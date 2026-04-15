const AUDIENCE_MAP = {
  'Adults (18+)': 'Adults',
  'Older Adults': 'Seniors',
  'Younger Adults (18-24)': 'Ages 18–24',
  'Teens (13-17)': 'Teens',
  'School Age Children (6-12)': 'Kids 6–12',
  'Preschool Children (0-5)': 'Ages 0–5',
}
const ADULT_GROUPS = new Set(['Adults (18+)', 'Older Adults', 'Younger Adults (18-24)'])
const KID_GROUPS = new Set(['Teens (13-17)', 'School Age Children (6-12)', 'Preschool Children (0-5)'])

export function formatAudiences(raw) {
  if (!raw) return ''
  const groups = raw.split(',').map(g => g.trim())
  const adults = groups.filter(g => ADULT_GROUPS.has(g))
  const kids = groups.filter(g => KID_GROUPS.has(g))
  if (adults.length >= 1 && kids.length >= 1) return 'All ages'
  if (adults.length >= 2) return 'Adults'
  if (kids.length >= 2) return 'Kids'
  return groups.map(g => AUDIENCE_MAP[g] ?? g).join(', ')
}

export function formatEventTime(s) {
  if (!s) return ''
  const tIdx = s.indexOf('T')
  const timePart = tIdx !== -1 ? s.slice(tIdx + 1) : s
  const [h, m] = timePart.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return ''
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}
