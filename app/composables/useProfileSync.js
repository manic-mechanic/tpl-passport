// Read/write profile data (name, homeBranch) via the shared auth server.
// user_profile table is the source of truth — do not use authClient.updateUser() for these fields.

const BASE = 'https://auth.librarypassport.ca'

export async function fetchProfile() {
  try {
    const res = await fetch(`${BASE}/api/profile`, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return {
      name: data.name ?? '',
      homeBranch: data.home_branch ?? '',
    }
  } catch {
    return null
  }
}

export async function pushProfile({ name, homeBranch }) {
  try {
    await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...(homeBranch != null ? { homeBranch } : {}) }),
    })
  } catch { /* best-effort */ }
}

export function useProfileSync() {
  return { fetchProfile, pushProfile }
}
