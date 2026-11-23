// Leaving the project owner's own use out of analytics.
//
// The project's test-account filter in PostHog excludes people whose person
// property `$internal_or_test_user` is true. When someone signs in with an
// account listed in NUXT_PUBLIC_INTERNAL_EMAIL_HASHES, the app sets that
// property on this device's person, so its events (past and future) drop out
// of every insight that filters internal users.
//
// The list holds SHA-256 hashes, not addresses: runtime config is public (it's
// in the page HTML), and a hash keeps the address out of it. Make one with:
//   printf '%s' 'you@example.com' | shasum -a 256
// (lowercase, no spaces). Separate several with commas.

export const INTERNAL_PERSON_PROPERTY = '$internal_or_test_user'

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export function parseEmailHashes(list: string): Set<string> {
  return new Set(list.split(',').map(h => h.trim().toLowerCase()).filter(h => /^[0-9a-f]{64}$/.test(h)))
}

export async function isInternalEmail(email: string, hashes: Set<string>): Promise<boolean> {
  if (!email || hashes.size === 0) return false
  return hashes.has(await sha256Hex(email.trim().toLowerCase()))
}
