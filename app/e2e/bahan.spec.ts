import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('tambah bahan muncul di daftar', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/bahan')

  await page.getByLabel('Nama').fill('Gula Aren')
  await page.getByLabel('Kode').fill('MAT-GLA02')
  const formCard = page.locator('section', { hasText: 'Tambah bahan baku' })
  await formCard.getByRole('combobox').selectOption('kg')
  await page.getByLabel('Harga beli per satuan').fill('25000')
  await page.getByLabel('Stok saat ini').fill('10')
  await page.getByLabel('Batas stok menipis').fill('5')
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()

  await expect(page.getByText('Gula Aren')).toBeVisible()
})

test('tambah supplier muncul di daftar', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/bahan')
  await page.getByRole('button', { name: 'Supplier', exact: true }).click()

  await page.getByLabel('Nama').fill('Toko Sembako')
  await page.getByLabel('Telepon (opsional)').fill('0811')
  await page.getByRole('button', { name: 'Tambah', exact: true }).click()

  await expect(page.getByText('Toko Sembako')).toBeVisible()
})

test('catat pembelian menambah stok dan harga terakhir', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/bahan')
  await page.getByRole('button', { name: 'Pembelian', exact: true }).click()

  await page.getByRole('button', { name: '+ Tambah item' }).click()
  const row = page.locator('div.grid.grid-cols-\\[1fr_90px_110px_auto\\]').first()
  await row.getByRole('combobox').selectOption({ label: 'Telur Ayam (butir)' })
  await row.getByPlaceholder('Qty').fill('50')
  await expect(row.getByPlaceholder('Harga')).toHaveValue('2000')
  await expect(page.getByText('Total: Rp100.000')).toBeVisible()

  await page.getByRole('button', { name: 'Simpan Pembelian' }).click()
  await expect(page.getByText('Pembelian tersimpan')).toBeVisible()

  await page.getByRole('button', { name: 'Bahan', exact: true }).click()
  await expect(page.getByText(/stok 110 butir/)).toBeVisible()
})
