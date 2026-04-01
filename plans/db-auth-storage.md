# Plan: Database, Auth & Storage

## The Core Design Principle

Auth must be **optional and frictionless**. The app works perfectly without an account. An account adds value (cross-device sync, photos, social) but never gates anything. The migration from "no account" to "has account" must be seamless — no data loss.

---

## Tool Evaluation

### Supabase
PostgreSQL + Auth + Storage + Realtime + Edge Functions in one hosted platform. Raised a $5B Series E in October 2025 — financially healthy, not at risk of disappearing.

**Strengths:**
- Fully open source. Your data is just Postgres — if Supabase ever becomes hostile, you export a DB dump and point elsewhere. No lock-in
- Relational SQL is the right model for this data. Leaderboards, friend activity, cross-branch stats are trivial queries in PostgreSQL; they're painful workarounds in a document store
- `signInAnonymously()` + `linkIdentity()` is first-class anonymous auth. The user ID persists through the upgrade — Firestore documents written under that UID stay accessible automatically (same behaviour as Firebase; this was wrong in an earlier version of this plan)
- Row Level Security enforces per-user data access at the DB level, not application code
- `@nuxtjs/supabase` is an official, actively maintained Nuxt module with explicit SPA/localStorage-session support

**Weaknesses:**
- Free tier pauses the DB after 7 days of inactivity. Non-issue with real users; annoying during development (common workaround: a daily GitHub Actions cron job that pings the DB)
- 500MB DB / 1GB file storage — the smallest raw numbers of any option
- No SLA on the free tier. They had ~37 incidents in 90 days in early 2026 — infrastructure is still maturing relative to Firebase
- RLS policy syntax is SQL but a specific dialect — there's a learning curve

### Firebase (Firestore + Auth + Storage)
Google-backed, battle-tested since 2014. You have existing experience with it.

**Strengths:**
- Most reliable infrastructure of any option — Google's SRE, no inactivity pause, very mature
- `signInAnonymously()` + `linkWithCredential()` is also first-class. The UID persists through upgrade — Firestore data continuity is automatic
- Generous Firestore free tier: 1GB storage, 50k reads/day, 20k writes/day
- `nuxt-vuefire` is official, Vue core team maintained, stable since Dec 2023

**Weaknesses:**
- Firestore is a document store. Social features (leaderboards, ranked stats, "most visited branches") require precomputed counters, denormalized data, and multiple round-trip reads. PostgreSQL handles these as single queries. You'll feel this as soon as you want any cross-user or cross-branch analytics
- **File storage now requires the Blaze (pay-as-you-go) plan** for new projects created after Oct 2024. First 5GB/month is still free, but you must attach a credit card. This is a meaningful friction point for a hobby project
- No self-host option. Firebase's data model is proprietary. Google has a history of deprecating products — Dynamic Links was shut down in 2025. No contractual guarantee the product exists in 5 years
- No egress-free storage (unlike Cloudflare R2)

### Cloudflare (D1 + R2 + KV + Workers)
Not a full BaaS — building blocks only. No built-in auth.

**Where it fits in this stack:**
- **R2** for photo storage: 10GB free, no egress fees, genuinely better than both Supabase Storage and Firebase Storage at the free tier
- **KV** for the events cache: replaces the in-memory Nitro cache that resets on cold starts. 1GB free, simple TTL semantics
- **D1** as an alternative DB if you ever outgrow Supabase's 500MB — 5GB free, SQLite at the edge

**Why not as a primary backend:** No auth means adding Clerk, Auth.js, or rolling your own JWT layer. That's real overhead for what should be a solved problem.

### Others considered
- **Neon / Turso** — good serverless Postgres/SQLite, but no auth or storage
- **PocketBase** — excellent open-source BaaS, requires a VPS, not serverless-compatible
- **Appwrite** — viable alternative, less mature community

---

## Comparison Scorecard

