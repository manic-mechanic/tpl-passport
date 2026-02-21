<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <BottomNav />
  </div>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'

const passport = usePassportStore()

watchEffect(() => {
  if (!import.meta.client) return
  const t = passport.profile.theme
  if (t === 'dark')  document.documentElement.setAttribute('data-theme', 'dark')
  else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
})
</script>
