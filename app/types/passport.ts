import type { CheckIn, Profile } from '@tpl-passport/shared'

export interface PassportCheckIn extends CheckIn {
  hasPhoto?: boolean
  // This device's photo isn't on the server yet: either it has no hosted
  // copy (no photoUri) or the server hasn't taken its hosted URL. It wins
  // over the server's photo when syncing (see checkInSyncMerge).
  photoPending?: boolean
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
