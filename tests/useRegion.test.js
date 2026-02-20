import { describe, it, expect } from 'vitest'
import { getRegion, physicalBranches, REGION_ORDER, WARD_TO_REGION } from '../app/composables/useRegion.js'

describe('getRegion', () => {
  it('returns the correct region for known wards', () => {
    expect(getRegion(1)).toBe('Etobicoke')
    expect(getRegion(6)).toBe('Downtown Toronto')
    expect(getRegion(20)).toBe('Scarborough')
    expect(getRegion(15)).toBe('Don Valley')
  })

  it('returns null for unknown or missing ward numbers', () => {
    expect(getRegion(null)).toBeNull()
    expect(getRegion(undefined)).toBeNull()
    expect(getRegion(99)).toBeNull()
  })

  it('handles string ward numbers', () => {
    expect(getRegion('1')).toBe('Etobicoke')
    expect(getRegion('25')).toBe('Scarborough')
  })
})

describe('REGION_ORDER', () => {
  it('contains exactly 6 regions', () => {
    expect(REGION_ORDER).toHaveLength(6)
  })

  it('covers all regions in WARD_TO_REGION', () => {
    const uniqueRegions = new Set(Object.values(WARD_TO_REGION))
    for (const region of uniqueRegions) {
      expect(REGION_ORDER).toContain(region)
    }
  })
})

describe('physicalBranches', () => {
  it('contains exactly 100 branches', () => {
    expect(physicalBranches).toHaveLength(100)
  })

  it('all have PhysicalBranch === 1', () => {
    expect(physicalBranches.every(b => b.PhysicalBranch === 1)).toBe(true)
  })

  it('all have a BranchCode and BranchName', () => {
    expect(physicalBranches.every(b => b.BranchCode && b.BranchName)).toBe(true)
  })

  it('has no duplicate BranchCodes', () => {
    const codes = physicalBranches.map(b => b.BranchCode)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('all map to a known region', () => {
    const unmapped = physicalBranches.filter(b => !getRegion(b.WardNo))
    expect(unmapped).toHaveLength(0)
  })
})
