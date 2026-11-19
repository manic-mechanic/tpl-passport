import { usePassportStore } from '~/stores/passport'

// Applies the manual theme choice (data-theme on <html>) app-wide. Lives in a
// plugin rather than app.vue so it also applies when error.vue replaces app.vue.
//
// It also keeps theme-color in step: the installed iOS app paints its status
// bar from theme-color, whose tags (nuxt.config.ts) follow the system
// scheme, so a manual Light or Dark would otherwise leave the bar the other
// theme's navy. These entries replace those tags (same name and media).
const NAVY = { light: '#001c71', dark: '#111850' } as const

export default defineNuxtPlugin(() => {
  const passport = usePassportStore()

  watchEffect(() => {
    const t = passport.profile.theme
    if (t === 'dark')       document.documentElement.setAttribute('data-theme', 'dark')
    else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else                    document.documentElement.removeAttribute('data-theme')
  })

  useHead({
    meta: computed(() => {
      const t = passport.profile.theme
      if (t !== 'dark' && t !== 'light') return []
      return [
        { name: 'theme-color', content: NAVY[t], media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: NAVY[t], media: '(prefers-color-scheme: dark)' },
      ]
    }),
  })
})
