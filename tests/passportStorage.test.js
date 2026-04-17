import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
const getItem = vi.fn((key) => storage.get(key) ?? null)
const setItem = vi.fn((key, value) => { storage.set(key, value) })

vi.stubGlobal('localStorage', { getItem, setItem })

import { loadPassportState, savePassportState } from '../app/lib/passportStorage.js'

const STORAGE_KEY = 'tpl-passport'

beforeEach(() => {
  storage.clear()
  getItem.mockClear()
  setItem.mockClear()
})

describe('passportStorage', () => {
  it('returns empty object when no state is saved', () => {
    expect(loadPassportState()).toEqual({})
  })

  it('loads current versioned payload', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 2,
      data: {
        anonymousId: 'anon-1',
        checkIns: [{ branchCode: 'AG', timestamp: '2024-01-01T00:00:00.000Z', note: '' }],
        profile: { name: 'Alex' },
        completedChallenges: ['AG:0'],
      },
    }))

    expect(loadPassportState()).toEqual({
      anonymousId: 'anon-1',
      checkIns: [{ branchCode: 'AG', timestamp: '2024-01-01T00:00:00.000Z', note: '' }],
      profile: { name: 'Alex' },
      completedChallenges: ['AG:0'],
    })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('migrates legacy unversioned payload and rewrites storage', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      anonymousId: 'legacy-anon',
      checkIns: [{ branchCode: 'HP', timestamp: '2024-01-02T00:00:00.000Z', note: 'visit' }],
      profile: { homeBranch: 'HP' },
      completedChallenges: ['HP:1'],
    }))

    const loaded = loadPassportState()
    expect(loaded).toEqual({
      anonymousId: 'legacy-anon',
      checkIns: [{ branchCode: 'HP', timestamp: '2024-01-02T00:00:00.000Z', note: 'visit' }],
      profile: { homeBranch: 'HP' },
      completedChallenges: ['HP:1'],
    })
    expect(setItem).toHaveBeenCalledOnce()

    const rewritten = JSON.parse(storage.get(STORAGE_KEY))
    expect(rewritten.version).toBe(2)
    expect(rewritten.data.anonymousId).toBe('legacy-anon')
  })

  it('returns empty object for malformed JSON', () => {
    storage.set(STORAGE_KEY, '{broken-json')
    expect(loadPassportState()).toEqual({})
  })

  it('returns empty object for unsupported future version', () => {
    storage.set(STORAGE_KEY, JSON.stringify({ version: 99, data: {} }))
    expect(loadPassportState()).toEqual({})
  })

  it('saves payload in versioned envelope', () => {
    savePassportState({
      anonymousId: 'anon-2',
      checkIns: [],
      profile: { theme: 'dark' },
      completedChallenges: [],
    })

    const saved = JSON.parse(storage.get(STORAGE_KEY))
    expect(saved.version).toBe(2)
    expect(saved.data).toEqual({
      anonymousId: 'anon-2',
      checkIns: [],
      profile: { theme: 'dark' },
      completedChallenges: [],
    })
  })
})
