// Points the app's page routes at a static index.html in Vercel's build
// output, in place of the Nitro server function.
//
// The app is a SPA (ssr: false), so every page is the same HTML shell. The
// Vercel preset still routes each page to a function (and writes one
// explore.func, settings.func, ... per page, linked to __fallback.func),
// which meant a cold start on the first visit after any idle period. This
// runs after the preset has written its output (Nitro's `compiled` hook):
//
// - routes whose destination is a page function now go to /index.html
// - the final catch-all goes to /index.html too, except under the build
//   assets dir: a missing chunk there (e.g. an old one after a deploy) is
//   a plain, uncached 404. Without this it got the HTML shell with a 200
//   and the dir's year-long immutable cache header, from the function as
//   well as from the static shell, so the browser cached HTML as JS.
// - the per-page functions are removed, since Vercel matches them before
//   any route
//
// Pages are identified from Nuxt's own page list (nitro.options.ssrRoutes),
// so server routes (/api and anything else in server/) keep their functions.

import { access, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

type Route = { src?: string, dest?: string, handle?: string, status?: number, headers?: Record<string, string> }

const FALLBACK = '/__fallback'
const SHELL = '/index.html'

// The function path the Vercel preset uses for a route pattern
// (nitropack's normalizeRouteDest): /branch/:id -> /branch/[id].
export function functionPathFor(route: string): string {
  return '/' + route.split('/').slice(1).map((segment) => {
    if (segment.startsWith('**')) return `[...${segment.replace(/[*:]/g, '')}]`
    if (segment === '*') return '[-]'
    if (segment.startsWith(':')) return `[${segment.slice(1)}]`
    if (segment.includes(':')) return `[${segment.replace(/:/g, '_')}]`
    return segment
  }).join('/')
}

export async function routePagesToStaticShell(opts: {
  outputDir: string
  pageRoutes: string[]
  buildAssetsDir: string
}): Promise<{ pageRoutes: number, removedFunctions: number }> {
  const { outputDir, buildAssetsDir } = opts
  const staticDir = join(outputDir, 'static')
  const functionsDir = join(outputDir, 'functions')

  await access(join(staticDir, 'index.html')).catch(() => {
    throw new Error(`Vercel output has no static/index.html. Is "/" prerendered (routeRules in nuxt.config.ts)?`)
  })

  const pageFunctions = new Set(opts.pageRoutes.map(functionPathFor).filter(path => path !== '/'))
  pageFunctions.add('/index')

  const configPath = join(outputDir, 'config.json')
  const config = JSON.parse(await readFile(configPath, 'utf8')) as { routes: Route[] }

  let pageRoutes = 0
  for (const route of config.routes) {
    if (route.dest && pageFunctions.has(route.dest)) {
      route.dest = SHELL
      pageRoutes++
    }
  }

  const catchAll = config.routes.findIndex(r => r.src === '/(.*)' && r.dest === FALLBACK)
  if (catchAll === -1) {
    throw new Error(`Vercel config.json has no "/(.*)" -> ${FALLBACK} catch-all to rewrite. Check the Nitro Vercel preset output.`)
  }
  const assetsPrefix = '/' + buildAssetsDir.replace(/^\/|\/$/g, '')
  config.routes.splice(catchAll, 1,
    { src: `${assetsPrefix}/(.*)`, status: 404, headers: { 'cache-control': 'no-store' } },
    { src: '/(.*)', dest: SHELL },
  )
  await writeFile(configPath, JSON.stringify(config, null, 2))

  let removedFunctions = 0
  for (const path of pageFunctions) {
    const funcPath = join(functionsDir, `${path}.func`)
    const exists = await access(funcPath).then(() => true, () => false)
    if (!exists) continue
    await rm(funcPath, { recursive: true })
    removedFunctions++
    // Remove parents the page function leaves empty (functions/branch/ etc.)
    let dir = dirname(funcPath)
    while (dir !== functionsDir && (await readdir(dir)).length === 0) {
      await rmdir(dir)
      dir = dirname(dir)
    }
  }

  return { pageRoutes, removedFunctions }
}
