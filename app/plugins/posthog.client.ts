import type { PostHog } from 'posthog-js'

// What the app calls on $posthog. Kept to these two so the SDK can load after
// first render: posthog-js is the largest library in the app (~170 KB min).
export interface Analytics {
  capture: (event: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

export default defineNuxtPlugin(() => {
  const { public: { isDev, posthogKey, posthogHost } } = useRuntimeConfig()

  // $posthog is null in dev, so callers use $posthog?.capture(...).
  if (isDev) return { provide: { posthog: null as Analytics | null } }

  // Calls made before the SDK has loaded wait here, in order, and are replayed
  // once it's ready. Events keep the time they happened.
  let client: PostHog | null = null
  let failed = false
  const queue: ((posthog: PostHog) => void)[] = []
  const run = (call: (posthog: PostHog) => void) => {
    if (client) call(client)
    else if (!failed) queue.push(call)
  }

  const analytics: Analytics = {
    capture(event, properties) {
      if (client) {
        client.capture(event, properties)
        return
      }
      const timestamp = new Date()
      run(posthog => posthog.capture(event, properties, { timestamp }))
    },
    reset() {
      run(posthog => posthog.reset())
    },
  }

  const passport = usePassportStore()
  const anonymousId = passport.anonymousId

  const router = useRouter()
  router.afterEach((to) => {
    analytics.capture('$pageview', { path: to.fullPath })
  })

  onNuxtReady(async () => {
    try {
      const { default: posthog } = await import('posthog-js')
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false,  // fired manually via router for SPA
        capture_pageleave: true,
        session_recording: {
          maskAllInputs: true,
        },
      })
      if (anonymousId) {
        posthog.identify(anonymousId)
      }
      client = posthog
      for (const call of queue.splice(0)) call(posthog)
    } catch {
      // Chunk failed to load (offline, deploy swapped mid-visit): analytics is
      // best-effort, so drop what's queued rather than hold it forever.
      failed = true
      queue.length = 0
    }
  })

  return { provide: { posthog: analytics as Analytics | null } }
})
