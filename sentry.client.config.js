import * as Sentry from '@sentry/nuxt'
import { sentryEnvironment } from './app/lib/sentryEnvironment'
import { sentryDataCollection } from './app/lib/sentryDataCollection'

// The browser bundle has no process.env, so read the DSN from runtime config
// (set via NUXT_PUBLIC_SENTRY_DSN).
const { public: { isDev, sentry, vercelEnv, vercelTargetEnv } } = useRuntimeConfig()

Sentry.init({
  dsn: sentry?.dsn || undefined,
  environment: sentryEnvironment({ vercelEnv, vercelTargetEnv, isDev: !!isDev }),
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
})
