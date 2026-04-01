# /explore Redesign

## Content Buckets

### Suggested Routes (fast follow)

- Pre-computed TSP/VRP clusters from `data/routing-exploration.md`
- Named by neighbourhood: Junction & High Park Loop, Danforth Strip, etc.
- Goal: cover all 100 branches across routes to the extent it's logical
- Show visited/remaining count per route ("3/5 visited")
- Filterable by transport mode — clusters differ meaningfully:
  - Walking: 4–5 branches within 1–2 km
  - Biking: 8–10 along a corridor (Danforth, Bloor, etc.)
  - TTC / Car: geographically spread, half-day format
- One-tap opens route in Google Maps
- Implementation: static JSON (no API cost, routes don't change)

### Upcoming Events (fast follow)

- Events at home branch or nearby branches in the coming days
- Surfaces existing CKAN events data (`/api/branch-events`) more proactively
- Currently only shown on individual branch pages

### Future / Later

- **Trending branches** — most check-ins this week across all users (requires backend)
- **Where friends checked in** — social layer (requires auth + social graph)

## Directory / Search

The "find a specific branch" use case still needs to exist somewhere. Options:

- Search icon in the nav or top of explore triggers a bottom sheet with the current A–Z list + filter
- Or keep a collapsed/secondary tab on explore for "All branches"

## Check-In Page (related)

The check-in page with an empty search bar feels dead — it asks the user to do work the app could do. If you're tapping check-in, you're almost certainly at a branch right now.

**Proposed behaviour:** on load, immediately attempt geolocation and pre-fill the nearest branch — even if the user is too far away to check in. The location error ("you're 400m away") is more useful than a blank field, and confirms the app is paying attention.

This is the same underlying "near me" feature as explore, just surfaced at the point of action. QR/NFC will eventually replace this entirely, but until then auto-detecting location is the right default. Manual search stays as a fallback.

## Open Questions

- Is "near me" always on, or does it require a permission prompt on page load?
- Route coverage: some branches (particularly remote Scarborough/Etobicoke outliers) may not cluster well — decide whether to force them into nearest cluster or surface separately as "solo destinations"
- Transport mode filter: user-set preference vs. per-route selection
