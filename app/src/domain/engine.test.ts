import { describe, expect, it } from 'vitest'
import { SBSCoreEngine } from './engine'
import type { ProductRecipeSpec, RawMaterialCost } from './types'

const materials: RawMaterialCost[] = [
  { materialId: 'mat-tlr', name: 'Telur Ayam', unit: 'butir', costPerUnit: 2000 },
  { materialId: 'mat-susu', name: 'Susu UHT', unit: 'liter', costPerUnit: 18000 },
  { materialId: 'mat-gula', name: 'Gula Pasir', unit: 'kg', costPerUnit: 15000 },
]

const materialsMap = new Map(materials.map((m) => [m.materialId, m] as const))
const costsMap = new Map(materials.map((m) => [m.materialId, m.costPerUnit] as const))

const recipe: ProductRecipeSpec = {
  productId: 'prd-pud01',
  productName: 'Puding Coklat Cup',
  items: [
    { materialId: 'mat-tlr', quantityRequired: 0.5 },
    { materialId: 'mat-susu', quantityRequired: 0.025 },
    { materialId: 'mat-gula', quantityRequired: 0.01 },
  ],
  packagingCostPerUnit: 500,
  directOverheadPerUnit: 0,
  defaultSellingPrice: 5000,
}

describe('calculateHPP', () => {
  it('HPP resep pecahan desimal = bahan + kemasan + overhead', () => {
    const result = SBSCoreEngine.calculateHPP(recipe, costsMap)
    expect(result.hppPerUnit).toBe(2100)
  })

  it('Total biaya batch = HPP × jumlah produksi', () => {
    const result = SBSCoreEngine.calculateHPP(recipe, costsMap, 100)
    expect(result.totalCost).toBe(210000)
    expect(result.materialsCostTotal).toBe(160000)
  })

  it('Override kemasan dan overhead dihormati', () => {
    const result = SBSCoreEngine.calculateHPP(recipe, costsMap, 1, {
      packagingCostPerUnit: 700,
      directOverheadPerUnit: 200,
    })
    expect(result.hppPerUnit).toBe(2500)
  })
})

describe('calculateActualBatchHpp', () => {
  it('HPP aktual memakai actual yield, bukan target', () => {
    const batchCost = SBSCoreEngine.calculateHPP(recipe, costsMap, 100).totalCost
    expect(SBSCoreEngine.calculateActualBatchHpp(batchCost, 98)).toBe(2143)
  })

  it('Yield 0 menghasilkan HPP 0, bukan error', () => {
    expect(SBSCoreEngine.calculateActualBatchHpp(210000, 0)).toBe(0)
  })
})

describe('simulateProductionAndPricing', () => {
  it('Skenario dasar: 100 cup @ Rp5.000 → margin 58%', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 100,
      simulatedSellingPrice: 5000,
    })

    expect(result.hppPerUnit).toBe(2100)
    expect(result.totalEstimatedCost).toBe(210000)
    expect(result.potentialRevenue).toBe(500000)
    expect(result.potentialGrossProfit).toBe(290000)
    expect(result.grossMarginPercentage).toBe(58)
    expect(result.materialRequirements).toHaveLength(3)
    expect(result.materialRequirements[0]).toEqual({
      materialId: 'mat-tlr',
      materialName: 'Telur Ayam',
      unit: 'butir',
      unitCostUsed: 2000,
      totalQuantityNeeded: 50,
      totalCost: 100000,
    })
  })

  it('Margin 0% saat harga jual = HPP', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 10,
      simulatedSellingPrice: 2100,
    })
    expect(result.grossMarginPercentage).toBe(0)
  })

  it('Margin negatif saat harga jual < HPP', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 10,
      simulatedSellingPrice: 1500,
    })
    expect(result.potentialGrossProfit).toBeLessThan(0)
    expect(result.grossMarginPercentage).toBeLessThan(0)
  })

  it('Override harga bahan (telur naik) menaikkan HPP dan menurunkan margin', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 10,
      simulatedSellingPrice: 5000,
      customMaterialCosts: { 'mat-tlr': 2500 },
    })
    expect(result.hppPerUnit).toBe(2350)
    expect(result.grossMarginPercentage).toBe(53)
    expect(result.materialRequirements[0]?.unitCostUsed).toBe(2500)
  })

  it('BEP null saat allocatedFixedCost kosong atau 0', () => {
    const base = { productId: recipe.productId, productionQty: 10, simulatedSellingPrice: 5000 }
    expect(
      SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, base).breakEvenUnits,
    ).toBeNull()
    expect(
      SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, base)
        .breakEvenRevenue,
    ).toBeNull()
  })

  it('BEP dihitung hanya jika fixed cost > 0', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 10,
      simulatedSellingPrice: 5000,
      allocatedFixedCost: 29000,
    })
    expect(result.breakEvenUnits).toBe(10)
    expect(result.breakEvenRevenue).toBe(50000)
  })
})

describe('target unit engine', () => {
  it('Target omzet Rp1.000.000 / Rp5.000 = 200 unit', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 50,
      simulatedSellingPrice: 5000,
      targetRevenue: 1000000,
    })
    expect(result.targetUnitsFromRevenue).toBe(200)
  })

  it('Target laba memakai laba kotor per unit', () => {
    const result = SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: 50,
      simulatedSellingPrice: 5000,
      targetProfit: 290000,
    })
    expect(result.targetUnitsFromProfit).toBe(100)
  })

  it('Target laba 0 unit jika tidak ada untung per unit', () => {
    expect(
      SBSCoreEngine.calculateTargetUnitsFromProfit(100000, 2000, 2500),
    ).toBe(0)
  })
})

describe('compareScenarios', () => {
  const run = (qty: number, price: number) =>
    SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
      productId: recipe.productId,
      productionQty: qty,
      simulatedSellingPrice: price,
    })

  it('Delta Skenario B vs baseline dihitung dengan benar', () => {
    const baseline = run(50, 5000)
    const scenarioA = run(50, 5000)
    const scenarioB = run(100, 4500)
    const matrix = SBSCoreEngine.compareScenarios(baseline, scenarioA, scenarioB)

    expect(matrix.deltas.deltaProductionQty).toBe(50)
    expect(matrix.deltas.deltaRevenue).toBe(200000)
    expect(matrix.deltas.deltaProfit).toBe(95000)
    expect(matrix.deltas.deltaHpp).toBe(0)
  })
})

describe('aturan insight', () => {
  it('Tidak mengandung kata terbaik / optimal', () => {
    const results = [
      SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
        productId: recipe.productId,
        productionQty: 10,
        simulatedSellingPrice: 5000,
      }),
      SBSCoreEngine.simulateProductionAndPricing(recipe, materialsMap, {
        productId: recipe.productId,
        productionQty: 10,
        simulatedSellingPrice: 1500,
      }),
    ]
    for (const r of results) {
      expect(r.humanInsightText).not.toMatch(/terbaik|optimal/i)
    }
  })
})
