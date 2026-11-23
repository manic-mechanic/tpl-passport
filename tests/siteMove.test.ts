import { describe, expect, it } from 'vitest'
import { MOVE_DATA, cameFromOldSite, hasPassportData, mergeMovedPassport, readMoveData } from '../app/lib/siteMove'
import type { PassportCheckIn, PassportPersistedState } from '../app/types/passport'

const checkIn = (branchCode: string, timestamp: string, note = ''): PassportCheckIn => ({ branchCode, timestamp, note })

const passport = (over: Partial<PassportPersistedState> = {}): PassportPersistedState => ({
  anonymousId: 'id',
  checkIns: [],
  profile: {},
  completedChallenges: [],
  ...over,
})

describe('hasPassportData', () => {
  it('is false for a first visit, which stores only defaults', () => {
    expect(hasPassportData({})).toBe(false)
    expect(hasPassportData(passport({
      profile: { name: '', homeBranch: '', favouriteBook: '', theme: 'light', hasSeenOnboarding: true },
    }))).toBe(false)
  })

  it('is true once there are visits, badges or profile details', () => {
    expect(hasPassportData(passport({ checkIns: [checkIn('AB', '2026-01-01T10:00:00Z')] }))).toBe(true)
    expect(hasPassportData(passport({ completedChallenges: ['first'] }))).toBe(true)
    expect(hasPassportData(passport({ profile: { homeBranch: 'AB' } }))).toBe(true)
  })
})

describe('mergeMovedPassport', () => {
  it('takes the moved passport whole when the new site has nothing yet', () => {
    const moved = passport({
      anonymousId: 'old',
      checkIns: [checkIn('AB', '2026-01-01T10:00:00Z')],
      profile: { name: 'Sam', theme: 'dark' },
      completedChallenges: ['first'],
    })
    const merged = mergeMovedPassport(passport({ anonymousId: 'new', profile: { theme: 'light' } }), moved)
    expect(merged.anonymousId).toBe('old')
    expect(merged.profile).toEqual({ name: 'Sam', theme: 'dark' })
    expect(merged.checkIns).toEqual(moved.checkIns)
    expect(merged.completedChallenges).toEqual(['first'])
  })

  it('works when nothing is stored on the new site at all', () => {
    const moved = passport({ anonymousId: 'old', checkIns: [checkIn('AB', '2026-01-01T10:00:00Z')] })
    expect(mergeMovedPassport({}, moved)).toEqual(moved)
  })

  it('keeps both sets of visits, newest first, without duplicates', () => {
    const current = passport({ checkIns: [checkIn('CD', '2026-03-01T10:00:00Z'), checkIn('AB', '2026-01-01T10:00:00Z', 'mine')] })
    const moved = passport({ checkIns: [checkIn('AB', '2026-01-01T10:00:00Z', 'theirs'), checkIn('EF', '2026-02-01T10:00:00Z')] })
    const merged = mergeMovedPassport(current, moved)
    expect(merged.checkIns.map(c => c.branchCode)).toEqual(['CD', 'EF', 'AB'])
    // The new site's copy wins an exact duplicate.
    expect(merged.checkIns.find(c => c.branchCode === 'AB')?.note).toBe('mine')
  })

  it('keeps the new site profile and identity once it has data, filling blanks', () => {
    const current = passport({
      anonymousId: 'new',
      checkIns: [checkIn('CD', '2026-03-01T10:00:00Z')],
      profile: { name: 'Sam', homeBranch: '', theme: 'light' },
      completedChallenges: ['a'],
    })
    const moved = passport({
      anonymousId: 'old',
      profile: { name: 'Old name', homeBranch: 'AB', theme: 'dark' },
      completedChallenges: ['a', 'b'],
    })
    const merged = mergeMovedPassport(current, moved)
    expect(merged.anonymousId).toBe('new')
    expect(merged.profile).toEqual({ name: 'Sam', homeBranch: 'AB', theme: 'light' })
    expect(merged.completedChallenges).toEqual(['a', 'b'])
  })
})

describe('readMoveData', () => {
  it('accepts a data message and keeps only well-formed photos', () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const data = readMoveData({
      type: MOVE_DATA,
      passport: '{}',
      photos: [{ key: '2026-01-01T10:00:00Z', blob }, { key: 1, blob }, { key: 'k', blob: 'not a blob' }, null],
    })
    expect(data).toEqual({ passport: '{}', photos: [{ key: '2026-01-01T10:00:00Z', blob }] })
  })

  it('rejects other messages', () => {
    expect(readMoveData(null)).toBeNull()
    expect(readMoveData({ type: 'something-else', passport: '{}' })).toBeNull()
    expect(readMoveData({ type: MOVE_DATA, passport: null })).toBeNull()
  })

  it('treats missing photos as none', () => {
    expect(readMoveData({ type: MOVE_DATA, passport: '{}' })).toEqual({ passport: '{}', photos: [] })
  })
})

describe('cameFromOldSite', () => {
  it('accepts only the old address', () => {
    expect(cameFromOldSite('https://tpl-passport.vercel.app/moving.html?to=%2F')).toBe(true)
    expect(cameFromOldSite('https://tpl-passport.vercel.app/')).toBe(true)
    expect(cameFromOldSite('https://tpl-passport.vercel.app.evil.example/')).toBe(false)
    expect(cameFromOldSite('https://evil.example/?https://tpl-passport.vercel.app')).toBe(false)
    expect(cameFromOldSite('http://tpl-passport.vercel.app/')).toBe(false)
    expect(cameFromOldSite('')).toBe(false)
  })
})
