<template>
  <ExploreEvents :user-lat="explore?.userLat.value ?? null" :user-lng="explore?.userLng.value ?? null"
                 @open-branch="explore?.openBranch"
  />
</template>

<script setup lang="ts">
import { exploreContextKey } from '~/lib/exploreRoutes'

const explore = inject(exploreContextKey)
</script>
