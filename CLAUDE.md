# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first **library passport app** for the Toronto Public Library (TPL). Users check into local branches, collect stamps, track progress toward completing their passport, and view branch info. Target audience: parents + children completing a passport together, and independent teens.

This is a greenfield project. The brief is in `brief.md`. A v0 proof-of-concept exists at `~/Documents/repos/v0-library-passport-app` for reference (do not copy from it wholesale — it is too complex).

## Guiding Principle

> Simplified implementation. A junior- to mid-level developer should be able to understand everything happening, know intuitively where to go to modify any component, and maintain this without an LLM at all times.

Prefer fewer files, fewer libraries, and less abstraction. When there are multiple valid approaches, choose the simpler one.

## Stack Decisions

- **Framework**: Vue / Nuxt (mobile-first)
- **Styling**: Scoped `<style>` blocks per Vue component + CSS custom properties for brand colors — co-located, readable, no utility sprawl
- **State**: Pinia (official Vue 3 / Nuxt state management)
- **Database**: Supabase — PostgreSQL, generous free tier, good Nuxt SDK
- **Auth**: No real auth needed for MVP. Support demo states: empty passport, mid-progress, completed passport
- **Hosting**: Vercel — best free-tier Nuxt hosting, automatic deploys from GitHub

## Current Implementation State

MVP is fully functional and deployed. Key implementation notes:

- **SPA mode** (`ssr: false` in nuxt.config.ts) — state is localStorage-first via Pinia; no backend yet
- **`#data` alias** — in nuxt.config.ts, points to `./data/` root folder so pages can `import from '#data/...'`
- **`physicalBranches`** — exported from `app/composables/useRegion.js`; filters to 100 branches with a valid `WardNo`
- **6-region grouping** — `useRegion.js` maps Toronto's 25 wards to 6 geographic regions: Etobicoke, West End Toronto, Downtown Toronto, East End Toronto, Don Valley, Scarborough
- **Events** — hardcoded for MVP (2 per branch in `branch/[id].vue`); real data would come from the CKAN programs API
- **Fonts** — Fraunces (display) + Outfit (body) via Google Fonts in nuxt.config.ts head
- **Stamp colors** — `useStampColor(wardNo)` in `app/composables/useStampColor.js`; `getStampShape(branchCode)` deterministically picks one of 5 border-radius shapes
- **Public images** — `tpl-meta.png` (used in header/watermark); `tpl-meta-card.png` (PWA icon, favicon, apple-touch-icon); `tpl-logo.png` (wordmark, unused currently)
- **Dark mode** — CSS vars duplicated in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and `[data-theme="dark"]`; `app.vue` watches `passport.profile.theme` to apply the attribute
- **PWA** — `public/manifest.json` + meta tags in nuxt.config.ts; `vercel.json` handles SPA routing fallback

## App Structure (Implemented)

Bottom nav: **Home → Explore → Check In (centre orb) → Passport → History**
Settings accessible via profile button on Home.

| Route | Description |
|---|---|
| `/` | Dashboard — passport hero card, stats, achievements, recent visits |
| `/explore` | All 100 branches; A–Z or by region; "Not yet" unvisited filter |
| `/check-in` | Dedicated check-in page; `?branch=CODE` pre-fills from QR scan |
| `/branch/[id]` | Branch detail — stamp preview, check-in sheet, events, info, services, challenges |
| `/passport` | Stamp grid organised by region with dashed separators |
| `/history` | Check-in log grouped by recency; streak + stats summary |
| `/settings` | Passport bio-page profile card with MRZ; theme toggle; demo mode |
| `/qr-print` | Searchable grid of printable QR codes for all branches |

**User types to consider**: Parent, Child, Teen — may have different experiences (at minimum, consider this in design).

**Check-in**: Manual check-in for MVP. Include non-functional hints toward QR code and/or NFC check-in (e.g., a visible button/icon), as these are the intended production mechanism.

**Stamps**: Each branch should have a unique stamp concept. Fun, whimsical — Balatro cards are the visual inspiration. Full design not required yet, but the concept should be present in the data model and UI placeholder.

## Data Assets

### Static Branch Data
`data/tpl-branch-general-information-2023.json` — array of branch objects. Updated annually; no need to re-fetch from API regularly. Use this as the primary data source for branch info.

Key fields:
- `BranchCode`, `BranchName`, `Address`, `Website`, `Telephone`
- `Lat`, `Long` — for mapping
- `NBHDNo`, `NBHDName` — neighbourhood
- `WardNo`, `WardName` — ward (use for passport pagination/grouping)
- `ServiceTier` — branch tier (e.g., "DL", "NL")
- `KidsStop`, `LeadingReading`, `CLC`, `DIH`, `TeenCouncil`, `YouthHub`, `AdultLiteracyProgram` — binary flags for services (use as tags on branch pages)
- `Workstations`, `SquareFootage`, `PublicParking`
- `PresentSiteYear` — could be used for branch facts/trivia unlocked on check-in
- `TPLNIA` — neighbourhood improvement area flag

See `data/library-branch-general-info-key-dictionary.csv` for field definitions.

### Toronto Open Data CKAN API
The `data/*-api-info.js` files contain Node.js snippets showing how to query these datasets via the CKAN API (`https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/`):

| File | Dataset |
|---|---|
| `library-branch-general-info-api-info.js` | Branch general info (packageId: `f5aa9b07-...`) |
| `tpl-circulation-annual-by-branch-api-info.js` | Annual circulation by branch |
| `tpl-visits-annual-by-branch-api-info.js` | Annual visits by branch |
| `tpl-card-registrations-annual-by-branch-api-info.js` | Annual card registrations |
| `library-branch-programs-and-events-feed-api-info.js` | Programs & events feed (packageId: `fb343332-...`) |
| `library-circulation-by-cardholder-type-api-info.js` | Circulation by cardholder type (packageId: `fa12529a-...`) |

Circulation/visit stats could be revealed as "fun facts" when a user checks into a branch.

## Brand Guidelines

**Colors**:
- Primary blue: `#005fc0`
- Secondary blue: `#001c71`
- Generic blue: `#02729e`

**Assets**: `assets/Toronto_Public_Library_Logo.png`, `assets/tpl_meta_card_image.png`

**Tone**: Fun and whimsical — this is a passport collecting experience, not a utility app.

## Future Ideas

These were discussed but not implemented in the MVP:

- **Map view** on `/explore` — Leaflet.js or a simple `<iframe>` embed; branch `Lat`/`Long` fields are available in the data
- **Onboarding flow** — first-launch name prompt before hitting the empty passport (currently jumps straight to dashboard)
- **Share card** — generate a shareable image of passport progress (Canvas API or a styled `<div>` + `html2canvas`)
- **Real events** — swap hardcoded events for live data from the CKAN programs API (resource `c73bbe54-3a48-4ada-8eef-a1a2864021e4`, filter by `library` field)
- **Supabase backend** — sync passport data across devices; would replace localStorage with real auth + DB rows
- **NFC check-in** — Web NFC API (`NDEFReader`) for tap-to-check-in; Chrome Android only as of 2026
- **Photo persistence** — store check-in photos in Supabase Storage; currently captured but discarded
- **Branch trivia** — unlock a "fun fact" on check-in using `PresentSiteYear`, `SquareFootage`, or circulation stats from the annual data APIs
