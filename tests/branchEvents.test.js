import { torontoDayKey, addDays, eventDates } from '../server/lib/eventDates'

describe('event date helpers', () => {
  it('uses the Toronto date, not the UTC date, in the evening', () => {
    // 21:30 in Toronto (EDT, UTC-4) on Jul 14 is already Jul 15 in UTC.
    const now = new Date('2026-07-15T01:30:00Z')
    expect(torontoDayKey(now)).toBe('2026-07-14')
  })

  it('uses the Toronto date across the EST offset too', () => {
    // 20:00 EST (UTC-5) on Jan 9 is Jan 10 01:00 UTC.
    expect(torontoDayKey(new Date('2026-01-10T01:00:00Z'))).toBe('2026-01-09')
  })

  it('adds calendar days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('builds a run of consecutive Toronto dates from an offset', () => {
    const now = new Date('2026-07-15T01:30:00Z')
    expect(eventDates(0, 2, now)).toEqual(['2026-07-14', '2026-07-15'])
    expect(eventDates(1, 3, now)).toEqual(['2026-07-15', '2026-07-16', '2026-07-17'])
  })
})
