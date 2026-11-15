import { usePassportStore } from '~/stores/passport'

// Applies the manual theme choice (data-theme on <html>) app-wide. Lives in a
// plugin rather than app.vue so it also applies when error.vue replaces app.vue.
export default defineNuxtPlugin(() => {
  const passport = usePassportStore()
  watchEffect(() => {
    const t = passport.profile.theme
    if (t === 'dark')       document.documentElement.setAttribute('data-theme', 'dark')
    else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else                    document.documentElement.removeAttribute('data-theme')
  })
})
