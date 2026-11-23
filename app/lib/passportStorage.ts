import { reportError } from '~/lib/reportError'
import type { PassportPersistedState } from '~/types/passport'

const STORAGE_KEY = 'tpl-passport'
const STORAGE_VERSION = 2

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePayload(payload: unknown): PassportPersistedState | null {
  if (!isObject(payload)) return null
  return {
    anonymousId: typeof payload.anonymousId === 'string' ? payload.anonymousId : undefined,
    checkIns: Array.isArray(payload.checkIns) ? payload.checkIns : [],
    profile: isObject(payload.profile) ? payload.profile : {},
    completedChallenges: Array.isArray(payload.completedChallenges) ? payload.completedChallenges : [],
  }
}

function migratePayload(parsed: unknown): { version: number; payload: PassportPersistedState | null } | null {
  // Legacy format (v1): raw state object with no envelope.
  if (isObject(parsed) && !Object.prototype.hasOwnProperty.call(parsed, 'version')) {
    return { version: 1, payload: normalizePayload(parsed) }
  }

  if (!isObject(parsed) || !Number.isInteger(parsed.version)) return null

  if (parsed.version === 1) {
    return { version: 1, payload: normalizePayload(parsed.data) }
  }

  if (parsed.version === STORAGE_VERSION) {
    return { version: STORAGE_VERSION, payload: normalizePayload(parsed.data) }
  }

  reportError(new Error(`Unknown passport storage version: ${parsed.version}`), {
    area: 'persistence',
    operation: 'load_passport_state',
    storageKey: STORAGE_KEY,
    version: parsed.version,
  })
  return null
}

function hasStorage() {
  return typeof localStorage !== 'undefined'
}

// Reads a raw stored passport (the localStorage value) in any storage
// version. Also used for a passport handed over from the old site address.
export function parseStoredPassport(raw: string): { version: number; payload: PassportPersistedState } | null {
  const migrated = migratePayload(JSON.parse(raw))
  return migrated?.payload ? { version: migrated.version, payload: migrated.payload } : null
}

export function loadPassportState(): Partial<PassportPersistedState> {
  if (!hasStorage()) return {}

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = parseStoredPassport(raw)
    if (!parsed) return {}

    if (parsed.version !== STORAGE_VERSION) {
      savePassportState(parsed.payload)
    }

    return parsed.payload
  } catch (error) {
    reportError(error, {
      area: 'persistence',
      operation: 'load_passport_state',
      storageKey: STORAGE_KEY,
    })
    return {}
  }
}

export function savePassportState(state: unknown) {
  if (!hasStorage()) return

  const payload = normalizePayload(state)
  if (!payload) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      data: payload,
    }))
  } catch (error) {
    reportError(error, {
      area: 'persistence',
      operation: 'save_passport_state',
      storageKey: STORAGE_KEY,
    })
  }
}
