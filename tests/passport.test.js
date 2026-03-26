import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Stub localStorage — not available in Node test environment
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
})

// Stub import.meta.client so the store skips the localStorage hydration branch
vi.stubEnv('', '')  // ensures import.meta.client is falsy in tests

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

  it('is 100 after visiting all 100 branches', () => {
    const passport = usePassportStore()
    passport.loadDemoState('completed')
    expect(passport.progressPct).toBe(100)
  })
})

describe('loadDemoState', () => {
  it('empty clears checkIns', () => {
    const passport = usePassportStore()
    passport.loadDemoState('mid')
    expect(passport.checkIns.length).toBeGreaterThan(0)
    passport.loadDemoState('empty')
    expect(passport.checkIns).toHaveLength(0)
  })

  it('empty clears completedChallenges', () => {
    const passport = usePassportStore()
    passport.toggleChallenge('AG', 0)
    expect(passport.completedChallenges).toHaveLength(1)
    passport.loadDemoState('empty')
    expect(passport.completedChallenges).toHaveLength(0)
  })

  it('mid loads 31 check-ins', () => {
    const passport = usePassportStore()
    passport.loadDemoState('mid')
    expect(passport.checkIns).toHaveLength(31)
  })

  it('completed loads 106 check-ins', () => {
    const passport = usePassportStore()
    passport.loadDemoState('completed')
    expect(passport.checkIns).toHaveLength(106)
  })

  it('demo check-ins never land on today', () => {
    const passport = usePassportStore()
    const todayPrefix = new Date().toISOString().slice(0, 10)
    passport.loadDemoState('completed')
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
