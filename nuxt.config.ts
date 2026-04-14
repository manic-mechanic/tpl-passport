import { fileURLToPath } from 'node:url'

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
      title: 'TPL Passport',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // PWA + iOS installability
        { name: 'theme-color', content: '#001c71', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#111850', media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'TPL Passport' },
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
        { rel: 'icon', type: 'image/png', href: '/tpl-meta-card.png' },
        { rel: 'apple-touch-icon', href: '/tpl-meta-card.png' },
      ],
    },
  },

  build: {
    transpile: ['@tpl-passport/shared'],
  },

  // Alias for branch data — now served from the shared package
  alias: {
    '#data': fileURLToPath(new URL('../tpl-passport-auth/packages/shared/data', import.meta.url)),
  },

  // Dev-only features (demo mode, location fence bypass, QR scanner).
  // Set NUXT_PUBLIC_IS_DEV=false in the production Vercel project settings.
  // Set NUXT_PUBLIC_BYPASS_GEOFENCE=true to allow check-ins from any location (e.g. for testers).
  runtimeConfig: {
    public: {
      isDev: true,
      bypassGeofence: false,
      posthogKey: '',
      posthogHost: 'https://us.i.posthog.com',
      sentryDsn: '',
    }
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: 'great-north-special',
      project: 'javascript-vue',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }
  },

  vite: {
    server: {
      allowedHosts: ['nonprotesting-rochel-carpingly.ngrok-free.dev']
    }
  }
})
