import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('simulasi dan simpan skenario tidak mengubah data aktual', async ({ page }) => {
  await seedDemo(page)

  await page.goto('/#/simulator')
  await page.getByLabel('Produk').selectOption({ label: 'Puding Coklat Cup' })
  await expect(page.getByText(/HPP resep Rp2\.100/)).toBeVisible()

  await page.getByRole('button', { name: 'Ubah harga jual' }).click()
  await page.getByLabel('Harga jual simulasi').fill('9000')

  await page.getByRole('button', { name: 'Kenaikan harga bahan' }).click()
  await page.getByPlaceholder('2000').fill('5000')

  await page.getByRole('button', { name: 'Simpan Skenario A' }).click()
  await expect(page.getByText('Skenario A tersimpan.')).toBeVisible()
  await page.getByRole('button', { name: 'Bandingkan Skenario' }).click()
  await expect(page.getByRole('columnheader', { name: 'Kondisi Aktual' })).toBeVisible()

  await page.goto('/#/bahan')
  await expect(page.getByText(/stok 60 butir/)).toBeVisible()
  await expect(page.getByText(/HPP bahan Rp2\.000/)).toBeVisible()

  await page.goto('/#/dapur')
  await expect(page.getByText('Belum ada draf produksi')).toBeVisible()

  await page.goto('/#/kasir')
  await expect(page.getByRole('button', { name: /Puding Coklat Cup/ })).toBeDisabled()

  await page.goto('/')
  await expect(page.getByText('Rp0', { exact: true }).first()).toBeVisible()
})
