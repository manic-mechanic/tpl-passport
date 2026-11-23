import { describe, expect, it } from 'vitest'
import { isInternalEmail, parseEmailHashes, sha256Hex } from '../app/lib/internalUser'

describe('sha256Hex', () => {
  it('matches a known digest', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('parseEmailHashes', () => {
  it('keeps well-formed hashes and ignores the rest', () => {
    const hash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(parseEmailHashes(` ${hash.toUpperCase()} , not-a-hash,, `)).toEqual(new Set([hash]))
    expect(parseEmailHashes('')).toEqual(new Set())
  })
})

describe('isInternalEmail', () => {
  it('matches a listed address, ignoring case and spaces', async () => {
    const hashes = new Set([await sha256Hex('owner@example.com')])
    expect(await isInternalEmail('owner@example.com', hashes)).toBe(true)
    expect(await isInternalEmail('  Owner@Example.COM ', hashes)).toBe(true)
  })

  it('does not match anyone else or an empty list', async () => {
    const hashes = new Set([await sha256Hex('owner@example.com')])
    expect(await isInternalEmail('reader@example.com', hashes)).toBe(false)
    expect(await isInternalEmail('', hashes)).toBe(false)
    expect(await isInternalEmail('owner@example.com', new Set())).toBe(false)
  })
})
