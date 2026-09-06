import type { SbsDatabase } from '@/data/db'

const nowIso = (): string => new Date().toISOString()

export async function seedDemoData(db: SbsDatabase): Promise<void> {
  const now = nowIso()
  const matTelur = crypto.randomUUID()
  const matSusu = crypto.randomUUID()
  const matGula = crypto.randomUUID()
  const prdCoklat = crypto.randomUUID()
  const prdKaramel = crypto.randomUUID()

  const supplier = crypto.randomUUID()
  await db.suppliers.add({
    id: supplier,
    name: 'Peternak Pak Dhe',
    phone: '0812-3456-7890',
    createdAt: now,
    updatedAt: now,
  })

  await db.rawMaterials.bulkPut([
    { id: matTelur, code: 'MAT-TLR01', name: 'Telur Ayam', unit: 'butir' as const, costPerUnit: 2000, currentStock: 60, minStockAlert: 30, supplierId: supplier, createdAt: now, updatedAt: now },
    { id: matSusu, code: 'MAT-SUSU01', name: 'Susu UHT', unit: 'liter' as const, costPerUnit: 18000, currentStock: 5, minStockAlert: 1, createdAt: now, updatedAt: now },
    { id: matGula, code: 'MAT-GLA01', name: 'Gula Pasir', unit: 'kg' as const, costPerUnit: 15000, currentStock: 0.8, minStockAlert: 0.5, createdAt: now, updatedAt: now },
  ])

  await db.products.bulkPut([
    { id: prdCoklat, code: 'PRD-PUD01', name: 'Puding Coklat Cup', category: 'Makanan', sellingPrice: 5000, currentHpp: 2100, currentStock: 0, isActive: true, createdAt: now, updatedAt: now },
    { id: prdKaramel, code: 'PRD-PUD02', name: 'Puding Karamel Cup', category: 'Makanan', sellingPrice: 5000, currentHpp: 2200, currentStock: 0, isActive: true, createdAt: now, updatedAt: now },
  ])

  const rcpCoklat = crypto.randomUUID()
  const rcpKaramel = crypto.randomUUID()
  await db.recipes.bulkAdd([
    { id: rcpCoklat, productId: prdCoklat, batchYieldQty: 1, packagingCost: 500, directOverhead: 0, updatedAt: now },
    { id: rcpKaramel, productId: prdKaramel, batchYieldQty: 1, packagingCost: 500, directOverhead: 0, updatedAt: now },
  ])

  await db.recipeItems.bulkAdd([
    { id: crypto.randomUUID(), recipeId: rcpCoklat, materialId: matTelur, quantityRequired: 0.5 },
    { id: crypto.randomUUID(), recipeId: rcpCoklat, materialId: matSusu, quantityRequired: 0.025 },
    { id: crypto.randomUUID(), recipeId: rcpCoklat, materialId: matGula, quantityRequired: 0.01 },
    { id: crypto.randomUUID(), recipeId: rcpKaramel, materialId: matTelur, quantityRequired: 0.5 },
    { id: crypto.randomUUID(), recipeId: rcpKaramel, materialId: matSusu, quantityRequired: 0.025 },
    { id: crypto.randomUUID(), recipeId: rcpKaramel, materialId: matGula, quantityRequired: 0.02 },
  ])
}
