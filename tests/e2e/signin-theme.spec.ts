import { test, expect } from '@playwright/test'
import { createCheckIn, disableLocationCheck } from './helpers'

test('anonymous progress shows sign-in CTA and login screen', async ({ page }) => {
  await disableLocationCheck(page)
  await createCheckIn(page, 'CTA flow note')

  await page.goto('/')
  await expect(page.getByText('Save your progress — access your passport on any device')).toBeVisible()
  await page.getByRole('link', { name: 'Sign in →' }).first().click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})

test('theme toggle persists across reload', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
