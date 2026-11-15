// Unknown /api/* paths return a real 404 instead of falling through to the
// SPA HTML shell. Named routes in this directory take precedence over this.
export default defineEventHandler(() => {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
