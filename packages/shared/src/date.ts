export function localDayKey(input: string | number | Date, timeZone?: string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value

  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

export function isSameLocalDay(a: string | number | Date, b: string | number | Date, timeZone?: string): boolean {
  const aKey = localDayKey(a, timeZone)
  if (!aKey) return false
  return aKey === localDayKey(b, timeZone)
}
