import { SBSCoreEngine } from '@/domain/engine'
import type { UnitType } from '@/domain/types'
import { db as defaultDb, type RecipeItem, type SbsDatabase } from '@/data/db'

const nowIso = (): string => new Date().toISOString()

export interface RecipeInput {
  packagingCost: number
  directOverhead: number
  items: Array<{ materialId: string; quantityRequired: number }>
}

export class MasterDataService {
  private readonly dbx: SbsDatabase

  constructor(dbx: SbsDatabase = defaultDb) {
    this.dbx = dbx
  }

  // ---------- Bahan baku ----------

  async upsertMaterial(input: {
    id?: string
    code: string
    name: string
    unit: UnitType
    costPerUnit: number
    currentStock: number
    minStockAlert: number
  }): Promise<void> {
    if (input.costPerUnit < 0 || input.currentStock < 0 || input.minStockAlert < 0) {
      throw new Error('Angka tidak boleh negatif.')
    }
    if (input.id) {
      await this.dbx.rawMaterials.update(input.id, {
        code: input.code,
        name: input.name,
        unit: input.unit,
        costPerUnit: input.costPerUnit,
        currentStock: input.currentStock,
        minStockAlert: input.minStockAlert,
        updatedAt: nowIso(),
      })
      return
    }
    await this.dbx.rawMaterials.add({
      id: crypto.randomUUID(),
      code: input.code,
      name: input.name,
      unit: input.unit,
      costPerUnit: input.costPerUnit,
      currentStock: input.currentStock,
      minStockAlert: input.minStockAlert,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.dbx.rawMaterials.delete(id)
  }

  // ---------- Supplier ----------

  async upsertSupplier(input: { id?: string; name: string; phone?: string; notes?: string }): Promise<void> {
    if (input.id) {
      await this.dbx.suppliers.update(input.id, { name: input.name, phone: input.phone, notes: input.notes })
      return
    }
    const now = nowIso()
    await this.dbx.suppliers.add({ id: crypto.randomUUID(), name: input.name, phone: input.phone, notes: input.notes, createdAt: now, updatedAt: now })
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.dbx.suppliers.delete(id)
  }

  // ---------- Produk ----------

  async upsertProduct(input: {
    id?: string
    code: string
    name: string
    category: string
    sellingPrice: number
  }): Promise<string> {
    if (input.sellingPrice < 0) {
      throw new Error('Harga jual tidak boleh negatif.')
    }
    if (input.id) {
      await this.dbx.products.update(input.id, {
        code: input.code,
        name: input.name,
        category: input.category,
        sellingPrice: input.sellingPrice,
        updatedAt: nowIso(),
      })
      return input.id
    }
    const id = crypto.randomUUID()
    const now = nowIso()
    await this.dbx.products.add({
      id,
      code: input.code,
      name: input.name,
      category: input.category,
      sellingPrice: input.sellingPrice,
      currentHpp: 0,
      currentStock: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    return id
  }

  async setProductActive(id: string, isActive: boolean): Promise<void> {
    await this.dbx.products.update(id, { isActive, updatedAt: nowIso() })
  }

  // ---------- Resep ----------

  async getRecipe(productId: string): Promise<{ recipeId?: string; packagingCost: number; directOverhead: number; items: RecipeItem[] }> {
    const recipe = await this.dbx.recipes.where('productId').equals(productId).first()
    if (!recipe) {
      return { packagingCost: 0, directOverhead: 0, items: [] }
    }
    const items = await this.dbx.recipeItems.where('recipeId').equals(recipe.id).toArray()
    return { recipeId: recipe.id, packagingCost: recipe.packagingCost, directOverhead: recipe.directOverhead, items }
  }

  async saveRecipe(
    productId: string,
    input: RecipeInput,
  ): Promise<void> {
    return this.dbx.transaction(
      'rw',
      [this.dbx.recipes, this.dbx.recipeItems, this.dbx.products, this.dbx.rawMaterials],
      async () => {
        if (input.items.length === 0) {
          throw new Error('Resep minimal punya satu bahan.')
        }
        for (const item of input.items) {
          if (item.quantityRequired <= 0) {
            throw new Error('Kuantitas bahan harus lebih dari 0.')
          }
          const material = await this.dbx.rawMaterials.get(item.materialId)
          if (!material) {
            throw new Error('Bahan tidak ditemukan.')
          }
        }

        let recipeId = (await this.dbx.recipes.where('productId').equals(productId).first())?.id
        if (recipeId) {
          await this.dbx.recipes.update(recipeId, {
            packagingCost: input.packagingCost,
            directOverhead: input.directOverhead,
            updatedAt: nowIso(),
          })
          await this.dbx.recipeItems.where('recipeId').equals(recipeId).delete()
        } else {
          recipeId = crypto.randomUUID()
          await this.dbx.recipes.add({
            id: recipeId,
            productId,
            batchYieldQty: 1,
            packagingCost: input.packagingCost,
            directOverhead: input.directOverhead,
            updatedAt: nowIso(),
          })
        }

        await this.dbx.recipeItems.bulkAdd(
          input.items.map((item) => ({
            id: crypto.randomUUID(),
            recipeId: recipeId!,
            materialId: item.materialId,
            quantityRequired: item.quantityRequired,
          })),
        )

        const product = await this.dbx.products.get(productId)
        const spec = {
          productId,
          productName: product?.name ?? '',
          items: input.items,
          packagingCostPerUnit: input.packagingCost,
          directOverheadPerUnit: input.directOverhead,
          defaultSellingPrice: product?.sellingPrice ?? 0,
        }
        const costMap = new Map<string, number>()
        for (const item of input.items) {
          const material = await this.dbx.rawMaterials.get(item.materialId)
          costMap.set(item.materialId, material?.costPerUnit ?? 0)
        }
        const hpp = SBSCoreEngine.calculateHPP(spec, costMap).hppPerUnit
        await this.dbx.products.update(productId, { currentHpp: hpp, updatedAt: nowIso() })
      },
    )
  }
}
