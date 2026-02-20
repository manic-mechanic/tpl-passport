<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <NuxtPage :transition="{ name: 'page' }" />
    <BottomNav />
  </div>
</template>
