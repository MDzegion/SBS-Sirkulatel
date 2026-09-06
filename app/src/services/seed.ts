import type { SbsDatabase } from '@/data/db'

export interface SeedResult {
  productId: string
  recipeId: string
  materialIds: { telur: string; susu: string; gula: string }
}

export async function seedPuding(db: SbsDatabase): Promise<SeedResult> {
  const now = new Date().toISOString()
  const materialIds = {
    telur: 'mat-tlr',
    susu: 'mat-susu',
    gula: 'mat-gula',
  }

  await db.rawMaterials.bulkAdd([
    {
      id: materialIds.telur,
      code: 'MAT-TLR01',
      name: 'Telur Ayam',
      unit: 'butir',
      costPerUnit: 2000,
      currentStock: 100,
      minStockAlert: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: materialIds.susu,
      code: 'MAT-SUSU01',
      name: 'Susu UHT',
      unit: 'liter',
      costPerUnit: 18000,
      currentStock: 5,
      minStockAlert: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: materialIds.gula,
      code: 'MAT-GLA01',
      name: 'Gula Pasir',
      unit: 'kg',
      costPerUnit: 15000,
      currentStock: 2,
      minStockAlert: 0.5,
      createdAt: now,
      updatedAt: now,
    },
  ])

  const productId = 'prd-pud01'
  await db.products.add({
    id: productId,
    code: 'PRD-PUD01',
    name: 'Puding Coklat Cup',
    category: 'Makanan',
    sellingPrice: 5000,
    currentHpp: 2100,
    currentStock: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  const recipeId = 'rcp-pud01'
  await db.recipes.add({
    id: recipeId,
    productId,
    batchYieldQty: 1,
    packagingCost: 500,
    directOverhead: 0,
    updatedAt: now,
  })

  await db.recipeItems.bulkAdd([
    { id: 'ri-1', recipeId, materialId: materialIds.telur, quantityRequired: 0.5 },
    { id: 'ri-2', recipeId, materialId: materialIds.susu, quantityRequired: 0.025 },
    { id: 'ri-3', recipeId, materialId: materialIds.gula, quantityRequired: 0.01 },
  ])

  return { productId, recipeId, materialIds }
}
