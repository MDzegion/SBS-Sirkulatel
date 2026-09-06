import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { ActualOperationService, type StockShortage } from '@/services/actual'
import type { ProductionOrder } from '@/data/db'
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Select, SuccessNote, TextInput } from '@/ui/components'
import { formatRupiah, formatDateLabel } from '@/ui/format'

const actualService = new ActualOperationService()

export default function DapurPage() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const orders = useLiveQuery(
    () =>
      db.productionOrders
        .toArray()
        .then((rows) => rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [],
  )
  const productById = new Map((products ?? []).map((p) => [p.id, p]))

  const [newProductId, setNewProductId] = useState('')
  const [newQty, setNewQty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [shortages, setShortages] = useState<Record<string, StockShortage[]>>({})
  const [yields, setYields] = useState<Record<string, string>>({})

  const startNewBatch = async () => {
    setError(null)
    setNotice(null)
    const qty = Number(newQty)
    if (!newProductId || !Number.isFinite(qty) || qty <= 0) {
      setError('Pilih produk dan isi jumlah produksi.')
      return
    }
    try {
      await actualService.createProductionDraft(newProductId, qty)
      setNewQty('')
      setNotice('Draf produksi dibuat.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat draf.')
    }
  }

  const doValidate = async (order: ProductionOrder) => {
    setError(null)
    try {
      const result = await actualService.validateProduction(order.id)
      if (result.length === 0) {
        setNotice(`Batch ${order.batchCode} tervalidasi — bahan cukup.`)
        setShortages((prev) => ({ ...prev, [order.id]: [] }))
      } else {
        setShortages((prev) => ({ ...prev, [order.id]: result }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validasi gagal.')
    }
  }

  const doConfirm = async (order: ProductionOrder) => {
    setError(null)
    const yieldValue = Number(yields[order.id] ?? order.targetQuantity)
    if (!Number.isFinite(yieldValue) || yieldValue <= 0) {
      setError('Hasil jadi riil harus lebih dari 0.')
      return
    }
    try {
      await actualService.confirmProduction(order.id, yieldValue)
      setNotice(`Batch ${order.batchCode} selesai — stok barang jadi bertambah.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konfirmasi gagal.')
    }
  }

  const doCancel = async (order: ProductionOrder) => {
    setError(null)
    try {
      await actualService.cancelProductionDraft(order.id)
      setNotice(`Batch ${order.batchCode} dibatalkan.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membatalkan.')
    }
  }

  const activeOrders = (orders ?? []).filter((o) => o.status === 'DRAFT' || o.status === 'VALIDATED')
  const history = (orders ?? []).filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-title">Dapur Produksi</h2>
        <p className="text-sm text-text-muted">Stok bahan baru dipotong saat batch dikonfirmasi selesai</p>
      </div>

      <Card title="Mulai batch baru">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field label="Produk">
            <Select value={newProductId} onChange={(e) => setNewProductId(e.target.value)}>
              <option value="">— pilih produk —</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Jumlah target">
            <TextInput type="number" min={1} value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="100" />
          </Field>
          <Button onClick={startNewBatch}>Buat Draf</Button>
        </div>
      </Card>

      <ErrorNote message={error} />
      <SuccessNote message={notice} />

      <Card title={`Draf & validasi (${activeOrders.length})`}>
        {activeOrders.length === 0 ? (
          <EmptyState
            title="Belum ada draf produksi"
            description="Buat draf di sini atau salin rencana dari Business Simulator."
            action={
              <Link to="/simulator">
                <Button variant="outline">Buka Simulator</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-4">
            {activeOrders.map((order) => {
              const orderShortages = shortages[order.id]
              const product = productById.get(order.productId)
              return (
                <li key={order.id} className="rounded-lg border border-border-default p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-title">{order.batchCode}</span>
                    <Badge tone={order.status === 'VALIDATED' ? 'primary' : 'neutral'}>{order.status}</Badge>
                    {order.source === 'SIMULATOR_COPY' && <Badge tone="amber">Dari Simulator</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-text-body">
                    {product?.name ?? order.productId} — target {order.targetQuantity} unit · dibuat {formatDateLabel(order.createdAt)}
                  </p>

                  {orderShortages && orderShortages.length > 0 && (
                    <div className="mt-2 rounded-md bg-danger-50 p-2 text-sm text-danger-600">
                      <p className="font-semibold">Bahan kurang:</p>
                      <ul className="list-inside list-disc">
                        {orderShortages.map((s) => (
                          <li key={s.materialId}>
                            {s.materialName}: butuh {s.quantityNeeded.toLocaleString('id-ID')}, tersedia {s.quantityAvailable.toLocaleString('id-ID')}
                          </li>
                        ))}
                      </ul>
                      <Link to="/bahan" className="mt-1 inline-block font-semibold underline">
                        Restok di menu Bahan
                      </Link>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    {order.status === 'DRAFT' && <Button variant="outline" onClick={() => doValidate(order)}>Cek Stok</Button>}
                    <div className="flex items-end gap-2">
                      <Field label="Hasil jadi riil">
                        <TextInput
                          type="number"
                          min={1}
                          className="w-28"
                          placeholder={String(order.targetQuantity)}
                          value={yields[order.id] ?? ''}
                          onChange={(e) => setYields((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        />
                      </Field>
                      <Button onClick={() => doConfirm(order)}>Konfirmasi Selesai</Button>
                    </div>
                    <Button variant="danger" onClick={() => doCancel(order)}>Batal</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title="Riwayat">
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada produksi selesai.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 first:border-0 first:pt-0">
                <span>
                  {order.batchCode} — {productById.get(order.productId)?.name ?? order.productId} ({order.targetQuantity} target)
                </span>
                <span className="text-text-muted">
                  {order.status === 'COMPLETED'
                    ? `jadi ${order.actualYieldQuantity} · HPP ${formatRupiah(order.actualHppPerUnit ?? 0)} · ${formatDateLabel(order.createdAt)}`
                    : `dibatalkan · ${formatDateLabel(order.createdAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
