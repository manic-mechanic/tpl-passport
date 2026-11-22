import type { Branch } from '@tpl-passport/shared'
import { physicalBranches } from '@tpl-passport/shared'
import {
  addDays, branchLookup, cleanLocationName, isOver, sortEvents, toExploreEvents, torontoNow, torontoToday,
  type RawEvent,
} from '../app/lib/exploreEvents'

const branches = branchLookup(physicalBranches)

function raw(over: Partial<RawEvent>): RawEvent {
  return { _id: Math.random(), Title: 'Storytime', StartDateLocal: '2026-11-22', StartTime: '2026-11-22T14:00:00', EndTime: '2026-11-22T15:00:00', LocationName: 'Parkdale', ...over }
}

describe('What\'s On events', () => {
  it('matches feed location names to branches, including Long Branch and curly apostrophes', () => {
    for (const name of ['Parkdale', 'Long Branch', 'Ethennonnhawahstihnen\'', 'North York Central Library']) {
      expect(toExploreEvents([raw({ LocationName: name })], branches)[0]!.branch, name).not.toBeNull()
    }
  })

  it('drops the "- Closed" twin and exact duplicates', () => {
    const events = toExploreEvents([
      raw({ _id: 1 }),
      raw({ _id: 2, LocationName: 'Parkdale - Closed' }),
      raw({ _id: 3 }),
      raw({ _id: 4, StartTime: '2026-11-22T16:00:00' }),
    ], branches)
    expect(events.map(e => e.id)).toEqual([1, 4])
  })

  it('labels events without a location as online', () => {
    expect(cleanLocationName('None')).toBe('Online')
    expect(cleanLocationName(undefined)).toBe('Online')
    expect(cleanLocationName('Cedarbrae - Closed')).toBe('Cedarbrae')
  })

  it('treats an event as over once it has ended, in Toronto time', () => {
    // 18:30 EST on Nov 22 is 23:30 UTC.
    const now = torontoNow(new Date('2026-11-22T23:30:00Z'))
    expect(now).toBe('2026-11-22T18:30:00')
    const [ended, running] = toExploreEvents([
      raw({ EndTime: '2026-11-22T18:00:00' }),
      raw({ Title: 'Evening', EndTime: '2026-11-22T19:00:00' }),
    ], branches)
    expect(isOver(ended!, now)).toBe(true)
    expect(isOver(running!, now)).toBe(false)
  })

  it('uses the Toronto day, not UTC\'s', () => {
    expect(torontoToday(new Date('2026-11-23T02:00:00Z'))).toBe('2026-11-22')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('sorts by day and time, or nearest first within a day when located', () => {
    const near = physicalBranches.find(b => b.BranchName.startsWith('Parkdale'))! as Branch
    const events = toExploreEvents([
      raw({ _id: 'far', LocationName: 'Malvern', StartTime: '2026-11-22T10:00:00' }),
      raw({ _id: 'near', LocationName: 'Parkdale', StartTime: '2026-11-22T16:00:00' }),
      raw({ _id: 'online', LocationName: 'None', StartTime: '2026-11-22T09:00:00' }),
      raw({ _id: 'tomorrow', StartDateLocal: '2026-11-23', StartTime: '2026-11-23T08:00:00' }),
    ], branches)
    expect(sortEvents(events, null, null).map(e => e.id)).toEqual(['online', 'far', 'near', 'tomorrow'])
    expect(sortEvents(events, Number(near.Lat), Number(near.Long)).map(e => e.id)).toEqual(['near', 'far', 'online', 'tomorrow'])
  })
})
