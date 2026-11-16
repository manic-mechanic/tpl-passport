// "Next Stop: Your Library Tour" — the School of Cities (University of Toronto)
// event marking ten years of #JacksLibraryTour. Ten transit routes of ten
// branches each cover all 100 branches. Route data comes from the event's
// own map (schoolofcities.github.io/libraries-by-transit), without the map
// geometry; data/library-tour.json says where it's from.

import { checkInDayKey, type Branch, type CheckIn } from '@tpl-passport/shared'
import tourData from '#data/library-tour.json'

export type TourMode = 'WALK' | 'BUS' | 'SUBWAY' | 'TRAM'

export interface TourSegment {
  mode: TourMode
  minutes: number
  meters?: number
  line?: string
  lineName?: string
  fromStop?: string
  toStop?: string
}

export interface TourRoute {
  id: number
  title: string
  color: string
  walkKm: number
  travelMin: number
  rides: number
  branches: string[] // BranchCodes, in visiting order
  // legs[i] gets you from branches[i] to branches[i + 1]
  legs: TourSegment[][]
}

export const LIBRARY_TOUR = tourData as {
  name: string
  hashtag: string
  by: string
  url: string
  endsOn: string // last day to log visits toward all 100 (YYYY-MM-DD)
  routes: TourRoute[]
}

export const tourRoutes: TourRoute[] = LIBRARY_TOUR.routes

export function getTourRoute(id: string | number): TourRoute | undefined {
  return tourRoutes.find(r => String(r.id) === String(id))
}

// "45 min", "2 h", "3 h 4 min"
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = Math.round(total % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function legMinutes(leg: TourSegment[]): number {
  return leg.reduce((sum, s) => sum + s.minutes, 0)
}

// The rides in a leg, e.g. ["45 Kipling", "Line 2"]. Walks are left out.
export function legRides(leg: TourSegment[]): TourSegment[] {
  return leg.filter(s => s.mode !== 'WALK')
}

// Google Maps transit directions between two branches. Maps URLs can't take
// waypoints for transit, so routes link one leg at a time.
export function transitDirectionsUrl(from: Pick<Branch, 'Lat' | 'Long'>, to: Pick<Branch, 'Lat' | 'Long'>): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.Lat},${from.Long}`,
    destination: `${to.Lat},${to.Long}`,
    travelmode: 'transit',
  })
  return `https://www.google.com/maps/dir/?${params}`
}

// Visitors who came from the event's page: its link carries ?ref=yourlibrarytour,
// or the browser reports the School of Cities site as the referrer.
export const TOUR_REF = 'yourlibrarytour'

export function isTourReferral(query: Record<string, unknown>, referrer: string): boolean {
  if (String(query.ref ?? '').toLowerCase() === TOUR_REF) return true
  try {
    return new URL(referrer).hostname === 'schoolofcities.utoronto.ca'
  } catch {
    return false
  }
}

// Text colour that stays readable on a route's colour (some are light, like
// route 9's sky blue and route 8's yellow): near-black on light, white on dark.
export function textOnColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1]!, 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  // Pick whichever of white or near-black has the higher contrast ratio
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? '#1a1a1a' : '#fff'
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface RouteProgress {
  route: TourRoute
  visited: number
  total: number
  complete: boolean
}

export function routeProgress(route: TourRoute, visitedCodes: ReadonlySet<string>): RouteProgress {
  const visited = route.branches.filter(code => visitedCodes.has(code)).length
  return { route, visited, total: route.branches.length, complete: visited === route.branches.length }
}

// Whether the tour is still on: logging visits toward all 100 runs through
// LIBRARY_TOUR.endsOn, in library (Toronto) days.
export function isTourOn(now: Date = new Date()): boolean {
  return checkInDayKey(now) <= LIBRARY_TOUR.endsOn
}

// Completing the #YourLibraryTour challenge: every branch first visited by
// LIBRARY_TOUR.endsOn. Returns the library day the last one was first
// visited, or null if not (yet) done. Shown as a postmark on Full Passport.
export function tourCompletedOn(checkIns: Pick<CheckIn, 'branchCode' | 'timestamp'>[]): string | null {
  const firstVisit = new Map<string, string>()
  for (const ci of checkIns) {
    const day = checkInDayKey(ci.timestamp)
    if (!day) continue
    const prev = firstVisit.get(ci.branchCode)
    if (!prev || day < prev) firstVisit.set(ci.branchCode, day)
  }
  let last = ''
  for (const route of tourRoutes) {
    for (const code of route.branches) {
      const day = firstVisit.get(code)
      if (!day) return null
      if (day > last) last = day
    }
  }
  return last <= LIBRARY_TOUR.endsOn ? last : null
}

// A boarding stop without its curb side, e.g. "Humberwood Blvd at Pinecone Dr
// North Side" → "Humberwood Blvd at Pinecone Dr". Landmarks after " - " stay.
export function shortStopName(stop: string | undefined): string {
  if (!stop) return ''
  return stop.replace(/\s+(North|South|East|West) Side\b/, '').trim()
}
