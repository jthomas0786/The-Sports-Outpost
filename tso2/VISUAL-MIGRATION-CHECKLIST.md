# TSO 1.0 → TSO 2.0 Visual Migration Checklist

> **Hard product requirement**
>
> TSO 2.0 must carry forward every useful TSO 1.0 graph, chart, trend visualization, probability visual, matchup comparison, distribution view, and sport-specific research graphic.
>
> **Do not copy the old styling 1:1.** Preserve the underlying data meaning, controls, thresholds, source integrity, and interaction behavior, then redesign the component in the TSO 2.0 broadcast / command-center visual language.
>
> No placeholder charts. No synthetic trend lines. No fake probabilities. If a source is unavailable, show an explicit unavailable state.

## Shared 2.0 visual rules

- Use the same visual grammar across NHL, NFL, MLB, and NBA where the statistic is conceptually the same.
- Exact sportsbook lines must be drawn as exact thresholds, never nearby substitutions.
- Model values must remain distinct from market values.
- Historical hit-rate charts must distinguish hits, misses, and pushes.
- Source/freshness must be visible for research visuals.
- Mobile must preserve readability and controls; horizontal scrolling is acceptable for dense historical plots when necessary.
- Player/team headshots and logos use the same consistent media system already being standardized in TSO 2.0.
- Filters must not reset scroll position or silently reset the selected market/range.

---

## 1. Recent-performance / exact-line game charts

### TSO 1.0 behavior
Used across NHL, NFL, and MLB player analysis:
- per-game vertical bars
- exact sportsbook/model line marker
- hit / miss visual state
- date + opponent under each bar
- L5 / L10 / L15 / L30 / season / H2H ranges where supported
- Home / Away filters where supported
- average + hit-count summary

### TSO 2.0 redesign
- dark command-center plot surface
- exact threshold line with labeled value
- hit/miss/push states
- compact tooltip / tap detail
- shared chart shell across sports
- selectable range chips inside the chart header

**Status:** NEEDS FULL MIGRATION  
**Existing 2.0 foundation:** exact-line L5/L10/season calculations already exist in Prop Intelligence.

---

## 2. Probability / grade rings

### TSO 1.0 behavior
- circular model probability / grade visualization
- model verdict / confidence presentation
- used in NFL and NHL player research

### TSO 2.0 redesign
- TSO 2.0 probability gauge/ring
- exact numeric probability in center
- explicit model source
- grade/tag outside the ring
- no ring when a genuine model probability is unavailable

**Status:** PARTIAL  
**Existing 2.0 foundation:** Model spotlight probability ring and scorer-model probabilities already exist.

---

## 3. Role / usage ring and player role visual

### TSO 1.0 behavior
NFL research included:
- role/usage ring
- snap percentage
- role mini-metrics
- recent workload context

### TSO 2.0 redesign
- player-role gauge
- snaps / targets / carries / routes or sport-equivalent usage
- recent-role change indicator
- position-specific labels

**Status:** NEEDS MIGRATION

---

## 4. Workload / role mix stacked visual

### TSO 1.0 behavior
NFL research included segmented workload/mix tracks for role composition.

### TSO 2.0 redesign
- stacked horizontal mix bar
- sport-aware segments:
  - NFL: rush / receiving / target / snap role where appropriate
  - NBA: scoring / rebounding / assist usage where supported
  - NHL: shot / scoring / assist contribution where meaningful
  - MLB: batted-ball / plate-discipline mixes where meaningful

**Status:** NEEDS MIGRATION

---

## 5. Player vs opponent comparison bars

### TSO 1.0 behavior
NFL research included paired comparison tracks:
- player metric
- opponent allowed metric
- positive/negative read

NHL included relative comparison bars for:
- season average
- recent average
- TSO mean
- sportsbook line
- current value

### TSO 2.0 redesign
- paired horizontal comparison bars
- player/team color vs opponent-neutral color
- exact numeric reads
- clearly labeled sample/source
- one shared comparison component across sports

**Status:** NEEDS MIGRATION

---

## 6. Simulation / outcome distribution visual

### TSO 1.0 behavior
NFL/NHL player analysis exposed simulation distribution / outcome distribution views.

### TSO 2.0 redesign
- probability distribution panel
- selected sportsbook line overlaid as a threshold
- model mean / median / percentile markers when the source provides them
- probability above/below line
- simulation count + model source

**Status:** NEEDS MIGRATION  
**Important:** Only show a distribution when actual simulation/distribution fields exist.

---

## 7. Hit-rate visuals

### TSO 1.0 behavior
- L5 / L10 / H2H hit rates
- recent-game hit states
- exact-line historical comparison

### TSO 2.0 redesign
- numeric rate cards
- recent outcome strip
- full per-game bar chart
- H2H when verified opponent history exists
- season range when full verified log exists

