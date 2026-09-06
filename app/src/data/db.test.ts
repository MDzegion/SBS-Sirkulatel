import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'
import { SbsDatabase, type Product, type RawMaterial, type SimulationScenario } from './db'

test('semua 13 tabel terdefinisi', async () => {
  const db = new SbsDatabase(`test-tables-${crypto.randomUUID()}`)
  await db.open()

  const expected = [
    'suppliers',
    'rawMaterials',
    'purchases',
    'purchaseItems',
    'products',
    'recipes',
    'recipeItems',
    'productionOrders',
    'productionMaterialsUsed',
    'saleTransactions',
    'saleItems',
    'operationalExpenses',
    'simulationScenarios',
  ]

  for (const name of expected) {
    expect(db.table(name), `tabel ${name}`).toBeDefined()
  }

  db.close()
})

test('insert dan query bahan baku', async () => {
  const db = new SbsDatabase(`test-insert-${crypto.randomUUID()}`)
  await db.open()

  const material: RawMaterial = {
    id: 'mat-tlr',
    code: 'MAT-TLR01',
    name: 'Telur Ayam',
    unit: 'butir',
    costPerUnit: 2000,
    currentStock: 100,
    minStockAlert: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await db.rawMaterials.add(material)
  const fetched = await db.rawMaterials.get('mat-tlr')

  expect(fetched?.name).toBe('Telur Ayam')
  expect(fetched?.costPerUnit).toBe(2000)
  db.close()
})

test('skenario simulasi tersimpan tanpa menyentuh produk', async () => {
  const db = new SbsDatabase(`test-sim-${crypto.randomUUID()}`)
  await db.open()

  const product: Product = {
    id: 'prd-pud01',
    code: 'PRD-PUD01',
    name: 'Puding Coklat Cup',
    category: 'Makanan',
    sellingPrice: 5000,
    currentHpp: 2100,
    currentStock: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.products.add(product)

  const scenario: SimulationScenario = {
    id: 'sim-001',
    scenarioName: 'Skenario A',
    productId: product.id,
    productName: product.name,
    simulationType: 'JUMLAH_PRODUKSI',
    inputParameters: { productionQty: 100 },
    calculatedResults: { grossMarginPercentage: 58 },
    createdAt: new Date().toISOString(),
  }
  await db.simulationScenarios.add(scenario)

  // hapus produk — skenario tetap ada (referensi logis, tanpa cascade)
  await db.products.delete(product.id)

  const remaining = await db.simulationScenarios.get('sim-001')
  expect(remaining).toBeDefined()
  expect(remaining?.productName).toBe('Puding Coklat Cup')

  db.close()
})
