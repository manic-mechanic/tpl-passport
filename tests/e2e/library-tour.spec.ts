import { test, expect } from '@playwright/test'
import tourData from '../../packages/shared/data/library-tour.json' with { type: 'json' }

const tourRoutes = tourData.routes

test('visitors from the event see the welcome sheet once, and the ref is dropped from the URL', async ({ page }) => {
  await page.goto('/?ref=yourlibrarytour')
  await expect(page.getByRole('heading', { name: 'Welcome to TPL Passport' })).toBeVisible()
  await expect(page).not.toHaveURL(/ref=/)

  await page.getByRole('link', { name: 'See the routes' }).click()
  await expect(page).toHaveURL(/\/explore\?tab=routes/)
  await expect(page.getByRole('link', { name: /Learn more at UofT School of Cities/ })).toBeVisible()

  await page.goto('/?ref=yourlibrarytour')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('heading', { name: 'Welcome to TPL Passport' })).toBeHidden()
})

test('a tour route lists its ten branches with directions between them', async ({ page }) => {
  await page.goto('/explore?tab=routes&mode=transit')
  await page.getByRole('link', { name: /Humberwood to Mimico Centennial/ }).click()
  await expect(page).toHaveURL(/\/tour\/1$/)
  await expect(page.getByRole('heading', { name: 'Humberwood to Mimico Centennial' })).toBeVisible()
  // Each leg ends with where you get off: Humberwood to Albion ends at Albion Station
  await expect(page.getByText('Humber College → Albion Station')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Directions' })).toHaveCount(9)
})

test('an unknown tour route shows the 404 screen', async ({ page }) => {
  await page.goto('/tour/99')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('Day Trips opens on the tour routes, with walking routes one tap away', async ({ page }) => {
  await page.goto('/explore?tab=routes')
  await expect(page.getByRole('link', { name: /Humberwood to Mimico Centennial/ })).toBeVisible()
  await expect(page.getByLabel('Bike and car routes coming soon')).toBeVisible()

  // The tour card collapses to its title line, and stays collapsed
  await page.getByRole('button', { name: '#YourLibraryTour' }).click()
  await expect(page.getByRole('link', { name: /Learn more at UofT School of Cities/ })).toBeHidden()
  await page.reload()
  await expect(page.getByRole('link', { name: /Learn more at UofT School of Cities/ })).toBeHidden()

  await page.getByRole('tab', { name: 'Walking' }).click()
  await expect(page.getByRole('link', { name: /Junction & High Park Loop/ })).toBeVisible()
})

test('finishing every location during the tour postmarks Full Passport', async ({ page }) => {
  const codes = tourRoutes.flatMap(r => r.branches)
  await page.addInitScript((branchCodes) => {
    const checkIns = branchCodes.map((branchCode, i) => ({
      branchCode,
      timestamp: new Date(Date.UTC(2026, 9, 1 + (i % 28), 15)).toISOString(),
      note: '',
    }))
    localStorage.setItem('tpl-passport', JSON.stringify({ checkIns, profile: {}, completedChallenges: [] }))
  }, codes)
  await page.goto('/passport#extra-credit')
  await expect(page.getByLabel('Completed during #YourLibraryTour')).toBeVisible()
})
