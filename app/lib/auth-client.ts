import { createAuthClient } from 'better-auth/vue'
import { AUTH_BASE } from '~/lib/config'

export const authClient = createAuthClient({
  baseURL: AUTH_BASE,
})