**Status:** PARTIAL  
**Existing 2.0 foundation:** Prop Intelligence currently renders L5/L10/season numeric hit-rate cards and recent outcome sequence.

---

## 8. Price / line movement timeline

### TSO 1.0 / historical concept
TSO retained odds/history data and movement-oriented research.

### TSO 2.0 redesign
- TSO Open → Current timeline
- exact sportsbook selector
- price movement and implied-probability movement
- line movement separate from price movement
- opening/current labels must never imply an official sportsbook open unless sourced as such

**Status:** PARTIAL / ACTIVE  
**Existing 2.0 foundation:** Prop Intelligence already reconstructs exact-selection committed price history and shows a timeline.

---

## 9. Matchup factor / driver visualization

### TSO 1.0 behavior
NHL/NFL player research included:
- factor rows
- positive / neutral / negative verdicts
- defense / role / recent form / model / sportsbook context

### TSO 2.0 redesign
- compact factor ladder
- source-backed driver values
- positive/neutral/negative state
- model contribution language must remain honest; do not imply causal weight unless the model exposes it

**Status:** NEEDS MIGRATION

---

## 10. NHL recent-performance charts

### TSO 1.0 behavior
NHL player modal supported:
- L5 / L10 / L15 / L30 / season / H2H
- Home / Away filters
- SOG, goals, assists, points, blocks, saves
- exact line marker
- hit/miss bars
- comparison bars
- outcome distribution

### TSO 2.0 redesign
Move into NHL Deep Research / Prop Intelligence with the shared 2.0 chart system.

**Status:** HIGH PRIORITY

---

## 11. NFL research visuals

### TSO 1.0 behavior
NFL research included:
- role ring
- workload mix
- player-vs-opponent comparison bars
- recent-game charts
- probability rings
- simulation distribution
- snap / target / carry context

### TSO 2.0 redesign
Move into NFL Deep Research and the universal Player Prop Tool.

**Status:** HIGH PRIORITY

---

## 12. MLB recent-performance + BvP visuals

### TSO 1.0 behavior
MLB player analysis included:
- recent-game bar charts with exact-line comparison
- Home/Away range controls where supported
- Batter vs Pitcher stat grid
- player prop parity with NFL-style charting

### TSO 2.0 redesign
- recent-game exact-line plot
- BvP visual card
- sample-size warning
- pitcher/batter handedness context
- current probable pitcher identity

**Status:** HIGH PRIORITY

---

## 13. MLB Statcast / batted-ball / pitch visuals

### Source-backed data already available in TSO
Current research feeds include fields for:
- exit velocity
- hard-hit rate
- barrel rate
- xBA / xSLG / xwOBA
- recent Statcast windows
- pitch mix
- pitch zones / zone comparison
- batted-ball samples
- pitcher arsenal
- park/weather context

### TSO 2.0 redesign
Build richer visuals than 1.0 where source coverage exists:
- Statcast metric profile
- L5 / L10 / season comparison
- pitch-mix bars
- strike-zone / zone-performance graphic
- batter vs pitcher pitch-type matchup
- batted-ball quality distribution
- park + weather impact panel

**Status:** SOURCE READY / VISUALS NEED BUILDING

---

## 14. NHL First Goal / Anytime Goal visual system

### TSO 1.0 behavior
- dedicated scorer model
- Top 3 + Risky Value
- team identity
- model probability
- sportsbook/fair price
- matchup context
- share cards

### TSO 2.0 status
- dedicated model restored
- First Goal / Anytime Goal toggle restored
- Top 3 + Risky Value restored
- team/player identity restored
- per-game share cards restored
- owner-only full-slate share cards added
- share-card game grouping/start times redesigned

**Status:** MIGRATED / CONTINUE VISUAL QA

---

## 15. NBA visual parity

NBA did not have equivalent mature 1.0 research depth.

### TSO 2.0 requirement
Once verified NBA game-log/research sources are connected, NBA must use the same shared visual system:
- exact-line recent-game chart
- L5/L10/season hit rate
- minutes/usage trend
- role/start status
- opponent positional matchup
- distribution/model visuals only after a genuine NBA model exists

**Status:** DATA/RESEARCH CONNECTION REQUIRED

---

# Migration order

1. Shared 2.0 chart shell + exact-line recent-game bars
2. NHL recent-performance chart migration
3. NFL role/usage + comparison visuals
4. NFL simulation distribution
5. MLB recent-performance + BvP
6. MLB Statcast / pitch-zone visual suite
7. Shared matchup-factor visual
8. NBA versions after verified NBA research is connected

# Definition of done

A TSO 1.0 visual is not considered migrated merely because its numbers appear as text in 2.0.

It is complete only when:
1. the same useful data/interaction is represented,
2. the underlying source is real and current,
3. the visual has been redesigned for TSO 2.0,
4. desktop and mobile are verified,
5. unavailable data is represented honestly,
6. no old placeholder/demo visual remains in a live-data area.
