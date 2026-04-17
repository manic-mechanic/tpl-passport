// Read/write profile data (name, homeBranch) via the shared auth server.
// user_profile table is the source of truth — do not use authClient.updateUser() for these fields.

import { AUTH_BASE as BASE } from '~/lib/config'
import { reportError } from '~/lib/reportError'

export async function fetchProfile() {
  try {
    const res = await fetch(`${BASE}/api/profile`, { credentials: 'include' })
    if (!res.ok) {
      reportError(new Error(`fetchProfile failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'fetch_profile',
        status: res.status,
        endpoint: '/api/profile',
      })
      return null
    }
    const data = await res.json()
    return {
      name: data.name ?? '',
      homeBranch: data.home_branch ?? '',
    }
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'fetch_profile',
      endpoint: '/api/profile',
    })
    return null
  }
}

export async function pushProfile({ name, homeBranch }) {
  try {
    const res = await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...(homeBranch != null ? { homeBranch } : {}) }),
    })
    if (!res.ok) {
      reportError(new Error(`pushProfile failed: HTTP ${res.status}`), {
        area: 'sync',
        operation: 'push_profile',
        status: res.status,
        endpoint: '/api/profile',
      })
    }
  } catch (error) {
    reportError(error, {
      area: 'sync',
      operation: 'push_profile',
      endpoint: '/api/profile',
    })
  }
}

export function useProfileSync() {
  return { fetchProfile, pushProfile }
}
