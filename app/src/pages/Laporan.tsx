import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { ActualOperationService } from '@/services/actual'
import { Button, Card, ErrorNote, Field, MetricCard, Select, TextInput } from '@/ui/components'
import { formatRupiah, localDateKey, formatDateLabel, todayISO } from '@/ui/format'

const actualService = new ActualOperationService()

const PERIODS = [
  { id: 'today', label: 'Hari ini', days: 1 },
  { id: 'week', label: '7 hari', days: 7 },
  { id: 'month', label: '30 hari', days: 30 },
] as const

const CATEGORIES = ['Sewa', 'Gaji', 'Listrik/Air', 'Pemasaran', 'Transportasi', 'Lainnya']

export default function LaporanPage() {
  const sales = useLiveQuery(() => db.saleTransactions.toArray(), [])
  const expenses = useLiveQuery(() => db.operationalExpenses.toArray(), [])

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [form, setForm] = useState({ expenseDate: todayISO(), category: 'Listrik/Air', amount: '', description: '' })
  const [error, setError] = useState<string | null>(null)

  const startKey = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)?.days ?? 1
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    return localDateKey(start)
  }, [period])

  const periodSales = (sales ?? []).filter((s) => s.transactionTime >= startKey)
  const omzet = periodSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const profit = periodSales.reduce((sum, s) => sum + s.grossProfit, 0)
  const periodExpenses = (expenses ?? []).filter((e) => e.expenseDate >= startKey)
  const opexTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = profit - opexTotal

  const addExpense = async () => {
    setError(null)
    const amount = Number(form.amount) || 0
    if (amount <= 0) {
      setError('Nilai biaya harus lebih dari 0.')
      return
    }
    try {
      await actualService.addOperationalExpense({
        expenseDate: form.expenseDate,
        category: form.category,
        amount,
        description: form.description || form.category,
      })
      setForm((f) => ({ ...f, amount: '', description: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mencatat biaya.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-title">Pengeluaran & Laporan</h2>
        <p className="text-sm text-text-muted">Ringkasan omzet, laba kotor, dan biaya operasional</p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              period === p.id ? 'bg-primary-600 text-white' : 'bg-surface-card text-text-muted hover:bg-surface-card-subtle'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Omzet" value={formatRupiah(omzet)} tone="primary" />
        <MetricCard label="Laba kotor" value={formatRupiah(profit)} tone={profit >= 0 ? 'primary' : 'danger'} />
        <MetricCard label="Pengeluaran operasional" value={formatRupiah(opexTotal)} tone="amber" />
        <MetricCard label="Estimasi laba bersih" value={formatRupiah(netProfit)} tone={netProfit >= 0 ? 'primary' : 'danger'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Catat biaya operasional">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tanggal">
                <TextInput type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
              </Field>
              <Field label="Kategori">
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Nilai (Rp)">
              <TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Keterangan">
              <TextInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Token listrik bulanan" />
            </Field>
            <Button onClick={addExpense}>Catat Biaya</Button>
            <ErrorNote message={error} />

            <ul className="space-y-2 text-sm">
              {periodExpenses.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between border-t border-border-default pt-2 first:border-0 first:pt-0">
                  <span>
                    {formatDateLabel(e.expenseDate)} · {e.category}
                    <span className="text-text-muted"> — {e.description}</span>
                  </span>
                  <span className="font-semibold">{formatRupiah(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Transaksi terakhir">
          {periodSales.length === 0 ? (
            <p className="text-sm text-text-muted">Belum ada transaksi pada periode ini.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {periodSales.slice(0, 12).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 first:border-0 first:pt-0">
                  <span>
                    {s.invoiceNumber}
                    <span className="ml-1 text-text-muted">· {s.paymentMethod} · {formatDateLabel(s.transactionTime)}</span>
                  </span>
                  <span>
                    <span className="font-semibold">{formatRupiah(s.totalAmount)}</span>
                    <span className="ml-2 text-text-muted">laba {formatRupiah(s.grossProfit)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
