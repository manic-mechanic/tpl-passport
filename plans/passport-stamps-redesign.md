# Passport & Stamps Redesign

## The Problem

Achievements are front and center on `/` and stamps — the whole point of the app — feel like an afterthought. `/passport` is a long grid that's functional but not beautiful or engrossing. `/history` is a separate list that's easy to ignore and disconnected from the stamp story.

## User Types

**User 1 (majority):** 1–40 branches, sporadic or burst. Won't bother with a history list but might tap a stamp and feel a spark of "oh right, I was there."

**User 2 (minority, e.g. Marci):** Visits all 100 in a short burst (~10 days). The achievement IS the full collection. A chronological list of 100+ check-ins is noise. What she wants is a completed passport that looks *done* — fully inked, a satisfying completion moment.

**User 3 (minority):** Slowly reaches the goal over time, takes notes and photos, wants to revisit them. Much better served by stories living on the stamp itself than in a separate list.

## Direction

**Stamps as the story.** All three users are better served by stamps-as-the-story than by a separate history list.

- `/passport` becomes the primary destination — full stamp book, stamps as the hero, each stamp tappable to reveal visits, notes, and photos for that branch
- `/history` disappears or becomes a hidden power-user feature (settings, long-press, etc.)
- Home page: passport card + recent stamps preview strip + achievements below (not competing with stamps)
- Achievements move to `/passport` as a second tab (Stamps | Badges) or a section below stamps — connected as parts of the same system

## The Physical Passport Metaphor

Pagination is appealing given the physical passport concept, but swipe-between-pages on mobile is high-risk — it either feels great or fights the browser's back gesture.

**Implemented:** book-like layout within a single scroll. Distinct visual "pages" as sections with a paper/card background and subtle page-turn shadow between them. Pages are grouped **alphabetically** (A–C, D–G, H–M, N–R, S–Z) with a sticky pill nav for jumping between sections — chosen over district grouping because it maps cleanly to how users look up a specific branch by name.

## Stamp Display

- Unvisited stamps: faded/ghosted, waiting to be "inked" — creates a sense of anticipation
- Visited stamps: fully rendered with color/shape/font/rotation as designed
- Completing a district should feel satisfying — some kind of visual payoff
- Each stamp tappable → inline detail: visits, dates, notes, photos

## Nav

**Implemented:** 4-item nav — Home, Explore, Check In (orb), Passport. History slot removed.

## Branch Page as Stamp Detail

The branch detail page currently answers "what is this place." A stamp detail view answers "what is this place *to me*." These aren't two different pages — they're the same page with emphasis that shifts based on whether you've visited.

**Pre-visit** (arriving from explore, a route suggestion, nearby list):
- Branch info leads — address, hours, events, nearby branches
- Stamp is ghosted/empty
- CTA is "check in here"

**Post-visit** (arriving from tapping a stamp on `/passport`):
- Your stamp leads — inked, prominent
- Notes and photos front and center
- Branch info collapses or moves below
- CTA is "check in again" if eligible

Same URL, same page. The back button and entry point communicate the context. No need for two separate pages.

## Open Questions

- Completion moment for User 2 — what does a fully completed passport look/feel like?
- Does the stamp detail view replace the branch detail page, or complement it?
- Tab treatment for Stamps | Badges on `/passport` — or keep as one scrolling page with badges below?
