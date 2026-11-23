import type { PostHog } from 'posthog-js'
import { analyticsEnabled } from '~/lib/analyticsEnabled'
import { INTERNAL_PERSON_PROPERTY, isInternalEmail, parseEmailHashes } from '~/lib/internalUser'
import { POSTHOG_PROXY_PATH, POSTHOG_UI_HOST } from '~/lib/posthogProxy'
import { useAccount } from '~/composables/useAuthState'

// What the app calls on $posthog. Kept to these two so the SDK can load after
// first render: posthog-js is the largest library in the app (~170 KB min).
export interface Analytics {
  capture: (event: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

export default defineNuxtPlugin(() => {
  const { public: { isDev, vercelEnv, posthogKey, internalEmailHashes } } = useRuntimeConfig()

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

  // Signed in as the project owner (see lib/internalUser.ts): mark this
  // device's person as internal, so the test-account filter leaves it out.
  const internalHashes = parseEmailHashes(String(internalEmailHashes ?? ''))
  if (internalHashes.size > 0) {
    const account = useAccount()
    watch(() => account.value?.email, async (email) => {
      if (email && await isInternalEmail(email, internalHashes)) {
        run(posthog => posthog.setPersonProperties({ [INTERNAL_PERSON_PROPERTY]: true }))
      }
    }, { immediate: true })
  }

  onNuxtReady(async () => {
    try {
      const { default: posthog } = await import('posthog-js')
      posthog.init(posthogKey, {
        // Through our own domain, past content blockers (lib/posthogProxy.ts).
        api_host: POSTHOG_PROXY_PATH,
        ui_host: POSTHOG_UI_HOST,
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
