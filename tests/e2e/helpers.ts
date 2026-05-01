import { expect, Page } from '@playwright/test'

export async function disableLocationCheck(page: Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Off', exact: true }).first().click()
}

export async function createCheckIn(page: Page, note: string) {
  await page.goto('/check-in')
  await page.getByLabel('Note optional').fill(note)
  await page.getByRole('button', { name: 'Check in' }).click()
  await expect(page.getByText('Stamp collected!')).toBeVisible()
}
