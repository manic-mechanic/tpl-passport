import * as Sentry from '@sentry/nuxt'

function formatError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { message: String(error) }
}

export function reportServerError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error))
  Sentry.captureException(err, {
    tags: {
      area: context.area ?? 'server',
      operation: context.operation ?? 'unknown',
      severity: 'non_blocking',
    },
    extra: context,
  })

  console.error('[server-error]', {
    area: context.area ?? 'server',
    operation: context.operation ?? 'unknown',
    ...context,
    error: formatError(error),
  })
}
