import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SBSCoreEngine } from '@/domain/engine'
import { SbsDatabase, type SbsDatabase as Db } from '@/data/db'
import { SimulationSandboxService } from './simulation'
import { ActualOperationService } from './actual'
import { seedPuding, type SeedResult } from './seed'

let db: Db
let sim: SimulationSandboxService
let actual: ActualOperationService
let seed: SeedResult

beforeEach(async () => {
  db = new SbsDatabase(`test-sim-${crypto.randomUUID()}`)
  await db.open()
  actual = new ActualOperationService(db)
  sim = new SimulationSandboxService(db, actual)
  seed = await seedPuding(db)
})

const snapshotMaterials = async () => {
  const materials = await db.rawMaterials.toArray()
  const products = await db.products.toArray()
  return JSON.stringify({ materials, products })
}

describe('loadSnapshot & runSimulation', () => {
  it('Snapshot berisi resep dan harga bahan (deep clone)', async () => {
    const snapshot = await sim.loadSnapshot(seed.productId)

    expect(snapshot.productName).toBe('Puding Coklat Cup')
    expect(snapshot.recipe.items).toHaveLength(3)
    expect(snapshot.recipe.packagingCostPerUnit).toBe(500)
    expect(snapshot.materials[0]?.costPerUnit).toBe(2000)
    expect(snapshot.currentSellingPrice).toBe(5000)

    // Mutasi snapshot tidak menyentuh database
    snapshot.materials[0]!.costPerUnit = 99999
    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.costPerUnit).toBe(2000)
  })

  it('Skenario dasar 100 cup @ Rp5.000 → margin 58%', async () => {
    const snapshot = await sim.loadSnapshot(seed.productId)
    const result = sim.runSimulation(snapshot, {
      productId: seed.productId,
      productionQty: 100,
      simulatedSellingPrice: 5000,
    })

    expect(result.hppPerUnit).toBe(2100)
    expect(result.potentialGrossProfit).toBe(290000)
    expect(result.grossMarginPercentage).toBe(58)
  })
})

describe('isolasi data (AC-09)', () => {
  it('1000 iterasi simulasi tidak mengubah raw_materials maupun products', async () => {
    const snapshot = await sim.loadSnapshot(seed.productId)
    const before = await snapshotMaterials()

    for (let i = 0; i < 1000; i++) {
      sim.runSimulation(snapshot, {
        productId: seed.productId,
        productionQty: 1 + (i % 500),
        simulatedSellingPrice: 3000 + (i % 4000),
        customMaterialCosts: { [seed.materialIds.telur]: 2000 + i },
        targetRevenue: 1000000 + i * 100,
        allocatedFixedCost: i,
      })
    }

    expect(await snapshotMaterials()).toBe(before)
    expect(await db.saleTransactions.count()).toBe(0)
    expect(await db.productionOrders.count()).toBe(0)
    expect(await db.purchases.count()).toBe(0)
  })

  it('Menyimpan skenario hanya menulis ke simulation_scenarios', async () => {
    const snapshot = await sim.loadSnapshot(seed.productId)
    const result = sim.runSimulation(snapshot, {
      productId: seed.productId,
      productionQty: 100,
      simulatedSellingPrice: 5000,
    })

    const before = await snapshotMaterials()
    const scenarioId = await sim.saveScenario({
      scenarioName: 'Skenario A',
      productId: seed.productId,
      simulationType: 'JUMLAH_PRODUKSI',
      inputParameters: { productionQty: 100, simulatedSellingPrice: 5000 },
      calculatedResults: result,
    })

    expect(await snapshotMaterials()).toBe(before)
    expect(await db.simulationScenarios.count()).toBe(1)

    const scenario = await db.simulationScenarios.get(scenarioId)
    expect(scenario?.productName).toBe('Puding Coklat Cup')
  })

  it('Kondisi aktual = engine + parameter master, qty mengikuti skenario acuan', async () => {
    const baseline = await sim.buildBaselineActual(seed.productId, 50)
    expect(baseline.potentialRevenue).toBe(250000)
    expect(baseline.potentialGrossProfit).toBe(145000)
    expect(baseline.grossMarginPercentage).toBe(58)
  })
})

describe('Salin ke Rencana Produksi (AC-13)', () => {
  it('Salin hanya membuat DRAFT — stok dan kas tidak berubah', async () => {
    const before = await snapshotMaterials()

    const draftId = await sim.copySimulationToProductionDraft(seed.productId, 100)

    const order = await db.productionOrders.get(draftId)
    expect(order?.status).toBe('DRAFT')
    expect(order?.source).toBe('SIMULATOR_COPY')
    expect(order?.targetQuantity).toBe(100)

    expect(await snapshotMaterials()).toBe(before)
    expect(await db.productionMaterialsUsed.count()).toBe(0)
  })

  it('Stok baru dipotong setelah konfirmasi di Dapur', async () => {
    const draftId = await sim.copySimulationToProductionDraft(seed.productId, 100)

    await actual.validateProduction(draftId)
    await actual.confirmProduction(draftId, 100)

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    const product = await db.products.get(seed.productId)
    const order = await db.productionOrders.get(draftId)

    expect(telur?.currentStock).toBe(50)
    expect(product?.currentStock).toBe(100)
    expect(order?.actualHppPerUnit).toBe(2100)
  })
})

describe('aturan insight & komparasi', () => {
  it('Seluruh insight dan summary bebas klaim terbaik/optimal', async () => {
    const snapshot = await sim.loadSnapshot(seed.productId)
    const baseline = await sim.buildBaselineActual(seed.productId, 50)

    const scenarioB = sim.runSimulation(snapshot, {
      productId: seed.productId,
      productionQty: 100,
      simulatedSellingPrice: 4500,
    })
    const scenarioRugi = sim.runSimulation(snapshot, {
      productId: seed.productId,
      productionQty: 10,
      simulatedSellingPrice: 1500,
    })

    const matrix = SBSCoreEngine.compareScenarios(baseline, baseline, scenarioB)
    const matrixTurun = SBSCoreEngine.compareScenarios(baseline, baseline, scenarioRugi)

    const texts = [
      baseline.humanInsightText,
      scenarioB.humanInsightText,
      scenarioRugi.humanInsightText,
      matrix.summaryInsight,
      matrixTurun.summaryInsight,
    ]
    for (const text of texts) {
      expect(text).not.toMatch(/terbaik|optimal/i)
    }

    expect(matrix.deltas.deltaProfit).toBe(95000)
    expect(matrix.deltas.deltaMarginPctPoints).toBeLessThan(0)
    expect(baseline.grossMarginPercentage).toBe(58)
    expect(scenarioB.grossMarginPercentage).toBe(53.33)
  })
})
