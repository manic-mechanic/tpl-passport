// Shared signed-in state. Kept separate from useAccountSync so the passport
// store can read it without importing the sync flows (which import the store).

// Whether the user is signed in. Before useAuthKnown() is true this is the
// answer remembered from the last visit (see restoreAuthState), or false.
export function useSignedIn() {
  return useState<boolean>('auth:signedIn', () => false)
}

// True once app.vue's getSession() call on load has answered.
export function useAuthKnown() {
  return useState<boolean>('auth:known', () => false)
}

// True once there's an answer good enough to draw the page with: the one
// remembered from the last visit, or the server's. Screens that differ for
// signed-in users wait for this instead of the network.
export function useAuthSettled() {
  return useState<boolean>('auth:settled', () => false)
}

// The signed-in account, for Settings. isGoogle is null until known.
export interface AccountInfo {
  email: string
  isGoogle: boolean | null
}

export function useAccount() {
  return useState<AccountInfo | null>('auth:account', () => null)
}

// Send check-ins and photos to the server unless we know the user is signed
// out. Before the session check finishes we try anyway: a signed-out request
// just gets a 401, and a signed-in user's request goes through. Anything
// skipped here is uploaded by syncAccount() when the user signs in.
export function canSyncToServer(): boolean {
  return useSignedIn().value || !useAuthKnown().value
}

// The last answer is kept on this device so the next visit can draw the
// right screens at once, instead of the signed-out version until the session
// check returns. The server's answer replaces it a moment later.
const STORAGE_KEY = 'auth_state'

interface StoredAuthState {
  signedIn: boolean
  account: AccountInfo | null
}

export function restoreAuthState() {
  let stored: StoredAuthState | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    stored = raw ? JSON.parse(raw) as StoredAuthState : null
  } catch {
    stored = null
  }
  if (!stored || typeof stored.signedIn !== 'boolean') return
  useSignedIn().value = stored.signedIn
  useAccount().value = stored.signedIn && isAccountInfo(stored.account) ? stored.account : null
  useAuthSettled().value = true
}

function isAccountInfo(value: unknown): value is AccountInfo {
  if (!value || typeof value !== 'object') return false
  const { email, isGoogle } = value as Record<string, unknown>
  return typeof email === 'string' && email.length > 0
    && (isGoogle === null || typeof isGoogle === 'boolean')
}

export function rememberAuthState() {
  const state: StoredAuthState = {
    signedIn: useSignedIn().value,
    account: useSignedIn().value ? useAccount().value : null,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode etc.: the next visit just waits for the session check.
  }
}
