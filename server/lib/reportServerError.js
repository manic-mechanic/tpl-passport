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
  console.error('[server-error]', {
    area: context.area ?? 'server',
    operation: context.operation ?? 'unknown',
    ...context,
    error: formatError(error),
  })
}
