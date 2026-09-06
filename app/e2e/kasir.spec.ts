import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('produksi manual lalu jual di kasir mencatat nota dan mengurangi stok', async ({ page }) => {
  await seedDemo(page)

  await page.goto('/#/dapur')
  await page.getByLabel('Produk').selectOption({ label: 'Puding Coklat Cup' })
  await page.getByLabel('Jumlah target').fill('10')
  await page.getByRole('button', { name: 'Buat Draf' }).click()
  await page.getByRole('button', { name: 'Cek Stok' }).click()
  await expect(page.getByText(/tervalidasi/)).toBeVisible()
  await page.getByLabel('Hasil jadi riil').fill('10')
  await page.getByRole('button', { name: 'Konfirmasi Selesai' }).click()
  await expect(page.getByText(/jadi 10 · HPP Rp2\.100/)).toBeVisible()

  await page.goto('/#/kasir')
  const productCard = page.getByRole('button', { name: /Puding Coklat Cup/ })
  await productCard.click()
  await productCard.click()

  await expect(page.getByText('Rp10.000').first()).toBeVisible()
  await page.getByRole('button', { name: 'QRIS', exact: true }).click()
  await page.getByRole('button', { name: 'Bayar' }).click()

  await expect(page.getByText(/Nota INV-/)).toBeVisible()
  await expect(page.getByText(/laba kotor Rp5\.800/)).toBeVisible()

  await page.getByRole('button', { name: 'Transaksi Baru' }).click()
  await expect(page.getByText(/stok 8/)).toBeVisible()
})
