import * as Sentry from '@sentry/nuxt'

function toError(error, fallbackMessage) {
  if (error instanceof Error) return error
  return new Error(fallbackMessage)
}

// Non-blocking reporting helper for best-effort sync flows.
export function reportError(error, context = {}) {
  const err = toError(error, context.message ?? 'Unknown app error')
  Sentry.captureException(err, {
    tags: {
      area: context.area ?? 'app',
      operation: context.operation ?? 'unknown',
      severity: 'non_blocking',
    },
    extra: context,
  })
}
