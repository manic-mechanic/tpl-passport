import type { CheckIn, Profile } from '@tpl-passport/shared'

export interface PassportCheckIn extends CheckIn {
  hasPhoto?: boolean
}

export interface PassportProfile extends Profile {
  favouriteBook: string
}

export interface PassportPersistedState {
  anonymousId?: string
  checkIns: PassportCheckIn[]
  profile: Partial<PassportProfile>
  completedChallenges: string[]
}

export interface ServerCheckInRecord {
  branch_code: string
  timestamp: string
  note?: string | null
  photo_url?: string | null
}

export interface ServerCheckInPayload {
  branchCode: string
  timestamp: string
  note: string
  photoUri?: string
}

export interface SyncedProfile {
  name: string
  homeBranch: string
}
