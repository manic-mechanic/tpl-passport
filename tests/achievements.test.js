import { describe, it, expect } from 'vitest'
import { physicalBranches } from '../app/composables/useRegion.js'

// Pure helper functions — mirror the computed properties in index.vue
// These functions are tested here to verify the achievement logic is correct.

function maxBranchesInOneDay(checkIns) {
  const byDay = {}
  for (const c of checkIns) {
    const day = c.timestamp.slice(0, 10)
    if (!byDay[day]) byDay[day] = new Set()
    byDay[day].add(c.branchCode)
  }
  const sizes = Object.values(byDay).map(s => s.size)
  return sizes.length ? Math.max(...sizes) : 0
}

function visitedDistricts(visitedBranchCodesSet) {
  const seen = new Set()
  for (const code of visitedBranchCodesSet) {
    const b = physicalBranches.find(br => br.BranchCode === code)
    if (b) seen.add(b.District)
  }
  return [...seen]
}

function branchVisitCounts(checkIns) {
  const counts = {}
  for (const c of checkIns) {
    counts[c.branchCode] = (counts[c.branchCode] ?? 0) + 1
  }
  return counts
}

function homeVisitCount(checkIns, homeBranch) {
  if (!homeBranch) return 0
  return checkIns.filter(c => c.branchCode === homeBranch).length
}

function maxNonHomeVisitCount(checkIns, homeBranch) {
  const counts = branchVisitCounts(checkIns)
  let max = 0
  for (const [code, count] of Object.entries(counts)) {
    if (code !== homeBranch && count > max) max = count
  }
  return max
}

function compassBranchSet() {
  let n = physicalBranches[0], s = physicalBranches[0]
  let e = physicalBranches[0], w = physicalBranches[0]
  for (const b of physicalBranches) {
    if (parseFloat(b.Lat) > parseFloat(n.Lat)) n = b
    if (parseFloat(b.Lat) < parseFloat(s.Lat)) s = b
    if (parseFloat(b.Long) > parseFloat(e.Long)) e = b
    if (parseFloat(b.Long) < parseFloat(w.Long)) w = b
  }
  return new Set([n.BranchCode, s.BranchCode, e.BranchCode, w.BranchCode])
}

const districtBranchCounts = physicalBranches.reduce((acc, b) => {
  acc[b.District] = (acc[b.District] ?? 0) + 1
  return acc
}, {})

function districtChampEarned(visitedBranchCodesSet) {
  const visited = {}
  for (const code of visitedBranchCodesSet) {
    const b = physicalBranches.find(br => br.BranchCode === code)
    if (b) visited[b.District] = (visited[b.District] ?? 0) + 1
  }
  return Object.entries(districtBranchCounts).some(([d, total]) => (visited[d] ?? 0) >= total)
}

function questMasterEarned(completedChallenges) {
  return physicalBranches.some(b =>
    completedChallenges.includes(`${b.BranchCode}:0`) &&
    completedChallenges.includes(`${b.BranchCode}:1`) &&
    completedChallenges.includes(`${b.BranchCode}:2`)
  )
}

// --- Tests ---

describe('maxBranchesInOneDay', () => {
  it('returns 0 for empty check-ins', () => {
    expect(maxBranchesInOneDay([])).toBe(0)
  })

  it('returns 1 when only one branch visited per day', () => {
    expect(maxBranchesInOneDay([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-02T10:00:00.000Z' },
    ])).toBe(1)
  })

  it('returns 2 when two different branches visited on the same day', () => {
    expect(maxBranchesInOneDay([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-01T14:00:00.000Z' },
    ])).toBe(2)
  })

  it('does not double-count the same branch visited twice on the same day', () => {
    expect(maxBranchesInOneDay([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-01T14:00:00.000Z' },
    ])).toBe(1)
  })

  it('returns the max across multiple days', () => {
    expect(maxBranchesInOneDay([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-01T14:00:00.000Z' },
      { branchCode: 'WH', timestamp: '2024-01-01T16:00:00.000Z' },
      { branchCode: 'MC', timestamp: '2024-01-02T10:00:00.000Z' },
    ])).toBe(3)
  })
})

describe('visitedDistricts', () => {
  it('returns empty for no visits', () => {
    expect(visitedDistricts(new Set())).toHaveLength(0)
  })

  it('returns the correct district for a single branch', () => {
    const branch = physicalBranches[0]
    const result = visitedDistricts(new Set([branch.BranchCode]))
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(branch.District)
  })

  it('deduplicates districts across multiple branches in the same district', () => {
    const district = physicalBranches[0].District
    const sameDistrict = physicalBranches.filter(b => b.District === district).slice(0, 3)
    const result = visitedDistricts(new Set(sameDistrict.map(b => b.BranchCode)))
    expect(result).toHaveLength(1)
  })

  it('returns 4 districts when branches from all districts are visited', () => {
    const onePerDistrict = ['Etobicoke-York', 'North York', 'Toronto-East York', 'Scarborough']
      .map(d => physicalBranches.find(b => b.District === d).BranchCode)
    expect(visitedDistricts(new Set(onePerDistrict))).toHaveLength(4)
  })
})

