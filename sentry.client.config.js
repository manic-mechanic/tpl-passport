import * as Sentry from '@sentry/nuxt'
import { sentryEnvironment } from './app/lib/sentryEnvironment'
import { sentryDataCollection } from './app/lib/sentryDataCollection'
import { sentryIgnoreErrors } from './app/lib/sentryIgnore'

// The browser bundle has no process.env, so read the DSN from runtime config
// (set via NUXT_PUBLIC_SENTRY_DSN, read at build time on Vercel).
const { public: { appVersion, isDev, sentry, vercelEnv, vercelTargetEnv } } = useRuntimeConfig()
const environment = sentryEnvironment({ vercelEnv, vercelTargetEnv, isDev: !!isDev })

Sentry.init({
  dsn: sentry?.dsn || undefined,
  environment,
  dataCollection: sentryDataCollection,
  ignoreErrors: sentryIgnoreErrors,
  // Trace every production page load, so a slow one shows up with its
  // timings. Dev and preview builds keep sampling so they don't use up the
  // span quota that production traces need.
  tracesSampleRate: environment === 'production' ? 1 : 0.2,
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0,
  // package.json's version, so an error can be traced to a release (#99).
  // Sentry's own `release` stays the commit SHA the bundler plugin sets, which
  // the uploaded source maps and deploys are tied to.
  initialScope: { tags: { app_version: appVersion } },
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
