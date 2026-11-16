import * as Sentry from '@sentry/nuxt'

export interface ServerErrorContext {
  area?: string
  operation?: string
  [key: string]: unknown
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { message: String(error) }
}

export function reportServerError(error: unknown, context: ServerErrorContext = {}): void {
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