| | Supabase | Firebase | Cloudflare |
|---|---|---|---|
| DB storage (free) | 500MB | 1GB Firestore | 5GB D1 |
| File storage (free) | 1GB | 5GB (credit card req.) | **10GB R2** |
| Auth users (free) | 50k MAU | 50k MAU | No built-in |
| Egress fees | Yes | Yes | **None on R2** |
| Inactivity pause | Yes (7 days) | No | No |
| Relational queries | **PostgreSQL** | NoSQL workarounds | SQLite (D1) |
| Reliability | Maturing | **Battle-tested** | Good |
| Vendor lock-in | **Open source** | Proprietary | Open source |
| Anonymous auth | First-class | **First-class** | N/A |
| Nuxt integration | Official module | Official (VueFire) | Manual |

**Honest summary:** Firebase wins on raw storage generosity and reliability. Supabase wins on the data model for social features and vendor lock-in risk. Both have first-class anonymous auth. The Firebase storage credit-card requirement is a real gotcha. Cloudflare's pieces (R2, KV) are genuinely best-in-class for their specific jobs.

---

---

## Recommendation

**Supabase** for auth + DB. The data is relational, the social features roadmap benefits from SQL, and the open-source self-host option reduces long-term risk. The smaller free tier is a real tradeoff but not a blocking one at this scale.

**Cloudflare R2** for photo storage instead of Supabase Storage — 10GB free with no egress fees vs 1GB. The auth session from Supabase issues the signed URLs; R2 just stores the bytes. Slightly more wiring but meaningfully better economics.

**Cloudflare KV** for the events cache (replaces the in-memory Nitro cache that cold-starts clean). Free tier is plenty. If you'd rather keep everything in one dashboard, **Vercel KV** (Upstash Redis) is one click from the Vercel UI and works identically.

---

## Auth Flow Design

### Tier 1 — No account (current behaviour)
App works entirely via localStorage. Nothing changes for users who never want an account.

### Tier 2 — Anonymous session (transparent, automatic)
On first launch, silently create a Supabase anonymous session. This generates a real user ID server-side without requiring any input. Store the session token alongside the localStorage data.

Effect: the user still has no account they're aware of, but their data now has a stable cloud identity that can be upgraded later. This is Supabase's `signInAnonymously()` — one call, no UI.

### Tier 3 — Real account (opt-in)
User taps "Sync across devices" or "Join the community" in Settings. Prompted to sign in with email or OAuth (Google). Supabase's `linkIdentity()` attaches a real provider to the anonymous session. The user ID does not change — all existing DB rows remain attached automatically. No data migration needed.

### Tier 4 — Returning on a new device
User signs in on a new device → Supabase returns their existing session → app fetches check-ins from DB → merges with any local data (take most recent, deduplicate by branchCode + timestamp).

---

## Data Model

```sql
-- Users table is managed by Supabase Auth, no custom table needed.
-- auth.users has: id (UUID), email, created_at, is_anonymous

-- Each user's profile (name, home branch, theme, etc.)
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  home_branch text,          -- BranchCode
  theme       text default 'light',
  created_at  timestamptz default now()
);

-- One row per check-in event
create table check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  branch_code text not null,
  checked_in_at timestamptz not null,
  note        text,
  photo_url   text,          -- Supabase Storage path, nullable
  created_at  timestamptz default now()
);

-- Completed challenges (one row per branch:index combo)
create table completed_challenges (
  user_id       uuid references auth.users on delete cascade,
  branch_code   text not null,
  challenge_idx smallint not null,
  completed_at  timestamptz default now(),
  primary key (user_id, branch_code, challenge_idx)
);
```

Row Level Security policies on all three tables: `user_id = auth.uid()` for reads and writes. Each user can only touch their own rows.

---

## Photo Storage

