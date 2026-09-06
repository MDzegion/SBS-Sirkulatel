import { SBSCoreEngine } from '@/domain/engine'
import type {
  ProductRecipeSpec,
  RawMaterialCost,
  SimulationInputParams,
  SimulationResultOutput,
  SimulationType,
} from '@/domain/types'
import { db as defaultDb, type SbsDatabase } from '@/data/db'
import { ActualOperationService } from './actual'

export interface SimulationSnapshot {
  productId: string
  productName: string
  recipe: ProductRecipeSpec
  materials: RawMaterialCost[]
  currentSellingPrice: number
}

export class SimulationSandboxService {
  private readonly dbx: SbsDatabase
  private readonly actual: ActualOperationService

  constructor(dbx: SbsDatabase = defaultDb, actual?: ActualOperationService) {
    this.dbx = dbx
    this.actual = actual ?? new ActualOperationService(dbx)
  }

  /**
   * Deep-clone master (resep, harga bahan, harga jual) ke memori sandbox.
   * Perubahan selanjutnya hanya di objek memori — bukan di database.
   */
  async loadSnapshot(productId: string): Promise<SimulationSnapshot> {
    const product = await this.dbx.products.get(productId)
    if (!product) {
      throw new Error('Produk tidak ditemukan.')
    }
    const recipe = await this.dbx.recipes.where('productId').equals(productId).first()
    if (!recipe) {
      throw new Error(`Resep untuk produk ${product.name} belum dibuat.`)
    }
    const recipeItems = await this.dbx.recipeItems.where('recipeId').equals(recipe.id).toArray()
    if (recipeItems.length === 0) {
      throw new Error(`Resep untuk produk ${product.name} masih kosong.`)
    }

    const materials: RawMaterialCost[] = []
    for (const ri of recipeItems) {
      const material = await this.dbx.rawMaterials.get(ri.materialId)
      if (!material) {
        throw new Error(`Bahan ${ri.materialId} tidak ditemukan.`)
      }
      materials.push({
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        costPerUnit: material.costPerUnit,
      })
    }

    const snapshot: SimulationSnapshot = {
      productId,
      productName: product.name,
      recipe: {
        productId,
        productName: product.name,
        items: recipeItems.map((ri) => ({
          materialId: ri.materialId,
          quantityRequired: ri.quantityRequired,
        })),
        packagingCostPerUnit: recipe.packagingCost,
        directOverheadPerUnit: recipe.directOverhead,
        defaultSellingPrice: product.sellingPrice,
      },
      materials,
      currentSellingPrice: product.sellingPrice,
    }

    return structuredClone(snapshot)
  }

  /**
   * Jalankan simulasi memakai shared engine. Tidak ada write database.
   */
  runSimulation(
    snapshot: SimulationSnapshot,
    params: SimulationInputParams,
  ): SimulationResultOutput {
    const materialsMap = new Map(snapshot.materials.map((m) => [m.materialId, m] as const))
    return SBSCoreEngine.simulateProductionAndPricing(snapshot.recipe, materialsMap, params)
  }

  /**
   * Kondisi aktual: engine yang sama, parameter master saat ini,
   * qty mengikuti skenario acuan agar perbandingan setara.
   */
  async buildBaselineActual(
    productId: string,
    referenceQty: number,
  ): Promise<SimulationResultOutput> {
    const snapshot = await this.loadSnapshot(productId)
    return this.runSimulation(snapshot, {
      productId,
      productionQty: referenceQty,
      simulatedSellingPrice: snapshot.currentSellingPrice,
    })
  }

  /**
   * Simpan skenario — write hanya ke simulation_scenarios.
   */
  async saveScenario(input: {
    scenarioName: string
    productId: string
    simulationType: SimulationType
    inputParameters: unknown
    calculatedResults: unknown
  }): Promise<string> {
    const product = await this.dbx.products.get(input.productId)
    const id = crypto.randomUUID()
    await this.dbx.simulationScenarios.add({
      id,
      scenarioName: input.scenarioName,
      productId: input.productId,
      productName: product?.name ?? input.productId,
      simulationType: input.simulationType,
      inputParameters: input.inputParameters,
      calculatedResults: input.calculatedResults,
      createdAt: new Date().toISOString(),
    })
    return id
  }

  async listScenarios(productId?: string) {
    if (productId) {
      return this.dbx.simulationScenarios.where('productId').equals(productId).toArray()
    }
    return this.dbx.simulationScenarios.toArray()
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    await this.dbx.simulationScenarios.delete(scenarioId)
  }

  /**
   * Salin ke Rencana Produksi — hanya membuat DRAFT di Dapur.
   * Stok bahan & kas tidak berubah sampai konfirmasi di Dapur.
   */
  async copySimulationToProductionDraft(
    productId: string,
    targetQuantity: number,
    notes?: string,
  ): Promise<string> {
    return this.actual.createProductionDraft(productId, targetQuantity, 'SIMULATOR_COPY', notes)
  }
}
