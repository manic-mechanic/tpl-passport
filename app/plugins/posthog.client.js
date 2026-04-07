import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const { public: { isDev, posthogKey, posthogHost } } = useRuntimeConfig()

  if (isDev) return { provide: { posthog: null } }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,  // fired manually via router for SPA
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,
    },
  })

  const passport = usePassportStore()
  if (passport.anonymousId) {
    posthog.identify(passport.anonymousId)
  }

  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture('$pageview', { path: to.fullPath })
  })

  return { provide: { posthog } }
})
