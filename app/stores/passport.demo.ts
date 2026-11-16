// Demo state helpers for previews and local development.
//
// passport.ts loads this file with a dynamic import, so it's split into its
// own chunk and only fetched when loadDemoState() runs, which it only does
// when the runtime isDev flag is on (local `nuxt dev`, or a deployment with
// NUXT_PUBLIC_IS_DEV=true such as dev.librarypassport.ca).

import { checkInDayKey, dayRangeUtc } from '@tpl-passport/shared'
import type { Ref } from 'vue'
import { physicalBranches } from '~/composables/useRegion'
import type { PassportCheckIn, PassportProfile } from '~/types/passport'

export type DemoMode = 'empty' | 'mid' | 'completed'

const DEMO_NOTES = [
  'Great kids section — found a perfect series to start',
  'Quiet and spacious, came back for study time',
  'Staff recommended an amazing read',
  'Attended a Saturday storytime — the kids loved it',
  'Picked up three holds, all ready the same week',
  'Discovered a local history display near the entrance',
  'Best natural light for reading in the whole system',
  'Met a librarian who helped us find a niche topic book',
  'Cozy nook in the corner, perfect for rainy days',
  'The teen section had some surprisingly good graphic novels',
]

// ISO timestamp at hour:minute (library time) on the library day `n` days
// before today. Days are counted in BRANCH_TIME_ZONE, the same rule
// hasVisitedToday uses, so n >= 1 never lands on today in any time zone.
function libraryDaysAgo(n: number, hour = 12, minute = 0): string {
  const [y = 0, m = 1, d = 1] = checkInDayKey(new Date()).split('-').map(Number)
  const dayKey = new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
  const range = dayRangeUtc(dayKey)
  if (!range) throw new Error(`No library day range for ${dayKey}`)
  const start = Date.parse(range.start)
  return new Date(start + (hour * 60 + minute) * 60_000).toISOString()
}

// Spread visits evenly backward from today, one per branch, newest first.
function makeCheckIns(codes: string[], totalDaysSpan: number): PassportCheckIn[] {
  return codes.map((branchCode, i) => {
    const daysBack = Math.max(1, Math.round((i / codes.length) * totalDaysSpan))
    const timestamp = libraryDaysAgo(daysBack, 10 + (i % 8), (i * 7) % 60)
    return { branchCode, timestamp, note: '' }
  })
}

// Applies a demo state to the passport store's reactive refs.
// Receives refs directly so it can mutate them without importing the store
// (which would cause a circular dependency).
export function applyDemoState(
  mode: DemoMode,
  { checkIns, completedChallenges, profile }: {
    checkIns: Ref<PassportCheckIn[]>
    completedChallenges: Ref<string[]>
    profile: Ref<PassportProfile>
  },
): void {
  const allCodes = physicalBranches.map(b => b.BranchCode)
  const [firstCode = '', secondCode = ''] = allCodes

  // Adds a note (and optionally a photo flag) to the i-th demo check-in.
  function annotate(i: number, note: string | undefined, hasPhoto = false) {
    const ci = checkIns.value[i]
    if (ci) checkIns.value[i] = { ...ci, note: note ?? '', ...(hasPhoto ? { hasPhoto: true } : {}) }
  }

  if (mode === 'empty') {
    checkIns.value = []
    completedChallenges.value = []
    profile.value = { ...profile.value, homeBranch: '' }
    return
  }

  if (mode === 'mid') {
    // First 28 physical branches (~28%), visited over the past 4 months
    checkIns.value = makeCheckIns(allCodes.slice(0, 28), 120)
    // Day Tripper: 2 branches on the same library day
    checkIns.value.push(
      { branchCode: firstCode, timestamp: libraryDaysAgo(30, 11), note: '' },
      { branchCode: secondCode, timestamp: libraryDaysAgo(30, 15), note: '' },
    )
    // Return Visitor: secondCode gets a 3rd visit
    checkIns.value.push(
      { branchCode: secondCode, timestamp: libraryDaysAgo(29), note: '' },
    )
    // Archivist: 2 fully documented check-ins (note + photo), 2 notes-only for documentedBranchCount
    annotate(0, DEMO_NOTES[0], true)
    annotate(1, DEMO_NOTES[1], true)
    annotate(2, DEMO_NOTES[2])
    annotate(3, DEMO_NOTES[3])

    // STASHED: quest_master demo data — uncomment when FEATURES.challenges = true
    // completedChallenges.value = [
    //   `${firstCode}:0`, `${firstCode}:1`, `${firstCode}:2`,
    // ]
    completedChallenges.value = []

    // Set home branch (2 visits so far — Familiar Face requires 5, not yet earned)
    profile.value = { ...profile.value, homeBranch: firstCode }
  } else if (mode === 'completed') {
    // All physical branches, visited over the past 2 years
    checkIns.value = makeCheckIns(allCodes, 730)
    // Day Tripper: 2 branches on the same library day
    checkIns.value.push(
      { branchCode: firstCode, timestamp: libraryDaysAgo(10, 11), note: '' },
      { branchCode: secondCode, timestamp: libraryDaysAgo(10, 15), note: '' },
    )
    // Familiar Face: firstCode now has 5 total visits (1 from makeCheckIns + 1 day-trip above + 3 here)
    checkIns.value.push(
      { branchCode: firstCode, timestamp: libraryDaysAgo(9), note: '' },
      { branchCode: firstCode, timestamp: libraryDaysAgo(8), note: '' },
      { branchCode: firstCode, timestamp: libraryDaysAgo(7), note: '' },
    )
    // Return Visitor: secondCode now has 3 total visits (1 makeCheckIns + 1 day-trip + 1 here)
    checkIns.value.push(
      { branchCode: secondCode, timestamp: libraryDaysAgo(6), note: '' },
    )
    // Archivist: 10 fully documented (note + photo), 15 notes-only for documentedBranchCount
    for (let i = 0; i < 10; i++) {
      annotate(i, DEMO_NOTES[i % DEMO_NOTES.length], true)
    }
    for (let i = 10; i < 25; i++) {
      annotate(i, DEMO_NOTES[i % DEMO_NOTES.length])
    }

    // STASHED: quest_master demo data — uncomment when FEATURES.challenges = true
    // completedChallenges.value = [
    //   `${firstCode}:0`, `${firstCode}:1`, `${firstCode}:2`,
    // ]
    completedChallenges.value = []

    // Set home branch for Familiar Face achievement
    profile.value = { ...profile.value, homeBranch: firstCode }
  }

  // Ensure newest-first order — matches the store contract and what RecentVisits expects.
  // push() calls above can leave extra check-ins out of order by timestamp.
  checkIns.value.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
}
