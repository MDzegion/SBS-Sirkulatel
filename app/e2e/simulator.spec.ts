import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test.beforeEach(async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/simulator')
  await page.getByLabel('Produk').selectOption({ label: 'Puding Coklat Cup' })
  await expect(page.getByText(/HPP resep Rp2\.100/)).toBeVisible()
})

test('UC2 jumlah produksi 100 cup menampilkan angka kanonis', async ({ page }) => {
  await expect(page.getByText('Rp210.000').first()).toBeVisible()
  await expect(page.getByText('Rp500.000').first()).toBeVisible()
  await expect(page.getByText('Rp290.000').first()).toBeVisible()
  await expect(page.getByText('58.0%').first()).toBeVisible()
  await expect(page.getByText(/Telur Ayam.*50 butir/)).toBeVisible()
})

test('UC1 ubah harga jual memperbarui margin', async ({ page }) => {
  await page.getByRole('button', { name: 'Ubah harga jual' }).click()
  await page.getByLabel('Harga jual simulasi').fill('4000')

  await expect(page.getByText('47.5%').first()).toBeVisible()
  await expect(page.getByText(/lebih rendah dibanding harga saat ini/)).toBeVisible()
})

test('UC3 kenaikan harga telur menurunkan margin', async ({ page }) => {
  await page.getByRole('button', { name: 'Kenaikan harga bahan' }).click()
  await page.getByPlaceholder('2000').fill('2500')

  await expect(page.getByText(/Rp2\.100 → Rp2\.350/)).toBeVisible()
  await expect(page.getByText(/58\.0% → 53\.0%/)).toBeVisible()
})

test('UC4 target omzet menghitung kebutuhan unit', async ({ page }) => {
  await page.getByRole('button', { name: 'Target omzet' }).click()
  await page.getByLabel('Target omzet').fill('1000000')

  await expect(page.getByText(/sekitar 200 unit/)).toBeVisible()
})

test('simpan A dan B lalu bandingkan menampilkan matriks', async ({ page }) => {
  await page.getByRole('button', { name: 'Simpan Skenario A' }).click()
  await expect(page.getByText('Skenario A tersimpan.')).toBeVisible()

  await page.getByRole('button', { name: 'Ubah harga jual' }).click()
  await page.getByLabel('Harga jual simulasi').fill('4500')
  await page.getByRole('button', { name: 'Simpan Skenario B' }).click()
  await expect(page.getByText('Skenario B tersimpan.')).toBeVisible()

  await page.getByRole('button', { name: 'Bandingkan Skenario' }).click()
  await expect(page.getByRole('columnheader', { name: 'Kondisi Aktual' })).toBeVisible()
  await expect(page.getByText('Rp450.000').first()).toBeVisible()
})
