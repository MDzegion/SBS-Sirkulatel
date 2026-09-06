import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SbsDatabase, type SbsDatabase as Db } from '@/data/db'
import { ActualOperationService } from './actual'
import { seedPuding, type SeedResult } from './seed'

let db: Db
let service: ActualOperationService
let seed: SeedResult

beforeEach(async () => {
  db = new SbsDatabase(`test-actual-${crypto.randomUUID()}`)
  await db.open()
  service = new ActualOperationService(db)
  seed = await seedPuding(db)
})

describe('commitPurchase', () => {
  it('Menambah stok dan memperbarui harga beli terakhir dalam satu transaksi', async () => {
    await service.commitPurchase({
      purchaseDate: '2026-09-06',
      items: [{ materialId: seed.materialIds.telur, quantity: 50, unitCost: 2500 }],
    })

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.currentStock).toBe(150)
    expect(telur?.costPerUnit).toBe(2500)

    const [purchase] = await db.purchases.toArray()
    expect(purchase.totalAmount).toBe(125000)
  })

  it('Pembelian tidak menulis ke operational_expenses', async () => {
    await service.commitPurchase({
      purchaseDate: '2026-09-06',
      items: [{ materialId: seed.materialIds.susu, quantity: 1000, unitCost: 20 }],
    })
    expect(await db.operationalExpenses.count()).toBe(0)
  })

  it('Input tidak valid ditolak tanpa mengubah data', async () => {
    await expect(
      service.commitPurchase({
        purchaseDate: '2026-09-06',
        items: [{ materialId: seed.materialIds.telur, quantity: -5, unitCost: 2500 }],
      }),
    ).rejects.toThrow()

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.currentStock).toBe(100)
    expect(await db.purchases.count()).toBe(0)
  })
})

describe('produksi batch', () => {
  it('Draf MANUAL tidak mengubah stok', async () => {
    const orderId = await service.createProductionDraft(seed.productId, 100)
    const order = await db.productionOrders.get(orderId)

    expect(order?.status).toBe('DRAFT')
    expect(order?.source).toBe('MANUAL')

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.currentStock).toBe(100)
    expect((await db.products.get(seed.productId))?.currentStock).toBe(0)
  })

  it('Validasi sukses menandai VALIDATED, stok tetap utuh', async () => {
    const orderId = await service.createProductionDraft(seed.productId, 100)
    const shortages = await service.validateProduction(orderId)

    expect(shortages).toHaveLength(0)
    expect((await db.productionOrders.get(orderId))?.status).toBe('VALIDATED')

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.currentStock).toBe(100)
  })

  it('Validasi gagal melaporkan kekurangan bahan', async () => {
    await db.rawMaterials.update(seed.materialIds.telur, { currentStock: 10 })
    const orderId = await service.createProductionDraft(seed.productId, 100)

    const shortages = await service.validateProduction(orderId)
    expect(shortages).toHaveLength(1)
    expect(shortages[0]?.materialName).toBe('Telur Ayam')
    expect(shortages[0]?.quantityNeeded).toBe(50)
    expect((await db.productionOrders.get(orderId))?.status).toBe('DRAFT')
  })

  it('Konfirmasi memotong bahan, menambah barang jadi, dan menghitung HPP riil', async () => {
    const orderId = await service.createProductionDraft(seed.productId, 100)
    await service.validateProduction(orderId)
    await service.confirmProduction(orderId, 98)

    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    const susu = await db.rawMaterials.get(seed.materialIds.susu)
    const product = await db.products.get(seed.productId)
    const order = await db.productionOrders.get(orderId)

    expect(telur?.currentStock).toBe(50)
    expect(susu?.currentStock).toBe(2.5)
    expect(product?.currentStock).toBe(98)
    expect(order?.status).toBe('COMPLETED')
    expect(order?.totalBatchCost).toBe(210000)
    expect(order?.actualHppPerUnit).toBe(2143)

    const used = await db.productionMaterialsUsed.where('productionOrderId').equals(orderId).toArray()
    expect(used).toHaveLength(3)
    const telurUsed = used.find((u) => u.materialId === seed.materialIds.telur)
    expect(telurUsed?.unitCostSnapshot).toBe(2000)
    expect(telurUsed?.quantityUsed).toBe(50)
  })

  it('Konfirmasi dengan stok berkurang ditolak, data tidak berubah', async () => {
    const orderId = await service.createProductionDraft(seed.productId, 100)
    await db.rawMaterials.update(seed.materialIds.telur, { currentStock: 1 })

    await expect(service.confirmProduction(orderId, 98)).rejects.toThrow()
    expect((await db.productionOrders.get(orderId))?.status).toBe('DRAFT')
    expect((await db.products.get(seed.productId))?.currentStock).toBe(0)
  })

  it('Batal draf tidak menyisakan mutasi stok', async () => {
    const orderId = await service.createProductionDraft(seed.productId, 100)
    await service.cancelProductionDraft(orderId)

    expect((await db.productionOrders.get(orderId))?.status).toBe('CANCELLED')
    const telur = await db.rawMaterials.get(seed.materialIds.telur)
    expect(telur?.currentStock).toBe(100)
  })
})

describe('checkoutSale (POS)', () => {
  it('Menjual mengurangi stok dan mencatat omzet + laba kotor', async () => {
    await db.products.update(seed.productId, { currentStock: 20 })

    const txId = await service.checkoutSale(
      [{ productId: seed.productId, quantity: 5 }],
      'QRIS',
    )

    const product = await db.products.get(seed.productId)
    const tx = await db.saleTransactions.get(txId)
    const items = await db.saleItems.where('saleTransactionId').equals(txId).toArray()

    expect(product?.currentStock).toBe(15)
    expect(tx?.totalAmount).toBe(25000)
    expect(tx?.grossProfit).toBe(14500)
    expect(items).toHaveLength(1)
    expect(items[0]?.subtotalGrossProfit).toBe(14500)
    expect(tx?.invoiceNumber).toMatch(/^INV-\d{8}-\d{3}$/)
  })

  it('Stok kurang menolak transaksi', async () => {
    await db.products.update(seed.productId, { currentStock: 2 })
    await expect(
      service.checkoutSale([{ productId: seed.productId, quantity: 5 }], 'TUNAI'),
    ).rejects.toThrow()
    expect(await db.saleTransactions.count()).toBe(0)
  })
})

describe('addOperationalExpense', () => {
  it('Mencatat biaya operasional terpisah dari pembelian', async () => {
    await service.addOperationalExpense({
      expenseDate: '2026-09-06',
      category: 'Listrik/Air',
      amount: 150000,
      description: 'Token listrik bulanan',
    })
    expect(await db.operationalExpenses.count()).toBe(1)
  })
})
