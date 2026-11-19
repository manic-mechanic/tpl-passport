// Branch history is ~190 KB of text, read only in the branch detail sheet, so
// it's loaded on first use instead of riding along with the home page (which
// imports BranchDetail for its recent-visits sheet).

export interface BranchHistoryEntry {
  year: string
  detail: string
}

export type BranchHistory = Record<string, BranchHistoryEntry[] | undefined>

let loaded: BranchHistory | null = null
let pending: Promise<BranchHistory> | null = null

// The history, if it has already been loaded.
export function loadedBranchHistory(): BranchHistory | null {
  return loaded
}

export function loadBranchHistory(): Promise<BranchHistory> {
  pending ??= import('#data/branch-history.json')
    .then((mod) => {
      loaded = mod.default as BranchHistory
      return loaded
    })
    .catch((error: unknown) => {
      // Let the next branch view try again (e.g. after a dropped connection).
      pending = null
      throw error
    })
  return pending
}
