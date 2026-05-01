import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NUXT_PUBLIC_IS_DEV === 'false' ? 'production' : 'development',
  tracesSampleRate: 0.2,
})
