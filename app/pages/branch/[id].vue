<template>
  <main class="page-content">
    <template v-if="branch">
      <header class="branch-header">
        <NuxtLink :to="backTo" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {{ backLabel }}
        </NuxtLink>
      </header>
      <BranchDetail :branch="branch" />
    </template>
    <p v-else class="empty-state">Branch not found.</p>
  </main>
</template>

<script setup>
import branchData from '#data/updated-branch-info.json'

const route  = useRoute()
const router = useRouter()

const branch = computed(() => branchData.find(b => b.BranchCode === route.params.id))

const backTo = computed(() => {
  const back = router.options.history.state?.back ?? ''
  if (back.startsWith('/history'))  return back
  if (back.startsWith('/passport')) return back
  if (back.startsWith('/explore'))  return back
  return '/explore'
})
const backLabel = computed(() => {
  if (backTo.value.startsWith('/history'))  return 'History'
  if (backTo.value.startsWith('/passport')) return 'Passport'
  return 'Explore'
})
</script>

<style scoped>
.branch-header { padding: 20px 0 0; }
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  margin-bottom: 4px;
}
.back-link svg { width: 16px; height: 16px; }
</style>
