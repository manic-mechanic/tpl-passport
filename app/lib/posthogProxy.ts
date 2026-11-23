// PostHog is reached through this path on our own domain, so content blockers
// that block posthog.com (Wipr, AdGuard, 1Blocker, Brave) don't drop events.
// nuxt.config.ts rewrites it to PostHog at Vercel's edge. Not an obvious
// analytics name, which blockers would catch too.
export const POSTHOG_PROXY_PATH = '/ink'

// PostHog's US region: events and flags, and the SDK's static assets.
export const POSTHOG_API_HOST = 'https://us.i.posthog.com'
export const POSTHOG_ASSETS_HOST = 'https://us-assets.i.posthog.com'
// Where PostHog links (toolbar, session links) point.
export const POSTHOG_UI_HOST = 'https://us.posthog.com'
