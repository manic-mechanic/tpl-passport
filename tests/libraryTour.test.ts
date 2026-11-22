import { describe, it, expect } from 'vitest'
import { physicalBranches } from '../app/composables/useRegion'
import {
  formatHours,
  getTourRoute,
  isTourOn,
  isTourReferral,
  legRides,
  routeProgress,
  shortStopName,
  stopLabel,
  tourRoutes,
  textOnColor,
  tourCompletedOn,
  tourStops,
  transitDirectionsUrl,
  walkingLabel,
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
  it('rounds route length to the nearest half hour', () => {
    expect(formatHours(10)).toBe('~0.5 hours')
    expect(formatHours(60)).toBe('~1 hour')
    expect(formatHours(132)).toBe('~2 hours')
    expect(formatHours(135)).toBe('~2.5 hours')
    expect(formatHours(184)).toBe('~3 hours')
    expect(formatHours(205)).toBe('~3.5 hours')
  })

  it('lists only the rides in a leg', () => {
    const leg = [
      { mode: 'WALK' as const, minutes: 2, meters: 150 },
      { mode: 'BUS' as const, minutes: 8, lineName: '45 Kipling' },
      { mode: 'WALK' as const, minutes: 1, meters: 80 },
    ]
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


  it('is on through the last day, in Toronto time', () => {
    expect(isTourOn(new Date('2027-11-01T03:59:00Z'))).toBe(true) // Oct 31, 11:59pm EDT
    expect(isTourOn(new Date('2027-11-01T04:01:00Z'))).toBe(false)
  })

  it('counts the challenge complete when all 100 branches are visited by the end date', () => {
    const visit = (code: string, timestamp: string) => ({ branchCode: code, timestamp })
    const allByDeadline = allCodes.map(c => visit(c, '2027-06-01T15:00:00.000Z'))
    expect(tourCompletedOn(allByDeadline)).toBe('2027-06-01')

    // The last new branch after the deadline: not complete, even with a later repeat visit
    const lastLate = [...allByDeadline.slice(1), visit(allCodes[0]!, '2027-11-02T15:00:00.000Z')]
    expect(tourCompletedOn(lastLate)).toBeNull()

    // A repeat visit after the deadline doesn't undo it
    expect(tourCompletedOn([...allByDeadline, visit(allCodes[0]!, '2027-12-01T15:00:00.000Z')])).toBe('2027-06-01')

    expect(tourCompletedOn(allByDeadline.slice(1))).toBeNull()
  })
})

describe('shortStopName', () => {
  it('drops the curb side but keeps landmarks', () => {
    expect(shortStopName('Humberwood Blvd at Pinecone Dr North Side')).toBe('Humberwood Blvd at Pinecone Dr')
    expect(shortStopName('Sherbourne St at Bloor St East South Side - Sherbourne Station')).toBe('Sherbourne St at Bloor St East - Sherbourne Station')
    expect(shortStopName('Humber College Station')).toBe('Humber College Station')
    expect(shortStopName(undefined)).toBe('')
  })
})

describe('tourStops', () => {
  const route = tourRoutes[0]!

  it('pairs each stop with the leg to the next', () => {
    const lookup = Object.fromEntries(route.branches.map(c => [c, { code: c }]))
    const stops = tourStops(route, lookup)
    expect(stops).toHaveLength(10)
    expect(stops[0]).toMatchObject({ code: route.branches[0], next: { code: route.branches[1] }, leg: route.legs[0] })
    expect(stops[9]).toMatchObject({ next: undefined, leg: undefined })
  })

  it("keeps later legs on the right stops when a branch is missing", () => {
    const missing = route.branches[3]!
    const lookup = Object.fromEntries(route.branches.filter(c => c !== missing).map(c => [c, { code: c }]))
    const stops = tourStops(route, lookup)
    expect(stops[3]!.branch).toBeUndefined()
    expect(stops[2]!.next).toBeUndefined() // no leg into the missing stop
    expect(stops[5]).toMatchObject({ code: route.branches[5], next: { code: route.branches[6] }, leg: route.legs[5] })
  })
})

describe('stop labels', () => {
  it('keeps the cross street for bus and streetcar stops', () => {
    expect(stopLabel('Roncesvalles Ave at High Park Blvd')).toBe('High Park Blvd')
    expect(stopLabel('Humberwood Blvd at Pinecone Dr North Side')).toBe('Pinecone Dr')
  })

  it('uses the landmark after a dash', () => {
    expect(stopLabel('Bay St at Cumberland St - Bay Station')).toBe('Bay Station')
    expect(stopLabel('Dundas St West at Bathurst St - Toronto Western Hospital')).toBe('Toronto Western Hospital')
  })

  it('drops the bus bay at a station', () => {
    expect(stopLabel('Renforth Station at Bus Bay 6')).toBe('Renforth Station')
  })

  it('drops "Station" only where the name is not also a street or branch', () => {
    expect(stopLabel('Humber College Station')).toBe('Humber College')
    expect(stopLabel('Albion Station')).toBe('Albion Station')
    expect(stopLabel('Union Station')).toBe('Union Station')
  })

  it('labels a walking-only leg by distance', () => {
    expect(walkingLabel([{ mode: 'WALK', minutes: 5, meters: 347 }])).toBe('Walk 350 m')
    expect(walkingLabel([{ mode: 'WALK', minutes: 15, meters: 1234 }])).toBe('Walk 1.2 km')
  })
})
