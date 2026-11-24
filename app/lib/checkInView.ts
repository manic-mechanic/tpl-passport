// The scene above the branch card on the check-in page. One is picked at
// random each time the page opens, never the same one twice in a row.

export const CHECK_IN_VIEWS = ['map', 'diary', 'street'] as const
export type CheckInView = (typeof CHECK_IN_VIEWS)[number]

const LAST_VIEW_KEY = 'tpl-passport:checkin-view'

export function pickView(last: string | null, random: () => number = Math.random): CheckInView {
  const choices = CHECK_IN_VIEWS.filter(v => v !== last)
  return choices[Math.floor(random() * choices.length)] ?? choices[0]!
}

// Picks this visit's view and remembers it for the next one.
export function nextCheckInView(random: () => number = Math.random): CheckInView {
  let last: string | null = null
  try {
    last = globalThis.localStorage?.getItem(LAST_VIEW_KEY) ?? null
  } catch { /* storage blocked: any view */ }
  const view = pickView(last, random)
  try {
    globalThis.localStorage?.setItem(LAST_VIEW_KEY, view)
  } catch { /* the next visit may repeat it, which is fine */ }
  return view
}
