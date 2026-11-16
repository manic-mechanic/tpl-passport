import { test, expect } from '@playwright/test'

test('visitors from the event see the welcome sheet once, and the ref is dropped from the URL', async ({ page }) => {
  await page.goto('/?ref=yourlibrarytour')
  await expect(page.getByRole('heading', { name: 'Welcome, Library Tour traveller' })).toBeVisible()
  await expect(page).not.toHaveURL(/ref=/)

  await page.getByRole('link', { name: 'See the 10 routes' }).click()
  await expect(page).toHaveURL(/\/explore\?tab=routes&mode=transit/)
  await expect(page.getByRole('heading', { name: 'Next Stop: Your Library Tour' })).toBeVisible()

  await page.goto('/?ref=yourlibrarytour')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('heading', { name: 'Welcome, Library Tour traveller' })).toBeHidden()
})

test('a tour route lists its ten branches with directions between them', async ({ page }) => {
  await page.goto('/explore?tab=routes&mode=transit')
  await page.getByRole('link', { name: /Humberwood to Mimico Centennial/ }).click()
  await expect(page).toHaveURL(/\/tour\/1$/)
  await expect(page.getByRole('heading', { name: 'Humberwood to Mimico Centennial' })).toBeVisible()
  await expect(page.getByText('0 of 10 visited')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Directions' })).toHaveCount(9)
})

test('an unknown tour route shows the 404 screen', async ({ page }) => {
  await page.goto('/tour/99')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
