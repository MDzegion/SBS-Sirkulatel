import { SBSCoreEngine } from '@/domain/engine'
import type { PurchaseCommitInput, ProductRecipeSpec, ProductionOrderSource } from '@/domain/types'
import { db as defaultDb, type SbsDatabase } from '@/data/db'

const nowIso = (): string => new Date().toISOString()
const dateKey = (d: Date): string =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`

export interface StockShortage {
  materialId: string
  materialName: string
  quantityNeeded: number
  quantityAvailable: number
}

export interface SaleCartItem {
  productId: string
  quantity: number
}

export class ActualOperationService {
  private readonly dbx: SbsDatabase

  constructor(dbx: SbsDatabase = defaultDb) {
    this.dbx = dbx
  }

  // ---------- Pengadaan: Pembelian / Restok ----------

  async commitPurchase(input: PurchaseCommitInput): Promise<string> {
    return this.dbx.transaction(
      'rw',
      this.dbx.purchases,
      this.dbx.purchaseItems,
      this.dbx.rawMaterials,
      this.dbx.suppliers,
      async () => {
        const purchaseId = crypto.randomUUID()
        let totalAmount = 0

        const rows = input.items.map((item) => {
          if (item.quantity <= 0 || item.unitCost < 0) {
            throw new Error('Kuantitas dan harga beli tidak valid.')
          }
          const subtotal = item.quantity * item.unitCost
          totalAmount += subtotal
          return {
            id: crypto.randomUUID(),
            purchaseId,
            materialId: item.materialId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal,
          }
        })

        let supplierName: string | undefined
        if (input.supplierId) {
          const supplier = await this.dbx.suppliers.get(input.supplierId)
          supplierName = supplier?.name
        }

        await this.dbx.purchases.add({
          id: purchaseId,
          purchaseDate: input.purchaseDate,
          supplierId: input.supplierId,
          supplierNameSnapshot: supplierName,
          totalAmount,
          notes: undefined,
          createdAt: nowIso(),
        })
        await this.dbx.purchaseItems.bulkAdd(rows)

        for (const row of rows) {
          const material = await this.dbx.rawMaterials.get(row.materialId)
          if (!material) {
            throw new Error(`Bahan ${row.materialId} tidak ditemukan.`)
          }
          await this.dbx.rawMaterials.update(row.materialId, {
            currentStock: material.currentStock + row.quantity,
            costPerUnit: row.unitCost,
            updatedAt: nowIso(),
          })
        }

        return purchaseId
      },
    )
  }

  // ---------- Produksi ----------

  async createProductionDraft(
    productId: string,
    targetQuantity: number,
    source: ProductionOrderSource = 'MANUAL',
    notes?: string,
  ): Promise<string> {
    return this.dbx.transaction('rw', this.dbx.productionOrders, async () => {
      if (targetQuantity <= 0) {
        throw new Error('Jumlah produksi harus lebih dari 0.')
      }
      const orderId = crypto.randomUUID()
      const date = new Date()
      const prefix = `BATCH-${dateKey(date)}-`
      const sameDay = await this.dbx.productionOrders
        .where('batchCode')
        .startsWith(prefix)
        .count()
      const batchCode = `${prefix}${String(sameDay + 1).padStart(2, '0')}`

      await this.dbx.productionOrders.add({
        id: orderId,
        batchCode,
        productionDate: date.toISOString().slice(0, 10),
        productId,
        targetQuantity,
        status: 'DRAFT',
        source,
        notes,
        createdAt: nowIso(),
      })
      return orderId
    })
  }

  async validateProduction(orderId: string): Promise<StockShortage[]> {
    return this.dbx.transaction(
      'rw',
      this.dbx.productionOrders,
      this.dbx.rawMaterials,
      this.dbx.products,
      this.dbx.recipes,
      this.dbx.recipeItems,
      async () => {
      const order = await this.requireOrder(orderId)
      if (order.status !== 'DRAFT') {
        throw new Error('Hanya draf yang bisa divalidasi.')
      }

      const requirements = await this.getRequirements(order.productId, order.targetQuantity)
      const shortages: StockShortage[] = []

      for (const req of requirements.items) {
        const material = await this.dbx.rawMaterials.get(req.materialId)
        const available = material?.currentStock ?? 0
        if (available < req.totalQuantityNeeded) {
          shortages.push({
            materialId: req.materialId,
            materialName: material?.name ?? req.materialId,
            quantityNeeded: req.totalQuantityNeeded,
            quantityAvailable: available,
          })
        }
      }

      if (shortages.length === 0) {
        await this.dbx.productionOrders.update(orderId, { status: 'VALIDATED' })
      }
      return shortages
    })
  }

  async confirmProduction(orderId: string, actualYieldQuantity: number): Promise<void> {
    await this.dbx.transaction(
      'rw',
      [
        this.dbx.productionOrders,
        this.dbx.productionMaterialsUsed,
        this.dbx.rawMaterials,
        this.dbx.products,
        this.dbx.recipes,
        this.dbx.recipeItems,
      ],
      async () => {
        const order = await this.requireOrder(orderId)
        if (order.status !== 'DRAFT' && order.status !== 'VALIDATED') {
          throw new Error('Hanya draf/tervalidasi yang bisa dikonfirmasi.')
        }
        if (actualYieldQuantity <= 0) {
          throw new Error('Hasil jadi riil harus lebih dari 0.')
        }

        const requirements = await this.getRequirements(order.productId, order.targetQuantity)

        // Cek ulang stok masih cukup
        for (const req of requirements.items) {
          const material = await this.dbx.rawMaterials.get(req.materialId)
          if ((material?.currentStock ?? 0) < req.totalQuantityNeeded) {
            throw new Error(`Stok ${material?.name ?? req.materialId} kurang.`)
          }
        }

        // Potong stok bahan + audit
        let rawMaterialCost = 0
        const usedRows = requirements.items.map((req) => {
          const unitCost = req.unitCost
          const subtotal = req.totalQuantityNeeded * unitCost
          rawMaterialCost += subtotal
          return {
            id: crypto.randomUUID(),
            productionOrderId: orderId,
            materialId: req.materialId,
            quantityUsed: req.totalQuantityNeeded,
            unitCostSnapshot: unitCost,
            subtotalCost: subtotal,
          }
        })
        await this.dbx.productionMaterialsUsed.bulkAdd(usedRows)

        for (const row of usedRows) {
          const material = await this.dbx.rawMaterials.get(row.materialId)
          await this.dbx.rawMaterials.update(row.materialId, {
            currentStock: (material?.currentStock ?? 0) - row.quantityUsed,
            updatedAt: nowIso(),
          })
        }

        // Total biaya & HPP via shared engine
        const cost = SBSCoreEngine.calculateHPP(
          requirements.recipe,
          requirements.costMap,
          order.targetQuantity,
        )
        const actualHpp = SBSCoreEngine.calculateActualBatchHpp(cost.totalCost, actualYieldQuantity)

        // Barang jadi masuk stok
        const product = await this.dbx.products.get(order.productId)
        if (!product) {
          throw new Error('Produk tidak ditemukan.')
        }
        await this.dbx.products.update(order.productId, {
          currentStock: product.currentStock + actualYieldQuantity,
          currentHpp: cost.hppPerUnit,
          updatedAt: nowIso(),
        })

        await this.dbx.productionOrders.update(orderId, {
          status: 'COMPLETED',
          actualYieldQuantity,
          totalRawMaterialCost: Math.round(rawMaterialCost),
          totalPackagingCost:
            requirements.recipe.packagingCostPerUnit * order.targetQuantity,
          totalBatchCost: cost.totalCost,
          actualHppPerUnit: actualHpp,
        })
      },
    )
  }

  async cancelProductionDraft(orderId: string): Promise<void> {
    await this.dbx.transaction('rw', this.dbx.productionOrders, async () => {
      const order = await this.requireOrder(orderId)
      if (order.status !== 'DRAFT' && order.status !== 'VALIDATED') {
        throw new Error('Hanya draf yang bisa dibatalkan.')
      }
      await this.dbx.productionOrders.update(orderId, { status: 'CANCELLED' })
    })
  }

  // ---------- Kasir / POS ----------

  async checkoutSale(
    cart: SaleCartItem[],
    paymentMethod: 'TUNAI' | 'TRANSFER' | 'QRIS',
  ): Promise<string> {
    return this.dbx.transaction(
      'rw',
      this.dbx.saleTransactions,
      this.dbx.saleItems,
      this.dbx.products,
      async () => {
        if (cart.length === 0) {
          throw new Error('Keranjang kosong.')
        }

        let totalAmount = 0
        let totalHppCost = 0
        const rows: Array<{
          id: string
          saleTransactionId: string
          productId: string
          quantity: number
          unitPrice: number
          unitHpp: number
          subtotalAmount: number
          subtotalGrossProfit: number
        }> = []

        const transactionId = crypto.randomUUID()
        const date = new Date()
        const prefix = `INV-${dateKey(date)}-`
        const sameDay = await this.dbx.saleTransactions
          .where('invoiceNumber')
          .startsWith(prefix)
          .count()
        const invoiceNumber = `${prefix}${String(sameDay + 1).padStart(3, '0')}`

        for (const item of cart) {
          const product = await this.dbx.products.get(item.productId)
          if (!product || !product.isActive) {
            throw new Error(`Produk ${item.productId} tidak tersedia.`)
          }
          if (item.quantity <= 0) {
            throw new Error('Kuantitas harus lebih dari 0.')
          }
          if (product.currentStock < item.quantity) {
            throw new Error(`Stok ${product.name} kurang untuk transaksi ini.`)
          }

          const subtotalAmount = product.sellingPrice * item.quantity
          const subtotalHpp = product.currentHpp * item.quantity
          const subtotalGrossProfit = subtotalAmount - subtotalHpp

          totalAmount += subtotalAmount
          totalHppCost += subtotalHpp

          rows.push({
            id: crypto.randomUUID(),
            saleTransactionId: transactionId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.sellingPrice,
            unitHpp: product.currentHpp,
            subtotalAmount,
            subtotalGrossProfit,
          })
        }

        await this.dbx.saleTransactions.add({
          id: transactionId,
          invoiceNumber,
          transactionTime: nowIso(),
          totalAmount,
          totalHppCost,
          grossProfit: totalAmount - totalHppCost,
          paymentMethod,
        })
        await this.dbx.saleItems.bulkAdd(rows)

        for (const row of rows) {
          const product = await this.dbx.products.get(row.productId)
          await this.dbx.products.update(row.productId, {
            currentStock: (product?.currentStock ?? 0) - row.quantity,
            updatedAt: nowIso(),
          })
        }

        return transactionId
      },
    )
  }

  // ---------- Biaya Operasional ----------

  async addOperationalExpense(expense: {
    expenseDate: string
    category: string
    amount: number
    description: string
  }): Promise<string> {
    if (expense.amount <= 0) {
      throw new Error('Nilai biaya harus lebih dari 0.')
    }
    const id = crypto.randomUUID()
    await this.dbx.operationalExpenses.add({ id, ...expense })
    return id
  }

  // ---------- Internal ----------

  private async requireOrder(orderId: string) {
    const order = await this.dbx.productionOrders.get(orderId)
    if (!order) {
      throw new Error('Draf produksi tidak ditemukan.')
    }
    return order
  }

  private async getRequirements(productId: string, targetQuantity: number): Promise<{
    recipe: ProductRecipeSpec
    costMap: Map<string, number>
    items: Array<{ materialId: string; unitCost: number; totalQuantityNeeded: number }>
  }> {
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

    const costMap = new Map<string, number>()
    const items: Array<{
      materialId: string
      unitCost: number
      totalQuantityNeeded: number
    }> = []

    for (const ri of recipeItems) {
      const material = await this.dbx.rawMaterials.get(ri.materialId)
      if (!material) {
        throw new Error(`Bahan ${ri.materialId} tidak ditemukan.`)
      }
      costMap.set(ri.materialId, material.costPerUnit)
      items.push({
        materialId: ri.materialId,
        unitCost: material.costPerUnit,
        totalQuantityNeeded: ri.quantityRequired * targetQuantity,
      })
    }

    const recipeSpec: ProductRecipeSpec = {
      productId,
      productName: product.name,
      items: recipeItems.map((ri) => ({
        materialId: ri.materialId,
        quantityRequired: ri.quantityRequired,
      })),
      packagingCostPerUnit: recipe.packagingCost,
      directOverheadPerUnit: recipe.directOverhead,
      defaultSellingPrice: product.sellingPrice,
    }

    return {
      recipe: recipeSpec,
      costMap,
      items,
    }
  }
}
