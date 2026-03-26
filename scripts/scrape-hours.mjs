// Scrapes opening hours from tpl.ca/locations/{BranchCode}/ for all 100 physical branches.
// Parses the JSON-LD openingHoursSpecification embedded in each page.
// Writes data/branch-hours.json keyed by BranchCode.
//
// Usage: node scripts/scrape-hours.mjs
//
// Re-run whenever hours change (e.g. seasonally). No external dependencies needed.

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const branchData = JSON.parse(readFileSync(join(__dirname, '../data/updated-branch-info.json'), 'utf8'))
const physical   = branchData.filter(b => b.PhysicalBranch === 1)

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
          if (entry.opens && entry.closes) {
            hours[dayName] = `${formatTime(entry.opens)} – ${formatTime(entry.closes)}`
          } else if (entry.opens === '' || entry.closes === '') {
            hours[dayName] = 'Closed'
          }
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
    if (!Object.keys(hours).length) throw new Error('no hours found in page')
    return hours
  } catch (err) {
    console.warn(`  ✗ ${branchCode}: ${err.message}`)
    return null
  }
}

const results = {}
let ok = 0, fail = 0

for (let i = 0; i < physical.length; i++) {
  const branch = physical[i]
  process.stdout.write(`[${i + 1}/${physical.length}] ${branch.BranchCode} ${branch.BranchName}… `)
  const hours = await fetchHours(branch.BranchCode)
  if (hours) {
    results[branch.BranchCode] = hours
    console.log(`✓ (${Object.keys(hours).length} days)`)
    ok++
  } else {
    fail++
  }
  if (i < physical.length - 1) await sleep(DELAY_MS)
}

const outPath = join(__dirname, '../data/branch-hours.json')
writeFileSync(outPath, JSON.stringify(results, null, 2))
console.log(`\nDone. ${ok} ok, ${fail} failed → ${outPath}`)
