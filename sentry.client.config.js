import * as Sentry from '@sentry/nuxt'
import { sentryEnvironment } from './app/lib/sentryEnvironment'
import { sentryDataCollection } from './app/lib/sentryDataCollection'
import { sentryIgnoreErrors } from './app/lib/sentryIgnore'

// The browser bundle has no process.env, so read the DSN from runtime config
// (set via NUXT_PUBLIC_SENTRY_DSN).
const { public: { isDev, sentry, vercelEnv, vercelTargetEnv } } = useRuntimeConfig()

Sentry.init({
  dsn: sentry?.dsn || undefined,
  environment: sentryEnvironment({ vercelEnv, vercelTargetEnv, isDev: !!isDev }),
  dataCollection: sentryDataCollection,
  ignoreErrors: sentryIgnoreErrors,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
})

// Session Replay is added once the app is up rather than in init(): it's the
// bulk of the SDK. Replays of errors in the first moments after load are lost.
onNuxtReady(async () => {
  try {
    const { replayIntegration } = await import('./app/lib/sentryReplay')
    Sentry.addIntegration(replayIntegration())
  } catch {
    // Replay is a nice-to-have; errors are still reported without it.
  }
})
