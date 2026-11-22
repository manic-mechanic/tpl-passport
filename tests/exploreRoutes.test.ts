import { describe, expect, it } from 'vitest'
import { exploreRedirect, exploreTabFor } from '../app/lib/exploreRoutes'

const to = (query: Record<string, string>, hash = '') => ({ query, hash })

describe('exploreRedirect', () => {
  it('sends old ?tab= links to their tab', () => {
    expect(exploreRedirect(to({}))).toEqual({ path: '/explore/branches', query: {}, hash: '' })
    expect(exploreRedirect(to({ tab: 'near-me' }))).toMatchObject({ path: '/explore/branches' })
    expect(exploreRedirect(to({ tab: 'routes' }))).toMatchObject({ path: '/explore/trips/transit' })
    expect(exploreRedirect(to({ tab: 'routes', mode: 'transit' }))).toMatchObject({ path: '/explore/trips/transit' })
    expect(exploreRedirect(to({ tab: 'routes', mode: 'walk' }))).toMatchObject({ path: '/explore/trips/walking' })
    expect(exploreRedirect(to({ tab: 'events' }))).toMatchObject({ path: '/explore/events' })
    expect(exploreRedirect(to({ tab: 'working-toward' }))).toMatchObject({ path: '/explore/extra' })
  })

  it('keeps other query parameters and the hash', () => {
    expect(exploreRedirect(to({ tab: 'events', ref: 'x' }, '#top'))).toEqual({ path: '/explore/events', query: { ref: 'x' }, hash: '#top' })
  })
})

describe('exploreTabFor', () => {
  it('finds the tab for a path, including the day trip modes', () => {
    expect(exploreTabFor('/explore/trips/walking')?.label).toBe('Day trips')
    expect(exploreTabFor('/explore/branches')?.analytics).toBe('near-me')
    expect(exploreTabFor('/explore/branchesx')).toBeUndefined()
    expect(exploreTabFor('/passport')).toBeUndefined()
  })
})
