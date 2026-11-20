import { ref } from 'vue'

const store = new Map()
vi.stubGlobal('localStorage', {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => { store.set(key, String(value)) },
  removeItem: key => { store.delete(key) },
})
let nuxtState = {}
vi.stubGlobal('useState', (key, init) => (nuxtState[key] ??= ref(init())))

const {
  restoreAuthState,
  rememberAuthState,
  useAccount,
  useAuthKnown,
  useAuthSettled,
  useSignedIn,
  canSyncToServer,
} = await import('../app/composables/useAuthState')

beforeEach(() => {
  store.clear()
  nuxtState = {}
})

describe('restoreAuthState', () => {
  it('leaves everything unsettled on a first visit', () => {
    restoreAuthState()
    expect(useAuthSettled().value).toBe(false)
    expect(useSignedIn().value).toBe(false)
    expect(useAccount().value).toBeNull()
  })

  it('restores a signed-in visit, without claiming the server has answered', () => {
    store.set('auth_state', JSON.stringify({ signedIn: true, account: { email: 'a@example.com', isGoogle: false } }))
    restoreAuthState()
    expect(useSignedIn().value).toBe(true)
    expect(useAccount().value).toEqual({ email: 'a@example.com', isGoogle: false })
    expect(useAuthSettled().value).toBe(true)
    expect(useAuthKnown().value).toBe(false)
  })

  it('restores a signed-out visit, and drops any account stored with it', () => {
    store.set('auth_state', JSON.stringify({ signedIn: false, account: { email: 'a@example.com', isGoogle: null } }))
    restoreAuthState()
    expect(useSignedIn().value).toBe(false)
    expect(useAccount().value).toBeNull()
    expect(useAuthSettled().value).toBe(true)
  })

  it('ignores unreadable stored state', () => {
    store.set('auth_state', '{not json')
    restoreAuthState()
    expect(useAuthSettled().value).toBe(false)
  })

  it('keeps uploads going before the server answers, even after restoring signed out', () => {
    store.set('auth_state', JSON.stringify({ signedIn: false, account: null }))
    restoreAuthState()
    expect(canSyncToServer()).toBe(true)
  })
})

describe('rememberAuthState', () => {
  it('round-trips through restoreAuthState', () => {
    useSignedIn().value = true
    useAccount().value = { email: 'b@example.com', isGoogle: true }
    rememberAuthState()
    nuxtState = {}
    restoreAuthState()
    expect(useSignedIn().value).toBe(true)
    expect(useAccount().value).toEqual({ email: 'b@example.com', isGoogle: true })
  })

  it('does not keep the account once signed out', () => {
    useSignedIn().value = false
    useAccount().value = { email: 'b@example.com', isGoogle: true }
    rememberAuthState()
    expect(JSON.parse(store.get('auth_state'))).toEqual({ signedIn: false, account: null })
  })
})
