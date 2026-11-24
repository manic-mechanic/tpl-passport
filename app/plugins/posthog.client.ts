import type { PostHog } from 'posthog-js'
import { analyticsEnabled } from '~/lib/analyticsEnabled'
import { ensureArms, homeStage, isPassportMade } from '~/lib/onboarding'

// What the app calls on $posthog. Kept to these so the SDK can load after
// first render: posthog-js is the largest library in the app (~170 KB min).
export interface Analytics {
  capture: (event: string, properties?: Record<string, unknown>) => void
  // Super properties, sent with every event after this call.
  register: (properties: Record<string, unknown>) => void
  reset: () => void
}

export default defineNuxtPlugin(() => {
  const { public: { isDev, vercelEnv, posthogKey, posthogHost } } = useRuntimeConfig()
  const passport = usePassportStore()

  // Onboarding test arms (lib/onboarding): picked on a first visit, before
  // any page draws, so Home and the first pageview both have them.
  const arms = ensureArms(homeStage(passport.checkIns.length, isPassportMade(passport.profile)))

  // $posthog is null outside Vercel production (dev, previews, custom
  // environments, local and CI builds), so callers use $posthog?.capture(...).
  if (!analyticsEnabled({ vercelEnv, isDev })) return { provide: { posthog: null as Analytics | null } }

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
      // Replayed later, so pin what PostHog would otherwise read at send
      // time: when it happened and the page it happened on.
      const timestamp = new Date()
      const page = { $current_url: window.location.href, $pathname: window.location.pathname }
      run(posthog => posthog.capture(event, { ...page, ...properties }, { timestamp }))
    },
    register(properties) {
      run(posthog => posthog.register(properties))
    },
    reset() {
      run(posthog => posthog.reset())
    },
  }

  const anonymousId = passport.anonymousId

  // Queued ahead of every event, so the first pageview carries the arms too.
  if (arms) analytics.register({ ...arms })

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
