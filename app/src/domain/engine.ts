import type {
  BOMItemSpec,
  MaterialRequirementDetail,
  ProductRecipeSpec,
  RawMaterialCost,
  ScenarioComparisonMatrix,
  SimulationInputParams,
  SimulationResultOutput,
} from './types'

const formatRupiah = (value: number): string =>
  `Rp${Math.round(value).toLocaleString('id-ID')}`

export class SBSCoreEngine {
  public static calculateHPP(
    recipe: ProductRecipeSpec,
    materialsCostMap: Map<string, number>,
    batchQty: number = 1,
    overrides?: { packagingCostPerUnit?: number; directOverheadPerUnit?: number },
  ): { hppPerUnit: number; totalCost: number; materialsCostTotal: number } {
    let rawMaterialCostPerUnit = 0

    for (const item of recipe.items) {
      const unitCost = materialsCostMap.get(item.materialId) ?? 0
      rawMaterialCostPerUnit += item.quantityRequired * unitCost
    }

    const packaging = overrides?.packagingCostPerUnit ?? recipe.packagingCostPerUnit
    const overhead = overrides?.directOverheadPerUnit ?? recipe.directOverheadPerUnit
    const totalUnitCost = rawMaterialCostPerUnit + packaging + overhead
    const totalBatchCost = totalUnitCost * batchQty

    return {
      hppPerUnit: Math.round(totalUnitCost),
      totalCost: Math.round(totalBatchCost),
      materialsCostTotal: Math.round(rawMaterialCostPerUnit * batchQty),
    }
  }

  public static calculateActualBatchHpp(
    totalBatchCost: number,
    actualYieldQuantity: number,
  ): number {
    if (actualYieldQuantity <= 0) return 0
    return Math.round(totalBatchCost / actualYieldQuantity)
  }

  public static calculateTargetUnitsFromRevenue(
    targetRevenue: number,
    sellingPrice: number,
  ): number {
    if (sellingPrice <= 0) return 0
    return Math.ceil(targetRevenue / sellingPrice)
  }

  public static calculateTargetUnitsFromProfit(
    targetProfit: number,
    sellingPrice: number,
    hppPerUnit: number,
  ): number {
    const profitPerUnit = sellingPrice - hppPerUnit
    if (profitPerUnit <= 0) return 0
    return Math.ceil(targetProfit / profitPerUnit)
  }

