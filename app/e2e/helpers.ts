import { expect, type Page } from '@playwright/test'

export async function seedDemo(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Isi Data Contoh' }).click()
  await expect(page.getByText('Puding Coklat Cup').first()).toBeVisible()
}
