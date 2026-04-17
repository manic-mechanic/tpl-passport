import { reportError } from '~/lib/reportError'

const STORAGE_KEY = 'tpl-passport'
const STORAGE_VERSION = 2

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePayload(payload) {
  if (!isObject(payload)) return null
  return {
    anonymousId: typeof payload.anonymousId === 'string' ? payload.anonymousId : undefined,
    checkIns: Array.isArray(payload.checkIns) ? payload.checkIns : [],
    profile: isObject(payload.profile) ? payload.profile : {},
    completedChallenges: Array.isArray(payload.completedChallenges) ? payload.completedChallenges : [],
  }
}

function migratePayload(parsed) {
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

export function loadPassportState() {
  if (!hasStorage()) return {}

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    const migrated = migratePayload(parsed)
    if (!migrated?.payload) return {}

    if (migrated.version !== STORAGE_VERSION) {
      savePassportState(migrated.payload)
    }

    return migrated.payload
  } catch (error) {
    reportError(error, {
      area: 'persistence',
      operation: 'load_passport_state',
      storageKey: STORAGE_KEY,
    })
    return {}
  }
}

export function savePassportState(state) {
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
