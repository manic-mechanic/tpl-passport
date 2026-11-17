import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { createCheckIn, disableLocationCheck } from './helpers'

// A small in-browser stand-in for the auth server (auth.librarypassport.ca),
// so sign-up / sign-out sync can be tested without the real service.
type FakeAuth = {
  signedIn: boolean
  checkIns: Map<string, Record<string, unknown>>
  uploads: number
  failCheckinsFetch: boolean
  failSignOut: boolean
}

async function fakeAuthServer(page: Page, initial: Partial<FakeAuth> = {}): Promise<FakeAuth> {
  const state: FakeAuth = {
    signedIn: false,
    checkIns: new Map(),
    uploads: 0,
    failCheckinsFetch: false,
    failSignOut: false,
    ...initial,
  }
  const user = { id: 'u1', email: 'reader@example.com', name: 'Reader' }

  await page.context().route('https://auth.librarypassport.ca/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const p = url.pathname
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })

    if (p.endsWith('/get-session')) return json(state.signedIn ? { user, session: { id: 's1' } } : null)
    if (p.endsWith('/sign-up/email')) { state.signedIn = true; return json({ token: 't', user }) }
    if (p.endsWith('/sign-out')) {
      if (state.failSignOut) return json({ message: 'boom' }, 500)
      state.signedIn = false
      return json({ success: true })
    }
    if (p.endsWith('/list-accounts')) return json([{ provider: 'credential' }])
    if (p === '/api/profile') return json({ name: 'Reader', home_branch: null })
    if (!state.signedIn && p.startsWith('/api/')) return json({ message: 'unauthorized' }, 401)
    if (p === '/api/checkins' && req.method() === 'GET') {
      if (state.failCheckinsFetch) return json({ message: 'down' }, 503)
      return json([...state.checkIns.values()])
    }
    if (p === '/api/checkins' && req.method() === 'POST') {
      const body = req.postDataJSON()
      state.checkIns.set(body.timestamp, {
        branch_code: body.branchCode, timestamp: body.timestamp, note: body.note, photo_url: body.photoUri ?? null,
      })
      return json({ ok: true })
    }
    if (p.startsWith('/api/checkins/') && req.method() === 'PATCH') {
      const ts = decodeURIComponent(p.slice('/api/checkins/'.length))
      const existing = state.checkIns.get(ts)
      if (!existing) return json({ message: 'not found' }, 404)
      existing.photo_url = req.postDataJSON().photoUri
      return json({ ok: true })
    }
    if (p === '/api/upload/photo') {
      state.uploads += 1
      return json({ publicUrl: `https://photos.example.com/${state.uploads}.jpg` })
    }
    return json({})
  })
  return state
}

function localCheckInCount(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('tpl-passport') ?? '{}').data?.checkIns?.length ?? 0)
}

const photoPath = path.resolve(process.cwd(), 'tests/e2e/fixtures/photo.png')

async function signUp(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByPlaceholder('Your name').fill('Reader')
  await page.getByPlaceholder('you@example.com').fill('reader@example.com')
  const passwords = page.locator('input[type="password"]')
  await passwords.nth(0).fill('password123')
  await passwords.nth(1).fill('password123')
  await page.locator('form').getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/')
}

test('signing up uploads check-ins and photos made before the account existed', async ({ page }) => {
  const server = await fakeAuthServer(page)
  await disableLocationCheck(page)
  await createCheckIn(page, 'before signing up')
  await page.locator('input.photo-input').setInputFiles(photoPath)
  await expect(page.getByRole('button', { name: 'Save photo' })).toBeVisible()
  expect(server.checkIns.size).toBe(0)

  await signUp(page)

  await expect.poll(() => server.checkIns.size).toBe(1)
  const [record] = [...server.checkIns.values()]
  expect(record.note).toBe('before signing up')
  await expect.poll(() => [...server.checkIns.values()][0].photo_url).toMatch(/^https:\/\/photos\.example\.com\//)
})

test('sign-out keeps local data when the server cannot confirm it is synced', async ({ page }) => {
  const server = await fakeAuthServer(page, { signedIn: true })
  await disableLocationCheck(page)
  await createCheckIn(page, 'not yet synced')
  server.failCheckinsFetch = true

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByText(/haven't synced yet/)).toBeVisible()
  expect(server.signedIn).toBe(true)

  expect(await localCheckInCount(page)).toBe(1)
})

test('sign-out keeps local data when the sign-out request fails', async ({ page }) => {
  const server = await fakeAuthServer(page, { signedIn: true, failSignOut: true })
  await disableLocationCheck(page)
  await createCheckIn(page, 'kept')

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByText("Couldn't sign out")).toBeVisible()

  expect(await localCheckInCount(page)).toBe(1)
})

test('sign-out syncs, then clears this device', async ({ page }) => {
  const server = await fakeAuthServer(page, { signedIn: true })
  await disableLocationCheck(page)
  await createCheckIn(page, 'synced then cleared')

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()

  expect(server.signedIn).toBe(false)
  expect([...server.checkIns.values()].map(c => c.note)).toEqual(['synced then cleared'])
  expect(await localCheckInCount(page)).toBe(0)
})
