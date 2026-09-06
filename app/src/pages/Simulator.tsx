import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { SimulationSandboxService, type SimulationSnapshot } from '@/services/simulation'
import { SBSCoreEngine } from '@/domain/engine'
import type { ScenarioComparisonMatrix, SimulationInputParams, SimulationResultOutput, SimulationType } from '@/domain/types'
import { Badge, Button, Card, ErrorNote, Field, InsightBanner, MetricCard, Select, SuccessNote, TextInput } from '@/ui/components'
import { formatRupiah, marginTone } from '@/ui/format'

const simService = new SimulationSandboxService()

type Mode = 'JUMLAH_PRODUKSI' | 'HARGA_JUAL' | 'KENAIKAN_BAHAN' | 'TARGET_OMZET'

const modeLabels: Array<{ id: Mode; label: string }> = [
  { id: 'JUMLAH_PRODUKSI', label: 'Jumlah produksi' },
  { id: 'HARGA_JUAL', label: 'Ubah harga jual' },
  { id: 'KENAIKAN_BAHAN', label: 'Kenaikan harga bahan' },
  { id: 'TARGET_OMZET', label: 'Target omzet' },
]

interface Advanced {
  packagingCost: string
  directOverhead: string
  fixedCost: string
  targetProfit: string
}