**Cloudflare R2** bucket: `check-in-photos` — 10GB free, no egress fees (vs Supabase Storage's 1GB with egress charges).

Path convention: `{user_id}/{check_in_id}.jpg`

Access pattern: private. Generate a short-lived presigned URL via the R2 SDK when displaying a photo. Since photos are personal, no public CDN needed.

On check-in with photo:
1. Compress client-side with `canvas.toBlob({ quality: 0.8 })` — keep uploads under ~300KB
2. Upload to R2 → store the object key (path) in the `check_ins.photo_url` DB column
3. When displaying: call R2's presigned URL API with a 1-hour expiry

The Supabase auth session is used for the DB write; R2 is accessed via its own API key stored as a server-side env var (not exposed to the client). The upload goes through a thin Nitro API route (`/api/upload-photo`) that validates the session before proxying to R2.

If the R2 wiring feels like too much overhead at implementation time, Supabase Storage works fine as a fallback — just accept the 1GB cap and swap R2 in later if needed.

---

## Sync Strategy

The app stays localStorage-first. Supabase is the sync layer, not the primary store. This means:

- **Reads**: load from localStorage on launch (instant), then fetch from Supabase in the background and merge
- **Writes**: write to localStorage immediately (user sees the result), then sync to Supabase async
- **Conflict resolution**: on merge, deduplicate check-ins by `(branchCode, date)` — if same branch was checked in on the same day in both local and remote, keep one (prefer remote since it has the photo URL)
- **Offline**: app works fully offline; sync happens whenever connectivity is available

This means the Pinia store doesn't need a rewrite — it gets a thin sync layer bolted on. The `checkIn()` action writes locally as before, then calls a `syncCheckIn()` helper that posts to Supabase if a session exists.

---

## Events Cache (Separate Concern)

The current in-memory Nitro cache resets on every Vercel cold start. For a persistent cache without cold-start thrash, two options:

**Option A: Vercel KV (Upstash Redis)**
- One-line Vercel integration, same deployment
- Free tier: 30k requests/day, 256MB
- Replace the `Map()` in `branch-events.get.js` with `kv.get()`/`kv.set()` calls
- TTL handled natively: `kv.set(key, value, { ex: 3600 })`

**Option B: Supabase table**
- `events_cache` table: `(location_name text PK, records jsonb, fetched_at timestamptz)`
- Slightly more overhead than KV but keeps everything in one place
- Works fine, just more SQL than this problem warrants

Recommendation: **Vercel KV** for events cache — it's the right tool for key-value TTL caching and trivial to wire into the existing Nitro handler.

---

## Social Features (Future)

The data model above supports these without schema changes:

- **Leaderboard**: `select branch_code, count(*) from check_ins group by branch_code order by count desc` — top visited branches
- **Friends**: add a `friendships (user_id, friend_id)` join table; query is `select * from check_ins where user_id in (select friend_id from friendships where user_id = auth.uid())`
- **"X people have visited this branch"**: aggregate `check_ins` on `branch_code` — public count without exposing individual users
- **Passport sharing**: generate a public share link using a `shared_passports` table with a random slug → read-only view

None of these are in scope now, but they inform why SQL is the right choice.

---

## Migration Path from localStorage

When a user first connects an account, run a one-time migration:

1. Read all `checkIns` and `completedChallenges` from localStorage
2. Upsert into Supabase (insert, ignore conflicts)
3. Mark migration complete in localStorage (`profile.syncedAt = now()`)
4. From then on, all writes go to both localStorage and Supabase

No destructive steps — localStorage is kept as the offline fallback indefinitely.

---

## Implementation Sequence

1. Create Supabase project, run schema SQL, configure RLS policies
2. `npm install @supabase/supabase-js`
3. Add `app/plugins/supabase.client.js` — initializes client, calls `signInAnonymously()` on first launch
4. Add `NUXT_PUBLIC_SUPABASE_URL` + `NUXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel env vars
5. Add `anonymousId` / `supabaseSession` tracking to passport store
6. Implement `syncCheckIn()` helper — write to Supabase after local write
7. Implement one-time migration function — upload localStorage data to Supabase on first sign-in
8. Add "Sync across devices" UI to settings page — triggers the Tier 3 real account upgrade
9. Add photo upload to check-in flow (compress → upload → attach URL to check-in row)
10. Implement Vercel KV for events cache (independent of auth work, can be done any time)
