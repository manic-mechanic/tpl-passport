import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Stub localStorage — not available in Node test environment
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
})

// import.meta.client is undefined in Vitest (not a browser), so the
// localStorage hydration branch in the store is skipped automatically.

import { usePassportStore } from '../app/stores/passport.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('checkIn', () => {
  it('returns a timestamp on first visit', () => {
    const passport = usePassportStore()
    const result = passport.checkIn('AG')
    expect(result).toBeTruthy()
    expect(new Date(result).toISOString()).toBe(result)
  })

  it('returns null when already visited today', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.checkIn('AG')).toBeNull()
  })

  it('allows a second visit to a different branch on the same day', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.checkIn('HP')).toBeTruthy()
  })

  it('increments visitCount for a new branch', () => {
    const passport = usePassportStore()
    expect(passport.visitCount).toBe(0)
    passport.checkIn('AG')
    expect(passport.visitCount).toBe(1)
  })

  it('does not double-count the same branch', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIn('AG') // blocked — but even if forced, visitCount should still be 1
    expect(passport.visitCount).toBe(1)
  })
})

describe('hasVisited', () => {
  it('returns false for an unvisited branch', () => {
    const passport = usePassportStore()
    expect(passport.hasVisited('AG')).toBe(false)
  })

  it('returns true after a check-in', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.hasVisited('AG')).toBe(true)
  })

  it('returns false for a different branch', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.hasVisited('HP')).toBe(false)
  })
})

describe('hasVisitedToday', () => {
  it('returns false for an unvisited branch', () => {
    const passport = usePassportStore()
    expect(passport.hasVisitedToday('AG')).toBe(false)
  })

  it('returns true immediately after a check-in', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.hasVisitedToday('AG')).toBe(true)
  })

  it('returns false for a check-in with a yesterday timestamp', () => {
    const passport = usePassportStore()
    const yesterday = new Date(Date.now() - 864e5).toISOString()
    passport.checkIns.push({ branchCode: 'AG', timestamp: yesterday, note: '' })
    expect(passport.hasVisitedToday('AG')).toBe(false)
  })
})

describe('progressPct', () => {
  it('is 0 with no visits', () => {
    const passport = usePassportStore()
    expect(passport.progressPct).toBe(0)
  })

  it('is 100 after visiting all 100 branches', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('completed')
    expect(passport.progressPct).toBe(100)
  })
})

describe('overallPct', () => {
  it('is 0 with no visits', () => {
    const passport = usePassportStore()
    expect(passport.overallPct).toBe(0)
  })

  it('is 1% with 1 visit and no documentation — Math.round(1/100*75) = 1', () => {
    const passport = usePassportStore()
    passport.checkIn('BL')
    expect(passport.overallPct).toBe(1)
  })

  it('documented branches add 25% weight — 4 visits + 4 documented = 4%, vs 3% without docs', () => {
    const passport = usePassportStore()
    passport.checkIn('BL')
    passport.checkIn('AG')
    passport.checkIn('HP')
    passport.checkIn('WH')
    // Without docs: Math.round(4/100*75 + 0) = 3
    expect(passport.overallPct).toBe(3)
    passport.checkIns[0] = { ...passport.checkIns[0], note: 'Note 1' }
    passport.checkIns[1] = { ...passport.checkIns[1], note: 'Note 2' }
    passport.checkIns[2] = { ...passport.checkIns[2], note: 'Note 3' }
    passport.checkIns[3] = { ...passport.checkIns[3], note: 'Note 4' }
    // With 4 documented: Math.round(4/100*75 + 4/100*25) = 4
    expect(passport.overallPct).toBe(4)
  })

  it('mid demo is 22% — Math.round(28/100*75 + 4/100*25) = 22', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('mid')
    expect(passport.overallPct).toBe(22)
  })

  it('completed demo is 81% — Math.round(100/100*75 + 25/100*25) = 81', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('completed')
    expect(passport.overallPct).toBe(81)
  })
})

