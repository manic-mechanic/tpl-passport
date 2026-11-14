import * as Sentry from '@sentry/nuxt'

// The browser bundle has no process.env, so read the DSN from runtime config
// (set via NUXT_PUBLIC_SENTRY_DSN).
const { public: { isDev, sentry } } = useRuntimeConfig()

Sentry.init({
  dsn: sentry?.dsn || undefined,
  environment: isDev ? 'development' : 'production',
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
})
