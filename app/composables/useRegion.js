// Maps Toronto's 25 wards into 6 geographic regions for passport grouping.
// Branches with no WardNo are service/virtual entities and are excluded.

export const WARD_TO_REGION = {
  1: 'Etobicoke',
  2: 'Etobicoke',
  3: 'Etobicoke',
  4: 'West End Toronto',
  5: 'West End Toronto',
  6: 'Downtown Toronto',
  7: 'West End Toronto',
  8: 'Downtown Toronto',
  9: 'West End Toronto',
  10: 'Downtown Toronto',
  11: 'Downtown Toronto',
  12: 'Downtown Toronto',
  13: 'Downtown Toronto',
  14: 'East End Toronto',
  15: 'Don Valley',
  16: 'Don Valley',
  17: 'Don Valley',
  18: 'Downtown Toronto',
  19: 'East End Toronto',
  20: 'Scarborough',
  21: 'Scarborough',
  22: 'Scarborough',
  23: 'Scarborough',
  24: 'Scarborough',
  25: 'Scarborough',
}

export const REGION_ORDER = [
  'Etobicoke',
  'West End Toronto',
  'Downtown Toronto',
  'East End Toronto',
  'Don Valley',
  'Scarborough',
]

export function getRegion(wardNo) {
  return WARD_TO_REGION[parseInt(wardNo)] ?? null
}

// Filters branch data to only physical, visitable locations (PhysicalBranch === 1)
import branchData from '#data/tpl-branch-general-information-2023.json'
export const physicalBranches = branchData.filter(b => b.PhysicalBranch === 1)
