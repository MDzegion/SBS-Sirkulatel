import Dexie, { type EntityTable } from 'dexie'
import type {
  ProductionOrderSource,
  ProductionOrderStatus,
  SimulationType,
  UnitType,
} from '@/domain/types'

// ---------- Row types (SCHEMA.md v1.1) ----------

export interface Supplier {
  id: string
  name: string
  phone?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface RawMaterial {
  id: string
  code: string
  name: string
  unit: UnitType
  costPerUnit: number
  currentStock: number
  minStockAlert: number
  supplierId?: string
  createdAt: string
  updatedAt: string
}

export interface Purchase {
  id: string
  purchaseDate: string
  supplierId?: string
  supplierNameSnapshot?: string
  totalAmount: number
  notes?: string
  createdAt: string
}

export interface PurchaseItem {
  id: string
  purchaseId: string
  materialId: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface Product {
  id: string
  code: string
  name: string
  category: string
  sellingPrice: number
  currentHpp: number
  currentStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  id: string
  productId: string
  batchYieldQty: number
  packagingCost: number
  directOverhead: number
  notes?: string
  updatedAt: string
}

export interface RecipeItem {
  id: string
  recipeId: string
  materialId: string
  quantityRequired: number
}

export interface ProductionOrder {
  id: string
  batchCode: string
  productionDate: string
  productId: string
  targetQuantity: number
  actualYieldQuantity?: number
  status: ProductionOrderStatus
  source: ProductionOrderSource
  totalRawMaterialCost?: number
  totalPackagingCost?: number
  totalBatchCost?: number
  actualHppPerUnit?: number
  notes?: string
  createdAt: string
}

export interface ProductionMaterialUsed {
  id: string
  productionOrderId: string
  materialId: string
  quantityUsed: number
  unitCostSnapshot: number
  subtotalCost: number
}

export interface SaleTransaction {
  id: string
  invoiceNumber: string
  transactionTime: string
  totalAmount: number
  totalHppCost: number
  grossProfit: number
  paymentMethod: 'TUNAI' | 'TRANSFER' | 'QRIS'
  notes?: string
}

export interface SaleItem {
  id: string
  saleTransactionId: string
  productId: string
  quantity: number
  unitPrice: number
  unitHpp: number
  subtotalAmount: number
  subtotalGrossProfit: number
}

export interface OperationalExpense {
  id: string
  expenseDate: string
  category: string
  amount: number
  description: string
}

export interface SimulationScenario {
  id: string
  scenarioName: string
  productId: string
  productName: string
  simulationType: SimulationType
  inputParameters: unknown
  calculatedResults: unknown
  createdAt: string
}

// ---------- Database ----------

export class SbsDatabase extends Dexie {
  suppliers!: EntityTable<Supplier, 'id'>
  rawMaterials!: EntityTable<RawMaterial, 'id'>
  purchases!: EntityTable<Purchase, 'id'>
  purchaseItems!: EntityTable<PurchaseItem, 'id'>
  products!: EntityTable<Product, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  recipeItems!: EntityTable<RecipeItem, 'id'>
  productionOrders!: EntityTable<ProductionOrder, 'id'>
  productionMaterialsUsed!: EntityTable<ProductionMaterialUsed, 'id'>
  saleTransactions!: EntityTable<SaleTransaction, 'id'>
  saleItems!: EntityTable<SaleItem, 'id'>
  operationalExpenses!: EntityTable<OperationalExpense, 'id'>
  simulationScenarios!: EntityTable<SimulationScenario, 'id'>

  constructor(name = 'sbs-sirkulatel') {
    super(name)
    this.version(1).stores({
      suppliers: 'id, name',
      rawMaterials: 'id, code, name, supplierId',
      purchases: 'id, purchaseDate, supplierId',
      purchaseItems: 'id, purchaseId, materialId',
      products: 'id, code, name, category, isActive',
      recipes: 'id, productId',
      recipeItems: 'id, recipeId, materialId',
      productionOrders: 'id, batchCode, productId, status, source, productionDate',
      productionMaterialsUsed: 'id, productionOrderId, materialId',
      saleTransactions: 'id, invoiceNumber, transactionTime',
      saleItems: 'id, saleTransactionId, productId',
      operationalExpenses: 'id, expenseDate, category',
      // product_id referensi logis — tanpa FK cascade
      simulationScenarios: 'id, productId, createdAt',
    })
  }
}

export const db = new SbsDatabase()
