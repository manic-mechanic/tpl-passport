import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { functionPathFor, routePagesToStaticShell } from '../build/vercelStaticShell'

// A trimmed copy of what Nitro's Vercel preset writes for this app.
const presetRoutes = [
  { src: '/_nuxt/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
  { handle: 'filesystem' },
  { src: '(?<__isr_route>/__nuxt_error)', dest: '/__fallback' },
  { src: '/settings', dest: '/settings' },
  { src: '/explore', dest: '/explore' },
  { src: '/api/all-events', dest: '/api/all-events' },
  { src: '/health', dest: '/health' },
  { src: '/__nuxt_error', dest: '/__nuxt_error' },
  { src: '/branch/(?<id>[^/]+)', dest: '/branch/[id]' },
  { src: '/api/(?:.*)', dest: '/api/[...]' },
  { src: '/__nuxt_island/(?:.*)', dest: '/__nuxt_island/[...]' },
  { src: '/(.*)', dest: '/__fallback' },
]
const pageRoutes = ['/', '/settings', '/explore', '/branch/:id']
const functions = ['__fallback', '__nuxt_error', 'index', 'settings', 'explore', 'branch/[id]', 'api/all-events', 'api/[...]', 'health', '__nuxt_island/[...]']

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vercel-output-'))
  await mkdir(join(dir, 'static'), { recursive: true })
  await writeFile(join(dir, 'static', 'index.html'), '<!doctype html>')
  await writeFile(join(dir, 'config.json'), JSON.stringify({ version: 3, routes: presetRoutes }))
  for (const name of functions) {
    const path = join(dir, 'functions', `${name}.func`)
    await mkdir(join(path, '..'), { recursive: true })
    if (name === '__fallback') await mkdir(path)
    else await symlink(join(dir, 'functions', '__fallback.func'), path)
  }
})

afterEach(() => rm(dir, { recursive: true, force: true }))

const run = () => routePagesToStaticShell({ outputDir: dir, pageRoutes, buildAssetsDir: '/_nuxt/' })
const routes = async () => JSON.parse(await readFile(join(dir, 'config.json'), 'utf8')).routes
const remaining = async () => (await readdir(join(dir, 'functions'), { recursive: true })).filter(p => p.endsWith('.func')).sort()

describe('functionPathFor', () => {
  it('matches the Vercel preset naming', () => {
    expect(functionPathFor('/branch/:id')).toBe('/branch/[id]')
    expect(functionPathFor('/api/**')).toBe('/api/[...]')
    expect(functionPathFor('/settings')).toBe('/settings')
  })
})

describe('routePagesToStaticShell', () => {
  it('sends page routes to index.html and leaves server routes alone', async () => {
    expect(await run()).toEqual({ pageRoutes: 3, removedFunctions: 4 })
    const dests = Object.fromEntries((await routes()).filter((r: { dest?: string }) => r.dest).map((r: { src: string, dest: string }) => [r.src, r.dest]))
    expect(dests['/settings']).toBe('/index.html')
    expect(dests['/branch/(?<id>[^/]+)']).toBe('/index.html')
    expect(dests['/api/all-events']).toBe('/api/all-events')
    expect(dests['/health']).toBe('/health')
    expect(dests['(?<__isr_route>/__nuxt_error)']).toBe('/__fallback')
  })

  it('returns an uncached 404 for missing build assets, not the HTML shell', async () => {
    await run()
    const tail = (await routes()).slice(-2)
    expect(tail).toEqual([
      { src: '/_nuxt/(.*)', status: 404, headers: { 'cache-control': 'no-store' } },
      { src: '/(.*)', dest: '/index.html' },
    ])
  })

  it('removes page functions and their empty folders, and keeps server functions', async () => {
    await run()
    expect(await remaining()).toEqual(['__fallback.func', '__nuxt_error.func', '__nuxt_island/[...].func', 'api/[...].func', 'api/all-events.func', 'health.func'].sort())
    expect(await readdir(join(dir, 'functions'))).not.toContain('branch')
  })

  it('fails the build if the shell or the catch-all is missing', async () => {
    await rm(join(dir, 'static', 'index.html'))
    await expect(run()).rejects.toThrow(/no static\/index.html/)

    await writeFile(join(dir, 'static', 'index.html'), '<!doctype html>')
    await writeFile(join(dir, 'config.json'), JSON.stringify({ routes: presetRoutes.slice(0, -1) }))
    await expect(run()).rejects.toThrow(/no "\/\(\.\*\)" -> \/__fallback catch-all/)
  })
})
