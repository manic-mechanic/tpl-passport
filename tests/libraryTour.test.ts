import { describe, it, expect } from 'vitest'
import { physicalBranches } from '../app/composables/useRegion'
import {
  formatMinutes,
  getTourRoute,
  goldEarnedOn,
  isTourOn,
  isTourReferral,
  legMinutes,
  legRides,
  routeProgress,
  suggestedRoute,
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

describe('tour progress', () => {
  const route1 = tourRoutes[0]!
  const allCodes = tourRoutes.flatMap(r => r.branches)

  it('counts visited branches on a route', () => {
    const p = routeProgress(route1, new Set(route1.branches.slice(0, 3)))
    expect(p).toMatchObject({ visited: 3, total: 10, complete: false })
    expect(routeProgress(route1, new Set(route1.branches)).complete).toBe(true)
  })

  it('suggests the unfinished route you are furthest along on', () => {
    expect(suggestedRoute(new Set())).toBeNull()
    const route2 = tourRoutes[1]!
    const visited = new Set([...route1.branches, ...route2.branches.slice(0, 2), tourRoutes[2]!.branches[0]!])
    expect(suggestedRoute(visited)?.route.id).toBe(route2.id)
  })

  it('is on through the last day, in Toronto time', () => {
    expect(isTourOn(new Date('2027-11-01T03:59:00Z'))).toBe(true) // Oct 31, 11:59pm EDT
    expect(isTourOn(new Date('2027-11-01T04:01:00Z'))).toBe(false)
  })

  it('awards gold for all 100 branches by the end date', () => {
    const visit = (code: string, timestamp: string) => ({ branchCode: code, timestamp })
    const allByDeadline = allCodes.map(c => visit(c, '2027-06-01T15:00:00.000Z'))
    expect(goldEarnedOn(allByDeadline)).toBe('2027-06-01')

    // The last new branch after the deadline: no gold, even with a later repeat visit
    const lastLate = [...allByDeadline.slice(1), visit(allCodes[0]!, '2027-11-02T15:00:00.000Z')]
    expect(goldEarnedOn(lastLate)).toBeNull()

    // A repeat visit after the deadline doesn't undo gold
    expect(goldEarnedOn([...allByDeadline, visit(allCodes[0]!, '2027-12-01T15:00:00.000Z')])).toBe('2027-06-01')

    expect(goldEarnedOn(allByDeadline.slice(1))).toBeNull()
  })
})
