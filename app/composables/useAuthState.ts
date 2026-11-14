// Shared signed-in state. Kept separate from useAccountSync so the passport
// store can read it without importing the sync flows (which import the store).

// Whether the user is signed in. Only meaningful once useAuthKnown() is true;
// app.vue sets both after its getSession() call on load.
export function useSignedIn() {
  return useState<boolean>('auth:signedIn', () => false)
}

export function useAuthKnown() {
  return useState<boolean>('auth:known', () => false)
}

// Send check-ins and photos to the server unless we know the user is signed
// out. Before the session check finishes we try anyway: a signed-out request
// just gets a 401, and a signed-in user's request goes through. Anything
// skipped here is uploaded by syncAccount() when the user signs in.
export function canSyncToServer(): boolean {
  return useSignedIn().value || !useAuthKnown().value
}