  public static simulateProductionAndPricing(
    recipe: ProductRecipeSpec,
    baseMaterialsMap: Map<string, RawMaterialCost>,
    params: SimulationInputParams,
  ): SimulationResultOutput {
    const effectiveCostMap = new Map<string, number>()
    baseMaterialsMap.forEach((mat, id) => {
      const overridden = params.customMaterialCosts?.[id]
      effectiveCostMap.set(id, overridden !== undefined ? overridden : mat.costPerUnit)
    })

    const costResult = this.calculateHPP(recipe, effectiveCostMap, params.productionQty, {
      packagingCostPerUnit: params.packagingCostOverride,
      directOverheadPerUnit: params.directOverheadOverride,
    })

    const potentialRevenue = params.productionQty * params.simulatedSellingPrice
    const potentialGrossProfit = potentialRevenue - costResult.totalCost
    const grossMarginPct = potentialRevenue > 0
      ? (potentialGrossProfit / potentialRevenue) * 100
      : 0
    const markupPct = costResult.hppPerUnit > 0
      ? ((params.simulatedSellingPrice - costResult.hppPerUnit) / costResult.hppPerUnit) * 100
      : 0

    const fixedCost = params.allocatedFixedCost ?? 0
    const contributionMarginPerUnit = params.simulatedSellingPrice - costResult.hppPerUnit
    const breakEvenUnits = fixedCost > 0 && contributionMarginPerUnit > 0
      ? Math.ceil(fixedCost / contributionMarginPerUnit)
      : null
    const breakEvenRevenue = breakEvenUnits !== null
      ? breakEvenUnits * params.simulatedSellingPrice
      : null

    const targetUnitsFromRevenue = params.targetRevenue !== undefined
      ? this.calculateTargetUnitsFromRevenue(params.targetRevenue, params.simulatedSellingPrice)
      : null
    const targetUnitsFromProfit = params.targetProfit !== undefined
      ? this.calculateTargetUnitsFromProfit(
          params.targetProfit,
          params.simulatedSellingPrice,
          costResult.hppPerUnit,
        )
      : null

    const materialReqs = recipe.items.map((item: BOMItemSpec): MaterialRequirementDetail => {
      const mat = baseMaterialsMap.get(item.materialId)
      const unitCost = effectiveCostMap.get(item.materialId) ?? 0
      const totalQty = item.quantityRequired * params.productionQty
      return {
        materialId: item.materialId,
        materialName: mat?.name ?? 'Bahan',
        unit: mat?.unit ?? 'pcs',
        unitCostUsed: unitCost,
        totalQuantityNeeded: totalQty,
        totalCost: Math.round(totalQty * unitCost),
      }
    })

    return {
      productId: recipe.productId,
      productionQty: params.productionQty,
      sellingPricePerUnit: params.simulatedSellingPrice,
      hppPerUnit: costResult.hppPerUnit,
      totalEstimatedCost: costResult.totalCost,
      potentialRevenue,
      potentialGrossProfit,
      grossMarginPercentage: Number(grossMarginPct.toFixed(2)),
      markupPercentage: Number(markupPct.toFixed(2)),
      breakEvenUnits,
      breakEvenRevenue,
      targetUnitsFromRevenue,
      targetUnitsFromProfit,
      materialRequirements: materialReqs,
      humanInsightText: this.buildInsight(grossMarginPct, potentialGrossProfit),
    }
  }

  static buildInsight(grossMarginPct: number, potentialGrossProfit: number): string {
    if (grossMarginPct < 20) {
      return 'Peringatan: Margin di bawah 20%. Sangat rentan rugi jika ada bahan terbuang.'
    }
    if (grossMarginPct >= 50) {
      return `Margin ${grossMarginPct.toFixed(1)}% tergolong sehat. Potensi laba kotor ${formatRupiah(potentialGrossProfit)}.`
    }
    return `Margin ${grossMarginPct.toFixed(1)}%. Pastikan volume penjualan stabil.`
  }

  public static compareScenarios(
    baseline: SimulationResultOutput,
    scenarioA: SimulationResultOutput,
    scenarioB?: SimulationResultOutput,
  ): ScenarioComparisonMatrix {
    const target = scenarioB ?? scenarioA
    const deltaRevenue = target.potentialRevenue - baseline.potentialRevenue
    const deltaProfit = target.potentialGrossProfit - baseline.potentialGrossProfit
    const deltaMarginPctPoints = target.grossMarginPercentage - baseline.grossMarginPercentage
    const deltaProductionQty = target.productionQty - baseline.productionQty
    const deltaHpp = target.hppPerUnit - baseline.hppPerUnit

    let summaryInsight = ''
    if (deltaProfit > 0 && deltaMarginPctPoints >= 0) {
      summaryInsight = `Skenario ini menaikkan laba kotor ${formatRupiah(deltaProfit)} dan margin tidak turun.`
    } else if (deltaProfit > 0 && deltaMarginPctPoints < 0) {
      summaryInsight = `Laba kotor naik ${formatRupiah(deltaProfit)}, namun margin turun ${Math.abs(deltaMarginPctPoints).toFixed(1)} poin persentase.`
    } else {
      summaryInsight = `Skenario ini menghasilkan laba kotor lebih rendah ${formatRupiah(Math.abs(deltaProfit))} dibanding kondisi awal.`
    }

    return {
      baselineActual: baseline,
      scenarioA,
      scenarioB,
      deltas: {
        deltaProductionQty,
        deltaRevenue,
        deltaProfit,
        deltaMarginPctPoints: Number(deltaMarginPctPoints.toFixed(2)),
        deltaHpp,
      },
      summaryInsight,
    }
  }
}
