import { describe, it, expect } from 'vitest'
import { physicalBranches, DISTRICT_ORDER, DISTRICT_COLORS, getDistrictColor } from '../app/composables/useRegion.js'

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

  it('all belong to a known district', () => {
    const unmapped = physicalBranches.filter(b => !DISTRICT_ORDER.includes(b.District))
    expect(unmapped).toHaveLength(0)
  })
})

describe('DISTRICT_ORDER', () => {
  it('contains exactly 4 districts', () => {
    expect(DISTRICT_ORDER).toHaveLength(4)
  })

  it('every district has a color in DISTRICT_COLORS', () => {
    for (const district of DISTRICT_ORDER) {
      expect(DISTRICT_COLORS).toHaveProperty(district)
    }
  })
})

describe('getDistrictColor', () => {
  it('returns the correct color for known districts', () => {
    expect(getDistrictColor('Etobicoke-York')).toBe('#c06b30')
    expect(getDistrictColor('Scarborough')).toBe('#b84040')
  })

  it('returns fallback color for unknown districts', () => {
    expect(getDistrictColor('Unknown')).toBe('#8c849e')
    expect(getDistrictColor(undefined)).toBe('#8c849e')
  })
})