describe('documentedBranchCount', () => {
  it('is 0 with no check-ins', () => {
    const passport = usePassportStore()
    expect(passport.documentedBranchCount).toBe(0)
  })

  it('is 0 for a check-in with no note or photo', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    expect(passport.documentedBranchCount).toBe(0)
  })

  it('counts a branch with a note', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIns[0] = { ...passport.checkIns[0], note: 'Great visit' }
    expect(passport.documentedBranchCount).toBe(1)
  })

  it('counts a branch with a photo', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIns[0] = { ...passport.checkIns[0], hasPhoto: true }
    expect(passport.documentedBranchCount).toBe(1)
  })

  it('does not count a note with only whitespace', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIns[0] = { ...passport.checkIns[0], note: '   ' }
    expect(passport.documentedBranchCount).toBe(0)
  })

  it('deduplicates: two visits to the same branch both with notes counts as 1', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIns.push({ branchCode: 'AG', timestamp: '2024-01-01T10:00:00.000Z', note: 'Second visit' })
    expect(passport.documentedBranchCount).toBe(1)
  })

  it('counts two different documented branches as 2', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.checkIn('HP')
    passport.checkIns[0] = { ...passport.checkIns[0], note: 'Great' }
    passport.checkIns[1] = { ...passport.checkIns[1], note: 'Nice' }
    expect(passport.documentedBranchCount).toBe(2)
  })
})

describe('markCheckInHasPhoto', () => {
  it('sets hasPhoto on the matching check-in', () => {
    const passport = usePassportStore()
    const ts = passport.checkIn('AG')
    passport.markCheckInHasPhoto(ts)
    expect(passport.checkIns[0].hasPhoto).toBe(true)
  })

  it('does nothing for an unknown timestamp', () => {
    const passport = usePassportStore()
    passport.checkIn('AG')
    passport.markCheckInHasPhoto('2000-01-01T00:00:00.000Z')
    expect(passport.checkIns[0].hasPhoto).toBeUndefined()
  })

  it('increases documentedBranchCount when set', () => {
    const passport = usePassportStore()
    const ts = passport.checkIn('AG')
    expect(passport.documentedBranchCount).toBe(0)
    passport.markCheckInHasPhoto(ts)
    expect(passport.documentedBranchCount).toBe(1)
  })
})

describe('loadDemoState', () => {
  it('empty clears checkIns', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('mid')
    expect(passport.checkIns.length).toBeGreaterThan(0)
    await passport.loadDemoState('empty')
    expect(passport.checkIns).toHaveLength(0)
  })

  it('empty clears completedChallenges', async () => {
    const passport = usePassportStore()
    passport.toggleChallenge('AG', 0)
    expect(passport.completedChallenges).toHaveLength(1)
    await passport.loadDemoState('empty')
    expect(passport.completedChallenges).toHaveLength(0)
  })

  it('mid loads 31 check-ins', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('mid')
    expect(passport.checkIns).toHaveLength(31)
  })

  it('completed loads 106 check-ins', async () => {
    const passport = usePassportStore()
    await passport.loadDemoState('completed')
    expect(passport.checkIns).toHaveLength(106)
  })

  it('demo check-ins never land on today', async () => {
    const passport = usePassportStore()
    const todayPrefix = new Date().toISOString().slice(0, 10)
    await passport.loadDemoState('completed')
    const todayVisits = passport.checkIns.filter(c => c.timestamp.startsWith(todayPrefix))
    expect(todayVisits).toHaveLength(0)
  })
})

describe('toggleChallenge / hasCompletedChallenge', () => {
  it('marks a challenge complete on first toggle', () => {
    const passport = usePassportStore()
    passport.toggleChallenge('AG', 0)
    expect(passport.hasCompletedChallenge('AG', 0)).toBe(true)
  })

  it('unmarks a challenge on second toggle', () => {
    const passport = usePassportStore()
    passport.toggleChallenge('AG', 0)
    passport.toggleChallenge('AG', 0)
    expect(passport.hasCompletedChallenge('AG', 0)).toBe(false)
  })

  it('does not affect other challenges', () => {
    const passport = usePassportStore()
    passport.toggleChallenge('AG', 0)
    expect(passport.hasCompletedChallenge('AG', 1)).toBe(false)
    expect(passport.hasCompletedChallenge('HP', 0)).toBe(false)
  })
})
