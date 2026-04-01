import { physicalBranches, branchesByAlphaPage } from './useRegion.js'

// compassPoints/compassBranches live here — badge logic and the Navigator detail view use them
export const compassPoints = (() => {
  const geo = physicalBranches.filter(b => b.Lat != null && b.Long != null)
  let n = geo[0], s = geo[0], e = geo[0], w = geo[0]
  for (const b of geo) {
    if (b.Lat  > n.Lat)  n = b
    if (b.Lat  < s.Lat)  s = b
    if (b.Long > e.Long) e = b
    if (b.Long < w.Long) w = b
  }
  return { n: n.BranchCode, s: s.BranchCode, e: e.BranchCode, w: w.BranchCode }
})()

export const compassBranches = new Set(Object.values(compassPoints))

export function maxBranchesInOneDay(checkIns) {
  const byDay = {}
  for (const c of checkIns) {
    const day = new Date(c.timestamp).toLocaleDateString('en-CA')
    if (!byDay[day]) byDay[day] = new Set()
    byDay[day].add(c.branchCode)
  }
  const sizes = Object.values(byDay).map(s => s.size)
  return sizes.length ? Math.max(...sizes) : 0
}

export function branchVisitCounts(checkIns) {
  const counts = {}
  for (const c of checkIns) counts[c.branchCode] = (counts[c.branchCode] ?? 0) + 1
  return counts
}

export function homeVisitCount(counts, homeBranch) {
  return homeBranch ? (counts[homeBranch] ?? 0) : 0
}

export function maxNonHomeVisitCount(counts, homeBranch) {
  let max = 0
  for (const [code, count] of Object.entries(counts)) {
    if (code !== homeBranch && count > max) max = count
  }
  return max
}

export function fullyDocumentedCount(checkIns) {
  return checkIns.filter(c => c.note?.trim() && c.hasPhoto).length
}

const fmtDate = ts => new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })

