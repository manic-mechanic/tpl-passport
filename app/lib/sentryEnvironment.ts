// Sentry environment name. On Vercel this is the deployment's own environment
// (production, preview, development or a custom environment's name), so preview errors stay out of
// production even when previews run with dev features off. Elsewhere it
// falls back to the isDev flag.
const VERCEL_ENVS = new Set(['production', 'preview', 'development'])

export function sentryEnvironment(opts: { vercelEnv?: string | null, vercelTargetEnv?: string | null, isDev: boolean }): string {
  // VERCEL_TARGET_ENV is production, preview, development or a custom
  // environment's name. It matches the deploy environment Sentry's bundler
  // plugins record, so a custom environment's events don't land in production.
  if (opts.vercelTargetEnv) return opts.vercelTargetEnv
  if (opts.vercelEnv && VERCEL_ENVS.has(opts.vercelEnv)) return opts.vercelEnv
  return opts.isDev ? 'development' : 'production'
}
