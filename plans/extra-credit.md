# Plan: Extra Credit

> **Status: Shipped to main — 2026-03-26**
> **Developer Notes**: Ensure tests are written and run whenever necessary. Ensure dev build has way to easily review empty, mid, and complete set of milestones (can be baked into existing buttons)

---

## Leftover Badge Ideas

- **Quest Master** - Complete all challenges at any single branch
- **Neighbourhood Explorer** — neighbourhoods aren't surfaced anywhere in the app; dropping avoids confusion
- **On a Roll (7-day streak)** — too rare to be motivating for most users
- **Branch Hopper (3 in one week)** — replaced by Day Tripper, which captures the same spirit as a single-outing easy win
- **Book Worm, Librarian's Pet, Event Attender** — require manual self-reporting with no UI for it yet; defer until a "log an activity" mechanic exists on branch pages
- **Service-based (all KidsStop, all TeenCouncil)** — too niche for MVP; could slot in later as a 13th badge

---

## Personal Best Display (Day Tripper, Homebody, Return Visitor)

These three badges show a live personal best count inside the badge — a number that keeps climbing even after the badge is earned. This is the primary content of the badge shape (like the milestone number on passport stamps).

Examples:

- User has visited home branch 8 times → Homebody badge shows **8**
- User once visited 3 branches in a day, later hits 5 → Day Tripper shows **5**
- User has visited one non-home branch 4 times → Return Visitor shows **4**

The badge is earned (unlocks, shows in color) when the threshold is crossed, but the number continues updating forever. This adds a personal record / competitive element without needing any new data model — it's all derived from `passport.visits`.

---

## Badge Visual Design

Three shapes — one per group — so the grid is visually readable at a glance.

| Group | Shape | CSS technique |
|---|---|---|
| Passport Stamps | Octagon (existing) | Keep current `clip-path: polygon(...)`. Color tint: tpl-blue at 1/10, tpl-navy at 25/50/100 |
| Geography | Circle with compass notches | `border-radius: 50%` + rotated tick marks via `::before`, or inline SVG |
| Habit | Starburst / shield | Different `clip-path: polygon(...)`, e.g. 6-point star or shield |

### Personal best number placement

For Day Tripper, Homebody, Return Visitor: the personal best number is the primary content of the badge shape, same position as the milestone numbers on passport stamps. A small label below the badge name (e.g. "5 visits") can reinforce it. Keep it secondary if the badge shape already has a visual icon — it doesn't have to dominate.

---
