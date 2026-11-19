// Scrapes opening hours from tpl.ca/locations/{BranchCode}/ for all 100 physical branches.
// Parses the JSON-LD openingHoursSpecification embedded in each page.
// Writes packages/shared/data/branch-hours.json keyed by BranchCode.
//
// Usage: node scripts/scrape-hours.mjs
//
// Runs weekly in CI (.github/workflows/refresh-hours.yml), which opens a PR
// when hours change. A branch whose page fails keeps its previous hours, and
// the run fails if more than 10% of branches fail, so a site outage or a
// page redesign can't wipe the file. No external dependencies needed.

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR   = join(__dirname, '../packages/shared/data')
const outPath    = join(DATA_DIR, 'branch-hours.json')
const branchData = JSON.parse(readFileSync(join(DATA_DIR, 'branch-info.json'), 'utf8'))
const previous   = JSON.parse(readFileSync(outPath, 'utf8'))
const physical   = branchData.filter(b => b.PhysicalBranch === 1)

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DELAY_MS = 300  // be polite — ~30 seconds total for 100 branches

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Format "09:00:00" → "9:00am", "20:30:00" → "8:30pm"
function formatTime(iso) {
  const [h, m] = iso.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

// Extract openingHoursSpecification from JSON-LD <script> tags in the page HTML
function parseHours(html) {
  const hours = {}
  const scriptMatches = [...html.matchAll(/<script[^>]+type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const [, json] of scriptMatches) {
    let data
    try { data = JSON.parse(json) } catch { continue }
    // Could be a single object or an array
    const items = Array.isArray(data) ? data : [data]
    for (const item of items) {
      const spec = item.openingHoursSpecification ?? item['@graph']?.find(n => n.openingHoursSpecification)?.openingHoursSpecification
      if (!spec) continue
      for (const entry of spec) {
        const days = Array.isArray(entry.dayOfWeek) ? entry.dayOfWeek : [entry.dayOfWeek]
        for (const day of days) {
          // dayOfWeek can be a full URL ("https://schema.org/Monday") or just "Monday"
          const dayName = String(day).replace(/.*\//, '')
          // An entry without both times isn't an hours entry; skip it.
          if (entry.opens == null || entry.closes == null) continue
          // tpl.ca marks a closed day as opens = closes = 00:00:00 (e.g. a
          // branch closed for renovation); two empty values also mean closed.
          hours[dayName] = entry.opens === entry.closes
            ? 'Closed'
            : `${formatTime(entry.opens)} – ${formatTime(entry.closes)}`
        }
      }
    }
    if (Object.keys(hours).length) break
  }
  return hours
}

async function fetchHours(branchCode) {
  const url = `https://tpl.ca/locations/${branchCode}/`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'tpl-passport-app/1.0 (branch hours scraper)' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html  = await res.text()
    const hours = parseHours(html)
    // A page with some days missing (e.g. after a redesign) would replace
    // a full week with a partial one, so count it as failed.
    const missing = DAYS.filter(day => !hours[day])
    if (missing.length) throw new Error(`no hours for ${missing.join(', ')}`)
    return Object.fromEntries(DAYS.map(day => [day, hours[day]]))
  } catch (err) {
    console.warn(`  ✗ ${branchCode}: ${err.message}`)
    return null
  }
}

const results = {}
let ok = 0
const failed = []

for (let i = 0; i < physical.length; i++) {
  const branch = physical[i]
  process.stdout.write(`[${i + 1}/${physical.length}] ${branch.BranchCode} ${branch.BranchName}… `)
  const hours = await fetchHours(branch.BranchCode)
  if (hours) {
    results[branch.BranchCode] = hours
    console.log(`✓ (${Object.keys(hours).length} days)`)
    ok++
  } else {
    failed.push(branch.BranchCode)
    if (previous[branch.BranchCode]) results[branch.BranchCode] = previous[branch.BranchCode]
  }
  if (i < physical.length - 1) await sleep(DELAY_MS)
}

if (failed.length > physical.length * 0.1) {
  console.error(`\n${failed.length} of ${physical.length} branches failed (${failed.join(', ')}); not writing ${outPath}.`)
  process.exit(1)
}

// Sorted keys, so a rerun with the same hours produces no diff.
const sorted = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n')

// A Markdown list of what changed, for the weekly PR's description. tpl.ca's
// hours are the current week's, so a holiday shows up as a closed day here
// (and reverts the week after); the list makes those easy to spot.
if (process.env.HOURS_CHANGES_FILE) {
  const names = Object.fromEntries(physical.map(b => [b.BranchCode, b.BranchName]))
  const lines = []
  for (const [code, week] of Object.entries(sorted)) {
    const before = previous[code]
    if (!before) { lines.push(`- **${names[code] ?? code}** (${code}): added`); continue }
    const changes = DAYS.filter(day => before[day] !== week[day])
      .map(day => `${day}: ${before[day] ?? '—'} → ${week[day]}${week[day] === 'Closed' ? ' ⚠️' : ''}`)
    if (changes.length) lines.push(`- **${names[code] ?? code}** (${code}): ${changes.join('; ')}`)
  }
  if (failed.length) lines.push('', `Pages that failed (previous hours kept): ${failed.join(', ')}`)
  writeFileSync(process.env.HOURS_CHANGES_FILE, lines.join('\n') + '\n')
}
console.log(`\nDone. ${ok} ok, ${failed.length} failed${failed.length ? ` (kept previous hours: ${failed.join(', ')})` : ''} → ${outPath}`)
