import type { PassportCheckIn } from '~/types/passport'

function timestampMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

export function reconcileCheckIns(
  serverCheckIns: PassportCheckIn[],
  localCheckIns: PassportCheckIn[],
) {
  const serverTimestamps = new Set(serverCheckIns.map(c => c.timestamp))
  const localOnly = localCheckIns.filter(c => !serverTimestamps.has(c.timestamp))
  const merged = [...serverCheckIns, ...localOnly]
    .sort((a, b) => timestampMs(b.timestamp) - timestampMs(a.timestamp))

  return { merged, localOnly }
}
