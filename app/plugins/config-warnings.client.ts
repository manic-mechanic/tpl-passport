export default defineNuxtPlugin(() => {
  const { public: { isDev, posthogKey, authBase } } = useRuntimeConfig()
  if (isDev) return

  if (!authBase || !String(authBase).trim()) {
    console.warn('[config] NUXT_PUBLIC_AUTH_BASE is empty in non-dev mode.')
  } else if (!/^https?:\/\//i.test(String(authBase))) {
    console.warn('[config] NUXT_PUBLIC_AUTH_BASE should be an absolute http(s) URL.')
  }

  if (!posthogKey) {
    console.warn('[config] NUXT_PUBLIC_POSTHOG_KEY is empty in non-dev mode.')
  }
})
