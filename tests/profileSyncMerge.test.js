import { describe, it, expect } from 'vitest'
import { reconcileProfile } from '../app/lib/profileSyncMerge'

describe('reconcileProfile', () => {
  it('prefers server profile fields when present', () => {
    const result = reconcileProfile(
      { name: 'Local Name', homeBranch: 'AG' },
      { name: 'Server Name', homeBranch: 'HP' },
      'Fallback'
    )

    expect(result).toEqual({
      nextName: 'Server Name',
      nextHomeBranch: 'HP',
      shouldPushHomeBranch: false,
    })
  })

  it('uses fallback name and preserves local home branch when server is missing', () => {
    const result = reconcileProfile(
      { name: 'Local Name', homeBranch: 'AG' },
      null,
      'OAuth Name'
    )

    expect(result).toEqual({
      nextName: 'OAuth Name',
      nextHomeBranch: 'AG',
      shouldPushHomeBranch: true,
    })
  })

  it('keeps local name when no server or fallback name exists', () => {
    const result = reconcileProfile(
      { name: 'Local Name', homeBranch: '' },
      null,
      ''
    )

    expect(result).toEqual({
      nextName: 'Local Name',
      nextHomeBranch: '',
      shouldPushHomeBranch: false,
    })
  })
})
