import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { ActualOperationService } from '@/services/actual'
import { Badge, Button, Card, ErrorNote, MetricCard } from '@/ui/components'
import { formatRupiah } from '@/ui/format'

const actualService = new ActualOperationService()

interface CartLine {
  productId: string
  name: string
  price: number
  quantity: number
}

export default function KasirPage() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const activeProducts = (products ?? []).filter((p) => p.isActive)

  const [cart, setCart] = useState<Record<string, number>>({})
  const [payment, setPayment] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI')
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<{ invoiceNumber: string; total: number; profit: number } | null>(null)

  const productById = new Map(activeProducts.map((p) => [p.id, p]))

  const lines: CartLine[] = Object.entries(cart)
    .map(([id, quantity]) => {
      const product = productById.get(id)
      return product ? { productId: id, name: product.name, price: product.sellingPrice, quantity } : null
    })
    .filter((l): l is CartLine => l !== null)

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  const addToCart = (productId: string) => {
    setError(null)
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))
  }

  const incQty = (line: CartLine) => {
    const product = productById.get(line.productId)
    if (!product) return
    if ((cart[line.productId] ?? 0) >= product.currentStock) return
    setCart((prev) => ({ ...prev, [line.productId]: (prev[line.productId] ?? 0) + 1 }))
  }

  const decQty = (productId: string) => {
    setCart((prev) => {
      const next = (prev[productId] ?? 0) - 1
      if (next <= 0) {
        const { [productId]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: next }
    })
  }

  const checkout = async () => {
    setError(null)
    if (lines.length === 0) return
    try {
      const txId = await actualService.checkoutSale(
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        payment,
      )
      const sale = await db.saleTransactions.get(txId)
      setReceipt({ invoiceNumber: sale?.invoiceNumber ?? '', total: sale?.totalAmount ?? 0, profit: sale?.grossProfit ?? 0 })
      setCart({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaksi gagal.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-title">Kasir</h2>
        <p className="text-sm text-text-muted">Pilih produk, stok dipotong otomatis setelah bayar</p>
      </div>

      {receipt && (
        <Card title="Transaksi sukses">
          <div className="space-y-3">
            <p className="text-sm text-text-body">
              Nota <strong>{receipt.invoiceNumber}</strong> — total {formatRupiah(receipt.total)} (laba kotor {formatRupiah(receipt.profit)})
            </p>
            <Button onClick={() => setReceipt(null)}>Transaksi Baru</Button>
          </div>
        </Card>
      )}

      {!receipt && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Produk">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activeProducts.length === 0 && <p className="col-span-full text-sm text-text-muted">Belum ada produk aktif.</p>}
              {activeProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  disabled={p.currentStock <= 0}
                  className="rounded-lg border border-border-default bg-white p-3 text-left shadow-sm transition hover:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm font-semibold text-text-title">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-primary-700">{formatRupiah(p.sellingPrice)}</p>
                  <p className="mt-0.5 text-xs text-text-muted">stok {p.currentStock}</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card title="Keranjang">
              {lines.length === 0 ? (
                <p className="text-sm text-text-muted">Belum ada item. Ketuk produk untuk menambah.</p>
              ) : (
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li key={l.productId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1">
                        {l.name}
                        <span className="ml-1 text-text-muted">×{l.quantity}</span>
                      </span>
                      <span className="font-semibold">{formatRupiah(l.price * l.quantity)}</span>
                      <span className="flex gap-1">
                        <Button variant="outline" className="px-2 py-1" onClick={() => incQty(l)}>
                          +
                        </Button>
                        <Button variant="outline" className="px-2 py-1" onClick={() => decQty(l.productId)}>
                          −
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Pembayaran">
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['TUNAI', 'QRIS', 'TRANSFER'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPayment(method)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        payment === method ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border-default text-text-muted'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                <MetricCard label="Total tagihan" value={formatRupiah(total)} />
                <Button className="w-full" onClick={checkout} disabled={lines.length === 0}>
                  Bayar
                </Button>
                {lines.some((l) => (productById.get(l.productId)?.currentStock ?? 0) < l.quantity) && (
                  <Badge tone="danger">Stok berubah — periksa keranjang</Badge>
                )}
                <ErrorNote message={error} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
