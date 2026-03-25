import { defineStore } from 'pinia'
import { physicalBranches } from '~/composables/useRegion'

const STORAGE_KEY = 'tpl-passport'

export const usePassportStore = defineStore('passport', () => {
  // --- State (hydrated from localStorage on first load) ---
  const saved = import.meta.client ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') : {}

  const checkIns = ref(saved.checkIns ?? [])             // [{ branchCode, timestamp, note }]
  const completedChallenges = ref(saved.completedChallenges ?? [])  // ["BranchCode:index", ...]
  const profile = ref({
    name: '',
    favouriteBook: '',
    homeBranch: '',  // BranchCode of home branch
    theme: 'light',
    bypassLocationFence: true,
    hasSeenOnboarding: false,
    ...(saved.profile ?? {}),
  })

  // Persist to localStorage whenever state changes
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      checkIns: checkIns.value,
      profile: profile.value,
      completedChallenges: completedChallenges.value,
    }))
  }

  watch([checkIns, profile, completedChallenges], persist, { deep: true })

  // --- Getters ---
  const visitedBranchCodes = computed(() =>
    new Set(checkIns.value.map(c => c.branchCode))
  )

  const hasVisited = (branchCode) => visitedBranchCodes.value.has(branchCode)

  const hasVisitedToday = (branchCode) => {
    const today = new Date().toDateString()
    return checkIns.value.some(
      c => c.branchCode === branchCode && new Date(c.timestamp).toDateString() === today
    )
  }

  const visitCount = computed(() => visitedBranchCodes.value.size)

  const completedChallengesCount = computed(() => completedChallenges.value.length)

  function hasCompletedChallenge(branchCode, idx) {
    return completedChallenges.value.includes(`${branchCode}:${idx}`)
  }

  function toggleChallenge(branchCode, idx) {
    const key = `${branchCode}:${idx}`
    const i = completedChallenges.value.indexOf(key)
    if (i >= 0) completedChallenges.value.splice(i, 1)
    else completedChallenges.value.push(key)
  }

  // --- Actions ---

  // Adds a check-in. Returns false (no-op) if the user already checked in
  // at this branch today — one visit per branch per day.
  function checkIn(branchCode, note = '') {
    if (hasVisitedToday(branchCode)) return false

    checkIns.value.unshift({
      branchCode,
      timestamp: new Date().toISOString(),
      note,
    })
    return true
  }

  // Resets the passport to a preset demo state.
  // 'empty'     → no visits
  // 'mid'       → ~28 physical branches visited over the last ~4 months
  // 'completed' → all physical branches visited over the last ~2 years
  function loadDemoState(mode) {
    if (mode === 'empty') {
      checkIns.value = []
      return
    }

    const allCodes = physicalBranches.map(b => b.BranchCode)

    // Spread visits evenly backward from today, one per branch
    const makeCheckIns = (codes, totalDaysSpan) =>
      codes.map((branchCode, i) => {
        // Minimum 1 day back — demo check-ins should never land on today
        const daysBack = Math.max(1, Math.round((i / codes.length) * totalDaysSpan))
        const d = new Date()
        d.setDate(d.getDate() - daysBack)
        d.setHours(10 + (i % 8), (i * 7) % 60, 0, 0) // vary the time of day
        return { branchCode, timestamp: d.toISOString(), note: '' }
      })

    if (mode === 'mid') {
      // First 28 physical branches (~28%), visited over the past 4 months
      checkIns.value = makeCheckIns(allCodes.slice(0, 28), 120)
    } else if (mode === 'completed') {
      // All physical branches, visited over the past 2 years
      checkIns.value = makeCheckIns(allCodes, 730)
    }
  }

  return {
    checkIns,
    profile,
    visitedBranchCodes,
    hasVisited,
    hasVisitedToday,
    visitCount,
    completedChallenges,
    completedChallengesCount,
    hasCompletedChallenge,
    toggleChallenge,
    checkIn,
    loadDemoState,
  }
})
