import { physicalBranches, DISTRICT_ORDER } from './useRegion.js'

const regionMap = Object.fromEntries(physicalBranches.map(b => [b.BranchCode, b.District]))

export const compassPoints = (() => {
  let n = physicalBranches[0], s = physicalBranches[0], e = physicalBranches[0], w = physicalBranches[0]
  for (const b of physicalBranches) {
    if (parseFloat(b.Lat)  > parseFloat(n.Lat))  n = b
    if (parseFloat(b.Lat)  < parseFloat(s.Lat))  s = b
    if (parseFloat(b.Long) > parseFloat(e.Long)) e = b
    if (parseFloat(b.Long) < parseFloat(w.Long)) w = b
  }
  return { n: n.BranchCode, s: s.BranchCode, e: e.BranchCode, w: w.BranchCode }
})()

export const compassBranches = new Set(Object.values(compassPoints))

export const districtBranchCounts = physicalBranches.reduce((acc, b) => {
  acc[b.District] = (acc[b.District] ?? 0) + 1
  return acc
}, {})

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

export function visitedDistricts(visitedBranchCodesSet) {
  const seen = new Set()
  for (const code of visitedBranchCodesSet) if (regionMap[code]) seen.add(regionMap[code])
  return [...seen]
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

// Builds the context object passed to each achievement's earned/stat/progress functions.
export function buildAchievementCtx({ checkIns, visitedBranchCodes, completedChallenges, homeBranch }) {
  const counts = branchVisitCounts(checkIns)
  return {
    visitCount:           visitedBranchCodes.size,
    visitedDistricts:     visitedDistricts(visitedBranchCodes),
    branchVisitCounts:    counts,
    maxBranchesInOneDay:  maxBranchesInOneDay(checkIns),
    homeVisitCount:       homeVisitCount(counts, homeBranch),
    maxNonHomeVisitCount: maxNonHomeVisitCount(counts, homeBranch),
    visitedBranchCodes,
    completedChallenges,
  }
}

// Column-major grid order: stamps col 0+overflow, circles col 1, stars col 2
export const ACHIEVEMENTS = [
  { id: 'first',         shape: 'octagon', title: 'First Stamp',    label: '1st', desc: 'Check in at your first branch',
    earned: ctx => ctx.visitCount >= 1,   progress: ctx => ({ current: ctx.visitCount, total: 1 }) },
  { id: 'world_tour',    shape: 'circle',  title: 'World Tour',                   desc: 'Visit a branch in every district',
    earned: ctx => ctx.visitedDistricts.length >= 4 },
  { id: 'day_tripper',   shape: 'star',    title: 'Day Tripper',                  desc: 'Visit 2+ branches in one day',
    earned: ctx => ctx.maxBranchesInOneDay >= 2,  stat: ctx => ctx.maxBranchesInOneDay,
    progress: ctx => ({ current: ctx.maxBranchesInOneDay, total: 2 }) },

  { id: 'explorer',      shape: 'octagon', title: 'Explorer',       label: '10',  desc: 'Visit 10 branches',
    earned: ctx => ctx.visitCount >= 10,  progress: ctx => ({ current: ctx.visitCount, total: 10 }) },
  { id: 'district_champ', shape: 'circle', title: 'District Champ', label: '★',  desc: 'Complete all branches in any district',
    earned: ctx => {
      const visited = {}
      for (const code of ctx.visitedBranchCodes) {
        const d = regionMap[code]; if (d) visited[d] = (visited[d] ?? 0) + 1
      }
      return Object.entries(districtBranchCounts).some(([d, total]) => (visited[d] ?? 0) >= total)
    } },
  { id: 'quest_master',  shape: 'star',    title: 'Quest Master',   label: '✓',  desc: 'Complete all challenges at any branch',
    earned: ctx => physicalBranches.some(b =>
      ctx.completedChallenges.includes(`${b.BranchCode}:0`) &&
      ctx.completedChallenges.includes(`${b.BranchCode}:1`) &&
      ctx.completedChallenges.includes(`${b.BranchCode}:2`)) },

  { id: 'adventurer',    shape: 'octagon', title: 'Adventurer',     label: '25',  desc: 'Visit 25 branches',
    earned: ctx => ctx.visitCount >= 25,  progress: ctx => ({ current: ctx.visitCount, total: 25 }) },
  { id: 'navigator',     shape: 'circle',  title: 'Navigator',                    desc: 'Visit the furthest branch in each direction: Goldhawk Park (N), Port Union (E), Long Branch (S), Humberwood (W)',
    earned: ctx => [...compassBranches].every(code => ctx.visitedBranchCodes.has(code)) },
  { id: 'familiar_face', shape: 'star',    title: 'Familiar Face',                desc: 'Check in at your home branch 5 times',
    earned: ctx => ctx.homeVisitCount >= 5, stat: ctx => ctx.homeVisitCount,
    progress: ctx => ({ current: ctx.homeVisitCount, total: 5 }) },

  { id: 'globetrotter',  shape: 'octagon', title: 'Globetrotter',  label: '50',  desc: 'Visit 50 branches',
    earned: ctx => ctx.visitCount >= 50,  progress: ctx => ({ current: ctx.visitCount, total: 50 }) },
  { id: 'complete',      shape: 'octagon', title: 'Full Passport',  label: '100', desc: `Visit all ${physicalBranches.length} branches`,
    earned: ctx => ctx.visitCount >= 100, progress: ctx => ({ current: ctx.visitCount, total: 100 }) },
  { id: 'return_visitor', shape: 'star',   title: 'Return Visitor',               desc: 'Check in at any branch 3+ times',
    earned: ctx => ctx.maxNonHomeVisitCount >= 3, stat: ctx => ctx.maxNonHomeVisitCount,
    progress: ctx => ({ current: ctx.maxNonHomeVisitCount, total: 3 }) },
]

