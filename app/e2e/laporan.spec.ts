import { expect, test } from '@playwright/test'
import { seedDemo } from './helpers'

test('catat biaya operasional memperbarui laba bersih', async ({ page }) => {
  await seedDemo(page)
  await page.goto('/#/laporan')

  await expect(page.getByText('Rp0', { exact: true }).first()).toBeVisible()

  await page.getByLabel('Nilai (Rp)').fill('150000')
  await page.getByLabel('Keterangan').fill('Token listrik')
  await page.getByRole('button', { name: 'Catat Biaya' }).click()

  await expect(page.getByText('Token listrik')).toBeVisible()
  await expect(page.getByText('Rp150.000').first()).toBeVisible()
  await expect(page.getByText('Rp-150.000').first()).toBeVisible()

  await page.getByRole('button', { name: '7 hari', exact: true }).click()
  await expect(page.getByText('Token listrik')).toBeVisible()
})
