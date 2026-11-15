import { test, expect } from '@playwright/test'

test('unknown page shows the 404 screen and links back home', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()

  await page.getByRole('button', { name: 'Back to your passport' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeHidden()
})

test('unknown day trip shows the 404 screen', async ({ page }) => {
  await page.goto('/day-trips/not-a-real-trip')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('unknown API path returns 404, not the app shell', async ({ request }) => {
  const res = await request.get('/api/does-not-exist')
  expect(res.status()).toBe(404)
  expect(res.headers()['content-type']).not.toContain('text/html')

  const removedAuth = await request.get('/api/auth/ok')
  expect(removedAuth.status()).toBe(404)
})
