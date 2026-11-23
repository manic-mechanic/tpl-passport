<template>
  <main class="page-content">
    <template v-if="branch">
      <header class="branch-header">
        <NuxtLink :to="backTo" class="back-link">
          <IconBack />
          {{ backLabel }}
        </NuxtLink>
      </header>
      <BranchDetail
        :branch="branch"
        :source="source"
        :effective-source="effectiveSource"
        :nearby-as-route="true"
      />
    </template>
    <p v-else class="empty-state">
      We couldn't find that branch.<br>
      <NuxtLink to="/explore/branches">Browse all branches</NuxtLink>
    </p>
  </main>
</template>

<script setup lang="ts">
import type { Branch } from '@tpl-passport/shared'
import branchData from '#data/branch-info.json'
import IconBack from '~/components/icons/IconBack.vue'

const route = useRoute()
const router = useRouter()

const branch = computed(() => (branchData as Branch[]).find(b => b.BranchCode === route.params.id))

const histBack = computed(() => {
  const back = router.options.history.state?.back
  return typeof back === 'string' ? back : ''
})
const histOriginalSource = computed(() => {
  const original = router.options.history.state?.originalSource
  return typeof original === 'string' ? original : null
})

function resolveNav(path: string) {
  if (!path || path === '/') return { to: '/',          label: 'Home'      }
  if (path.startsWith('/history'))   return { to: path,        label: 'History'   }
  if (path.startsWith('/passport'))  return { to: path,        label: 'Passport'  }
  if (path.startsWith('/explore'))   return { to: path,        label: 'Explore'   }
  if (path.startsWith('/check-in'))  return { to: '/check-in', label: 'Check in'  }
  if (path.startsWith('/day-trips')) return { to: path,        label: 'Day trips' }
  if (path.startsWith('/visit/'))    return { to: path,        label: 'Visit'     }
  return { to: '/explore', label: 'Explore' }
}

const backNav = computed(() => {
  const back = histBack.value
  if (back.startsWith('/branch/')) return resolveNav(histOriginalSource.value ?? '/explore')
  return resolveNav(back)
})

const backTo    = computed(() => backNav.value.to)
const backLabel = computed(() => backNav.value.label)

// The effective origin of this branch page — forwarded through nearby-branch chains.
const effectiveSource = computed(() => {
  const back = histBack.value
  if (back.startsWith('/branch/') && histOriginalSource.value) return histOriginalSource.value
  return backNav.value.to
})

const source = computed(() => {
  const back = histBack.value
  if (!back) return 'direct'
  if (back.startsWith('/history'))  return 'history'
  if (back.startsWith('/passport')) return 'passport'
  if (back.startsWith('/check-in')) return 'check-in'
  if (back.startsWith('/branch/'))  return 'nearby'
  // A visit page passes on where it was opened from, so branch views keep
  // the source they had when the visit was a panel on History or Check in.
  if (back.startsWith('/visit/')) {
    const from = router.options.history.state?.visitSource
    return from === 'history' || from === 'check-in' ? from : 'visit'
  }
  if (back === '/')                 return 'home'
  return 'explore'
})
</script>

<style scoped>
.branch-header {
  padding: 20px 0 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tpl-blue);
  margin-bottom: 4px;
}

.back-link svg {
  width: 16px;
  height: 16px;
}
</style>
