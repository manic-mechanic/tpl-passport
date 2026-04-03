# Copy Audit

> Status: audit only — no fixes made yet

---

## Key Issues

### 1. "Check In" capitalization
- Page header and nav label: **"Check In"** (title case)
- Buttons in BranchDetail: **"Check in here"** / **"Check in again"** (sentence case)

### 2. Visit status — 4 different phrasings
| Context | Text |
|---|---|
| BranchCard meta | "visited" / "never been" |
| Check-in page notice | "You've already checked in here today" |
| BranchDetail buttons | "Check in again" / "Check in here" |
| branches.vue filters | "Visited" / "Unvisited" |

### 3. Link arrow conventions
| Usage | Style |
|---|---|
| "Find a branch →" (check-in.vue) | → |
| "All events at this branch ↗" (BranchDetail) | ↗ |
| "Toronto Public Library ↗" (settings) | ↗ |
| "See all" (RecentVisits, HomeBadgesStrip) | none |

No consistent rule: internal vs external vs no arrow.

### 4. "Nearby" vs "near you"
- "Nearby branches" — BranchDetail section heading
- "Also nearby" — check-in success sheet
- "branches near you" — explore.vue geolocation prompt
- "Finding branches near you…" — explore.vue loading state

### 5. Empty state tone varies wildly
| Empty state | Tone |
|---|---|
| "No check-ins yet. Visit a branch to get started!" | casual + encouraging |
| "No memories recorded yet. Add a note or photo when checking in." | instructional |
| "You've earned every badge. Nothing left to work toward — well done!" | celebratory |
| "Branch not found." | terse |
| "No events today or tomorrow." | neutral |

### 6. Section heading structure inconsistency
- "Recent Visits", "Upcoming events", "Nearby branches" — plural
- "Your Passport", "Extra Credit" — singular
- "Your visits here" — possessive + plural (BranchDetail)

---

## Minor Issues

- Ellipsis inconsistency: "Detecting your location…" and "Checking location…" use ellipsis, but "coming soon" copy does not
- "Already visited today" (BranchDetail label) vs "You've already checked in here today" (check-in.vue notice) — same concept, two phrasings
- "visits" vs "check-ins" used interchangeably in history.vue (header: "check-ins", stat label: "Total visits")
