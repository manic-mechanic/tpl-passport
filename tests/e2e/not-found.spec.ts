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

test('in-app navigation to an unknown day trip shows the 404 screen', async ({ page }) => {
  await page.goto('/')
  // Push through the app's router so the route is resolved client-side, not by
  // the server. The mounted Vue app is on #__nuxt in both dev and production.
  // The push rejects when the page's validate fails; the 404 screen is the check.
  type Router = { push: (p: string) => Promise<unknown> }
  type NuxtRoot = HTMLElement & { __vue_app__?: { config: { globalProperties: { $router: Router } } } }
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as NuxtRoot | null)?.__vue_app__)
  await page.evaluate(() => (document.querySelector('#__nuxt') as NuxtRoot).__vue_app__!
    .config.globalProperties.$router.push('/day-trips/not-a-real-trip').catch(() => {}))
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('404 screen keeps a manually chosen theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Dark', exact: true }).click()

  await page.goto('/this-page-does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('unknown API path returns 404, not the app shell', async ({ request }) => {
  const res = await request.get('/api/does-not-exist')
  expect(res.status()).toBe(404)
  expect(res.headers()['content-type']).not.toContain('text/html')

  const removedAuth = await request.get('/api/auth/ok')
  expect(removedAuth.status()).toBe(404)
})
