import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { ActualOperationService } from '@/services/actual'
import { MasterDataService } from '@/services/master'
import { SBSCoreEngine } from '@/domain/engine'
import type { UnitType } from '@/domain/types'
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Select, SuccessNote, Tabs, TextInput } from '@/ui/components'
import { formatRupiah, todayISO, formatDateLabel } from '@/ui/format'

const master = new MasterDataService()
const actual = new ActualOperationService()

const UNITS: UnitType[] = ['kg', 'gram', 'liter', 'ml', 'butir', 'pcs', 'pack']

interface MaterialForm {
  id?: string
  code: string
  name: string
  unit: UnitType
  costPerUnit: string
  currentStock: string
  minStockAlert: string
}

const emptyMaterial: MaterialForm = {
  code: '',
  name: '',
  unit: 'kg',
  costPerUnit: '',
  currentStock: '',
  minStockAlert: '5',
}

interface RecipeRow {
  materialId: string
  quantity: string
}

function BahanTab() {
  const materials = useLiveQuery(() => db.rawMaterials.toArray(), [])
  const [form, setForm] = useState<MaterialForm>(emptyMaterial)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    try {
      await master.upsertMaterial({
        id: form.id,
        code: form.code,
        name: form.name,
        unit: form.unit,
        costPerUnit: Number(form.costPerUnit) || 0,
        currentStock: Number(form.currentStock) || 0,
        minStockAlert: Number(form.minStockAlert) || 0,
      })
      setForm(emptyMaterial)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan bahan.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title={form.id ? 'Edit bahan' : 'Tambah bahan baku'}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Nama">
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Telur Ayam" />
          </Field>
          <Field label="Kode">
            <TextInput value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MAT-TLR01" />
          </Field>
          <Field label="Satuan">
            <Select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as UnitType }))}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </Field>
          <Field label="Harga beli per satuan">
            <TextInput type="number" min={0} value={form.costPerUnit} onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))} />
          </Field>
          <Field label="Stok saat ini">
            <TextInput type="number" min={0} value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} />
          </Field>
          <Field label="Batas stok menipis">
            <TextInput type="number" min={0} value={form.minStockAlert} onChange={(e) => setForm((f) => ({ ...f, minStockAlert: e.target.value }))} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={submit}>{form.id ? 'Simpan' : 'Tambah'}</Button>
          {form.id && <Button variant="outline" onClick={() => setForm(emptyMaterial)}>Batal edit</Button>}
        </div>
        <ErrorNote message={error} />
      </Card>

      <Card title="Daftar bahan">
        {(materials ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada bahan.</p>
        ) : (
          <ul className="space-y-2">
            {(materials ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 text-sm first:border-0 first:pt-0">
                <span>
                  <strong className="text-text-title">{m.name}</strong> ({m.unit}) · HPP bahan {formatRupiah(m.costPerUnit)}
                  {m.currentStock <= m.minStockAlert && <Badge tone="danger">Stok menipis</Badge>}
                </span>
                <span className="flex items-center gap-2 text-text-muted">
                  stok {m.currentStock.toLocaleString('id-ID')} {m.unit} · min {m.minStockAlert}
                  <Button variant="ghost" className="px-2 py-1" onClick={() => setForm({
                    id: m.id,
                    code: m.code,
                    name: m.name,
                    unit: m.unit,
                    costPerUnit: String(m.costPerUnit),
                    currentStock: String(m.currentStock),
                    minStockAlert: String(m.minStockAlert),
                  })}>
                    Edit
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function SupplierTab() {
  const suppliers = useLiveQuery(() => db.suppliers.toArray(), [])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!name.trim()) return
    try {
      await master.upsertSupplier({ name, phone: phone || undefined })
      setName('')
      setPhone('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan supplier.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Tambah supplier">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nama">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Peternak Pak Dhe" />
          </Field>
          <Field label="Telepon (opsional)">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Button onClick={submit}>Tambah</Button>
        </div>
        <ErrorNote message={error} />
      </Card>
      <Card title="Daftar supplier">
        {(suppliers ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada supplier.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(suppliers ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between border-t border-border-default pt-2 first:border-0 first:pt-0">
                <span>
                  <span className="font-semibold text-text-title">{s.name}</span>
                  {s.phone && <span className="text-text-muted"> · {s.phone}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function PembelianTab() {
  const materials = useLiveQuery(() => db.rawMaterials.toArray(), [])
  const suppliers = useLiveQuery(() => db.suppliers.toArray(), [])
  const purchases = useLiveQuery(
    () =>
      db.purchases
        .toArray()
        .then((rows) => rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [],
  )

  const [date, setDate] = useState(todayISO())
  const [supplierId, setSupplierId] = useState('')
  const [rows, setRows] = useState<Array<{ materialId: string; quantity: string; unitCost: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0)

  const addRow = () => setRows((prev) => [...prev, { materialId: '', quantity: '', unitCost: '' }])

  const updateRow = (index: number, patch: Partial<(typeof rows)[number]>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const autofillCost = (index: number, materialId: string) => {
    const material = (materials ?? []).find((m) => m.id === materialId)
    updateRow(index, { materialId, unitCost: material ? String(material.costPerUnit) : '' })
  }

  const commit = async () => {
    setError(null)
    setNotice(null)
    const items = rows.map((r) => ({
      materialId: r.materialId,
      quantity: Number(r.quantity) || 0,
      unitCost: Number(r.unitCost) || 0,
    }))
    if (items.some((i) => !i.materialId || i.quantity <= 0)) {
      setError('Lengkapi bahan dan kuantitas.')
      return
    }
    try {
      await actual.commitPurchase({
        purchaseDate: date,
        supplierId: supplierId || undefined,
        items,
      })
      setRows([])
      setNotice('Pembelian tersimpan — stok bertambah dan harga beli terkini diperbarui.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pembelian gagal.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Catat pembelian / restok">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tanggal">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Supplier (opsional)">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— tanpa supplier —</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-text-body">Item</p>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_110px_auto] gap-2">
              <Select value={row.materialId} onChange={(e) => autofillCost(i, e.target.value)}>
                <option value="">— bahan —</option>
                {(materials ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </Select>
              <TextInput type="number" min={0} placeholder="Qty" value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} />
              <TextInput type="number" min={0} placeholder="Harga" value={row.unitCost} onChange={(e) => updateRow(i, { unitCost: e.target.value })} />
              <Button variant="danger" className="px-3" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>×</Button>
            </div>
          ))}
          <Button variant="outline" onClick={addRow}>+ Tambah item</Button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-title">Total: {formatRupiah(total)}</span>
          <Button onClick={commit} disabled={rows.length === 0}>Simpan Pembelian</Button>
        </div>
        <ErrorNote message={error} />
        <SuccessNote message={notice} />
      </Card>

      <Card title="Riwayat pembelian">
        {(purchases ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada pembelian.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(purchases ?? []).slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center justify-between border-t border-border-default pt-2 first:border-0 first:pt-0">
                <span>{formatDateLabel(p.createdAt)}{p.supplierNameSnapshot ? ` · ${p.supplierNameSnapshot}` : ''}</span>
                <span className="font-semibold">{formatRupiah(p.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ProdukResepTab() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const materials = useLiveQuery(() => db.rawMaterials.toArray(), [])

  const [selectedId, setSelectedId] = useState('')
  const selected = (products ?? []).find((p) => p.id === selectedId)

  const [productForm, setProductForm] = useState({ code: '', name: '', category: 'Makanan', sellingPrice: '' })
  const [productError, setProductError] = useState<string | null>(null)

  const [recipe, setRecipe] = useState<{ packaging: string; overhead: string; rows: RecipeRow[] }>({ packaging: '0', overhead: '0', rows: [] })
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeNotice, setRecipeNotice] = useState<string | null>(null)

  const loadRecipe = async (productId: string) => {
    setSelectedId(productId)
    setRecipeError(null)
    setRecipeNotice(null)
    if (!productId) return
    const data = await master.getRecipe(productId)
    setRecipe({
      packaging: String(data.packagingCost),
      overhead: String(data.directOverhead),
      rows: data.items.map((item) => ({ materialId: item.materialId, quantity: String(item.quantityRequired) })),
    })
  }

  const materialById = useMemo(() => new Map((materials ?? []).map((m) => [m.id, m])), [materials])

  const hppPreview = useMemo(() => {
    if (!selected) return 0
    const rows = recipe.rows
      .map((r) => ({ materialId: r.materialId, quantityRequired: Number(r.quantity) || 0 }))
      .filter((r) => r.materialId && r.quantityRequired > 0)
    if (rows.length === 0) return 0
    const spec = {
      productId: selected.id,
      productName: selected.name,
      items: rows,
      packagingCostPerUnit: Number(recipe.packaging) || 0,
      directOverheadPerUnit: Number(recipe.overhead) || 0,
      defaultSellingPrice: selected.sellingPrice,
    }
    const costMap = new Map<string, number>()
    for (const row of rows) {
      costMap.set(row.materialId, materialById.get(row.materialId)?.costPerUnit ?? 0)
    }
    return SBSCoreEngine.calculateHPP(spec, costMap).hppPerUnit
  }, [selected, recipe, materialById])

  const addProduct = async () => {
    setProductError(null)
    if (!productForm.name.trim() || !productForm.code.trim()) {
      setProductError('Nama dan kode produk wajib diisi.')
      return
    }
    try {
      const id = await master.upsertProduct({
        code: productForm.code,
        name: productForm.name,
        category: productForm.category,
        sellingPrice: Number(productForm.sellingPrice) || 0,
      })
      setProductForm({ code: '', name: '', category: 'Makanan', sellingPrice: '' })
      await loadRecipe(id)
    } catch (e) {
      setProductError(e instanceof Error ? e.message : 'Gagal menyimpan produk.')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await master.setProductActive(id, isActive)
  }

  const saveRecipe = async () => {
    setRecipeError(null)
    setRecipeNotice(null)
    if (!selected) return
    try {
      await master.saveRecipe(selected.id, {
        packagingCost: Number(recipe.packaging) || 0,
        directOverhead: Number(recipe.overhead) || 0,
        items: recipe.rows.map((r) => ({ materialId: r.materialId, quantityRequired: Number(r.quantity) || 0 })),
      })
      setRecipeNotice('Resep tersimpan — HPP produk diperbarui.')
    } catch (e) {
      setRecipeError(e instanceof Error ? e.message : 'Gagal menyimpan resep.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Tambah produk">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Kode">
            <TextInput value={productForm.code} onChange={(e) => setProductForm((f) => ({ ...f, code: e.target.value }))} placeholder="PRD-PUD03" />
          </Field>
          <Field label="Nama">
            <TextInput value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} placeholder="Puding Stroberi Cup" />
          </Field>
          <Field label="Kategori">
            <Select value={productForm.category} onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}>
              <option>Makanan</option>
              <option>Minuman</option>
              <option>Bahan Baku Ecer</option>
            </Select>
          </Field>
          <Field label="Harga jual">
            <TextInput type="number" min={0} value={productForm.sellingPrice} onChange={(e) => setProductForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
          </Field>
        </div>
        <div className="mt-3">
          <Button onClick={addProduct}>Tambah Produk</Button>
        </div>
        <ErrorNote message={productError} />
      </Card>

      <Card title="Produk & resep">
        {(products ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada produk.</p>
        ) : (
          <div className="space-y-3">
            {(products ?? []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 text-sm first:border-0 first:pt-0">
                <span>
                  <strong className="text-text-title">{p.name}</strong> — {formatRupiah(p.sellingPrice)} · HPP {formatRupiah(p.currentHpp)} · stok {p.currentStock}
                  {!p.isActive && <Badge tone="neutral">Nonaktif</Badge>}
                </span>
                <span className="flex gap-2">
                  <Button variant="outline" className="px-3 py-1" onClick={() => loadRecipe(p.id)}>Resep</Button>
                  <Button variant="ghost" className="px-3 py-1" onClick={() => toggleActive(p.id, !p.isActive)}>
                    {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <Card title={`Resep: ${selected.name}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Biaya kemasan per unit">
                <TextInput type="number" min={0} value={recipe.packaging} onChange={(e) => setRecipe((r) => ({ ...r, packaging: e.target.value }))} />
              </Field>
              <Field label="Overhead langsung per unit">
                <TextInput type="number" min={0} value={recipe.overhead} onChange={(e) => setRecipe((r) => ({ ...r, overhead: e.target.value }))} />
              </Field>
            </div>

            <p className="text-sm font-medium text-text-body">Komposisi bahan per 1 unit</p>
            {recipe.rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2">
                <Select
                  value={row.materialId}
                  onChange={(e) => setRecipe((r) => ({ ...r, rows: r.rows.map((row2, i2) => (i2 === i ? { ...row2, materialId: e.target.value } : row2)) }))}
                >
                  <option value="">— bahan —</option>
                  {(materials ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </Select>
                <TextInput
                  type="number"
                  min={0}
                  step="0.0001"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => setRecipe((r) => ({ ...r, rows: r.rows.map((row2, i2) => (i2 === i ? { ...row2, quantity: e.target.value } : row2)) }))}
                />
                <Button variant="danger" className="px-3" onClick={() => setRecipe((r) => ({ ...r, rows: r.rows.filter((_, idx) => idx !== i) }))}>×</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setRecipe((r) => ({ ...r, rows: [...r.rows, { materialId: '', quantity: '' }] }))}>
              + Tambah bahan
            </Button>

            <p className="text-sm">
              HPP per unit: <strong className="text-primary-700">{formatRupiah(hppPreview)}</strong>
            </p>
            <Button onClick={saveRecipe}>Simpan Resep</Button>
            <ErrorNote message={recipeError} />
            <SuccessNote message={recipeNotice} />
          </div>
        </Card>
      )}

      {(products ?? []).length === 0 && (materials ?? []).length === 0 && (
        <EmptyState title="Mulai dari bahan baku" description="Tambahkan bahan terlebih dulu sebelum membuat resep." />
      )}
    </div>
  )
}

const tabs = [
  { id: 'bahan', label: 'Bahan' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'pembelian', label: 'Pembelian' },
  { id: 'produk', label: 'Produk & Resep' },
]

export default function BahanPage() {
  const [active, setActive] = useState('bahan')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text-title">Bahan, Supplier & Pembelian</h2>
        <p className="text-sm text-text-muted">Data master bisnis — pembelian menambah stok, bukan biaya operasional</p>
      </div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      {active === 'bahan' && <BahanTab />}
      {active === 'supplier' && <SupplierTab />}
      {active === 'pembelian' && <PembelianTab />}
      {active === 'produk' && <ProdukResepTab />}
    </div>
  )
}
