import { test, expect } from '@playwright/test'

test('each Explore tab has its own URL, and back and forward move between them', async ({ page }) => {
  await page.goto('/explore')
  await expect(page).toHaveURL(/\/explore\/branches$/)
  await expect(page.getByRole('tab', { name: 'Branches', selected: true })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search branches' })).toBeVisible()

  await page.getByRole('tab', { name: 'Day trips' }).click()
  await expect(page).toHaveURL(/\/explore\/trips\/transit$/)
  await page.getByRole('tab', { name: 'Walking' }).click()
  await expect(page).toHaveURL(/\/explore\/trips\/walking$/)
  await page.getByRole('tab', { name: 'What\'s on' }).click()
  await expect(page).toHaveURL(/\/explore\/events$/)
  await page.getByRole('tab', { name: 'Extra Credit' }).click()
  await expect(page).toHaveURL(/\/explore\/extra$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/explore\/events$/)
  await expect(page.getByRole('tab', { name: 'What\'s on', selected: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/explore\/trips\/walking$/)
  await expect(page.getByRole('link', { name: /Junction & High Park Loop/ })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/explore\/events$/)
})

test('old Explore links land on the matching tab', async ({ page }) => {
  const cases: [string, RegExp][] = [
    ['/explore?tab=near-me', /\/explore\/branches$/],
    ['/explore?tab=routes', /\/explore\/trips\/transit$/],
    ['/explore?tab=routes&mode=walk', /\/explore\/trips\/walking$/],
    ['/explore?tab=routes&mode=transit', /\/explore\/trips\/transit$/],
    ['/explore?tab=events', /\/explore\/events$/],
    ['/explore?tab=working-toward', /\/explore\/extra$/],
    ['/branches', /\/explore\/branches$/],
  ]
  for (const [from, url] of cases) {
    await page.goto(from)
    await expect(page, from).toHaveURL(url)
  }
})

test('Explore has no header search or Browse all branches button', async ({ page }) => {
  await page.goto('/explore/branches')
  await expect(page.getByRole('searchbox', { name: 'Search branches' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse all branches' })).toHaveCount(0)
})
