// TTC route badge colours: red for regular bus and streetcar routes, an
// outlined badge for limited-service, Blue Night (300s) and community (400s)
// routes, green for Express (900s), and each rapid-transit line's own colour.
import styles from '#data/ttc-route-styles.json'
import type { TourMode } from '~/lib/libraryTour'

export interface RouteBadgeStyle {
  background?: string
  color: string
  border?: string
}

type Rule =
  | { match: 'limited', style: RouteBadgeStyle }
  | { range: [number, number], style: RouteBadgeStyle }

const busStreetcar = styles.busStreetcar as {
  limited: number[]
  default: RouteBadgeStyle
  rules: Rule[]
}
const subway = styles.subway as {
  default: RouteBadgeStyle
  lines: Record<string, Partial<RouteBadgeStyle>>
}

// Lines 1–6 are rapid transit, whether the data calls them SUBWAY or (for
// Lines 5 and 6, which are light rail) TRAM.
export function isRapidTransitLine(line: string): boolean {
  return line in subway.lines
}

export function routeBadgeStyle(mode: TourMode, line: string): RouteBadgeStyle {
  if (mode === 'SUBWAY' || isRapidTransitLine(line)) {
    return { ...subway.default, ...subway.lines[line] }
  }
  const n = Number(line)
  const rule = busStreetcar.rules.find(r =>
    'match' in r ? busStreetcar.limited.includes(n) : n >= r.range[0] && n <= r.range[1])
  return rule ? rule.style : busStreetcar.default
}

// "45 Kipling" → "Kipling", "Line 2 (Bloor - Danforth)" → "Bloor-Danforth",
// "Line 6 Finch West" → "Finch West". The number goes in the badge.
export function routeShortName(lineName: string | undefined, line: string): string {
  if (!lineName) return ''
  return lineName
    .replace(new RegExp(`^(Line\\s+)?${line}\\s*`), '')
    .replace(/^\((.*)\)$/, '$1')
    .replace(/\s*-\s*/g, '-')
    .trim()
}
