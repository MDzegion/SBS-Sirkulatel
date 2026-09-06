import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('salin simulator ke dapur lalu konfirmasi memotong stok', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/simulator')
  await page.getByLabel('Produk').selectOption({ label: 'Puding Coklat Cup' })
  await expect(page.getByText(/HPP resep Rp2\.100/)).toBeVisible()
  await page.getByRole('spinbutton').fill('50')

  await page.getByRole('button', { name: 'Salin ke Rencana Produksi' }).click()
  await expect(page.getByText('Rencana produksi dibuat')).toBeVisible()
  await page.getByRole('button', { name: 'Buka Dapur' }).click()

  await expect(page.getByText('Dari Simulator')).toBeVisible()
  await page.getByRole('button', { name: 'Cek Stok' }).click()
  await expect(page.getByText(/tervalidasi/)).toBeVisible()

  await page.getByLabel('Hasil jadi riil').fill('49')
  await page.getByRole('button', { name: 'Konfirmasi Selesai' }).click()
  await expect(page.getByText(/selesai — stok barang jadi bertambah/)).toBeVisible()
  await expect(page.getByText(/jadi 49 · HPP Rp2\.143/)).toBeVisible()

  await page.goto('/#/bahan')
  await expect(page.getByText(/stok 35 butir/)).toBeVisible()

  await page.goto('/')
  await expect(page.getByText(/Gula Pasir.*sisa 0,3 kg/)).toBeVisible()
})
