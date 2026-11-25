import { describe, expect, it } from 'vitest'
import { isServerCheckIn, readDuplicateOf, readPublicUrl, readServerCheckIns, readServerProfile } from '../app/lib/serverResponses'

const record = { branch_code: 'AN', timestamp: '2026-11-15T01:00:00.000Z', note: 'hi', photo_url: null }

describe('isServerCheckIn', () => {
  it('accepts a record with branch and time, and note and photo string, null or missing', () => {
    expect(isServerCheckIn(record)).toBe(true)
    expect(isServerCheckIn({ branch_code: 'AN', timestamp: 't' })).toBe(true)
    expect(isServerCheckIn({ ...record, note: null, photo_url: 'https://p/x.jpg' })).toBe(true)
  })

  it('rejects a record missing or mistyping a field', () => {
    expect(isServerCheckIn({ ...record, branch_code: undefined })).toBe(false)
    expect(isServerCheckIn({ ...record, branch_code: '' })).toBe(false)
    expect(isServerCheckIn({ ...record, timestamp: 1700000000 })).toBe(false)
    expect(isServerCheckIn({ ...record, note: 3 })).toBe(false)
    expect(isServerCheckIn({ ...record, photo_url: {} })).toBe(false)
    expect(isServerCheckIn(null)).toBe(false)
    expect(isServerCheckIn('AN')).toBe(false)
    expect(isServerCheckIn([record])).toBe(false)
  })
})

describe('readServerCheckIns', () => {
  it('keeps good records and counts the dropped ones', () => {
    expect(readServerCheckIns([record, { timestamp: 't' }, null])).toEqual({ records: [record], dropped: 2 })
    expect(readServerCheckIns([])).toEqual({ records: [], dropped: 0 })
  })

  it('is null for a body that is not a list', () => {
    expect(readServerCheckIns(null)).toBeNull()
    expect(readServerCheckIns({ error: 'x' })).toBeNull()
    expect(readServerCheckIns('<html>')).toBeNull()
  })
})

describe('readServerProfile', () => {
  it('reads string fields', () => {
    expect(readServerProfile({ name: 'Ada', home_branch: 'AN' })).toEqual({ name: 'Ada', homeBranch: 'AN' })
  })

  it('reads missing, null or non-string fields as empty', () => {
    expect(readServerProfile({})).toEqual({ name: '', homeBranch: '' })
    expect(readServerProfile({ name: null, home_branch: 42 })).toEqual({ name: '', homeBranch: '' })
  })

  it('is null for a body that is not an object', () => {
    expect(readServerProfile(null)).toBeNull()
    expect(readServerProfile([])).toBeNull()
    expect(readServerProfile('Ada')).toBeNull()
  })
})

describe('readPublicUrl', () => {
  it('accepts an https URL', () => {
    expect(readPublicUrl({ publicUrl: 'https://photos.test/photos/u1/a.jpg' })).toBe('https://photos.test/photos/u1/a.jpg')
  })

  it('rejects anything else', () => {
    expect(readPublicUrl({ publicUrl: 'http://photos.test/a.jpg' })).toBeNull()
    expect(readPublicUrl({ publicUrl: 'javascript:alert(1)' })).toBeNull()
    expect(readPublicUrl({ publicUrl: 'photos/a.jpg' })).toBeNull()
    expect(readPublicUrl({ publicUrl: '' })).toBeNull()
    expect(readPublicUrl({ publicUrl: 1 })).toBeNull()
    expect(readPublicUrl({})).toBeNull()
    expect(readPublicUrl(null)).toBeNull()
  })
})

describe('readDuplicateOf', () => {
  it('is true only for a non-empty duplicateOf string', () => {
    expect(readDuplicateOf({ ok: true, duplicateOf: '2026-11-14T14:00:00.000Z' })).toBe(true)
    expect(readDuplicateOf({ ok: true, duplicateOf: null })).toBe(false)
    expect(readDuplicateOf({ ok: true, duplicateOf: '' })).toBe(false)
    expect(readDuplicateOf({ ok: true })).toBe(false)
    expect(readDuplicateOf(null)).toBe(false)
  })
})
