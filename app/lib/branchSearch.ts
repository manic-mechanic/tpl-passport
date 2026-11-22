import type { Branch } from '@tpl-passport/shared'

// Branch search matches only what a branch card shows: its name and, when
// the card shows it, the street part of its address (the card drops the
// city, province and postal code). Each word of the query has to match the
// start of a word, so "park" finds High Park and Park Lawn Road but not
// Armour Heights (in Bedford Park-Nortown, a neighbourhood the card never
// shows), and "st clair" finds St. Clair/Silverthorn.
export function branchSearchMatcher(query: string, { withAddress = true } = {}) {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (!words.length) return () => true
  const patterns = words.map(w => new RegExp(`(^|[^\\p{L}\\p{N}])${w}`, 'u'))
  return (branch: Pick<Branch, 'BranchName' | 'Address'>): boolean => {
    const text = withAddress
      ? `${branch.BranchName}\n${branch.Address?.split(',')[0] ?? ''}`.toLowerCase()
      : branch.BranchName.toLowerCase()
    return patterns.every(p => p.test(text))
  }
}