export default function SimulatorPage() {
  const products = useLiveQuery(() => db.products.toArray(), [])

  const [productId, setProductId] = useState<string>('')
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null)
  const [mode, setMode] = useState<Mode>('JUMLAH_PRODUKSI')
  const [qty, setQty] = useState(100)
  const [price, setPrice] = useState(0)
  const [targetRevenue, setTargetRevenue] = useState('')
  const [materialOverrides, setMaterialOverrides] = useState<Record<string, string>>({})
  const [advanced, setAdvanced] = useState<Advanced>({ packagingCost: '', directOverhead: '', fixedCost: '', targetProfit: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scenarios, setScenarios] = useState<Array<{ id: string; scenarioName: string }>>([])
  const [comparison, setComparison] = useState<ScenarioComparisonMatrix | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)

  const parseNum = (value: string): number | undefined => {
    if (!value.trim()) return undefined
    const n = Number(value.replace(/[^\d-]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }

  const targetUnits = useMemo(() => {
    const target = parseNum(targetRevenue)
    if (mode === 'TARGET_OMZET' && target && price > 0) {
      return SBSCoreEngine.calculateTargetUnitsFromRevenue(target, price)
    }
    return qty
  }, [mode, targetRevenue, price, qty])

  const result: SimulationResultOutput | null = useMemo(() => {
    if (!snapshot || targetUnits <= 0 || price <= 0) return null
    const params: SimulationInputParams = {
      productId: snapshot.productId,
      productionQty: targetUnits,
      simulatedSellingPrice: price,
    }
    const overrides: Record<string, number> = {}
    for (const [id, value] of Object.entries(materialOverrides)) {
      const n = parseNum(value)
      if (n !== undefined) overrides[id] = n
    }
    if (Object.keys(overrides).length > 0) params.customMaterialCosts = overrides
    if (showAdvanced) {
      const packaging = parseNum(advanced.packagingCost)
      const overhead = parseNum(advanced.directOverhead)
      const fixed = parseNum(advanced.fixedCost)
      const profit = parseNum(advanced.targetProfit)
      if (packaging !== undefined) params.packagingCostOverride = packaging
      if (overhead !== undefined) params.directOverheadOverride = overhead
      if (fixed !== undefined && fixed > 0) params.allocatedFixedCost = fixed
      if (profit !== undefined && profit > 0) params.targetProfit = profit
    }
    return simService.runSimulation(snapshot, params)
  }, [snapshot, targetUnits, price, materialOverrides, advanced, showAdvanced])

  const recipeHpp = useMemo(() => {
    if (!snapshot) return 0
    return simService.runSimulation(snapshot, {
      productId: snapshot.productId,
      productionQty: 1,
      simulatedSellingPrice: snapshot.currentSellingPrice,
    }).hppPerUnit
  }, [snapshot])

  const baselineSameQty: SimulationResultOutput | null = useMemo(() => {
    if (!snapshot || targetUnits <= 0 || price <= 0) return null
    return simService.runSimulation(snapshot, {
      productId: snapshot.productId,
      productionQty: targetUnits,
      simulatedSellingPrice: price,
    })
  }, [snapshot, targetUnits, price])

  const marginAtCurrentPrice: SimulationResultOutput | null = useMemo(() => {
    if (!snapshot || targetUnits <= 0) return null
    return simService.runSimulation(snapshot, {
      productId: snapshot.productId,
      productionQty: targetUnits,
      simulatedSellingPrice: snapshot.currentSellingPrice,
    })
  }, [snapshot, targetUnits])

  const refreshScenarios = useCallback(async (id: string) => {
    if (!id) return
    const list = await simService.listScenarios(id)
    setScenarios(list.map((s) => ({ id: s.id, scenarioName: s.scenarioName })))
  }, [])

  const handleProductChange = (id: string) => {
    setProductId(id)
    if (!id) {
      setSnapshot(null)
      setComparison(null)
      setScenarios([])
    }
  }

  useEffect(() => {
    if (!productId) return
    let ignore = false

    void simService
      .loadSnapshot(productId)
      .then((snap) => {
        if (ignore) return
        setSnapshot(snap)
        setPrice(snap.currentSellingPrice)
        setMaterialOverrides({})
        setError(null)
        setNotice(null)
        setComparison(null)
      })
      .catch((e) => {
        if (ignore) return
        setError(e instanceof Error ? e.message : 'Gagal memuat produk.')
      })

    void simService
      .listScenarios(productId)
      .then((list) => {
        if (ignore) return
        setScenarios(list.map((s) => ({ id: s.id, scenarioName: s.scenarioName })))
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [productId])

  const saveScenario = async (name: string) => {
    if (!result || !productId) return
    const type: SimulationType = mode
    await simService.saveScenario({
      scenarioName: name,
      productId,
      simulationType: type,
      inputParameters: (() => {
        const overrides: Record<string, number> = {}
        for (const [id, value] of Object.entries(materialOverrides)) {
          const n = parseNum(value)
          if (n !== undefined) overrides[id] = n
        }
        return {
          productionQty: targetUnits,
          simulatedSellingPrice: price,
          customMaterialCosts: overrides,
          allocatedFixedCost: parseNum(advanced.fixedCost) ?? null,
        }
      })(),
      calculatedResults: result,
    })
    await refreshScenarios(productId)
    setNotice(`${name} tersimpan.`)
  }

  const runComparison = async () => {
    if (!snapshot || !productId) return
    setError(null)
    const list = await simService.listScenarios(productId)
    const a = [...list].reverse().find((s) => s.scenarioName === 'Skenario A')
    const b = [...list].reverse().find((s) => s.scenarioName === 'Skenario B')
    if (!a) {
      setError('Simpan Skenario A dulu untuk membandingkan.')
      return
    }
    const paramsA = a.inputParameters as SimulationInputParams
    const baseline = await simService.buildBaselineActual(productId, paramsA.productionQty)
    const resultA = simService.runSimulation(snapshot, paramsA)
    const resultB = b ? simService.runSimulation(snapshot, b.inputParameters as SimulationInputParams) : undefined
    setComparison(SBSCoreEngine.compareScenarios(baseline, resultA, resultB))
  }

  const copyToProduction = async () => {
    if (!result || !productId) return
    try {
      await simService.copySimulationToProductionDraft(productId, result.productionQty)
      setShowCopyDialog(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyalin rencana.')
    }
  }

  const hasOverrides = Object.keys(materialOverrides).length > 0
  const activeProducts = (products ?? []).filter((p) => p.isActive)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-text-title">Business Simulator</h2>
          <p className="text-sm text-text-muted">Uji keputusan sebelum eksekusi — pilih produk, masukkan angka, lihat dampaknya</p>
        </div>
        <Badge tone="primary">Mode Simulasi: stok & kas tidak terpengaruh</Badge>
      </div>

      <Card title="1. Pilih produk">
        <div className="space-y-3">
          <Field label="Produk">
            <Select value={productId} onChange={(e) => handleProductChange(e.target.value)}>
              <option value="">— pilih produk —</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          {snapshot && (
            <p className="text-sm text-text-muted">
              HPP resep {formatRupiah(recipeHpp)} · Harga jual normal {formatRupiah(snapshot.currentSellingPrice)}
            </p>
          )}
          <ErrorNote message={error} />
        </div>
      </Card>

      {snapshot && (
        <Card title="2. Pilih pertanyaan bisnis & masukkan angka">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modeLabels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                    mode === m.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-border-default text-text-muted hover:border-border-hover'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'JUMLAH_PRODUKSI' && (
              <div>
                <Field label={`Jumlah produksi: ${targetUnits} unit`}>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={Math.min(targetUnits, 500)}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </Field>
                <TextInput
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}

            {mode === 'HARGA_JUAL' && (
              <div className="space-y-2">
                <Field label="Harga jual simulasi">
                  <TextInput
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {[3000, 4000, 5000].map((p) => (
                    <Button key={p} variant="outline" onClick={() => setPrice(p)}>
                      {formatRupiah(p)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'KENAIKAN_BAHAN' && (
              <div className="space-y-2">
                <p className="text-sm text-text-muted">Ubah harga bahan tertentu (kosongkan untuk memakai harga saat ini)</p>
                {snapshot.materials.map((m) => (
                  <div key={m.materialId} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">
                      {m.name} — harga sekarang {formatRupiah(m.costPerUnit)}/{m.unit}
                    </span>
                    <TextInput
                      type="number"
                      min={0}
                      placeholder={`${m.costPerUnit}`}
                      className="w-32"
                      value={materialOverrides[m.materialId] ?? ''}
                      onChange={(e) =>
                        setMaterialOverrides((prev) => ({ ...prev, [m.materialId]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {mode === 'TARGET_OMZET' && (
              <Field label="Target omzet">
                <TextInput
                  type="number"
                  min={0}
                  placeholder="1000000"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                />
              </Field>
            )}

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm font-semibold text-primary-700 hover:underline"
            >
              {showAdvanced ? '− Tutup' : '+ Ubah biaya kemasan / overhead / biaya tetap'}
            </button>
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Biaya kemasan/unit">
                  <TextInput type="number" min={0} placeholder={`${snapshot.recipe.packagingCostPerUnit}`} value={advanced.packagingCost} onChange={(e) => setAdvanced((a) => ({ ...a, packagingCost: e.target.value }))} />
                </Field>
                <Field label="Overhead/unit">
                  <TextInput type="number" min={0} placeholder={`${snapshot.recipe.directOverheadPerUnit}`} value={advanced.directOverhead} onChange={(e) => setAdvanced((a) => ({ ...a, directOverhead: e.target.value }))} />
                </Field>
                <Field label="Biaya tetap (untuk titik impas)">
                  <TextInput type="number" min={0} placeholder="mis. 500000" value={advanced.fixedCost} onChange={(e) => setAdvanced((a) => ({ ...a, fixedCost: e.target.value }))} />
                </Field>
                <Field label="Target laba (opsional)">
                  <TextInput type="number" min={0} placeholder="500000" value={advanced.targetProfit} onChange={(e) => setAdvanced((a) => ({ ...a, targetProfit: e.target.value }))} />
                </Field>
              </div>
            )}

            {result && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Estimasi modal" value={formatRupiah(result.totalEstimatedCost)} hint={`untuk ${result.productionQty} unit`} />
                <MetricCard label="Potensi omzet" value={formatRupiah(result.potentialRevenue)} />
                <MetricCard label="Laba kotor" value={formatRupiah(result.potentialGrossProfit)} tone={result.potentialGrossProfit >= 0 ? 'primary' : 'danger'} />
                <MetricCard
                  label="Margin"
                  value={`${result.grossMarginPercentage.toFixed(1)}%`}
                  tone={marginTone(result.grossMarginPercentage)}
                />
              </div>
            )}

            {result && mode === 'HARGA_JUAL' && snapshot.currentSellingPrice !== price && marginAtCurrentPrice && (
              <p className="text-sm text-text-muted">
                Margin {result.grossMarginPercentage.toFixed(1)}% dengan {formatRupiah(price)} —{' '}
                {result.grossMarginPercentage > marginAtCurrentPrice.grossMarginPercentage ? 'lebih tinggi' : 'lebih rendah'} dibanding harga saat ini{' '}
                {formatRupiah(snapshot.currentSellingPrice)} ({marginAtCurrentPrice.grossMarginPercentage.toFixed(1)}%).
              </p>
            )}

            {result && mode === 'TARGET_OMZET' && result.productionQty > 0 && (
              <InsightBanner>
                Untuk mencapai omzet {formatRupiah(parseNum(targetRevenue) ?? 0)} dengan harga {formatRupiah(price)}/unit, diperlukan penjualan sekitar{' '}
                <strong>{result.productionQty.toLocaleString('id-ID')} unit</strong> dengan modal sekitar {formatRupiah(result.totalEstimatedCost)}.
              </InsightBanner>
            )}

            {result && mode === 'KENAIKAN_BAHAN' && hasOverrides && baselineSameQty && (
              <InsightBanner>
                HPP {formatRupiah(baselineSameQty.hppPerUnit)} → {formatRupiah(result.hppPerUnit)}; margin{' '}
                {baselineSameQty.grossMarginPercentage.toFixed(1)}% → {result.grossMarginPercentage.toFixed(1)}% (
                {(result.grossMarginPercentage - baselineSameQty.grossMarginPercentage).toFixed(1)} poin persentase).
              </InsightBanner>
            )}

            {result && advanced.targetProfit && result.targetUnitsFromProfit !== null && (
              <p className="text-sm text-text-muted">
                Untuk laba {formatRupiah(parseNum(advanced.targetProfit) ?? 0)} perlu jual sekitar {result.targetUnitsFromProfit} unit.
              </p>
            )}

            {result && result.breakEvenUnits !== null && (
              <MetricCard label="Titik impas (BEP)" value={`${result.breakEvenUnits} unit`} hint={`Omkzet minimal ${formatRupiah(result.breakEvenRevenue ?? 0)}`} tone="amber" />
            )}

            {result && (
              <InsightBanner>{result.humanInsightText}</InsightBanner>
            )}

            {result && mode === 'JUMLAH_PRODUKSI' && (
              <div>
                <p className="mb-1 text-sm font-semibold text-text-title">Kebutuhan bahan untuk {result.productionQty} unit</p>
                <ul className="space-y-1 text-sm text-text-body">
                  {result.materialRequirements.map((m) => (
                    <li key={m.materialId} className="flex justify-between">
                      <span>
                        {m.materialName} — {m.totalQuantityNeeded.toLocaleString('id-ID')} {m.unit}
                      </span>
                      <span className="text-text-muted">{formatRupiah(m.totalCost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveScenario('Skenario A')} disabled={!result}>
                Simpan Skenario A
              </Button>
              <Button variant="outline" onClick={() => saveScenario('Skenario B')} disabled={!result}>
                Simpan Skenario B
              </Button>
              <Button variant="outline" onClick={runComparison}>
                Bandingkan Skenario
              </Button>
              <Button variant="outline" onClick={copyToProduction} disabled={!result}>
                Salin ke Rencana Produksi
              </Button>
            </div>
            <SuccessNote message={notice} />

            {scenarios.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                Tersimpan:
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={async () => {
                      await simService.deleteScenario(s.id)
                      void refreshScenarios(productId)
                    }}
                    className="rounded-full bg-surface-card-subtle px-2 py-0.5 hover:bg-danger-50 hover:text-danger-600"
                  >
                    {s.scenarioName} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {comparison && (
        <Card title="Komparasi: kondisi aktual vs skenario">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted">
                  <th className="py-1 pr-4 font-medium">Indikator</th>
                  <th className="py-1 pr-4 font-medium">Kondisi Aktual</th>
                  <th className="py-1 pr-4 font-medium">Skenario A</th>
                  <th className="py-1 pr-4 font-medium">Skenario B</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Produksi', String(comparison.baselineActual.productionQty), String(comparison.scenarioA.productionQty), comparison.scenarioB ? String(comparison.scenarioB.productionQty) : '—'],
                  ['Harga jual', formatRupiah(comparison.baselineActual.sellingPricePerUnit), formatRupiah(comparison.scenarioA.sellingPricePerUnit), comparison.scenarioB ? formatRupiah(comparison.scenarioB.sellingPricePerUnit) : '—'],
                  ['Modal', formatRupiah(comparison.baselineActual.totalEstimatedCost), formatRupiah(comparison.scenarioA.totalEstimatedCost), comparison.scenarioB ? formatRupiah(comparison.scenarioB.totalEstimatedCost) : '—'],
                  ['Omzet', formatRupiah(comparison.baselineActual.potentialRevenue), formatRupiah(comparison.scenarioA.potentialRevenue), comparison.scenarioB ? formatRupiah(comparison.scenarioB.potentialRevenue) : '—'],
                  ['Laba kotor', formatRupiah(comparison.baselineActual.potentialGrossProfit), formatRupiah(comparison.scenarioA.potentialGrossProfit), comparison.scenarioB ? formatRupiah(comparison.scenarioB.potentialGrossProfit) : '—'],
                  ['Margin', `${comparison.baselineActual.grossMarginPercentage.toFixed(1)}%`, `${comparison.scenarioA.grossMarginPercentage.toFixed(1)}%`, comparison.scenarioB ? `${comparison.scenarioB.grossMarginPercentage.toFixed(1)}%` : '—'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-border-default">
                    <td className="py-1.5 pr-4 font-medium text-text-title">{row[0]}</td>
                    <td className="py-1.5 pr-4">{row[1]}</td>
                    <td className="py-1.5 pr-4">{row[2]}</td>
                    <td className="py-1.5 pr-4">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <InsightBanner>{comparison.summaryInsight}</InsightBanner>
          </div>
        </Card>
      )}

      {showCopyDialog && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface-card p-5 shadow-lg">
            <p className="font-bold text-text-title">Rencana produksi dibuat</p>
            <p className="mt-2 text-sm text-text-body">
              Draf produksi sudah ada di Dapur. Stok bahan belum dipotong — stok baru berkurang setelah Anda konfirmasi di sana.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
                Tetap di Simulator
              </Button>
              <Link to="/dapur">
                <Button>Buka Dapur</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
