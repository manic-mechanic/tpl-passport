// Sentry environment name. On Vercel this is the deployment's own environment
// (production, preview or development), so preview errors stay out of
// production even when previews run with dev features off. Elsewhere it
// falls back to the isDev flag.
const VERCEL_ENVS = new Set(['production', 'preview', 'development'])

export function sentryEnvironment(opts: { vercelEnv?: string | null, isDev: boolean }): string {
  if (opts.vercelEnv && VERCEL_ENVS.has(opts.vercelEnv)) return opts.vercelEnv
  return opts.isDev ? 'development' : 'production'
}
