// First-visit onboarding (issues #82, #83): Home leads with two panels,
// "Check in" and "Make your passport", until the person has done one of them.
//
// Two A/B tests run on it at the same time. Arms are picked on the device on
// the first visit and kept in localStorage, not read from PostHog feature
// flags: posthog-js loads after the page draws (#45), so flag-driven panels
// would pop in late. The posthog plugin registers them as super properties.

export type SheetArm = 'sheet' | 'none'
export type HomeOrderArm = 'checkin_first' | 'passport_first'

export interface OnboardingArms {
  onb_sheet: SheetArm
  onb_home_order: HomeOrderArm
}

// Where Home is in the first steps.
//   new       nothing done yet: the two panels
//   checkedIn checked in, no passport yet
//   passport  passport made, no check-in yet
//   done      both: the regular Home
export type HomeStage = 'new' | 'checkedIn' | 'passport' | 'done'

const ARMS_KEY = 'tpl-passport:onboarding-arms'
const SHEET_SEEN_KEY = 'tpl-passport:onboarding-sheet-seen'

export function homeStage(checkInCount: number, passportMade: boolean): HomeStage {
  if (checkInCount > 0) return passportMade ? 'done' : 'checkedIn'
  return passportMade ? 'passport' : 'new'
}

// A passport counts as made once it has a name or a home branch, whether
// that came from "Make your passport", the passport card, Settings, or the
// account on another device.
export function isPassportMade(profile: { name?: string, homeBranch?: string }): boolean {
  return !!profile.name?.trim() || !!profile.homeBranch
}

export function parseArms(raw: string | null | undefined): OnboardingArms | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if ((v?.onb_sheet === 'sheet' || v?.onb_sheet === 'none')
      && (v?.onb_home_order === 'checkin_first' || v?.onb_home_order === 'passport_first')) {
      return { onb_sheet: v.onb_sheet, onb_home_order: v.onb_home_order }
    }
  } catch { /* bad JSON: treated as none */ }
  return null
}

// Each test is a fair coin, picked separately.
export function pickArms(random: () => number = Math.random): OnboardingArms {
  return {
    onb_sheet: random() < 0.5 ? 'sheet' : 'none',
    onb_home_order: random() < 0.5 ? 'checkin_first' : 'passport_first',
  }
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

let memoryArms: OnboardingArms | null = null

// This device's arms, or null when it has none. Never assigns.
export function storedArms(): OnboardingArms | null {
  if (memoryArms) return memoryArms
  try {
    memoryArms = parseArms(storage()?.getItem(ARMS_KEY))
  } catch {
    memoryArms = null
  }
  return memoryArms
}

// This device's arms, picked now if it has none yet. Only people who haven't
// started (stage 'new') are put in the tests, so existing users never get arms.
// Without storage the arms last for this page load.
export function ensureArms(stage: HomeStage, random: () => number = Math.random): OnboardingArms | null {
  const existing = storedArms()
  if (existing || stage !== 'new') return existing
  memoryArms = pickArms(random)
  try {
    storage()?.setItem(ARMS_KEY, JSON.stringify(memoryArms))
  } catch { /* private mode: kept in memory */ }
  return memoryArms
}

export function sheetSeen(): boolean {
  try {
    return storage()?.getItem(SHEET_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markSheetSeen() {
  try {
    storage()?.setItem(SHEET_SEEN_KEY, '1')
  } catch { /* the sheet may show again next visit, which is fine */ }
}

// For tests.
export function resetOnboardingMemory() {
  memoryArms = null
}
