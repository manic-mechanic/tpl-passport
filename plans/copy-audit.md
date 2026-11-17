# Copy Guide

> Status: rules agreed and applied (November 2026, issue #36). Use this when writing new copy.

---

## Rules

### 1. Sentence case
Headings, page titles, tab labels, nav labels and buttons use sentence case:
"Check in", "Recent visits", "Branch history", "All branches", "Near me".

Exceptions are names: **Extra Credit** (a passport page), **Library Passport**,
**Toronto Public Library**, and branch and route names.

### 2. "Check in" is the action, "visit" is the record
- Verbs and buttons: "Check in here", "Check in again", "Checked in today".
- Counts and lists: "visits", "Recent visits", "Your visits here", "Visited" / "Not visited".
- Don't count "check-ins" in the UI.

### 3. Links
- Internal text links: no arrow ("Sign in", "See all", "Browse all branches").
- Rows that open something: the chevron (`IconChevron`).
- Links that leave the app: text, then `IconExternal` with the shared `.external-icon` class,
  `target="_blank" rel="noopener"`, and an `aria-label` ending "(opens another site)".
  Don't use ↗ or →.

### 4. "Nearby" vs "near you"
Both stay. "Nearby" is relative to a branch ("Nearby branches", "Also nearby"); "near you"
is relative to the user's location ("Finding branches near you…").

### 5. Empty states
Say what's empty, then give one next step. No exclamation marks.
- "No visits yet. Check in at any branch to start your history."
- Dead ends link somewhere: "We couldn't find that branch. Browse all branches"

### 6. Ellipses
Use the single character `…`, only for something in progress ("Saving…", "Checking location…")
or a placeholder ("Search branches…").
