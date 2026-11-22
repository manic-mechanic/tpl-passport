<template>
  <ExploreBadgeSuggestions @open-branch="explore?.openBranch" />
</template>

<script setup lang="ts">
import { exploreContextKey } from '~/lib/exploreRoutes'

const explore = inject(exploreContextKey)
</script>
