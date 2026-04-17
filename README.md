# TPL Passport

A mobile-first stamp-collecting app for the Toronto Public Library. Visit branches, collect stamps, complete challenges, and fill your passport.

<p align="center">
  <img src="docs/screenshot-home.png" width="22%" />
  <img src="docs/screenshot-explore.png" width="22%" />
  <img src="docs/screenshot-passport.png" width="22%" />
  <img src="docs/screenshot-branch.png" width="22%" />
</p>

## Try it

Open the app on your phone for the best experience — it's designed as a mobile PWA and can be added to your home screen.

## What's in the app

| Screen | Description |
|--------|-------------|
| **Home** | Passport progress, recent visits, and earned badges; sign-in prompt for logged-out users |
| **Explore** | Three tabs: nearby branches, walking day-trips with progress, badge suggestions |
| **Check In** | Select a branch, add an optional note or photo, verify proximity, earn a stamp |
| **Passport** | Stamp book across 5 alphabetical pages + an Extra Credit page for badges |
| **History** | Check-in log grouped by recency; filter to visits with notes or photos |
| **Branch detail** | Branch info, hours, events, and services |
| **Settings** | Sign in/out, theme picker (Light / Auto / Dark), dev-only demo mode |

## Stack

- **Nuxt 3** (SPA mode — `ssr: false`)
- **Pinia** for state, persisted to `localStorage`
- **BetterAuth + Turso** — email/password and Google OAuth; cross-device sync
- **Vercel** for hosting

All branch data is static JSON from the [Toronto Open Data](https://open.toronto.ca/) portal (`tpl-branch-general-information-2023.json`).

## Commands

- `npm run dev` — start local development server
- `npm test` — run tests once
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — run ESLint checks
- `npm run lint:fix` — auto-fix lint issues where possible
- `npm run build` — build for production
