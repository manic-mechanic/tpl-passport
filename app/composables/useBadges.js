import { BADGES, buildBadgeCtx, compassPoints, compassBranches } from '@tpl-passport/shared'
export { BADGES, buildBadgeCtx, compassPoints, compassBranches }

// Badge background gradients for suggestion cards in /explore.
const BADGE_BG = {
  first:          'radial-gradient(circle, #7ab4ec 0%, #3878c4 100%)',
  explorer:       'radial-gradient(circle, #4a90d9 0%, #0048a8 100%)',
  adventurer:     'radial-gradient(circle, #2e74c8 0%, #0030a0 100%)',
  globetrotter:   'radial-gradient(circle, #1e60b4 0%, #001e78 100%)',
  complete:       'radial-gradient(circle, #001c70 0%, #000640 100%)',
  page_filler:    'radial-gradient(circle, #52cc84 0%, #1a6640 100%)',
  page_turner:    'radial-gradient(circle, #52cc84 0%, #1a6640 100%)',
  day_tripper:    'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  archivist:      'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  familiar_face:  'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  return_visitor: 'radial-gradient(circle, #eaa040 0%, #9e3c14 100%)',
  navigator:      'radial-gradient(circle, #5a8fd8 0%, #1a4490 100%)',
}

export function badgeBg(id) { return BADGE_BG[id] ?? 'var(--color-border)' }

// Reactive composable — returns a computed badge context from the passport store.
export function useBadgeCtx() {
  const passport = usePassportStore()
  return computed(() => buildBadgeCtx({
    checkIns:            passport.checkIns,
    visitedBranchCodes:  passport.visitedBranchCodes,
    completedChallenges: passport.completedChallenges,
    homeBranch:          passport.profile.homeBranch,
  }))
}
