import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('empty state lalu seed demo menampilkan ringkasan', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Selamat datang di SBS Sirkulatel')).toBeVisible()

  await page.getByRole('button', { name: 'Isi Data Contoh' }).click()

  await expect(page.getByText('Puding Coklat Cup')).toBeVisible()
  await expect(page.getByText('Puding Karamel Cup')).toBeVisible()
  await expect(page.getByText('Semua stok bahan aman.')).toBeVisible()
  await expect(page.getByText('Omzet hari ini')).toBeVisible()
})

test('seed demo hanya dari kondisi kosong', async ({ page }) => {
  await seedDemo(page)
  await expect(page.getByRole('button', { name: 'Isi Data Contoh' })).toHaveCount(0)
})
