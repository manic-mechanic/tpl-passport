// The auth server only accepts requests from the site's own domain. Every
// Vercel deployment (production ones included) is also served from its own
// *.vercel.app address, and Vercel's post-deploy checks load those addresses
// with a headless browser, so the session check fails there on every deploy.
// Those failures say nothing about whether auth works for users, so they are
// not reported.
export function isAuthReachableFrom(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host !== 'vercel.app' && !host.endsWith('.vercel.app')
}
