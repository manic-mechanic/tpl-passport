import { describe, it, expect } from 'vitest'
import { physicalBranches, sortedBranches, DISTRICT_ORDER, getDistrictColor, haversineKm, branchesByAlphaPage } from '../app/composables/useRegion.js'

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

describe('sortedBranches', () => {
  it('contains the same 100 branches as physicalBranches', () => {
    expect(sortedBranches).toHaveLength(physicalBranches.length)
  })

  it('is sorted alphabetically by BranchName', () => {
    for (let i = 1; i < sortedBranches.length; i++) {
      expect(sortedBranches[i - 1].BranchName.localeCompare(sortedBranches[i].BranchName)).toBeLessThanOrEqual(0)
    }
  })
})

describe('DISTRICT_ORDER', () => {
  it('contains exactly 4 districts', () => {
    expect(DISTRICT_ORDER).toHaveLength(4)
  })

  it('every district has a color via getDistrictColor', () => {
    for (const district of DISTRICT_ORDER) {
      const color = getDistrictColor(district)
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(color).not.toBe('#8c849e') // should not fall back to the unknown color
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

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(43.7, -79.4, 43.7, -79.4)).toBe(0)
  })

  it('calculates a reasonable distance between two Toronto branches', () => {
    // Roughly: Agincourt (43.7804, -79.2756) to Bloor/Gladstone (43.6538, -79.4282)
    const km = haversineKm(43.7804, -79.2756, 43.6538, -79.4282)
    expect(km).toBeGreaterThan(15)
    expect(km).toBeLessThan(20)
  })

  it('is symmetric', () => {
    const a = haversineKm(43.7, -79.4, 43.65, -79.38)
    const b = haversineKm(43.65, -79.38, 43.7, -79.4)
    expect(a).toBeCloseTo(b, 10)
  })
})

describe('branchesByAlphaPage', () => {
  it('covers all 100 physical branches exactly once', () => {
    const allCodes = branchesByAlphaPage.flatMap(page => page.branches.map(b => b.BranchCode))
    expect(allCodes).toHaveLength(physicalBranches.length)
    expect(new Set(allCodes).size).toBe(physicalBranches.length)
  })

  it('each page has a label and a non-empty branches array', () => {
    for (const page of branchesByAlphaPage) {
      expect(page.label).toBeTruthy()
      expect(page.branches.length).toBeGreaterThan(0)
    }
  })

  it('branches on each page are sorted alphabetically', () => {
    for (const page of branchesByAlphaPage) {
      for (let i = 1; i < page.branches.length; i++) {
        expect(page.branches[i - 1].BranchName.localeCompare(page.branches[i].BranchName)).toBeLessThanOrEqual(0)
      }
    }
  })
})
