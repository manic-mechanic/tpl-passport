# Plan: Analytics + Error Logging

## Tools

| Tool | Role | Free tier |
|---|---|---|
| **PostHog** | Product analytics, custom events, session replay | 1M events/month, 15k session replays/month |
| **Sentry** | Error monitoring, stack traces, performance | 5k errors/month, source map support |

PostHog answers "what are users doing?" Sentry answers "why did it break?"
Together they close the full loop — Sentry surfaces the error, PostHog shows the session replay of how the user got there.

---

## Setup

### PostHog

1. Create account at posthog.com → new project → copy the Project API Key + host (`https://us.i.posthog.com`)
2. `npm install posthog-js`
3. Create `app/plugins/posthog.client.js`:

```js
import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()

  posthog.init(runtimeConfig.public.posthogKey, {
    api_host: runtimeConfig.public.posthogHost,
    capture_pageview: false,       // we'll fire these manually for SPA routing
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,         // never record text the user types
    },
  })

  // Track route changes as pageviews (required for SPA)
  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture('$pageview', { path: to.fullPath })
  })

  return {
    provide: { posthog }
  }
})
```

4. Add to `nuxt.config.ts` runtimeConfig:
```js
public: {
  isDev: true,
  posthogKey: '',   // set NUXT_PUBLIC_POSTHOG_KEY in Vercel env vars
  posthogHost: 'https://us.i.posthog.com',
}
```

5. Set `NUXT_PUBLIC_POSTHOG_KEY` in Vercel project settings (prod + dev environments separately — PostHog supports multiple projects).

6. **Suppress PostHog in dev** — PostHog's UI lets you filter out localhost events, but cleaner to not send them at all. In the plugin, wrap `posthog.init(...)` with `if (!runtimeConfig.public.isDev)` so local dev doesn't pollute your data.

---

### Sentry

1. Create account at sentry.io → new project → select Vue → copy the DSN
2. `npm install @sentry/nuxt`
3. Follow the `@sentry/nuxt` setup (it generates `sentry.client.config.js` and `sentry.server.config.js`):

```js
// sentry.client.config.js
import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NUXT_PUBLIC_IS_DEV === 'false' ? 'production' : 'development',
  tracesSampleRate: 0.2,       // capture 20% of transactions for performance data
  replaysOnErrorSampleRate: 1, // always capture replay when an error occurs
  replaysSessionSampleRate: 0, // don't sample random sessions (PostHog handles that)
  integrations: [Sentry.replayIntegration()],
})
```

4. Add `NUXT_PUBLIC_SENTRY_DSN` to Vercel env vars.
5. Add source map upload to `nuxt.config.ts` so Sentry can show readable stack traces:
```js
// nuxt.config.ts
sentry: {
  sourceMapsUploadOptions: {
    org: 'your-sentry-org',
    project: 'tpl-passport',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }
}
```
Set `SENTRY_AUTH_TOKEN` in Vercel (build-time env var, not public).

---

## User Identity

No real auth in this app, but PostHog benefits from a stable anonymous ID so it can stitch sessions together across visits.

Generate a UUID on first launch and persist it to localStorage alongside the passport data. Pass it to PostHog on init:

```js
// in posthog.client.js, after posthog.init(...)
const passport = usePassportStore()
if (passport.anonymousId) {
  posthog.identify(passport.anonymousId)
}
```

Add `anonymousId` to the passport store, generated once with `crypto.randomUUID()` if not present. This is not linked to any personal data — it's just a random device ID for session continuity.

Do **not** send the user's name or home branch in identify calls — not needed, and keeps the data clean.

---

## Event Tagging Plan

### Naming convention

`noun_verb` in snake_case. Keep it readable in the PostHog UI.

### Events

#### Check-in flow

| Event | When fired | Properties |
|---|---|---|
| `checkin_started` | User taps "Check in" on a branch page or the check-in nav button | `branch_code`, `branch_name`, `district`, `source` (`branch_page` \| `nav_button` \| `qr_scan`) |
| `checkin_completed` | Check-in confirmed and saved | `branch_code`, `branch_name`, `district`, `photo_taken` (bool), `note_added` (bool), `visit_number` (nth visit to this branch), `total_visits` (passport total after) |
| `checkin_abandoned` | User leaves check-in page without completing | `branch_code`, `step` (`form` \| `confirm`) |
| `qr_scan_attempted` | User taps the QR scan button | — |

#### Branch pages

| Event | When fired | Properties |
|---|---|---|
| `branch_viewed` | Branch detail page opened | `branch_code`, `branch_name`, `district`, `source` (`explore` \| `nearby` \| `history` \| `passport` \| `direct`) |
| `challenge_toggled` | User marks a challenge complete or incomplete | `branch_code`, `challenge_index`, `completed` (bool) |
| `tpl_link_tapped` | User taps "Visit tpl.ca" on a branch page | `branch_code` |

#### Navigation + exploration

| Event | When fired | Properties |
|---|---|---|
| `explore_searched` | User types in the explore search box (debounced, on clear/submit not keystroke) | `query_length` (not the query itself — don't log user text) |
| `explore_filter_changed` | User changes the sort/filter | `filter` (`az` \| `region` \| `unvisited`) |
| `nearby_branch_tapped` | User taps a nearby branch suggestion | `from` (`branch_page` \| `checkin_success`), `branch_code` |

#### Achievements + passport

| Event | When fired | Properties |
|---|---|---|
| `achievement_unlocked` | An achievement flips from locked to earned | `achievement_id`, `achievement_title` |
| `passport_viewed` | Passport page opened | `visit_count`, `completion_pct` |
| `history_viewed` | History page opened | — |

#### Settings + onboarding

| Event | When fired | Properties |
|---|---|---|
| `onboarding_completed` | User submits the onboarding form | `name_set` (bool), `home_branch_set` (bool) |
| `home_branch_changed` | User changes their home branch in settings | — |
| `theme_changed` | User toggles theme | `theme` (`light` \| `dark` \| `system`) |
| `demo_mode_activated` | User enters demo mode (dev only — will filter out anyway) | `demo_state` |

---

## What NOT to Track

- The user's name or any text they type
- Branch code + name combos that could fingerprint a person's location over time (branch_code alone is fine)
- Every scroll or hover — noise, not signal
- Events in `isDev` mode — suppress at the plugin level

---

## PostHog Dashboards to Build (post-launch)

Once data is flowing, these are the most useful views to set up:

1. **Check-in funnel**: `checkin_started` → `checkin_completed` — drop-off rate tells you if the flow has friction
2. **Top branches**: which branches get the most `branch_viewed` and `checkin_completed` events
3. **Feature adoption**: % of users who have ever fired `challenge_toggled`, `photo_taken`, etc.
4. **Achievement unlock curve**: which achievements unlock first, which are rarely reached
5. **Session replay filter**: watch sessions that include `checkin_abandoned` to understand why people bail

---

## Implementation Sequence

1. Create PostHog and Sentry accounts, note API keys/DSN
2. Add env vars to Vercel (prod) and `.env.local` (dev, suppressed)
3. `npm install posthog-js @sentry/nuxt`
4. Add `app/plugins/posthog.client.js` + Sentry config files
5. Add `anonymousId` to passport store
6. Wire up `runtimeConfig` keys in `nuxt.config.ts`
7. Instrument events in priority order: check-in flow first, then branch views, then the rest
8. Verify events appear in PostHog Live Events view before shipping
9. Set up source map upload for Sentry
10. Build PostHog dashboards after ~1 week of real data
