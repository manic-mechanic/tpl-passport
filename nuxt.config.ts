import { readdir } from 'node:fs/promises'
import pkg from './package.json'
import { fileURLToPath } from 'node:url'
import { routePagesToStaticShell } from './build/vercelStaticShell'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Vercel sets VERCEL=1 for its builds; NITRO_PRESET=vercel is a local Vercel build.
const isVercelBuild = process.env.VERCEL === '1' || process.env.NITRO_PRESET === 'vercel'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // SPA mode — no SSR needed for a mobile passport app
  ssr: false,

  modules: ['@pinia/nuxt', '@sentry/nuxt/module'],

  // Fonts are bundled with the app instead of loaded from Google Fonts. A
  // stylesheet from fonts.googleapis.com in <head> blocks the first paint, so
  // when that connection stalls (Private Relay, content blockers, flaky
  // networks) the page stays blank until the browser gives up on it.
  // Each file covers every subset (latin-ext, cyrillic, vietnamese, ...) by
  // unicode-range, as Google did, so browsers only download what a page uses.
  css: [
    '@fontsource-variable/fraunces/opsz.css',
    '@fontsource-variable/fraunces/opsz-italic.css',
    '@fontsource/roboto/400.css',
    '@fontsource/roboto/500.css',
    '@fontsource/roboto/600.css',
    '@fontsource/roboto/700.css',
    '@fontsource/roboto-condensed/600.css',
    '@fontsource/roboto-condensed/700.css',
    '@fontsource/allerta-stencil/400.css',
    '@fontsource/special-elite/400.css',
    '~/assets/css/main.css',
  ],

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
        // Default, not black-translucent: since iOS 26.1, iOS draws a blur over
        // a translucent status bar that the page can't turn off, and its edge
        // shows as a hairline under the bar. With the default style iOS paints
        // a solid bar from theme-color (the banner navy above). iOS reads this
        // when the app is added to the Home Screen, so existing installs keep
        // the old bar until they're removed and added again.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      script: [
        // Mark the installed app before first paint; main.css switches it to
        // the pinned-document layout ("Installed app scrolling"). iOS Home
        // Screen apps don't always match display-mode: standalone, so also
        // check Safari's navigator.standalone.
        {
          innerHTML: "if(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)document.documentElement.classList.add('standalone')",
          tagPosition: 'head',
        },
      ],
      link: [
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
  // On Vercel, NUXT_PUBLIC_* values are read at build time (see routeRules),
  // so changing one needs a redeploy.
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
      // Set by NUXT_PUBLIC_SENTRY_DSN (at build time on Vercel).
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

  // The app is a SPA, so every page gets the same HTML shell. On Vercel it's
  // built once as a static index.html and served for every page (see the
  // nitro:init hook), in place of a server function that cold-started after
  // any idle period. That bakes NUXT_PUBLIC_* values into the HTML at build
  // time, so on Vercel they take effect on the next deploy, not at runtime.
  // Other builds (CI's node server) keep reading them per request.
  routeRules: isVercelBuild ? { '/': { prerender: true } } : {},

  nitro: {
    vercel: {
      config: {
        // tpl-passport.vercel.app is Vercel's built-in production address. Send
        // it to the real site so there's one production URL: sign-in only works
        // on librarypassport.ca, and analytics only counts one host. Nitro
        // writes Vercel's routing itself, so a vercel.json redirect wouldn't
        // apply. Exact host only, so preview and per-deploy URLs are untouched.
        // Query strings pass through. Nitro's route type only covers the routes
        // Nitro writes itself, hence the cast; this is a standard Build Output
        // API redirect route.
        routes: [
          {
            src: '^/(.*)$',
            has: [{ type: 'host', value: 'tpl-passport.vercel.app' }],
            status: 308,
            headers: { Location: 'https://www.librarypassport.ca/$1' },
          } as never,
        ],
      },
    },
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

      // On Vercel, serve pages from the prerendered index.html in place of
      // the server function. See build/vercelStaticShell.ts.
      if (nitro.options.preset === 'vercel') {
        nitro.hooks.hook('compiled', async () => {
          const { pageRoutes, removedFunctions } = await routePagesToStaticShell({
            outputDir: nitro.options.output.dir,
            pageRoutes: nitro.options.ssrRoutes ?? [],
            buildAssetsDir: nitro.options.runtimeConfig.app.buildAssetsDir,
          })
          nitro.logger.info(`Routed ${pageRoutes} page route(s) and the catch-all to the static /index.html shell; removed ${removedFunctions} page function(s)`)
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
