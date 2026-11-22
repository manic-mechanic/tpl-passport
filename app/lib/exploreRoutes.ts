import type { InjectionKey, Ref } from 'vue'
import type { Branch } from '@tpl-passport/shared'
import type { LocationQuery, RouteLocationNormalizedGeneric, RouteLocationRaw } from 'vue-router'

// Each Explore tab has its own route under /explore (app/pages/explore/).
export const EXPLORE_TABS = [
  { path: '/explore/branches', label: 'Branches', analytics: 'near-me' },
  { path: '/explore/trips', label: 'Day trips', analytics: 'routes' },
  { path: '/explore/events', label: 'What\'s on', analytics: 'events' },
  { path: '/explore/extra', label: 'Extra Credit', analytics: 'working-toward' },
] as const

// The tab a path belongs to, e.g. /explore/trips/walking → Day trips.
export function exploreTabFor(path: string) {
  return EXPLORE_TABS.find(t => path === t.path || path.startsWith(t.path + '/'))
}

export const TRIP_MODES = ['transit', 'walking'] as const
export type TripMode = typeof TRIP_MODES[number]

// Where an old /explore link lands: /explore?tab=routes&mode=walk was the
// walking day trips, and so on. Plain /explore opens Branches. Other query
// parameters and the hash are kept.
export function exploreRedirect(to: { query: LocationQuery, hash: string }): RouteLocationRaw {
  const { tab, mode, ...query } = to.query
  let path = '/explore/branches'
  if (tab === 'routes') path = mode === 'walk' ? '/explore/trips/walking' : '/explore/trips/transit'
  else if (tab === 'events') path = '/explore/events'
  else if (tab === 'working-toward') path = '/explore/extra'
  return { path, query, hash: to.hash }
}

// Redirects for routes that are not pages: /explore and /explore/trips pick
// a tab, and /branches (the old all-branches page) is the Branches tab.
export const exploreRedirectRoutes = [
  { path: '/branches', redirect: (to: RouteLocationNormalizedGeneric) => ({ path: '/explore/branches', query: to.query, hash: to.hash }) },
  { path: '/explore/trips', redirect: (to: RouteLocationNormalizedGeneric) => ({ path: '/explore/trips/transit', query: to.query, hash: to.hash }) },
]

// Shared by the Explore tabs: the branch sheet lives on the Explore page.
export interface ExploreContext {
  openBranch: (branch: Branch) => void
  userLat: Ref<number | null>
  userLng: Ref<number | null>
}
export const exploreContextKey: InjectionKey<ExploreContext> = Symbol('explore')
