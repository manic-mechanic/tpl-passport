import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { physicalBranches } from '~/composables/useRegion'
import { pushCheckIn, patchCheckInPhoto } from '~/composables/useCheckInSync'
import { loadPassportState, savePassportState } from '~/lib/passportStorage'
import { localDayKey } from '@tpl-passport/shared'
import type { PassportCheckIn, PassportProfile } from '~/types/passport'

type DemoMode = 'empty' | 'mid' | 'completed'

const defaultProfile: PassportProfile = {
  name: '',
  favouriteBook: '',
  homeBranch: '',
  theme: 'light',
  bypassLocationFence: false,
  hasSeenOnboarding: false,
}

export const usePassportStore = defineStore('passport', () => {
  // --- State (hydrated from localStorage on first load) ---
  const saved = loadPassportState()

  const anonymousId = ref(saved.anonymousId ?? (import.meta.client ? crypto.randomUUID() : ''))

  const checkIns = ref<PassportCheckIn[]>(saved.checkIns ?? [])
  const completedChallenges = ref<string[]>(saved.completedChallenges ?? [])
  const profile = ref<PassportProfile>({
    ...defaultProfile,
    ...(saved.profile ?? {}),
  })

  // Persist to localStorage whenever state changes
  function persist() {
    savePassportState({
      anonymousId: anonymousId.value,
      checkIns: checkIns.value,
      profile: profile.value,
      completedChallenges: completedChallenges.value,
    })
  }

  watch([anonymousId, checkIns, profile, completedChallenges], persist, { deep: true })

  // --- Getters ---
  const visitedBranchCodes = computed(() =>
    new Set(checkIns.value.map(c => c.branchCode))
  )

  const hasVisited = (branchCode: string) => visitedBranchCodes.value.has(branchCode)

  const hasVisitedToday = (branchCode: string) => {
    const today = localDayKey(new Date())
    if (!today) return false
    return checkIns.value.some(
      c => c.branchCode === branchCode &&
           localDayKey(c.timestamp) === today
    )
  }

  const visitCount = computed(() => visitedBranchCodes.value.size)

  // Unique branches where any check-in has a note or photo — used for overallPct
  const documentedBranchCount = computed(() =>
    new Set(
      checkIns.value
        .filter(c => c.note?.trim() || c.hasPhoto)
        .map(c => c.branchCode)
    ).size
  )

  const progressPct = computed(() => Math.round((visitCount.value / physicalBranches.length) * 100))

  // 75% from visiting branches, 25% from documenting them (note or photo).
  // Will expand to include challenges when FEATURES.challenges is re-enabled.
  const overallPct = computed(() =>
    Math.round(
      (visitCount.value / physicalBranches.length * 75) +
      (documentedBranchCount.value / physicalBranches.length * 25)
    )
  )

  // --- Actions ---

  // Adds a check-in. Returns the ISO timestamp of the new check-in,
  // or null if the user already visited this branch today.
  function checkIn(branchCode: string, note = ''): string | null {
    if (hasVisitedToday(branchCode)) return null

    const timestamp = new Date().toISOString()
    checkIns.value.unshift({ branchCode, timestamp, note })
    void pushCheckIn({ branchCode, timestamp, note })  // fire-and-forget
    return timestamp
  }

  function updateNote(timestamp: string, note: string) {
    const ci = checkIns.value.find(c => c.timestamp === timestamp)
    if (!ci) return
    ci.note = note
    void pushCheckIn({ ...ci })  // re-push full check-in so server note is updated
  }

  // Sets hasPhoto: true on the check-in matching the given timestamp.
  // Called after a photo is successfully saved to IndexedDB.
  // Pass photoUri (a hosted URL) to also sync the photo to the server.
  function markCheckInHasPhoto(timestamp: string, photoUri: string | null = null) {
    const ci = checkIns.value.find(c => c.timestamp === timestamp)
    if (ci) {
      ci.hasPhoto = true
      if (photoUri) {
        ci.photoUri = photoUri
        void patchCheckInPhoto(timestamp, photoUri)  // fire-and-forget
      }
    }
  }

  // Bulk-replace check-ins (used after server sync on sign-in).
  function setCheckIns(newCheckIns: PassportCheckIn[]) {
    checkIns.value = newCheckIns
  }

  // STASHED: challenges — restore when FEATURES.challenges = true
  // These functions and state are kept intact so re-enabling requires only a flag flip.
  function hasCompletedChallenge(branchCode: string, idx: number) {
    return completedChallenges.value.includes(`${branchCode}:${idx}`)
  }

  function toggleChallenge(branchCode: string, idx: number) {
    const key = `${branchCode}:${idx}`
    const i = completedChallenges.value.indexOf(key)
    if (i >= 0) completedChallenges.value.splice(i, 1)
    else completedChallenges.value.push(key)
  }
  // END STASHED: challenges

  // Resets the passport to a preset demo state.
  // 'empty'     → no visits
  // 'mid'       → ~28 physical branches visited over the last ~4 months
  // 'completed' → all physical branches visited over the last ~2 years
  //
  // The implementation lives in passport.demo.js and is loaded on demand.
  // Guarded by the runtime isDev flag so it works on preview deployments
  // (NUXT_PUBLIC_IS_DEV=true) while remaining a no-op in production.
  async function loadDemoState(mode: DemoMode) {
    const { public: { isDev } } = useRuntimeConfig()
    if (!isDev) return
    try {
      const { applyDemoState } = await import('./passport.demo.js')
      applyDemoState(mode, { checkIns, completedChallenges, profile })
    } catch (e) {
      console.error('[demo] loadDemoState failed:', e)
    }
  }

  return {
    anonymousId,
    checkIns,
    profile,
    visitedBranchCodes,
    hasVisited,
    hasVisitedToday,
    visitCount,
    documentedBranchCount,
    progressPct,
    overallPct,
    completedChallenges,
    hasCompletedChallenge,
    toggleChallenge,
    checkIn,
    updateNote,
    markCheckInHasPhoto,
    setCheckIns,
    loadDemoState,
  }
})
