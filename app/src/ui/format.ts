export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`
}

export function formatQty(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(3))
  return `${rounded.toLocaleString('id-ID')} ${unit}`
}

export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function marginTone(marginPct: number): 'primary' | 'amber' | 'danger' {
  if (marginPct >= 50) return 'primary'
  if (marginPct >= 20) return 'amber'
  return 'danger'
}
