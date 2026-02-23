# TPL Passport

A mobile-first stamp-collecting app for the Toronto Public Library. Visit branches, collect stamps, complete challenges, and fill your passport.

<!-- Screenshots — add once captured
<p align="center">
  <img src="docs/home.png" width="30%" />
  <img src="docs/passport.png" width="30%" />
  <img src="docs/branch.png" width="30%" />
</p>
-->

## Try it

Open the app on your phone for the best experience — it's designed as a mobile PWA and can be added to your home screen.

**To simulate the QR check-in flow:**
1. Open **[the app](https://tpl-passport.vercel.app)** on your phone
2. Open **`/qr-print`** on a second device (laptop, tablet)
3. Tap **Scan QR code** in the app, then point your phone at any branch code on the print page

## What's in the app

| Screen | Description |
|--------|-------------|
| **Home** | Passport progress card, stats, achievements, recent visit |
| **Explore** | All 100 branches — search, filter A–Z or by region, "Not yet" toggle |
| **Check In** | Manual branch selection or QR scan; optional note and photo |
| **Passport** | Full stamp grid organised by region — each branch has a unique stamp |
| **History** | Check-in log grouped by recency, week streak |
| **Branch detail** | Info, events, services, and branch challenges (unlocked on first visit) |
| **Settings** | Profile card, theme toggle (light / dark / system), demo modes |

Branch challenges (check out a book, attend a program, meet a librarian) unlock after your first visit and count toward overall passport completion.

## Stack

- **Nuxt 3** (SPA mode — `ssr: false`)
- **Pinia** for state, persisted to `localStorage`
- **Supabase** — planned for cross-device sync; not yet wired up
- **Vercel** for hosting

All branch data is static JSON from the [Toronto Open Data](https://open.toronto.ca/) portal (`tpl-branch-general-information-2023.json`).

## Dev setup

```bash
bun install
bun run dev
```

Open `http://localhost:3000`.

The `#data` alias in `nuxt.config.ts` points to `/data/` at the repo root (outside the `app/` srcDir) — used for importing the branch JSON.
