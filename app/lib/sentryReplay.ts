// Loaded on its own (see sentry.client.config.js): Session Replay is ~220 KB,
// the largest part of the Sentry SDK, and isn't needed for first render.
export { replayIntegration } from '@sentry/nuxt'
