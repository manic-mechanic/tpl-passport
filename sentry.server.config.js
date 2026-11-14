import * as Sentry from '@sentry/nuxt'
import { sentryEnvironment } from './app/lib/sentryEnvironment'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment({
    vercelEnv: process.env.VERCEL_ENV,
    isDev: process.env.NUXT_PUBLIC_IS_DEV === 'true' || process.env.NODE_ENV !== 'production',
  }),
  tracesSampleRate: 0.2,
})
