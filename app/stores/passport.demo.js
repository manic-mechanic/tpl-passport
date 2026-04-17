// Demo state helpers — loaded only in development builds.
//
// This file is code-split via the `import.meta.dev` guard in passport.ts.
// Vite treats `import.meta.dev` as a compile-time constant and eliminates
// the dynamic import branch in production builds — this file is never bundled
// into the Vercel deployment.
//
// No Vercel or GitHub changes are required.
//
// Note: `import.meta.dev` (build-time) and `runtimeConfig.public.isDev`
// (runtime) serve different roles. The runtime flag gates the demo UI in
// settings.vue; the build-time flag gates whether this code ships at all.
// They will always agree in normal usage (local dev vs. Vercel prod), but
// if you ever set NUXT_PUBLIC_IS_DEV=true on a production Vercel build,
// the demo buttons will appear but loadDemoState() will be a no-op — test
// demo state locally with `npm run dev` or from a preview branch instead.

import { physicalBranches } from '~/composables/useRegion'

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

// Spread visits evenly backward from today, one per branch, newest first.
function makeCheckIns(codes, totalDaysSpan) {
  return codes.map((branchCode, i) => {
    const daysBack = Math.max(1, Math.round((i / codes.length) * totalDaysSpan))
    const d = new Date()
    d.setDate(d.getDate() - daysBack)
    d.setHours(10 + (i % 8), (i * 7) % 60, 0, 0)
    return { branchCode, timestamp: d.toISOString(), note: '' }
  })
}

// Returns an ISO timestamp N days ago at a specific UTC hour.
function utcDaysAgo(n, utcHour = 12) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(utcHour, 0, 0, 0)
  return d.toISOString()
}

// Applies a demo state to the passport store's reactive refs.
// Receives refs directly so it can mutate them without importing the store
// (which would cause a circular dependency).
export function applyDemoState(mode, { checkIns, completedChallenges, profile }) {
  const allCodes = physicalBranches.map(b => b.BranchCode)

  if (mode === 'empty') {
    checkIns.value = []
    completedChallenges.value = []
    profile.value = { ...profile.value, homeBranch: '' }
    return
  }

  if (mode === 'mid') {
    // First 28 physical branches (~28%), visited over the past 4 months
    checkIns.value = makeCheckIns(allCodes.slice(0, 28), 120)
    // Day Tripper: 2 branches on the same UTC day
    checkIns.value.push(
      { branchCode: allCodes[0], timestamp: utcDaysAgo(30, 11), note: '' },
      { branchCode: allCodes[1], timestamp: utcDaysAgo(30, 15), note: '' },
    )
    // Return Visitor: allCodes[1] gets a 3rd visit
    checkIns.value.push(
      { branchCode: allCodes[1], timestamp: utcDaysAgo(29), note: '' },
    )
    // Archivist: 2 fully documented check-ins (note + photo), 2 notes-only for documentedBranchCount
    checkIns.value[0] = { ...checkIns.value[0], note: DEMO_NOTES[0], hasPhoto: true }
    checkIns.value[1] = { ...checkIns.value[1], note: DEMO_NOTES[1], hasPhoto: true }
    checkIns.value[2] = { ...checkIns.value[2], note: DEMO_NOTES[2] }
    checkIns.value[3] = { ...checkIns.value[3], note: DEMO_NOTES[3] }

    // STASHED: quest_master demo data — uncomment when FEATURES.challenges = true
    // completedChallenges.value = [
    //   `${allCodes[0]}:0`, `${allCodes[0]}:1`, `${allCodes[0]}:2`,
    // ]
    completedChallenges.value = []

    // Set home branch (2 visits so far — Familiar Face requires 5, not yet earned)
    profile.value = { ...profile.value, homeBranch: allCodes[0] }
  } else if (mode === 'completed') {
    // All physical branches, visited over the past 2 years
    checkIns.value = makeCheckIns(allCodes, 730)
    // Day Tripper: 2 branches on the same UTC day
    checkIns.value.push(
      { branchCode: allCodes[0], timestamp: utcDaysAgo(10, 11), note: '' },
      { branchCode: allCodes[1], timestamp: utcDaysAgo(10, 15), note: '' },
    )
    // Familiar Face: allCodes[0] now has 5 total visits (1 from makeCheckIns + 1 day-trip above + 3 here)
    checkIns.value.push(
      { branchCode: allCodes[0], timestamp: utcDaysAgo(9), note: '' },
      { branchCode: allCodes[0], timestamp: utcDaysAgo(8), note: '' },
      { branchCode: allCodes[0], timestamp: utcDaysAgo(7), note: '' },
    )
    // Return Visitor: allCodes[1] now has 3 total visits (1 makeCheckIns + 1 day-trip + 1 here)
    checkIns.value.push(
      { branchCode: allCodes[1], timestamp: utcDaysAgo(6), note: '' },
    )
    // Archivist: 10 fully documented (note + photo), 15 notes-only for documentedBranchCount
    for (let i = 0; i < 10; i++) {
      checkIns.value[i] = { ...checkIns.value[i], note: DEMO_NOTES[i % DEMO_NOTES.length], hasPhoto: true }
    }
    for (let i = 10; i < 25; i++) {
      checkIns.value[i] = { ...checkIns.value[i], note: DEMO_NOTES[i % DEMO_NOTES.length] }
    }

    // STASHED: quest_master demo data — uncomment when FEATURES.challenges = true
    // completedChallenges.value = [
    //   `${allCodes[0]}:0`, `${allCodes[0]}:1`, `${allCodes[0]}:2`,
    // ]
    completedChallenges.value = []

    // Set home branch for Familiar Face achievement
    profile.value = { ...profile.value, homeBranch: allCodes[0] }
  }

  // Ensure newest-first order — matches the store contract and what RecentVisits expects.
  // push() calls above can leave extra check-ins out of order by timestamp.
  checkIns.value.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
}
