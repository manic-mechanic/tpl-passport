const DEFAULT_AUTH_BASE = 'https://auth.librarypassport.ca'

function normalizeAuthBase(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_AUTH_BASE
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return DEFAULT_AUTH_BASE
  if (!/^https?:\/\//i.test(trimmed)) return DEFAULT_AUTH_BASE
  return trimmed
}

// Build-time fallback for modules instantiated outside composable context.
export const AUTH_BASE = normalizeAuthBase(import.meta.env.NUXT_PUBLIC_AUTH_BASE)

// Runtime source of truth for app code running in Nuxt composable context.
export function getAuthBase(): string {
  return normalizeAuthBase(useRuntimeConfig().public.authBase)
}
