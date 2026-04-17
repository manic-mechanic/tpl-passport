# Copilot Instructions for `tpl-passport`

## Build, test, and lint commands

Use npm scripts from `package.json`:

- `npm run dev` — run Nuxt locally (SPA mode).
- `npm run build` — production build.
- `npm run preview` — preview built app.
- `npm run generate` — static generation.
- `npm test` — run full Vitest suite once (`vitest run`).
- `npm run test:watch` — watch mode tests.
- `npm run lint` — run ESLint checks.
- `npm run lint:fix` — auto-fix lint issues where possible.
- Single test file: `npm test -- tests/passport.test.js`
- Single test by name: `npm test -- -t "checkIn"`

## High-level architecture

- This is a Nuxt 3 SPA (`ssr: false`) with a mobile-first UI and client-heavy behavior (`app/`).
- Core user state lives in Pinia (`app/stores/passport.ts`) and persists to `localStorage` (`tpl-passport` key). The app remains fully usable offline/local-first.
- Cross-device sync is layered on top of local state:
  - Auth via Better Auth client (`app/lib/auth-client.ts`) using centralized auth base config (`app/lib/config.ts`).
  - Check-ins/profile sync via best-effort fetch helpers (`app/composables/useCheckInSync.ts`, `app/composables/useProfileSync.ts`).
  - On app mount (`app/app.vue`), session/profile/check-ins are reconciled; local-only check-ins are pushed up.
- Server routes in this repo (`server/api/`) are primarily proxy/integration endpoints:
  - `all-events.get.js` and `branch-events.get.js` proxy Toronto CKAN event data and cache results.
  - `auth/[...all].ts` mounts Better Auth server handler backed by Turso + Drizzle (`server/lib/*`).
- Domain logic and static branch datasets are centralized in `packages/shared/`:
  - `packages/shared/src/*` contains framework-agnostic region/badge/stamp logic.
  - App composables like `useRegion` and `useBadges` re-export from shared package.
  - Nuxt runtime alias `#data` points to `packages/shared/data`.

## Key conventions in this codebase

- Treat `physicalBranches` as canonical branch universe for progress/badges (exactly 100 where `PhysicalBranch === 1`).
- Check-in identity is timestamp-based:
  - A check-in is keyed by ISO timestamp.
  - Photo storage (`usePhotoStore`) uses the same timestamp key in IndexedDB.
- Passport local state persistence is versioned (`{ version, data }` envelope in `tpl-passport` localStorage key); preserve migrations when changing stored shape.
- Use shared local-day utilities (`localDayKey` / `isSameLocalDay` from `@tpl-passport/shared`) for day-based logic instead of ad-hoc locale string comparisons.
- Check-ins are one-per-branch-per-day (local day, `en-CA` date formatting) in `passport.checkIn`.
- Sync helpers are intentionally non-blocking/best-effort and should not prevent local writes.
- Check-in reconciliation should use `reconcileCheckIns` (`app/lib/checkInSyncMerge.ts`) so both app-load and post-login sync paths stay consistent.
- Profile reconciliation should use `reconcileProfile` (`app/lib/profileSyncMerge.ts`) so app-load and login apply the same merge rules.
- Use `app/lib/config.ts` (`AUTH_BASE` / `getAuthBase()`) as the single source for auth service base URL; avoid hardcoded endpoint strings.
- `user_profile` is source of truth for `name` and `homeBranch`; use `useProfileSync` endpoints rather than auth user profile mutation.
- Feature rollout uses code-level flags in `app/composables/useFeatureFlags.js` (not env toggles) for unfinished features.
- Styling rules from `CLAUDE.md` are strict and should be preserved:
  - No BEM naming.
  - Scoped style nesting with `&`.
  - Theme colors via CSS variables in shared CSS, not hardcoded per-component light/dark values.
  - Typography and button spacing constraints defined there are intentional project standards.
- For bottom sheets (`vaul-vue`), keep `noBodyStyles: true`; use existing z-index layering conventions from `CLAUDE.md` when editing sheet/nav interactions.

## Related instruction sources already incorporated

- `README.md` (app purpose, routes/features, stack context).
- `CLAUDE.md` (hard styling and implementation conventions, dev/prod behavior notes, test focus).

## MCP servers configured for this repo

- Playwright MCP is configured at `.vscode/mcp.json` for browser-driven debugging and UI verification flows.
