import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { createCheckIn, disableLocationCheck } from './helpers'

const photoPath = path.resolve(process.cwd(), 'tests/e2e/fixtures/photo.png')

// A signed-in session on a stand-in auth server, with photo uploads that
// answer with the given statuses in turn (the last one repeats).
async function signedInServer(page: Page, uploadStatuses: number[] = [200]) {
  const state = { uploads: 0, patches: [] as string[] }
  await page.context().route('https://auth.librarypassport.ca/**', async (route) => {
    const req = route.request()
    const p = new URL(req.url()).pathname
    // WebKit checks CORS on fulfilled responses too.
    const headers = {
      'access-control-allow-origin': req.headers().origin ?? '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
    }
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body, headers })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (p.endsWith('/get-session')) return json({ user: { id: 'u1', email: 'reader@example.com', name: 'Reader' }, session: { id: 's1' } })
    if (p === '/api/profile') return json({ name: 'Reader', home_branch: null })
    if (p === '/api/checkins' && req.method() === 'GET') return json([])
    if (p === '/api/upload/photo') {
      const status = uploadStatuses[Math.min(state.uploads, uploadStatuses.length - 1)]!
      state.uploads += 1
      return status === 200 ? json({ publicUrl: `https://photos.example.com/${state.uploads}.jpg` }) : json({ message: 'boom' }, status)
    }
    if (p.startsWith('/api/checkins/') && req.method() === 'PATCH') {
      state.patches.push(req.postDataJSON().photoUri)
      return json({ ok: true })
    }
    return json({ ok: true })
  })
  return state
}

// Stands in for the iOS share sheet: takes focus from the page, then
// resolves, or rejects with AbortError as when it's closed without saving.
async function fakeShareSheet(page: Page, outcome: 'save' | 'cancel') {
  await page.addInitScript((outcome) => {
    const w = window as unknown as { shareCalls: number }
    w.shareCalls = 0
    navigator.canShare = () => true
    navigator.share = () => new Promise((resolve, reject) => {
      w.shareCalls += 1
      ;(document.activeElement as HTMLElement | null)?.blur()
      window.dispatchEvent(new Event('blur'))
      setTimeout(() => {
        window.dispatchEvent(new Event('focus'))
        if (outcome === 'cancel') reject(new DOMException('Share canceled', 'AbortError'))
        else resolve()
      }, 200)
    })
  }, outcome)
}

test('a check-in lands on its visit page, which survives a reload and goes back to check-in', async ({ page }) => {
  await disableLocationCheck(page)
  await createCheckIn(page, 'visit page note')
  const visitUrl = page.url()
  await expect(page.getByText('visit page note')).toBeVisible()

  await page.reload()
  expect(page.url()).toBe(visitUrl)
  await expect(page.getByText('Stamp collected!')).toBeVisible()
  await expect(page.getByText('visit page note')).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/check-in$/)
  await expect(page.getByText("You've already checked in here today")).toBeVisible()
})

test('History opens a visit on its page', async ({ page }) => {
  await disableLocationCheck(page)
  await createCheckIn(page, 'from history')
  const visitUrl = page.url()

  await page.goto('/history')
  await page.locator('.checkin-list a').first().click()
  await expect(page).toHaveURL(visitUrl)
  await expect(page.getByText('from history')).toBeVisible()
  await expect(page.getByText('Stamp collected!')).toHaveCount(0)

  await page.getByRole('button', { name: 'History' }).click()
  await expect(page).toHaveURL(/\/history$/)
})

test('an unknown visit says so', async ({ page }) => {
  await page.goto('/visit/2000-01-01T00%3A00%3A00.000Z')
  await expect(page.getByText("We couldn't find that visit.")).toBeVisible()
})

test('a signed-in photo shows that it uploaded', async ({ page }) => {
  const server = await signedInServer(page)
  await disableLocationCheck(page)
  await createCheckIn(page, 'upload ok')
  await page.locator('input.photo-input').setInputFiles(photoPath)
  await expect(page.locator('.photo-status')).toHaveText('Uploaded')
  expect(server.patches).toEqual(['https://photos.example.com/1.jpg'])
})

test('a failed upload shows, and Retry uploads it', async ({ page }) => {
  const server = await signedInServer(page, [500, 200])
  await disableLocationCheck(page)
  await createCheckIn(page, 'upload fails')
  await page.locator('input.photo-input').setInputFiles(photoPath)
  await expect(page.locator('.photo-status')).toContainText('Upload failed.')

  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.locator('.photo-status')).toHaveText('Uploaded')
  expect(server.uploads).toBe(2)
  expect(server.patches).toEqual(['https://photos.example.com/2.jpg'])
})

for (const outcome of ['save', 'cancel'] as const) {
  test(`the visit page stays usable after Save photo (share sheet ${outcome})`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await fakeShareSheet(page, outcome)
    await disableLocationCheck(page)
    await createCheckIn(page, 'save photo')
    await page.locator('input.photo-input').setInputFiles(photoPath)

    await page.getByRole('button', { name: 'Save photo' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { shareCalls: number }).shareCalls)).toBe(1)
    await page.waitForTimeout(400)  // the share sheet has closed

    expect(await page.evaluate(() => document.body.style.pointerEvents)).toBe('')
    await page.getByRole('button', { name: 'Save photo' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { shareCalls: number }).shareCalls)).toBe(2)
    await page.getByRole('link', { name: 'View branch' }).click()
    await expect(page).toHaveURL(/\/branch\//)
    expect(errors.filter(e => /AbortError|Share canceled/.test(e))).toEqual([])
  })
}
