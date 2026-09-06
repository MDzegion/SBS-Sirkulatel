import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('tambah produk lalu susun resep menampilkan HPP live', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/bahan')
  await page.getByRole('button', { name: 'Produk & Resep', exact: true }).click()

  await page.getByLabel('Kode').fill('PRD-PUD03')
  await page.getByLabel('Nama').fill('Puding Stroberi Cup')
  await page.getByLabel('Harga jual').fill('6000')
  await page.getByRole('button', { name: 'Tambah Produk' }).click()

  await expect(page.getByText('Resep: Puding Stroberi Cup')).toBeVisible()

  await page.getByRole('button', { name: '+ Tambah bahan' }).click()
  const recipeCard = page.locator('section', { hasText: 'Resep: Puding Stroberi Cup' }).last()
  await recipeCard.getByRole('combobox').selectOption({ label: 'Telur Ayam (butir)' })
  await recipeCard.getByPlaceholder('Qty').fill('1')

  await expect(recipeCard.getByText('Rp2.000', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Simpan Resep' }).click()
  await expect(page.getByText('Resep tersimpan')).toBeVisible()
  await expect(page.getByText(/HPP Rp2\.000/)).toBeVisible()
})
