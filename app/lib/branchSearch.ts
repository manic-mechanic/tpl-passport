import type { Branch } from '@tpl-passport/shared'

// Branch search matches only what a branch card shows, its name and its
// address, and only at the start of a word: "park" finds High Park and
// Park Lawn Road, not Armour Heights (in Bedford Park-Nortown, a
// neighbourhood the card never shows).
export function matchesBranchSearch(branch: Pick<Branch, 'BranchName' | 'Address'>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wordStart = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, 'u')
  return wordStart.test(branch.BranchName.toLowerCase()) || wordStart.test((branch.Address ?? '').toLowerCase())
}
