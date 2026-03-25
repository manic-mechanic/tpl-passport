// Returns the Monday (local time) of the week containing the given date, as a timestamp.
function weekStart(date) {
  const d = new Date(date)
  const day = d.getDay() || 7  // treat Sunday as 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Counts consecutive calendar weeks (Mon–Sun) with at least one visit,
// walking backward from the most recent week. Returns 0 if the most
// recent visit is older than last week.
export function calcWeekStreak(checkIns) {
  if (!checkIns.length) return 0

  const weeksWithVisit = new Set(checkIns.map(c => weekStart(new Date(c.timestamp))))
  const thisWeek = weekStart(new Date())
  const lastWeekDate = new Date(thisWeek)
  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
  const lastWeek = lastWeekDate.getTime()

  if (!weeksWithVisit.has(thisWeek) && !weeksWithVisit.has(lastWeek)) return 0

  let streak = 0
  const cursorDate = new Date(weeksWithVisit.has(thisWeek) ? thisWeek : lastWeek)
  while (weeksWithVisit.has(cursorDate.getTime())) {
    streak++
    cursorDate.setDate(cursorDate.getDate() - 7)
  }
  return streak
}
