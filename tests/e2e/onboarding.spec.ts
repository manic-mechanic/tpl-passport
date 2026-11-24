import { test, expect } from '@playwright/test'
import { disableLocationCheck, setOnboardingArms } from './helpers'

test('a first visit leads with check-in, then the passport, then the regular Home', async ({ page }) => {
  await setOnboardingArms(page, { onb_sheet: 'none', onb_home_order: 'checkin_first' })
  await disableLocationCheck(page)
  await page.goto('/')

  // No empty passport card, no recent visits: the two first steps
  await expect(page.getByRole('heading', { name: 'Visiting the library?' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Make your passport/ })).toBeVisible()
  await expect(page.locator('.passport-card')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Recent visits' })).toHaveCount(0)

  // Check in from Home: the check-in page finds the nearest branch itself
  await page.getByRole('link', { name: 'Check in now' }).click()
  await page.getByRole('button', { name: 'Stamp my passport' }).click()
  await expect(page.getByRole('heading', { name: 'First stamp!' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Home' }).click()

  // One step done: the passport card is back, and the other step has its panel
  await expect(page.locator('.passport-card')).toBeVisible()
  await page.getByRole('link', { name: /Make your passport/ }).click()
  await page.getByLabel('Name').fill('Avery')
  await page.getByRole('button', { name: 'Save' }).click()

  // Signed out: offered an account
  await expect(page.getByRole('heading', { name: 'Save your progress' })).toBeVisible()
  await page.getByRole('link', { name: 'Not now' }).click()

  // Both done: the regular Home
  await expect(page.locator('.passport-card')).toBeVisible()
  await expect(page.getByRole('link', { name: /Make your passport/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Recent visits' })).toBeVisible()
})

test('the other arm puts the passport on top, and making it brings back the passport card', async ({ page }) => {
  await setOnboardingArms(page, { onb_sheet: 'none', onb_home_order: 'passport_first' })
  await page.goto('/')

  const panels = page.locator('.first-steps > *')
  await expect(panels.first()).toHaveClass(/first-step--checkin/)
  await expect(page.getByRole('heading', { name: 'Make your passport' })).toBeVisible()
  // Visually first, by CSS order
  const passportBox = await page.getByRole('heading', { name: 'Make your passport' }).boundingBox()
  const checkinBox = await page.getByRole('link', { name: /Check in now/ }).boundingBox()
  expect(passportBox!.y).toBeLessThan(checkinBox!.y)

  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await page.getByLabel('Name').fill('Sam')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Not now' }).click()

  await expect(page.locator('.passport-card')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visiting the library?' })).toBeVisible()
})

test('the welcome sheet arm shows the sheet once', async ({ page }) => {
  await setOnboardingArms(page, { onb_sheet: 'sheet', onb_home_order: 'checkin_first' })
  await page.goto('/')
  const sheet = page.getByRole('dialog', { name: 'Welcome' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toHaveCount(0)

  await page.reload()
  await page.waitForTimeout(1500)
  await expect(page.getByRole('dialog', { name: 'Welcome' })).toHaveCount(0)
})