// Returns the date the Nth unique branch was visited (oldest-first), or null.
function nthUniqueDate(checkIns, n) {
  const sorted = [...checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const seen = new Set()
  for (const ci of sorted) {
    if (!seen.has(ci.branchCode)) {
      seen.add(ci.branchCode)
      if (seen.size === n) return fmtDate(ci.timestamp)
    }
  }
  return null
}

// Builds the context object passed to each badge's earned/stat/progress functions.
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
// Use this in components/pages instead of calling buildBadgeCtx manually.
export function useBadgeCtx() {
  const passport = usePassportStore()
  return computed(() => buildBadgeCtx({
    checkIns:            passport.checkIns,
    visitedBranchCodes:  passport.visitedBranchCodes,
    completedChallenges: passport.completedChallenges,
    homeBranch:          passport.profile.homeBranch,
  }))
}

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

export const BADGES = [
  { id: 'first',         shape: 'octagon', title: 'First Stamp',    label: '1st', desc: 'Check in at your first branch',
    earned:   ctx => ctx.visitCount >= 1,
    progress: ctx => ({ current: ctx.visitCount, total: 1 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 1),
    suggest:  ()  => ({ pct: 0, message: 'Check in at your first branch', branches: [] }) },

  { id: 'page_turner',   shape: 'circle',  title: 'Page Turner',                  desc: 'Visit one branch on each page',
    earned: ctx => branchesByAlphaPage.every(page => page.branches.some(b => ctx.visitedBranchCodes.has(b.BranchCode))),
    suggest: ctx => {
      const emptyPages = branchesByAlphaPage.filter(page =>
        !page.branches.some(b => ctx.visitedBranchCodes.has(b.BranchCode))
      )
      const visitedPageCount = branchesByAlphaPage.length - emptyPages.length
      return {
        pct:      visitedPageCount / branchesByAlphaPage.length,
        message:  `Visit a branch on ${emptyPages.length} more page${emptyPages.length === 1 ? '' : 's'}`,
        branches: emptyPages.slice(0, 3).map(p => p.branches[0]),
      }
    } },

  { id: 'day_tripper',   shape: 'star',    title: 'Day Tripper',                  desc: 'Visit 2+ branches in one day',
    earned:   ctx => ctx.maxBranchesInOneDay >= 2,
    stat:     ctx => ctx.maxBranchesInOneDay,
    progress: ctx => ({ current: ctx.maxBranchesInOneDay, total: 2 }),
    earnedAt: ctx => {
      const sorted = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const byDay = {}
      for (const ci of sorted) {
        const day = new Date(ci.timestamp).toLocaleDateString('en-CA')
        if (!byDay[day]) byDay[day] = new Set()
        byDay[day].add(ci.branchCode)
        if (byDay[day].size >= 2) return fmtDate(ci.timestamp)
      }
      return null
    },
    suggest: ctx => ({
      pct:      ctx.maxBranchesInOneDay / 2,
      message:  'Check in at 2 or more branches in one day',
      branches: [],
    }) },

  { id: 'explorer',      shape: 'octagon', title: 'Explorer',       label: '10',  desc: 'Visit 10 branches',
    earned:   ctx => ctx.visitCount >= 10,
    progress: ctx => ({ current: ctx.visitCount, total: 10 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 10),
    suggest:  ctx => {
      const rem = 10 - ctx.visitCount
      return { pct: ctx.visitCount / 10, message: `${rem} more branch${rem === 1 ? '' : 'es'} to go`, branches: [] }
    } },

  { id: 'page_filler',   shape: 'circle',  title: 'Page Filler',    label: '★',   desc: 'Fill one complete page',
    earned: ctx => branchesByAlphaPage.some(page => page.branches.every(b => ctx.visitedBranchCodes.has(b.BranchCode))),
    suggest: ctx => {
      const pages = branchesByAlphaPage
        .map(page => {
          const visitedCount = page.branches.filter(b => ctx.visitedBranchCodes.has(b.BranchCode)).length
          return { page, visitedCount, pct: visitedCount / page.branches.length }
        })
        .filter(p => p.pct < 1)
        .sort((a, b) => b.pct - a.pct)
      if (!pages.length) return { pct: 1, message: '', branches: [] }
      const best = pages[0]
      const unvisited = best.page.branches.filter(b => !ctx.visitedBranchCodes.has(b.BranchCode))
      return {
        pct:      best.pct,
        message:  `Fill the ${best.page.label} page — ${best.visitedCount}/${best.page.branches.length} done`,
        branches: unvisited.slice(0, 3),
      }
    } },

  // STASHED: quest_master — restore when FEATURES.challenges = true
  // { id: 'quest_master',  shape: 'star',    title: 'Quest Master',   label: '✓',  desc: 'Complete all challenges at any branch',
  //   earned: ctx => physicalBranches.some(b =>
  //     ctx.completedChallenges.includes(`${b.BranchCode}:0`) &&
  //     ctx.completedChallenges.includes(`${b.BranchCode}:1`) &&
  //     ctx.completedChallenges.includes(`${b.BranchCode}:2`)) },
  // END STASHED: quest_master

  { id: 'archivist',     shape: 'star',    title: 'Archivist',      label: '✎',   desc: 'Add a note and photo to any check-in',
    earned:   ctx => ctx.fullyDocumentedCount >= 1,
    stat:     ctx => ctx.fullyDocumentedCount,
    progress: ctx => ({ current: Math.min(ctx.fullyDocumentedCount, 1), total: 1 }),
    earnedAt: ctx => {
      const ci = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).find(c => c.note?.trim() && c.hasPhoto)
      return ci ? fmtDate(ci.timestamp) : null
    },
    suggest: () => ({ pct: 0, message: 'Add a note and photo to any check-in', branches: [] }) },

  { id: 'adventurer',    shape: 'octagon', title: 'Adventurer',     label: '25',  desc: 'Visit 25 branches',
    earned:   ctx => ctx.visitCount >= 25,
    progress: ctx => ({ current: ctx.visitCount, total: 25 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 25),
    suggest:  ctx => ({ pct: ctx.visitCount / 25, message: `${25 - ctx.visitCount} more branches to go`, branches: [] }) },

  { id: 'navigator',     shape: 'circle',  title: 'Navigator',                    desc: 'Visit the furthest branch in each direction: Goldhawk Park (N), Port Union (E), Long Branch (S), Humberwood (W)',
    earned: ctx => [...compassBranches].every(code => ctx.visitedBranchCodes.has(code)),
    suggest: ctx => {
      const remaining = Object.values(compassPoints)
        .filter(code => !ctx.visitedBranchCodes.has(code))
        .map(code => physicalBranches.find(b => b.BranchCode === code))
        .filter(Boolean)
      return {
        pct:      (4 - remaining.length) / 4,
        message:  `Visit ${remaining.length} more compass branch${remaining.length === 1 ? '' : 'es'}`,
        branches: remaining,
      }
    } },

  { id: 'familiar_face', shape: 'star',    title: 'Familiar Face',                desc: 'Check in at your home branch 5 times',
    earned:   ctx => ctx.homeVisitCount >= 5,
    stat:     ctx => ctx.homeVisitCount,
    progress: ctx => ({ current: ctx.homeVisitCount, total: 5 }),
    earnedAt: ctx => {
      if (!ctx.homeBranch) return null
      const sorted = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      let count = 0
      for (const ci of sorted) {
        if (ci.branchCode === ctx.homeBranch && ++count === 5)
          return fmtDate(ci.timestamp)
      }
      return null
    },
    suggest: ctx => {
      const home = physicalBranches.find(b => b.BranchCode === ctx.homeBranch)
      if (home) {
        const rem = 5 - ctx.homeVisitCount
        return { pct: ctx.homeVisitCount / 5, message: `${rem} more visit${rem === 1 ? '' : 's'} to ${home.BranchName}`, branches: [home] }
      }
      return { pct: 0, message: 'Set a home branch in Settings to track this', branches: [] }
    } },

  { id: 'globetrotter',  shape: 'octagon', title: 'Globetrotter',   label: '50',  desc: 'Visit 50 branches',
    earned:   ctx => ctx.visitCount >= 50,
    progress: ctx => ({ current: ctx.visitCount, total: 50 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 50),
    suggest:  ctx => ({ pct: ctx.visitCount / 50, message: `${50 - ctx.visitCount} more branches to go`, branches: [] }) },

  { id: 'complete',      shape: 'octagon', title: 'Full Passport',  label: '100', desc: `Visit all ${physicalBranches.length} branches`,
    earned:   ctx => ctx.visitCount >= 100,
    progress: ctx => ({ current: ctx.visitCount, total: 100 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 100),
    suggest:  ctx => ({ pct: ctx.visitCount / 100, message: `${100 - ctx.visitCount} more branches to go`, branches: [] }) },

  { id: 'return_visitor', shape: 'star',   title: 'Return Visitor',               desc: 'Check in at any non-home branch 3+ times',
    earned:   ctx => ctx.maxNonHomeVisitCount >= 3,
    stat:     ctx => ctx.maxNonHomeVisitCount,
    progress: ctx => ({ current: ctx.maxNonHomeVisitCount, total: 3 }),
    earnedAt: ctx => {
      const sorted = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const counts = {}
      for (const ci of sorted) {
        if (ci.branchCode === ctx.homeBranch) continue
        counts[ci.branchCode] = (counts[ci.branchCode] ?? 0) + 1
        if (counts[ci.branchCode] === 3)
          return fmtDate(ci.timestamp)
      }
      return null
    },
    suggest: ctx => {
      const best = Object.entries(ctx.branchVisitCounts)
        .filter(([code, count]) => count < 3 && code !== ctx.homeBranch)
        .sort((a, b) => b[1] - a[1])[0]
      if (best) {
        const [code, count] = best
        const branch = physicalBranches.find(b => b.BranchCode === code)
        if (branch) {
          const rem = 3 - count
          return { pct: ctx.maxNonHomeVisitCount / 3, message: `${rem} more visit${rem === 1 ? '' : 's'} to ${branch.BranchName}`, branches: [branch] }
        }
      }
      return { pct: 0, message: 'Check in at any branch 3 times', branches: [] }
    } },
]
