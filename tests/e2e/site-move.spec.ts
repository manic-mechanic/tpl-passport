import { test, expect, type BrowserContext, type Page } from '@playwright/test'

// Moving passports from tpl-passport.vercel.app to www.librarypassport.ca
// (app/lib/siteMove.ts, public/moving.html). Both real addresses are served
// from the app under test, so each keeps its own storage, as browsers do.

const OLD = 'https://tpl-passport.vercel.app'
const NEW = 'https://www.librarypassport.ca'
const PHOTO_KEY = '2026-10-01T15:00:00.000Z'

const savedPassport = {
  version: 2,
  data: {
    anonymousId: 'old-id',
    checkIns: [
      { branchCode: 'AB', timestamp: PHOTO_KEY, note: 'first', hasPhoto: true, photoPending: true },
      { branchCode: 'CD', timestamp: '2026-09-01T15:00:00.000Z', note: '' },
    ],
    profile: { name: 'Sam', homeBranch: 'AB' },
    completedChallenges: ['first-visit'],
  },
}

async function serveBothAddresses(context: BrowserContext, baseURL: string, opts: { noReferrer?: boolean } = {}) {
  await context.route(/^https:\/\/(tpl-passport\.vercel\.app|www\.librarypassport\.ca)\//, async (route) => {
    const url = new URL(route.request().url())
    try {
      const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href, maxRedirects: 0 })
      if (opts.noReferrer && url.pathname === '/moving.html') {
        // A browser set to send no referrer.
        const body = (await response.text()).replace('<head>', '<head><meta name="referrer" content="no-referrer">')
        return await route.fulfill({ response, body })
      }
      return await route.fulfill({ response })
    } catch {
      // The page navigated away while this was loading (these pages redirect
      // straight away), so nothing is waiting for it.
    }
  })
  await context.route('https://auth.librarypassport.ca/**', route => route.abort())
}

async function saveOnOldSite(page: Page, withPhoto: boolean) {
  // A static file, so the old address doesn't redirect while seeding.
  await page.goto(`${OLD}/sw.js`)
  await page.evaluate(async ({ passport, withPhoto, key }) => {
    localStorage.setItem('tpl-passport', JSON.stringify(passport))
    if (!withPhoto) return
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('tpl-passport-photos', 1)
      open.onupgradeneeded = () => open.result.createObjectStore('photos')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const tx = open.result.transaction('photos', 'readwrite')
        tx.objectStore('photos').put(new Blob([new Uint8Array(150_000).fill(7)], { type: 'image/jpeg' }), key)
        tx.oncomplete = () => { open.result.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, { passport: savedPassport, withPhoto, key: PHOTO_KEY })
}

// The passport and the moved photo's size, as stored on the current page's address.
function readStored(page: Page) {
  return page.evaluate(key => new Promise<{ checkIns: string[], name?: string, photoBytes: number | null }>((resolve) => {
    const stored = JSON.parse(localStorage.getItem('tpl-passport') || 'null')
    const result = {
      checkIns: (stored?.data?.checkIns ?? []).map((c: { branchCode: string }) => c.branchCode),
      name: stored?.data?.profile?.name,
      photoBytes: null as number | null,
    }
    const open = indexedDB.open('tpl-passport-photos')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('photos')) return resolve(result)
      const get = db.transaction('photos').objectStore('photos').get(key)
      get.onsuccess = () => resolve({ ...result, photoBytes: get.result ? (get.result as Blob).size : null })
    }
    open.onerror = () => resolve(result)
  }), PHOTO_KEY)
}

test.describe('moving off the old address', () => {
  test('a visitor with nothing saved goes straight to the same page on the new site', async ({ page, baseURL }) => {
    await serveBothAddresses(page.context(), baseURL!)
    await page.goto(`${OLD}/explore?x=1`)
    await page.waitForURL(`${NEW}/explore?x=1`)
  })

  test('one tap moves visits, profile and photos, then both tabs continue on the new site', async ({ page, baseURL }) => {
    const context = page.context()
    await serveBothAddresses(context, baseURL!)
    await saveOnOldSite(page, true)

    await page.goto(`${OLD}/passport?ref=soc`)
    await expect(page.getByRole('heading', { name: 'Library Passport has moved' })).toBeVisible()
    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Move my passport' }).click(),
    ])
    await expect(page.getByText('Done. Your passport is now at')).toBeVisible()

    await newTab.waitForURL(`${NEW}/`)
    expect(await readStored(newTab)).toEqual({ checkIns: ['AB', 'CD'], name: 'Sam', photoBytes: 150_000 })
    await page.waitForURL(`${NEW}/passport?ref=soc`)

    // Moved: the next visit to the old address goes straight through.
    const again = await context.newPage()
    await again.goto(`${OLD}/`)
    await again.waitForURL(`${NEW}/`)
  })

  test('the fallback moves the passport without photos and leaves a clean URL', async ({ page, baseURL }) => {
    await serveBothAddresses(page.context(), baseURL!)
    await saveOnOldSite(page, false)
    await page.goto(`${OLD}/`)
    await expect(page.getByRole('heading', { name: 'Library Passport has moved' })).toBeVisible()
    // Shown after a failed one-tap attempt; clicked directly here.
    await page.evaluate(() => (document.getElementById('no-photos') as HTMLButtonElement).click())
    await page.waitForURL(`${NEW}/`)
    expect((await readStored(page)).checkIns).toEqual(['AB', 'CD'])
  })

  test('without a referrer the fallback is refused and the old page says so', async ({ page, baseURL }) => {
    await serveBothAddresses(page.context(), baseURL!, { noReferrer: true })
    await saveOnOldSite(page, false)
    await page.goto(`${OLD}/`)
    await expect(page.getByRole('heading', { name: 'Library Passport has moved' })).toBeVisible()
    await page.evaluate(() => (document.getElementById('no-photos') as HTMLButtonElement).click())
    await page.waitForURL(`${OLD}/moving.html?failed=1`)
    await expect(page.getByText('Your passport didn’t move. Try again.')).toBeVisible()
  })

  test('a crafted move link sent straight to the new site imports nothing', async ({ page, baseURL }) => {
    await serveBothAddresses(page.context(), baseURL!)
    // Refused and sent to the old page, which has nothing saved here, so it
    // continues straight back to the new site.
    await page.goto(`${NEW}/?passport-move=1#${encodeURIComponent(JSON.stringify(savedPassport))}`, { waitUntil: 'commit' })
    await page.waitForURL(`${NEW}/`)
    expect((await readStored(page)).checkIns).toEqual([])
  })

  test('a crafted move link sent through the old address imports nothing', async ({ page, baseURL }) => {
    await serveBothAddresses(page.context(), baseURL!)
    // The old address forwards visitors with nothing saved to the new site,
    // with its referrer: it must not forward a move link.
    await page.goto(`${OLD}/?passport-move=1#${encodeURIComponent(JSON.stringify(savedPassport))}`, { waitUntil: 'commit' })
    await page.waitForURL(`${NEW}/`)
    expect((await readStored(page)).checkIns).toEqual([])
  })
})
