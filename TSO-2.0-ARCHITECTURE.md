# The Sports Outpost 2.0 — Product Architecture

## Mission
Rebuild The Sports Outpost as a unified sports intelligence platform that feels faster, cleaner, more premium, and more coherent than competing products while preserving the existing sports models, live data, odds, simulations, social features, and automation work.

## Non-negotiable product rules
1. One product shell across every sport.
2. Sport changes context/data, not page architecture.
3. Same component anatomy everywhere.
4. Primary actions are obvious; advanced detail is progressive.
5. Desktop and mobile are intentionally designed, not simply resized.
6. Live context is available globally.
7. Models, research, props, parlays, community, and profile are destinations.
8. No new page may invent its own button/card/filter language.
9. Existing production main stays untouched until TSO 2.0 is approved.
10. Every migration happens behind the isolated tso-2.0-restructure branch.

## Global information architecture
- Home — Today at The Outpost
- Live — scores, gamecasts, live markets, live model movement
- Research — teams, players, matchups, trends, situational data
- Models — scoring models, game models, simulations
- Props — player props, lines, books, model edge, alternative lines
- Parlay Lab — build, optimize, save, track
- Community — chat, posts, reactions, follows
- Leaderboard — records, points, streaks, rankings
- Profile — picks, watchlists, alerts, settings

## Sport context
Global sport context:
- All
- MLB
- NFL
- NHL
- NBA

The same URL/page family should remain recognizable across sports.
Examples:
- /models?league=nhl
- /models?league=nfl
- /research?league=mlb
- /live?league=nfl

## Shared shell
Desktop:
- fixed left rail
- global top bar
- persistent score/live strip
- center content canvas
- optional contextual right rail

Mobile:
- compact top bar
- horizontal live strip
- single-column content
- persistent bottom navigation
- sheets/drawers for filters and secondary controls

## Design system
Primary accent: #2d7fff
Foundation surfaces:
- Canvas: #070b12
- Raised: #0c121d
- Card: #101824
- Card elevated: #151f2e
- Border: rgba(255,255,255,.08)

Shared radii:
- xs 8
- sm 12
- md 16
- lg 22
- xl 28

Shared spacing scale:
4, 8, 12, 16, 20, 24, 32, 40, 48, 64

## Required shared components
- AppShell
- SidebarNav
- TopBar
- SportContextSwitcher
- LiveScoreStrip
- PageHeader
- SectionHeader
- StatCard
- GameCard
- PlayerCard
- ModelCard
- OddsChip
- ConfidenceBadge
- ProbabilityBar
- TrendBadge
- FilterBar
- SegmentedControl
- SearchField
- DataTable
- EmptyState
- LoadingState
- ErrorState
- RightRail
- MobileBottomNav
- Modal
- Drawer
- Toast

## Card anatomy rule
Every card follows:
1. eyebrow/context
2. title/entity
3. primary metric/action
4. supporting context
5. optional detail/expand affordance

No sport is allowed to invent a new card hierarchy unless the underlying information truly requires it.

## Visual consistency
League identity appears through:
- logo/team art
- tiny sport-context label
- restrained secondary accent where useful

League identity must NOT change:
- page background
- typography scale
- button system
- panel radius
- control sizes
- filter layout
- modal behavior

## Migration plan
### Phase 1 — Shell + design system
Build TSO 2.0 shell in /tso2 as an isolated preview.
Establish navigation, layout, cards, right rail, mobile nav, states.

### Phase 2 — Home
Create unified Today dashboard using existing data feeds.

### Phase 3 — Live
Move NFL/NHL/MLB gamecast entry points into a consistent Live destination.

### Phase 4 — Models
Wrap existing model engines in consistent model pages and cards.

### Phase 5 — Props + Research
Normalize filters, player cards, tables, and detail panels.

### Phase 6 — Parlay Lab
Consolidate quarter/halftime/prop/parlay workflows into one consistent lab.

### Phase 7 — Community / profile / leaderboard
Bring Supabase-backed social features into the new shell.

### Phase 8 — Mobile
Final mobile interaction pass and performance audit.

### Phase 9 — Cutover
Only after approval:
- map old routes to new routes
- regression test live/model/odds/social flows
- switch production entry point

## Success criteria
TSO 2.0 should feel like one product even when moving:
NHL First Goal -> NFL TD Model -> MLB HR Model -> Props -> Live -> Community.

A user should never need to relearn:
- where filters live
- what a confidence indicator means
- how to open detail
- where odds appear
- how to save/watch a pick
- how to return to live games

That consistency is the core of TSO 2.0.
