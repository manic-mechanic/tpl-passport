import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ensureArms, homeStage, isPassportMade, parseArms, pickArms, resetOnboardingMemory, storedArms,
} from '../app/lib/onboarding'
import { pickView } from '../app/lib/checkInView'

function fakeStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    data,
  }
}

let storage: ReturnType<typeof fakeStorage>

beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
  resetOnboardingMemory()
})

describe('homeStage', () => {
  it('follows the two first steps', () => {
    expect(homeStage(0, false)).toBe('new')
    expect(homeStage(1, false)).toBe('checkedIn')
    expect(homeStage(0, true)).toBe('passport')
    expect(homeStage(3, true)).toBe('done')
  })
})

describe('isPassportMade', () => {
  it('needs a name or a home branch', () => {
    expect(isPassportMade({ name: '', homeBranch: '' })).toBe(false)
    expect(isPassportMade({ name: '   ', homeBranch: '' })).toBe(false)
    expect(isPassportMade({ name: 'Avery', homeBranch: '' })).toBe(true)
    expect(isPassportMade({ name: '', homeBranch: 'LS' })).toBe(true)
  })
})

describe('arms', () => {
  it('picks each test separately', () => {
    const rolls = [0.2, 0.7]
    expect(pickArms(() => rolls.shift()!)).toEqual({ onb_sheet: 'sheet', onb_home_order: 'passport_first' })
    expect(pickArms(() => 0.9)).toEqual({ onb_sheet: 'none', onb_home_order: 'passport_first' })
    expect(pickArms(() => 0.1)).toEqual({ onb_sheet: 'sheet', onb_home_order: 'checkin_first' })
  })

  it('assigns on a first visit and keeps the arms', () => {
    const first = ensureArms('new', () => 0.1)
    expect(first).toEqual({ onb_sheet: 'sheet', onb_home_order: 'checkin_first' })
    resetOnboardingMemory()
    // A later visit reads them back, whatever the dice say
    expect(ensureArms('new', () => 0.9)).toEqual(first)
    expect(ensureArms('done', () => 0.9)).toEqual(first)
  })

  it('leaves out people who had already started', () => {
    expect(ensureArms('checkedIn')).toBeNull()
    expect(ensureArms('passport')).toBeNull()
    expect(ensureArms('done')).toBeNull()
    expect(storage.data.size).toBe(0)
  })

  it('ignores stored values it does not know', () => {
    expect(parseArms('{"onb_sheet":"maybe","onb_home_order":"checkin_first"}')).toBeNull()
    expect(parseArms('not json')).toBeNull()
    storage.setItem('tpl-passport:onboarding-arms', '{"onb_sheet":"x"}')
    expect(storedArms()).toBeNull()
  })

  it('works without storage for this page load', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(ensureArms('new', () => 0.9)).toEqual({ onb_sheet: 'none', onb_home_order: 'passport_first' })
    expect(storedArms()).toEqual({ onb_sheet: 'none', onb_home_order: 'passport_first' })
  })
})

describe('pickView', () => {
  it('never repeats the last view', () => {
    for (const last of ['map', 'diary', 'street']) {
      for (const r of [0, 0.4, 0.99]) expect(pickView(last, () => r)).not.toBe(last)
    }
  })

  it('can pick any view the first time', () => {
    expect(pickView(null, () => 0)).toBe('map')
    expect(pickView(null, () => 0.5)).toBe('diary')
    expect(pickView(null, () => 0.99)).toBe('street')
  })
})
