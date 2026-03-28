// Shared branch data, district metadata, and geo utilities.

import branchData from '#data/updated-branch-info.json'
export const physicalBranches = branchData.filter(b => b.PhysicalBranch === 1)
export const sortedBranches  = [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))

export const DISTRICT_ORDER = [
  'Etobicoke-York',
  'North York',
  'Toronto-East York',
  'Scarborough',
]

const DISTRICT_COLORS = {
  'Etobicoke-York':    '#c06b30',
  'North York':        '#7b50c8',
  'Toronto-East York': '#1a80a0',
  'Scarborough':       '#b84040',
}

export function getDistrictColor(district) {
  return DISTRICT_COLORS[district] ?? '#8c849e'
}

// Alphabetical page groupings for /passport (A–C, D–G, H–M, N–R, S–Z)
export const ALPHA_PAGES = [
  { label: 'A – C', from: 'A', to: 'C' },
  { label: 'D – G', from: 'D', to: 'G' },
  { label: 'H – M', from: 'H', to: 'M' },
  { label: 'N – R', from: 'N', to: 'R' },
  { label: 'S – Z', from: 'S', to: 'Z' },
]

export const branchesByAlphaPage = ALPHA_PAGES.map(page => ({
  ...page,
  branches: sortedBranches.filter(b => {
    const c = b.BranchName[0].toUpperCase()
    return c >= page.from && c <= page.to
  }),
}))

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export const compassPoints = (() => {
  let n = physicalBranches[0], s = physicalBranches[0], e = physicalBranches[0], w = physicalBranches[0]
  for (const b of physicalBranches) {
    if (parseFloat(b.Lat)  > parseFloat(n.Lat))  n = b
    if (parseFloat(b.Lat)  < parseFloat(s.Lat))  s = b
    if (parseFloat(b.Long) > parseFloat(e.Long)) e = b
    if (parseFloat(b.Long) < parseFloat(w.Long)) w = b
  }
  return { n: n.BranchCode, s: s.BranchCode, e: e.BranchCode, w: w.BranchCode }
})()

export const compassBranches = new Set(Object.values(compassPoints))
