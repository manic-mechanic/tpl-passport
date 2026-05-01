import * as Sentry from '@sentry/nuxt'

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error
  return new Error(fallbackMessage)
}

// Non-blocking reporting helper for best-effort sync flows.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const message = typeof context.message === 'string' ? context.message : 'Unknown app error'
  const err = toError(error, message)
  Sentry.captureException(err, {
    tags: {
      area: typeof context.area === 'string' ? context.area : 'app',
      operation: typeof context.operation === 'string' ? context.operation : 'unknown',
      severity: 'non_blocking',
    },
    extra: context,
  })
}
