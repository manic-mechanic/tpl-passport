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

test('Day Trips opens on the tour routes, with walking routes one tap away', async ({ page }) => {
  await page.goto('/explore?tab=routes')
  await expect(page.getByRole('heading', { name: 'Next Stop: Your Library Tour' })).toBeVisible()
  await expect(page.getByText('Bike and car routes coming soon.')).toBeVisible()
  await page.getByRole('tab', { name: 'Walk' }).click()
  await expect(page.getByRole('link', { name: /Junction & High Park Loop/ })).toBeVisible()
})

test('the home tour banner can be dismissed and stays hidden', async ({ page }) => {
  await page.goto('/')
  const banner = page.getByRole('region', { name: 'Next Stop: Your Library Tour' })
  await expect(banner).toBeVisible()
  await page.getByRole('button', { name: 'Hide the Library Tour banner' }).click()
  await expect(banner).toBeHidden()
  await page.reload()
  await page.waitForTimeout(1000)
  await expect(banner).toBeHidden()
})

test('route medals and Go for Gold show on Extra Credit', async ({ page }) => {
  await page.goto('/passport#extra-credit')
  await expect(page.getByRole('heading', { name: 'Library Tour' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Route \d+, / })).toHaveCount(10)
  await expect(page.getByText('Go for Gold')).toBeVisible()
})
