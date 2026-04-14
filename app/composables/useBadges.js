import { BADGES, compassPoints, compassBranches, physicalBranches, branchesByAlphaPage } from '@tpl-passport/shared'
export { BADGES, compassPoints, compassBranches }

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

// Internal helpers for buildBadgeCtx

function maxBranchesInOneDay(checkIns) {
  const byDay = {}
  for (const c of checkIns) {
    const day = new Date(c.timestamp).toLocaleDateString('en-CA')
    if (!byDay[day]) byDay[day] = new Set()
    byDay[day].add(c.branchCode)
  }
  const sizes = Object.values(byDay).map(s => s.size)
  return sizes.length ? Math.max(...sizes) : 0
}

function branchVisitCounts(checkIns) {
  const counts = {}
  for (const c of checkIns) counts[c.branchCode] = (counts[c.branchCode] ?? 0) + 1
  return counts
}

function homeVisitCount(counts, homeBranch) {
  return homeBranch ? (counts[homeBranch] ?? 0) : 0
}

function maxNonHomeVisitCount(counts, homeBranch) {
  let max = 0
  for (const [code, count] of Object.entries(counts)) {
    if (code !== homeBranch && count > max) max = count
  }
  return max
}

// Web check-ins use `hasPhoto` flag; RN uses `photoUri` — keep this version here.
function fullyDocumentedCount(checkIns) {
  return checkIns.filter(c => c.note?.trim() && c.hasPhoto).length
}

export function buildBadgeCtx({ checkIns, visitedBranchCodes, completedChallenges, homeBranch }) {
  const counts = branchVisitCounts(checkIns)
  return {
    visitCount:            visitedBranchCodes.size,
    branchVisitCounts:     counts,
    maxBranchesInOneDay:   maxBranchesInOneDay(checkIns),
    homeVisitCount:        homeVisitCount(counts, homeBranch),
    maxNonHomeVisitCount:  maxNonHomeVisitCount(counts, homeBranch),
    fullyDocumentedCount:  fullyDocumentedCount(checkIns),
    visitedBranchCodes,
    completedChallenges,
    checkIns,
    homeBranch,
  }
}

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
