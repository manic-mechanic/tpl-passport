import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import pkg from './package.json'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode — no SSR needed for a mobile passport app
  ssr: false,

  modules: ['@pinia/nuxt', '@sentry/nuxt/module'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Library Passport',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // PWA + iOS installability
        { name: 'theme-color', content: '#001c71', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#111850', media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Library Passport' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        // Fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Allerta+Stencil&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Roboto:wght@400;500;600;700&family=Roboto+Condensed:wght@600;700&family=Special+Elite&display=swap',
        },
        // PWA
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icon-512.png' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
      ],
    },
  },

  build: {
    transpile: ['@tpl-passport/shared'],
  },

  // Alias for branch data — now served from the shared package
  alias: {
    '#data': fileURLToPath(new URL('./packages/shared/data', import.meta.url)),
  },

  // Dev-only features (demo mode, location fence bypass, QR scanner).
  // On by default only under `nuxt dev`; production builds default to off.
  // Set NUXT_PUBLIC_IS_DEV=true on preview/tester deployments to turn them on.
  // Set NUXT_PUBLIC_BYPASS_GEOFENCE=true to allow check-ins from any location (e.g. for testers);
  // it only takes effect when isDev is on, so it can't switch off the check in production.
  runtimeConfig: {
    public: {
      // The app's version, shown in Settings. Bump it in package.json.
      appVersion: pkg.version,
      isDev: process.env.NODE_ENV !== 'production',
      bypassGeofence: false,
      authBase: 'https://auth.librarypassport.ca',
      posthogKey: '',
      posthogHost: 'https://us.i.posthog.com',
      // Vercel deployment environment (production / preview / development),
      // captured at build time so the browser can tag Sentry events with it.
      vercelEnv: process.env.VERCEL_ENV ?? '',
      // Vercel's target environment, which is a custom environment's own name
      // (VERCEL_ENV is 'preview' for those). Sentry's v11 bundler plugins tag
      // deploys with it, so events use it too.
      vercelTargetEnv: process.env.VERCEL_TARGET_ENV ?? '',
      // Overridden at runtime by NUXT_PUBLIC_SENTRY_DSN.
      sentry: {
        dsn: '',
      },
    }
  },

  // Generate client source maps for Sentry without linking them from the
  // public JS (no sourceMappingURL comment). The Sentry module uploads them
  // and then deletes them, so they are never served from the site. Server
  // maps are uploaded too and stay in the server bundle, which isn't public.
  sourcemap: {
    client: 'hidden',
    server: true,
  },

  // The app is a SPA, so every page gets the same HTML shell. Build it once as
  // a static index.html instead of rendering it in a server function on each
  // request, which on Vercel meant a cold start after any idle period.
  // NUXT_PUBLIC_* values are read at build time for this file, so they must
  // be set for the build (Vercel sets project env vars for builds too).
  routeRules: {
    '/': { prerender: true },
  },

  hooks: {
    // Guard against shipping client source maps: if the Nitro preset's public
    // dir isn't covered by sentry.sourcemaps.filesToDeleteAfterUpload, fail
    // the build instead of serving the maps.
    'nitro:init'(nitro) {
      if (nitro.options.dev) return
      nitro.hooks.hook('compiled', async () => {
        const publicDir = nitro.options.output.publicDir
        const files = await readdir(publicDir, { recursive: true })
        const maps = files.filter(file => file.endsWith('.map'))
        if (maps.length > 0) {
          throw new Error(`${maps.length} source map(s) left in ${publicDir}. Add it to sentry.sourcemaps.filesToDeleteAfterUpload in nuxt.config.ts.`)
        }
      })

      // On Vercel, send page routes to the static shell (see routeRules) in
      // place of the server function. /api stays a function. This runs after
      // the Vercel preset has written its config.json.
      if (nitro.options.preset === 'vercel') {
        nitro.hooks.hook('compiled', async () => {
          const configPath = join(nitro.options.output.dir, 'config.json')
          const config = JSON.parse(await readFile(configPath, 'utf8')) as { routes: { src?: string, dest?: string }[] }
          const serverOnly = /\/(api|__nuxt_island|__nuxt_error)(\/|\)|$)/
          let rewritten = 0
          for (const route of config.routes) {
            if (!route.dest || serverOnly.test(route.src ?? '') || serverOnly.test(route.dest)) continue
            route.dest = '/index.html'
            rewritten++
          }
          if (!config.routes.some(r => r.src === '/(.*)' && r.dest === '/index.html')) {
            throw new Error('Vercel config.json: no catch-all route to rewrite to /index.html. Check the Nitro Vercel preset output.')
          }
          await writeFile(configPath, JSON.stringify(config, null, 2))
          nitro.logger.info(`Routed ${rewritten} page route(s) to the static /index.html shell`)
        })
      }
    },
  },

  sentry: {
    org: 'great-north-special',
    project: 'javascript-vue',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
      // Client maps in Nitro's public output: .output/public locally,
      // .vercel/output/static on Vercel. Anchored to the project root so the
      // build's cwd doesn't matter. The `compiled` hook below fails the build
      // if a preset writes them anywhere else.
      filesToDeleteAfterUpload: [
        `${rootDir}.output/public/**/*.map`,
        `${rootDir}.vercel/output/static/**/*.map`,
      ],
    },
  },
})
