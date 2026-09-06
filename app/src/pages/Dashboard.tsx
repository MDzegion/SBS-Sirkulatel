import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { seedDemoData } from '@/services/demo'
import { Button, Card, EmptyState, MetricCard } from '@/ui/components'
import { formatRupiah, localDateKey } from '@/ui/format'

export default function DashboardPage() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const materials = useLiveQuery(() => db.rawMaterials.toArray(), [])
  const sales = useLiveQuery(() => db.saleTransactions.toArray(), [])

  const todayKey = localDateKey(new Date())
  const todaySales = (sales ?? []).filter((s) => s.transactionTime.startsWith(todayKey))
  const omzetToday = todaySales.reduce((sum, s) => sum + s.totalAmount, 0)
  const profitToday = todaySales.reduce((sum, s) => sum + s.grossProfit, 0)

  const lowStock = (materials ?? []).filter((m) => m.currentStock <= m.minStockAlert)
  const hasData = (products ?? []).length > 0

  if (products !== undefined && !hasData) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-title">Selamat datang di SBS Sirkulatel</h2>
        <EmptyState
          title="Mulai dari data bisnis Anda"
          description="Isi bahan baku, resep, dan produk secara manual, atau pakai data contoh untuk melihat semua fitur berjalan."
          action={
            <Button onClick={() => seedDemoData(db)}>Isi Data Contoh</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Omzet hari ini" value={formatRupiah(omzetToday)} tone="primary" />
        <MetricCard label="Laba kotor hari ini" value={formatRupiah(profitToday)} tone="primary" />
        <MetricCard label="Transaksi hari ini" value={String(todaySales.length)} />
      </div>

      <Link
        to="/simulator"
        className="block rounded-lg border border-accent-500 bg-accent-50 p-4 shadow-sm transition hover:bg-accent-50/70"
      >
        <p className="text-sm font-bold text-accent-600">Business Simulator</p>
        <p className="mt-1 text-sm text-text-body">
          Uji harga jual, jumlah produksi, kenaikan harga bahan, dan target omzet — tanpa merusak data aktual.
        </p>
      </Link>

      <Card title="Stok bahan menipis">
        {lowStock.length === 0 ? (
          <p className="text-sm text-text-muted">Semua stok bahan aman.</p>
        ) : (
          <ul className="space-y-2">
            {lowStock.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  {m.name} — sisa {m.currentStock.toLocaleString('id-ID')} {m.unit}
                </span>
                <Link to="/bahan" className="font-semibold text-primary-700 hover:underline">
                  Restok
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Barang jadi siap jual">
        {(products ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada produk. Tambahkan di menu Bahan.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(products ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-text-muted">
                  {p.currentStock} stok · {formatRupiah(p.sellingPrice)} · HPP {formatRupiah(p.currentHpp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
