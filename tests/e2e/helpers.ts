import { expect, Page } from '@playwright/test'

export async function disableLocationCheck(page: Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Off', exact: true }).first().click()
}

// Puts this device in the onboarding tests' arms (lib/onboarding.ts) before
// the app loads, so Home's layout is known.
export async function setOnboardingArms(page: Page, arms: { onb_sheet: 'sheet' | 'none', onb_home_order: 'checkin_first' | 'passport_first' }) {
  await page.addInitScript((value) => {
    localStorage.setItem('tpl-passport:onboarding-arms', JSON.stringify(value))
  }, arms)
}

// Checks in at the nearest branch and leaves the page on that visit's
// regular page (not the first-stamp celebration), with `note` added from
// the branch page, where notes are written.
export async function createCheckIn(page: Page, note = '') {
  await page.goto('/check-in')
  await page.getByRole('button', { name: 'Stamp my passport' }).click()
  await page.waitForURL(/\/visit\/[^/]+$/)
  await expect(page.getByText(/^(First stamp!|Stamp collected!)$/)).toBeVisible()
  const visitUrl = page.url()

  if (note) {
    const branchCode = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tpl-passport') ?? '{}').data?.checkIns?.[0]?.branchCode as string)
    await page.goto(`/branch/${branchCode}`)
    await page.getByRole('button', { name: 'Edit note' }).first().click()
    await page.getByLabel('Note').fill(note)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
  }

  // Opened afresh from another page, the visit has no "just checked in"
  // state (a same-URL goto would keep it).
  if (!note) await page.goto('/history')
  await page.goto(visitUrl)
  await expect(page.locator('input.photo-input')).toBeAttached()
}
