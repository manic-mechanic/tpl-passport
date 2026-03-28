import { describe, it, expect } from 'vitest'
import { physicalBranches, branchesByAlphaPage } from '../app/composables/useRegion.js'
import {
  ACHIEVEMENTS,
  buildAchievementCtx,
  compassBranches,
  fullyDocumentedCount,
  maxBranchesInOneDay,
  branchVisitCounts,
  homeVisitCount,
  maxNonHomeVisitCount,
} from '../app/composables/useAchievements.js'

// Helper: build a minimal ctx with sensible defaults
function ctx(overrides = {}) {
  return buildAchievementCtx({
    checkIns: [],
    visitedBranchCodes: new Set(),
    completedChallenges: [],
    homeBranch: null,
    ...overrides,
  })
}

function badge(id) {
  return ACHIEVEMENTS.find(a => a.id === id)
}

// --- Helper function tests ---

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


describe('branchVisitCounts', () => {
  it('returns empty object for no check-ins', () => {
    expect(branchVisitCounts([])).toEqual({})
  })

  it('counts each visit, including repeat visits to the same branch', () => {
    expect(branchVisitCounts([
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'AG', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-03T10:00:00.000Z' },
    ])).toEqual({ AG: 2, HP: 1 })
  })
})

describe('homeVisitCount', () => {
  it('returns 0 when no home branch set', () => {
    expect(homeVisitCount({ AG: 2 }, null)).toBe(0)
    expect(homeVisitCount({ AG: 2 }, '')).toBe(0)
  })

  it('returns 0 when home branch has never been visited', () => {
    expect(homeVisitCount({ HP: 1 }, 'AG')).toBe(0)
  })

  it('returns the correct count of home branch visits', () => {
    expect(homeVisitCount({ AG: 2, HP: 1 }, 'AG')).toBe(2)
  })
})

describe('maxNonHomeVisitCount', () => {
  it('returns 0 for no check-ins', () => {
    expect(maxNonHomeVisitCount({}, 'AG')).toBe(0)
  })

  it('excludes the home branch from the count', () => {
    expect(maxNonHomeVisitCount({ AG: 3, HP: 1 }, 'AG')).toBe(1)
  })

  it('returns the max visit count among non-home branches', () => {
    expect(maxNonHomeVisitCount({ HP: 2, WH: 3 }, 'AG')).toBe(3)
  })
})

describe('fullyDocumentedCount', () => {
  it('returns 0 for empty check-ins', () => {
    expect(fullyDocumentedCount([])).toBe(0)
  })

  it('returns 0 when note is present but no photo', () => {
    expect(fullyDocumentedCount([{ note: 'Great', hasPhoto: false }])).toBe(0)
  })

  it('returns 0 when photo is present but note is empty', () => {
    expect(fullyDocumentedCount([{ note: '', hasPhoto: true }])).toBe(0)
  })

  it('returns 0 when photo is present but note is whitespace', () => {
    expect(fullyDocumentedCount([{ note: '   ', hasPhoto: true }])).toBe(0)
  })

  it('counts check-ins with both a non-empty note and a photo', () => {
    expect(fullyDocumentedCount([
      { note: 'Good', hasPhoto: true },
      { note: 'Also good', hasPhoto: true },
      { note: 'No photo', hasPhoto: false },
    ])).toBe(2)
  })
})

// --- Achievement badge tests ---

describe('achievement: first stamp', () => {
  it('not earned with no visits', () => {
    expect(badge('first').earned(ctx())).toBe(false)
  })
  it('earned after one visit', () => {
    expect(badge('first').earned(ctx({ visitedBranchCodes: new Set(['AG']) }))).toBe(true)
  })
})

describe('achievement: page_turner', () => {
  it('not earned with no visits', () => {
    expect(badge('page_turner').earned(ctx())).toBe(false)
  })

  it('not earned with one branch per page except one page', () => {
    // Visit one branch from all pages except the last
    const codes = branchesByAlphaPage.slice(0, -1).map(page => page.branches[0].BranchCode)
    expect(badge('page_turner').earned(ctx({ visitedBranchCodes: new Set(codes) }))).toBe(false)
  })

  it('earned when at least one branch on every alpha page is visited', () => {
    const codes = branchesByAlphaPage.map(page => page.branches[0].BranchCode)
    expect(badge('page_turner').earned(ctx({ visitedBranchCodes: new Set(codes) }))).toBe(true)
  })
})

describe('achievement: day_tripper', () => {
  it('not earned with only one branch per day', () => {
    const checkIns = [
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-02T10:00:00.000Z' },
    ]
    expect(badge('day_tripper').earned(ctx({ checkIns }))).toBe(false)
  })
  it('earned when 2 different branches visited on the same day', () => {
    const checkIns = [
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-01T14:00:00.000Z' },
    ]
    expect(badge('day_tripper').earned(ctx({ checkIns }))).toBe(true)
  })
})

describe('achievement: page_filler', () => {
  it('not earned with no visits', () => {
    expect(badge('page_filler').earned(ctx())).toBe(false)
  })

  it('not earned when no page is fully complete', () => {
    // Visit all but one branch on the smallest page
    const smallestPage = branchesByAlphaPage.slice().sort((a, b) => a.branches.length - b.branches.length)[0]
    const codes = smallestPage.branches.slice(0, -1).map(b => b.BranchCode)
    expect(badge('page_filler').earned(ctx({ visitedBranchCodes: new Set(codes) }))).toBe(false)
  })

  it('earned when all branches on any single page are visited', () => {
    const smallestPage = branchesByAlphaPage.slice().sort((a, b) => a.branches.length - b.branches.length)[0]
    const codes = smallestPage.branches.map(b => b.BranchCode)
    expect(badge('page_filler').earned(ctx({ visitedBranchCodes: new Set(codes) }))).toBe(true)
  })
})

