import { checkInDayKey } from '@tpl-passport/shared'
import type { PassportCheckIn } from '~/types/passport'

function timestampMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

function branchDayKey(checkIn: PassportCheckIn): string {
  return `${checkIn.branchCode}|${checkInDayKey(checkIn.timestamp)}`
}

// Merges server and local check-ins.
// - Server wins when both have the same timestamp, except for a photo the
//   server copy is missing: if this device has one (a hosted photoUri, or a
//   hasPhoto flag for a photo still only in IndexedDB), it's kept. A hosted
//   photoUri is returned in `updated` so the caller pushes it up; a local-only
//   photo keeps hasPhoto so the caller's pending-upload pass uploads it.
// - A local-only check-in for a branch + day the server already has (e.g. the
//   same visit recorded on two devices) is dropped rather than pushed, matching
//   the one-stamp-per-branch-per-day rule in the store. If the server copy has
//   no note or photo, the local one's are moved onto it:
//   - the record is returned in `updated` so the caller pushes it back up;
//   - a photo that only exists on this device (stored under the dropped
//     record's timestamp) is listed in `photoMoves` so the caller can re-key it.
// - Remaining local-only records are returned in `localOnly` to be pushed.
export function reconcileCheckIns(
  serverCheckIns: PassportCheckIn[],
  localCheckIns: PassportCheckIn[],
) {
  const serverByTimestamp = new Map<string, PassportCheckIn>()
  const serverByDay = new Map<string, PassportCheckIn>()
  const mergedServer = serverCheckIns.map((c) => {
    const copy = { ...c }
    serverByTimestamp.set(copy.timestamp, copy)
    if (!serverByDay.has(branchDayKey(copy))) serverByDay.set(branchDayKey(copy), copy)
    return copy
  })

  const localOnly: PassportCheckIn[] = []
  const updated = new Set<PassportCheckIn>()
  const photoMoves: { from: string, to: string }[] = []

  for (const local of localCheckIns) {
    const sameTimestamp = serverByTimestamp.get(local.timestamp)
    if (sameTimestamp) {
      if (!sameTimestamp.hasPhoto && (local.hasPhoto || local.photoUri)) {
        sameTimestamp.hasPhoto = true
        if (local.photoUri) {
          sameTimestamp.photoUri = local.photoUri
          updated.add(sameTimestamp)
        }
      }
      continue
    }
    const sameDay = serverByDay.get(branchDayKey(local))
    if (!sameDay) {
      localOnly.push(local)
      continue
    }
    if (!sameDay.note?.trim() && local.note?.trim()) {
      sameDay.note = local.note
      updated.add(sameDay)
    }
    if (!sameDay.hasPhoto && local.hasPhoto) {
      sameDay.hasPhoto = true
      if (local.photoUri) {
        sameDay.photoUri = local.photoUri
        updated.add(sameDay)
      } else {
        photoMoves.push({ from: local.timestamp, to: sameDay.timestamp })
      }
    }
  }

  const merged = [...mergedServer, ...localOnly]
    .sort((a, b) => timestampMs(b.timestamp) - timestampMs(a.timestamp))

  return { merged, localOnly, updated: [...updated], photoMoves }
}
