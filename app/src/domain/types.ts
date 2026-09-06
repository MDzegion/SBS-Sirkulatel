export type UnitType = 'kg' | 'gram' | 'liter' | 'ml' | 'butir' | 'pcs' | 'pack'

export type ProductionOrderStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

export type ProductionOrderSource = 'MANUAL' | 'SIMULATOR_COPY'

export type SimulationType =
  | 'HARGA_JUAL'
  | 'JUMLAH_PRODUKSI'
  | 'KENAIKAN_BAHAN'
  | 'TARGET_OMZET'

export interface RawMaterialCost {
  materialId: string
  name: string
  unit: UnitType
  costPerUnit: number
}

export interface BOMItemSpec {
  materialId: string
  quantityRequired: number
}

export interface ProductRecipeSpec {
  productId: string
  productName: string
  items: BOMItemSpec[]
  packagingCostPerUnit: number
  directOverheadPerUnit: number
  defaultSellingPrice: number
}

export interface SimulationInputParams {
  productId: string
  productionQty: number
  simulatedSellingPrice: number
  customMaterialCosts?: Record<string, number>
  packagingCostOverride?: number
  directOverheadOverride?: number
  allocatedFixedCost?: number
  targetRevenue?: number
  targetProfit?: number
}

export interface MaterialRequirementDetail {
  materialId: string
  materialName: string
  unit: UnitType
  unitCostUsed: number
  totalQuantityNeeded: number
  totalCost: number
}

export interface SimulationResultOutput {
  productId: string
  productionQty: number
  sellingPricePerUnit: number
  hppPerUnit: number
  totalEstimatedCost: number
  potentialRevenue: number
  potentialGrossProfit: number
  grossMarginPercentage: number
  markupPercentage: number
  breakEvenUnits: number | null
  breakEvenRevenue: number | null
  targetUnitsFromRevenue: number | null
  targetUnitsFromProfit: number | null
  materialRequirements: MaterialRequirementDetail[]
  humanInsightText: string
}

export interface ProductionDraftPayload {
  productId: string
  targetQuantity: number
  source: 'SIMULATOR_COPY'
  status: 'DRAFT'
  notes?: string
}

export interface ScenarioComparisonMatrix {
  baselineActual: SimulationResultOutput
  scenarioA: SimulationResultOutput
  scenarioB?: SimulationResultOutput
  deltas: {
    deltaProductionQty: number
    deltaRevenue: number
    deltaProfit: number
    deltaMarginPctPoints: number
    deltaHpp: number
  }
  summaryInsight: string
}

export interface PurchaseCommitInput {
  supplierId?: string
  purchaseDate: string
  items: Array<{ materialId: string; quantity: number; unitCost: number }>
}
