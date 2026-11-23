// Whether this build sends analytics to PostHog. Only Vercel production
// deploys do: previews and custom environments (dev.librarypassport.ca) are
// production builds too, but VERCEL_ENV is 'preview' for them, so their
// events stay out of the production project. Local and CI builds have no
// VERCEL_ENV and send nothing.
export function analyticsEnabled(opts: { vercelEnv?: string | null, isDev: boolean }): boolean {
  return !opts.isDev && opts.vercelEnv === 'production'
}
