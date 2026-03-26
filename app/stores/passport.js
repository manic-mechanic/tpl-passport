import { ref, computed, watch } from 'vue'
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
    bypassLocationFence: false,
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
    const todayPrefix = new Date().toISOString().slice(0, 10)
    return checkIns.value.some(
      c => c.branchCode === branchCode && c.timestamp.startsWith(todayPrefix)
    )
  }

  const visitCount    = computed(() => visitedBranchCodes.value.size)
  const progressPct   = computed(() => Math.round((visitCount.value / physicalBranches.length) * 100))

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

  // Adds a check-in. Returns the ISO timestamp of the new check-in,
  // or null if the user already visited this branch today.
  function checkIn(branchCode, note = '') {
    if (hasVisitedToday(branchCode)) return null

    const timestamp = new Date().toISOString()
    checkIns.value.unshift({ branchCode, timestamp, note })
    return timestamp
  }

  // Resets the passport to a preset demo state.
  // 'empty'     → no visits
  // 'mid'       → ~28 physical branches visited over the last ~4 months
  // 'completed' → all physical branches visited over the last ~2 years
  function loadDemoState(mode) {
    if (mode === 'empty') {
      checkIns.value = []
      completedChallenges.value = []
      profile.value = { ...profile.value, homeBranch: '' }
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
        d.setHours(10 + (i % 8), (i * 7) % 60, 0, 0)
        return { branchCode, timestamp: d.toISOString(), note: '' }
      })

    // Returns an ISO timestamp N days ago at a specific UTC hour
    const utcDaysAgo = (n, utcHour = 12) => {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - n)
      d.setUTCHours(utcHour, 0, 0, 0)
      return d.toISOString()
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
      // Quest Master: all 3 challenges completed at allCodes[0]
      completedChallenges.value = [
        `${allCodes[0]}:0`, `${allCodes[0]}:1`, `${allCodes[0]}:2`,
      ]
      // Set home branch (2 visits so far — Homebody requires 5, not yet earned)
      profile.value = { ...profile.value, homeBranch: allCodes[0] }
    } else if (mode === 'completed') {
      // All physical branches, visited over the past 2 years
      checkIns.value = makeCheckIns(allCodes, 730)
      // Day Tripper: 2 branches on the same UTC day
      checkIns.value.push(
        { branchCode: allCodes[0], timestamp: utcDaysAgo(10, 11), note: '' },
        { branchCode: allCodes[1], timestamp: utcDaysAgo(10, 15), note: '' },
      )
      // Homebody: allCodes[0] now has 5 total visits (1 from makeCheckIns + 1 day-trip above + 3 here)
      checkIns.value.push(
        { branchCode: allCodes[0], timestamp: utcDaysAgo(9), note: '' },
        { branchCode: allCodes[0], timestamp: utcDaysAgo(8), note: '' },
        { branchCode: allCodes[0], timestamp: utcDaysAgo(7), note: '' },
      )
      // Return Visitor: allCodes[1] now has 3 total visits (1 makeCheckIns + 1 day-trip + 1 here)
      checkIns.value.push(
        { branchCode: allCodes[1], timestamp: utcDaysAgo(6), note: '' },
      )
      // Quest Master: all 3 challenges completed at allCodes[0]
      completedChallenges.value = [
        `${allCodes[0]}:0`, `${allCodes[0]}:1`, `${allCodes[0]}:2`,
      ]
      // Set home branch for Homebody achievement
      profile.value = { ...profile.value, homeBranch: allCodes[0] }
    }
  }

  return {
    checkIns,
    profile,
    visitedBranchCodes,
    hasVisited,
    hasVisitedToday,
    visitCount,
    progressPct,
    completedChallenges,
    completedChallengesCount,
    hasCompletedChallenge,
    toggleChallenge,
    checkIn,
    loadDemoState,
  }
})
