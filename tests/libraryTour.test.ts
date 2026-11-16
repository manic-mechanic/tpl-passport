import { describe, it, expect } from 'vitest'
import { physicalBranches } from '../app/composables/useRegion'
import {
  formatMinutes,
  getTourRoute,
  isTourReferral,
  legMinutes,
  legRides,
  tourRoutes,
  textOnColor,
  transitDirectionsUrl,
} from '../app/lib/libraryTour'

describe('Your Library Tour data', () => {
  it('has ten routes that together visit every physical branch once', () => {
    expect(tourRoutes).toHaveLength(10)
    const codes = tourRoutes.flatMap(r => r.branches)
    expect(codes).toHaveLength(100)
    expect(new Set(codes)).toEqual(new Set(physicalBranches.map(b => b.BranchCode)))
  })

  it('has one leg between each pair of stops', () => {
    for (const route of tourRoutes) {
      expect(route.legs).toHaveLength(route.branches.length - 1)
      for (const leg of route.legs) expect(leg.length).toBeGreaterThan(0)
    }
  })

  it('finds routes by id as a number or a route param string', () => {
    expect(getTourRoute(3)?.id).toBe(3)
    expect(getTourRoute('3')?.id).toBe(3)
    expect(getTourRoute('99')).toBeUndefined()
  })
})

describe('tour helpers', () => {
  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
    expect(formatMinutes(184)).toBe('3 h 4 min')
  })

  it('totals a leg and lists only its rides', () => {
    const leg = [
      { mode: 'WALK' as const, minutes: 2, meters: 150 },
      { mode: 'BUS' as const, minutes: 8, lineName: '45 Kipling' },
      { mode: 'WALK' as const, minutes: 1, meters: 80 },
    ]
    expect(legMinutes(leg)).toBe(11)
    expect(legRides(leg).map(s => s.lineName)).toEqual(['45 Kipling'])
  })

  it('builds a Google Maps transit link between two branches', () => {
    const url = new URL(transitDirectionsUrl({ Lat: '43.7', Long: '-79.4' }, { Lat: '43.65', Long: '-79.38' }))
    expect(url.searchParams.get('travelmode')).toBe('transit')
    expect(url.searchParams.get('origin')).toBe('43.7,-79.4')
    expect(url.searchParams.get('destination')).toBe('43.65,-79.38')
  })

  it('recognises visitors from the event', () => {
    expect(isTourReferral({ ref: 'yourlibrarytour' }, '')).toBe(true)
    expect(isTourReferral({ ref: 'YourLibraryTour' }, '')).toBe(true)
    expect(isTourReferral({}, 'https://schoolofcities.utoronto.ca/opportunities/next-stop-your-library-tour/')).toBe(true)
    expect(isTourReferral({}, 'https://schoolofcities.utoronto.ca.evil.example/')).toBe(false)
    expect(isTourReferral({}, 'https://www.google.com/')).toBe(false)
    expect(isTourReferral({}, '')).toBe(false)
  })
})

describe('textOnColor', () => {
  it('uses white on dark route colours and dark text on light ones', () => {
    expect(textOnColor('#1E3765')).toBe('#fff')
    expect(textOnColor('#6FC7EA')).toBe('#1a1a1a')
    expect(textOnColor('#EBA00F')).toBe('#1a1a1a')
  })
})
