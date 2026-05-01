// Pure, framework-agnostic branch data and geo utilities.

import branchData from '../data/branch-info.json'
import type { Branch } from './types'

export const physicalBranches: Branch[] = (branchData as Branch[]).filter(b => b.PhysicalBranch === 1)
export const sortedBranches: Branch[] = [...physicalBranches].sort((a, b) => a.BranchName.localeCompare(b.BranchName))

export const DISTRICT_ORDER = [
  'Etobicoke-York',
  'North York',
  'Toronto-East York',
  'Scarborough',
]

const DISTRICT_COLORS: Record<string, string> = {
  'Etobicoke-York':    '#c06b30',
  'North York':        '#7b50c8',
  'Toronto-East York': '#1a80a0',
  'Scarborough':       '#b84040',
}

export function getDistrictColor(district: string): string {
  return DISTRICT_COLORS[district] ?? '#8c849e'
}

export const ALPHA_PAGES = [
  { label: 'A – C', from: 'A', to: 'C' },
  { label: 'D – G', from: 'D', to: 'G' },
  { label: 'H – M', from: 'H', to: 'M' },
  { label: 'N – R', from: 'N', to: 'R' },
  { label: 'S – Z', from: 'S', to: 'Z' },
]

export type AlphaPage = (typeof ALPHA_PAGES)[number] & { branches: Branch[] }

export const branchesByAlphaPage: AlphaPage[] = ALPHA_PAGES.map(page => ({
  ...page,
  branches: physicalBranches
    .filter(b => {
      const c = b.BranchCode[0]?.toUpperCase() ?? ''
      return c >= page.from && c <= page.to
    })
    .sort((a, b) => a.BranchCode.localeCompare(b.BranchCode)),
}))

// Accepts string or number coords — branch JSON stores Lat/Long as strings,
// expo-location returns numbers.
export function haversineKm(
  lat1: number | string, lng1: number | string,
  lat2: number | string, lng2: number | string,
): number {
  const R = 6371
  const dLat = (+lat2 - +lat1) * Math.PI / 180
  const dLng = (+lng2 - +lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(+lat1 * Math.PI / 180) * Math.cos(+lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function filterBranches(query: string, branches: Branch[] = sortedBranches): Branch[] {
  const q = query.trim().toLowerCase()
  return q ? branches.filter(b => b.BranchName.toLowerCase().includes(q)) : branches
}

export function buildMapsUrl(branches: Branch[]): string {
  return 'https://www.google.com/maps/dir/' + branches.map(b => `${b.Lat},${b.Long}`).join('/')
}
