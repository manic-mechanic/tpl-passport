import * as Sentry from '@sentry/nuxt'
import { sentryEnvironment } from './app/lib/sentryEnvironment'
import { sentryDataCollection } from './app/lib/sentryDataCollection'
import pkg from './package.json' with { type: 'json' }

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment({
    vercelEnv: process.env.VERCEL_ENV,
    vercelTargetEnv: process.env.VERCEL_TARGET_ENV,
    isDev: process.env.NUXT_PUBLIC_IS_DEV === 'true' || process.env.NODE_ENV !== 'production',
  }),
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0.2,
  // As in sentry.client.config.js.
  initialScope: { tags: { app_version: pkg.version } },
})