describe('achievement: navigator', () => {
  it('correctly identifies 1–4 extreme branches', () => {
    expect(compassBranches.size).toBeGreaterThanOrEqual(1)
    expect(compassBranches.size).toBeLessThanOrEqual(4)
  })

  it('not earned when extreme branches are not all visited', () => {
    expect(badge('navigator').earned(ctx())).toBe(false)
  })

  it('earned when all extreme branches are visited', () => {
    expect(badge('navigator').earned(ctx({ visitedBranchCodes: new Set(compassBranches) }))).toBe(true)
  })
})

// STASHED: quest_master tests — restore when FEATURES.challenges = true
// describe('achievement: quest_master', () => {
//   it('not earned with no challenges completed', () => {
//     expect(badge('quest_master').earned(ctx())).toBe(false)
//   })
//   it('not earned with only 2 of 3 challenges at one branch', () => {
//     const code = physicalBranches[0].BranchCode
//     expect(badge('quest_master').earned(ctx({ completedChallenges: [`${code}:0`, `${code}:1`] }))).toBe(false)
//   })
//   it('earned when all 3 challenges at one branch are completed', () => {
//     const code = physicalBranches[0].BranchCode
//     expect(badge('quest_master').earned(ctx({ completedChallenges: [`${code}:0`, `${code}:1`, `${code}:2`] }))).toBe(true)
//   })
//   it('not earned when challenges are spread across branches with none having all 3', () => {
//     const [c0, c1, c2] = physicalBranches.slice(0, 3).map(b => b.BranchCode)
//     expect(badge('quest_master').earned(ctx({ completedChallenges: [`${c0}:0`, `${c1}:1`, `${c2}:2`] }))).toBe(false)
//   })
// })
// END STASHED: quest_master

describe('achievement: archivist', () => {
  it('not earned with no check-ins', () => {
    expect(badge('archivist').earned(ctx())).toBe(false)
  })

  it('not earned with a note but no photo', () => {
    const checkIns = [{ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: 'Great visit' }]
    expect(badge('archivist').earned(ctx({ checkIns }))).toBe(false)
  })

  it('not earned with a photo but no note', () => {
    const checkIns = [{ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: '', hasPhoto: true }]
    expect(badge('archivist').earned(ctx({ checkIns }))).toBe(false)
  })

  it('not earned with a whitespace-only note and photo', () => {
    const checkIns = [{ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: '   ', hasPhoto: true }]
    expect(badge('archivist').earned(ctx({ checkIns }))).toBe(false)
  })

  it('earned when a check-in has both a note and a photo', () => {
    const checkIns = [{ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: 'Great', hasPhoto: true }]
    expect(badge('archivist').earned(ctx({ checkIns }))).toBe(true)
  })

  it('stat counts revisits to the same branch', () => {
    const checkIns = [
      { branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: 'First', hasPhoto: true },
      { branchCode: 'AG', timestamp: '2024-01-02T10:00:00.000Z', note: 'Second', hasPhoto: true },
    ]
    expect(badge('archivist').stat(ctx({ checkIns }))).toBe(2)
  })

  it('progress is 0/1 before earning', () => {
    expect(badge('archivist').progress(ctx())).toEqual({ current: 0, total: 1 })
  })

  it('progress is 1/1 after earning', () => {
    const checkIns = [{ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: 'Great', hasPhoto: true }]
    expect(badge('archivist').progress(ctx({ checkIns }))).toEqual({ current: 1, total: 1 })
  })
})

describe('achievement: familiar_face', () => {
  it('not earned with only 4 home branch visits', () => {
    const checkIns = Array.from({ length: 4 }, (_, i) => ({ branchCode: 'AG', timestamp: `2024-01-0${i + 1}T10:00:00.000Z` }))
    expect(badge('familiar_face').earned(ctx({ checkIns, homeBranch: 'AG' }))).toBe(false)
  })
  it('earned with 5 home branch visits', () => {
    const checkIns = Array.from({ length: 5 }, (_, i) => ({ branchCode: 'AG', timestamp: `2024-01-0${i + 1}T10:00:00.000Z` }))
    expect(badge('familiar_face').earned(ctx({ checkIns, homeBranch: 'AG' }))).toBe(true)
  })
})

describe('achievement: return_visitor', () => {
  it('not earned with only 2 visits to any non-home branch', () => {
    const checkIns = [
      { branchCode: 'HP', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-02T10:00:00.000Z' },
    ]
    expect(badge('return_visitor').earned(ctx({ checkIns, homeBranch: 'AG' }))).toBe(false)
  })
  it('earned with 3 visits to any non-home branch', () => {
    const checkIns = [
      { branchCode: 'HP', timestamp: '2024-01-01T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-02T10:00:00.000Z' },
      { branchCode: 'HP', timestamp: '2024-01-03T10:00:00.000Z' },
    ]
    expect(badge('return_visitor').earned(ctx({ checkIns, homeBranch: 'AG' }))).toBe(true)
  })
})
