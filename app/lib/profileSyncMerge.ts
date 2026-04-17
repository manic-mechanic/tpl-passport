import type { SyncedProfile } from '~/types/passport'

interface InputProfile {
  name: string
  homeBranch: string
}

export function reconcileProfile(
  localProfile: InputProfile,
  serverProfile: SyncedProfile | null,
  fallbackName = '',
) {
  const nextName = serverProfile?.name || fallbackName || localProfile.name
  const nextHomeBranch = serverProfile?.homeBranch || localProfile.homeBranch || ''

  return {
    nextName,
    nextHomeBranch,
    shouldPushHomeBranch: !serverProfile?.homeBranch && !!localProfile.homeBranch,
  }
}