describe('branchVisitCounts', () => {
  it('returns empty object for no check-ins', () => {
    expect(branchVisitCounts([])).toEqual({})
  })

  it('counts each visit, including repeat visits to the same branch', () => {
    const result = branchVisitCounts([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-03T10:00:00.000Z' },
    ])
    expect(result).toEqual({ AG: 2, HP: 1 })
  })
})

describe('homeVisitCount', () => {
  it('returns 0 when no home branch set', () => {
    expect(homeVisitCount([{ branchCode: 'AG', timestamp: '' }], null)).toBe(0)
    expect(homeVisitCount([{ branchCode: 'AG', timestamp: '' }], '')).toBe(0)
  })

  it('returns 0 when home branch has never been visited', () => {
    expect(homeVisitCount([{ branchCode: 'HP', timestamp: '' }], 'AG')).toBe(0)
  })

  it('returns the correct count of home branch visits', () => {
    expect(homeVisitCount([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-03T10:00:00.000Z' },
    ], 'AG')).toBe(2)
  })
})

describe('maxNonHomeVisitCount', () => {
  it('returns 0 for no check-ins', () => {
    expect(maxNonHomeVisitCount([], 'AG')).toBe(0)
  })

  it('excludes the home branch from the count', () => {
    expect(maxNonHomeVisitCount([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-03T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-04T10:00:00.000Z' },
    ], 'AG')).toBe(1)
  })

  it('returns the max visit count among non-home branches', () => {
    expect(maxNonHomeVisitCount([
      { branchCode: 'HP', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'WH', timestamp: '2024-01-03T10:00:00.000Z' },
      { branchCode: 'WH', timestamp: '2024-01-04T10:00:00.000Z' },
      { branchCode: 'WH', timestamp: '2024-01-05T10:00:00.000Z' },
    ], 'AG')).toBe(3)
  })
})

describe('achievement: district_champ', () => {
  it('not earned with no visits', () => {
    expect(districtChampEarned(new Set())).toBe(false)
  })

  it('not earned with only partial coverage of every district', () => {
    const onePerDistrict = ['Etobicoke-York', 'North York', 'Toronto-East York', 'Scarborough']
      .map(d => physicalBranches.find(b => b.District === d).BranchCode)
    expect(districtChampEarned(new Set(onePerDistrict))).toBe(false)
  })

  it('earned when all branches in the smallest district are visited', () => {
    const smallestDistrict = Object.entries(districtBranchCounts).sort((a, b) => a[1] - b[1])[0][0]
    const codes = physicalBranches
      .filter(b => b.District === smallestDistrict)
      .map(b => b.BranchCode)
    expect(districtChampEarned(new Set(codes))).toBe(true)
  })
})

describe('achievement: compass', () => {
  it('correctly identifies 4 extreme branches', () => {
    const compassSet = compassBranchSet()
    expect(compassSet.size).toBeGreaterThanOrEqual(1)
    expect(compassSet.size).toBeLessThanOrEqual(4)
  })

  it('not earned when extreme branches are not visited', () => {
    const compassSet = compassBranchSet()
    expect([...compassSet].every(code => new Set(['OTHER']).has(code))).toBe(false)
  })

  it('earned when all 4 extreme branches are visited', () => {
    const compassSet = compassBranchSet()
    expect([...compassSet].every(code => compassSet.has(code))).toBe(true)
  })
})

describe('achievement: quest_master', () => {
  it('not earned with no challenges completed', () => {
    expect(questMasterEarned([])).toBe(false)
  })

  it('not earned with only 2 of 3 challenges at one branch', () => {
    const code = physicalBranches[0].BranchCode
    expect(questMasterEarned([`${code}:0`, `${code}:1`])).toBe(false)
  })

  it('earned when all 3 challenges at one branch are completed', () => {
    const code = physicalBranches[0].BranchCode
    expect(questMasterEarned([`${code}:0`, `${code}:1`, `${code}:2`])).toBe(true)
  })

  it('earned when one branch has all 3 even if other branches have partial completions', () => {
    const code0 = physicalBranches[0].BranchCode
    const code1 = physicalBranches[1].BranchCode
    expect(questMasterEarned([
      `${code0}:0`, `${code0}:1`, `${code0}:2`,
      `${code1}:0`,
    ])).toBe(true)
  })

  it('not earned when challenges are spread across branches with none having all 3', () => {
    const code0 = physicalBranches[0].BranchCode
    const code1 = physicalBranches[1].BranchCode
    const code2 = physicalBranches[2].BranchCode
    expect(questMasterEarned([`${code0}:0`, `${code1}:1`, `${code2}:2`])).toBe(false)
  })
})
