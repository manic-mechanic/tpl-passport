import { describe, it, expect } from 'vitest'
import { routeBadgeStyle, routeShortName } from '../app/lib/ttcRouteStyle'

describe('routeBadgeStyle', () => {
  it('uses red for regular bus and streetcar routes', () => {
    expect(routeBadgeStyle('BUS', '45')).toEqual({ background: '#DA251D', color: '#FFFFFF' })
    expect(routeBadgeStyle('TRAM', '506')).toEqual({ background: '#DA251D', color: '#FFFFFF' })
  })

  it('outlines limited-service, Blue Night and community routes', () => {
    expect(routeBadgeStyle('BUS', '160')).toEqual({ background: '#FFFFFF', color: '#DA251D', border: '#DA251D' })
    expect(routeBadgeStyle('TRAM', '507')).toEqual({ background: '#FFFFFF', color: '#DA251D', border: '#DA251D' })
    expect(routeBadgeStyle('BUS', '320')).toEqual({ background: '#FFFFFF', color: '#024182', border: '#024182' })
    expect(routeBadgeStyle('BUS', '403')).toEqual({ background: '#FFFFFF', color: '#808080', border: '#808080' })
  })

  it('uses green for Express routes', () => {
    expect(routeBadgeStyle('BUS', '996')).toEqual({ background: '#00923F', color: '#FFFFFF' })
  })

  it("uses each rapid-transit line's colour, including the light-rail lines", () => {
    expect(routeBadgeStyle('SUBWAY', '1')).toEqual({ background: '#F8C300', color: '#000000' })
    expect(routeBadgeStyle('SUBWAY', '2')).toEqual({ background: '#00923F', color: '#FFFFFF' })
    expect(routeBadgeStyle('TRAM', '6')).toEqual({ background: '#969594', color: '#FFFFFF' })
  })
})

describe('routeShortName', () => {
  it('drops the route number, which goes in the badge', () => {
    expect(routeShortName('45 Kipling', '45')).toBe('Kipling')
    expect(routeShortName('996 Wilson Express', '996')).toBe('Wilson Express')
    expect(routeShortName('Line 2 (Bloor - Danforth)', '2')).toBe('Bloor-Danforth')
    expect(routeShortName('Line 6 Finch West', '6')).toBe('Finch West')
    expect(routeShortName(undefined, '7')).toBe('')
  })
})
