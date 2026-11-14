import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NUXT_PUBLIC_IS_DEV === 'true' || process.env.NODE_ENV !== 'production'
    ? 'development'
    : 'production',
  tracesSampleRate: 0.2,
})
