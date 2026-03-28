import { physicalBranches, branchesByAlphaPage, compassPoints, compassBranches } from './useRegion.js'

export { compassPoints, compassBranches }

export function maxBranchesInOneDay(checkIns) {
  const byDay = {}
  for (const c of checkIns) {
    const day = c.timestamp.slice(0, 10)
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

// Builds the context object passed to each achievement's earned/stat/progress functions.
export function buildAchievementCtx({ checkIns, visitedBranchCodes, completedChallenges, homeBranch }) {
  const counts = branchVisitCounts(checkIns)
  return {
    visitCount:           visitedBranchCodes.size,
    branchVisitCounts:    counts,
    maxBranchesInOneDay:  maxBranchesInOneDay(checkIns),
    homeVisitCount:       homeVisitCount(counts, homeBranch),
    maxNonHomeVisitCount: maxNonHomeVisitCount(counts, homeBranch),
    visitedBranchCodes,
    completedChallenges,
    checkIns,
    homeBranch,
  }
}

export const ACHIEVEMENTS = [
  { id: 'first',         shape: 'octagon', title: 'First Stamp',    label: '1st', desc: 'Check in at your first branch',
    earned: ctx => ctx.visitCount >= 1,   progress: ctx => ({ current: ctx.visitCount, total: 1 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 1) },
  { id: 'page_turner',   shape: 'circle',  title: 'Page Turner',                  desc: 'Visit one branch on each page',
    earned: ctx => branchesByAlphaPage.every(page => page.branches.some(b => ctx.visitedBranchCodes.has(b.BranchCode))) },
  { id: 'day_tripper',   shape: 'star',    title: 'Day Tripper',                  desc: 'Visit 2+ branches in one day',
    earned: ctx => ctx.maxBranchesInOneDay >= 2,  stat: ctx => ctx.maxBranchesInOneDay,
    progress: ctx => ({ current: ctx.maxBranchesInOneDay, total: 2 }),
    earnedAt: ctx => {
      const sorted = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const byDay = {}
      for (const ci of sorted) {
        const day = ci.timestamp.slice(0, 10)
        if (!byDay[day]) byDay[day] = new Set()
        byDay[day].add(ci.branchCode)
        if (byDay[day].size >= 2) return fmtDate(ci.timestamp)
      }
      return null
    } },

  { id: 'explorer',      shape: 'octagon', title: 'Explorer',       label: '10',  desc: 'Visit 10 branches',
    earned: ctx => ctx.visitCount >= 10,  progress: ctx => ({ current: ctx.visitCount, total: 10 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 10) },
  { id: 'page_filler',   shape: 'circle',  title: 'Page Filler',    label: '★',   desc: 'Fill one complete page',
    earned: ctx => branchesByAlphaPage.some(page => page.branches.every(b => ctx.visitedBranchCodes.has(b.BranchCode))) },
  // STASHED: quest_master — restore when FEATURES.challenges = true
  // { id: 'quest_master',  shape: 'star',    title: 'Quest Master',   label: '✓',  desc: 'Complete all challenges at any branch',
  //   earned: ctx => physicalBranches.some(b =>
  //     ctx.completedChallenges.includes(`${b.BranchCode}:0`) &&
  //     ctx.completedChallenges.includes(`${b.BranchCode}:1`) &&
  //     ctx.completedChallenges.includes(`${b.BranchCode}:2`)) },
  // END STASHED: quest_master
  { id: 'archivist',     shape: 'star',    title: 'Archivist',      label: '✎',   desc: 'Add a note and photo to any check-in',
    earned: ctx => fullyDocumentedCount(ctx.checkIns) >= 1,
    stat:   ctx => fullyDocumentedCount(ctx.checkIns),
    progress: ctx => ({ current: Math.min(fullyDocumentedCount(ctx.checkIns), 1), total: 1 }),
    earnedAt: ctx => {
      const ci = [...ctx.checkIns].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).find(c => c.note?.trim() && c.hasPhoto)
      return ci ? fmtDate(ci.timestamp) : null
    } },

  { id: 'adventurer',    shape: 'octagon', title: 'Adventurer',     label: '25',  desc: 'Visit 25 branches',
    earned: ctx => ctx.visitCount >= 25,  progress: ctx => ({ current: ctx.visitCount, total: 25 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 25) },
  { id: 'navigator',     shape: 'circle',  title: 'Navigator',                    desc: 'Visit the furthest branch in each direction: Goldhawk Park (N), Port Union (E), Long Branch (S), Humberwood (W)',
    earned: ctx => [...compassBranches].every(code => ctx.visitedBranchCodes.has(code)) },
  { id: 'familiar_face', shape: 'star',    title: 'Familiar Face',                desc: 'Check in at your home branch 5 times',
    earned: ctx => ctx.homeVisitCount >= 5, stat: ctx => ctx.homeVisitCount,
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
    } },

  { id: 'globetrotter',  shape: 'octagon', title: 'Globetrotter',   label: '50',  desc: 'Visit 50 branches',
    earned: ctx => ctx.visitCount >= 50,  progress: ctx => ({ current: ctx.visitCount, total: 50 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 50) },
  { id: 'complete',      shape: 'octagon', title: 'Full Passport',  label: '100', desc: `Visit all ${physicalBranches.length} branches`,
    earned: ctx => ctx.visitCount >= 100, progress: ctx => ({ current: ctx.visitCount, total: 100 }),
    earnedAt: ctx => nthUniqueDate(ctx.checkIns, 100) },
  { id: 'return_visitor', shape: 'star',   title: 'Return Visitor',               desc: 'Check in at any non-home branch 3+ times',
    earned: ctx => ctx.maxNonHomeVisitCount >= 3, stat: ctx => ctx.maxNonHomeVisitCount,
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
    } },
]
