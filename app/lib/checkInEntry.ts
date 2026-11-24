// Every "Check in" entry point (Home panel, welcome sheet, nav orb) goes to
// the check-in page with { locate: true } in history state. The page then
// finds the nearest branch straight away, so the browser's location prompt
// appears there, after a tap about checking in. Home never asks for location.
export const CHECK_IN_ROUTE = { path: '/check-in', state: { locate: true } } as const

// The branches on the onboarding panels: real stamps, real colours.
export const SHOWCASE_STAMPS = ['HP', 'LS', 'PK'] as const
