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
- Readability floor: normal UI labels/microcopy should not fall back to the old 5–9px system. TSO 2.0 now uses a 12px minimum CSS text floor, with Deep Research supporting text generally 12–14px and primary values larger.
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

**Status:** PARTIAL — SHARED 2.0 CHART SHELL MIGRATED  
**Existing 2.0 foundation:** Prop Intelligence now renders verified per-game bars against the exact selected threshold, with hit / miss / push states and L5 / L10 / L15 / L30 / season range controls when enough verified game-log rows exist. Exact-line L5/L10/season calculations remain in the same panel.  
**Still required for full parity:** opponent labels where the source exposes them, sport-specific Home/Away and verified H2H filtering, and reuse of the same shell inside Deep Research sport modules.

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

**Status:** PARTIAL — NFL DEEP RESEARCH MIGRATED  
**Current 2.0 implementation:** verified L5 average snap-share ring with last-game snap %, average snaps, and current depth context. No ring is shown when the source does not expose genuine snap share.

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

**Status:** PARTIAL — NFL OPPORTUNITY MIX MIGRATED  
**Current 2.0 implementation:** NFL Deep Research now shows a source-backed L5 targets-vs-carries opportunity mix when those fields exist, explicitly labeled as opportunity mix rather than team usage share.

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

**Status:** PARTIAL — NFL COMPARISON VISUAL MIGRATED  
**Current 2.0 implementation:** NFL Deep Research now compares the current prop's L5 player average, current-season average, opponent position-group allowance, and exact sportsbook line when matching verified fields exist. No generic grade is invented.

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

**Status:** PARTIAL / VISUAL MIGRATION ACTIVE  
**Existing 2.0 foundation:** Prop Intelligence renders L5/L10/season numeric hit-rate cards, recent outcome sequence, and the shared exact-line per-game bar chart with selectable recent/season ranges.

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

**Status:** PARTIAL / CORE RECENT-PERFORMANCE MIGRATED  
**Current 2.0 implementation:** NHL Deep Research now uses the shared exact-line per-game chart with L5/L10/L15/L30/season ranges when enough verified history exists, opponent labels, exact selected threshold, hit/miss/push states, and verified All / Home / Away / H2H filters. Selected-sample AVG / HITS / GAMES are shown above the chart.  
**Still required:** comparison/distribution modules only where verified source fields exist.

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

**Status:** PARTIAL / ACTIVE  
**Current 2.0 implementation:** NFL Deep Research now includes the redesigned snap-share role ring, L5 target/carry opportunity mix, and source-backed player-vs-opponent/exact-line comparison bars. Shared exact-line recent-game bars are available in Prop Intelligence. Simulation distribution and deeper route/red-zone fields still require verified source fields.

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

**Status:** PARTIAL / CORE RECENT + BvP MIGRATED  
**Current 2.0 implementation:** MLB Deep Research now uses the shared exact-line recent-game chart with selectable verified ranges, plus a redesigned Batter-vs-Starter visual with PA/H/HR, AVG/OBP/SLG bars, pitcher handedness when supplied, and an explicit small/limited/established sample warning.  
**Still required:** richer Statcast, pitch-mix, pitch-zone, batted-ball distribution, park/weather visual modules.

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

**Status:** MIGRATED / EXACT 1.0 CONTACT QUALITY PORT / VISUAL QA ACTIVE  
**Current 2.0 implementation:** MLB Deep Research now ports the actual TSO 1.0 Player Modal Contact Quality system: a 14-day MLB Stats API game-log lookup, per-game live-feed hitData extraction, the original behind-home 2.5D projection over `preview-hero.jpg`, multiple real batted-ball trajectories from home plate using actual coordX/coordY + distance + launch angle, outcome-aware HR/hit/out landing behavior, staggered draw-on animation, ALL/FB/BRK/OFF/BRL filters, and a linked recent-contact log. This replaces the earlier 2.0 zone-grid/scatter approximation and the later Gamecast-field approximation.  
**Still required:** visual QA in the live preview across several hitters and confirmation that browser-side MLB Stats API requests are not being blocked by preview CORS/runtime policy.

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


## 16. Universal Player Prop Tool — TSO 1.0 decision-information parity

### Reference behavior
The TSO 1.0 prop board exposed the decision-making fields together in one dense research view. TSO 2.0 must preserve that information depth while redesigning the presentation.

### Shared 2.0 prop intelligence schema
Every sport uses this same conceptual sequence when verified data exists:

1. **Player**
   - headshot
   - team
   - opponent / matchup
   - game date/time

2. **Prop Line**
   - exact market
   - exact threshold
   - exact side

3. **Pick / Best Book**
   - sportsbook identity
   - selected side + exact line
   - best verified price
   - native sportsbook link when supplied

4. **Projection**
   - model projection
   - difference vs exact line
   - projection source / freshness

5. **L10 Average**
   - exact stat average over the verified last-10 sample

6. **Cover Probability**
   - genuine model probability of the selected side covering the exact line
   - grade / confidence visual only when supported by a real model

7. **Edge**
   - model cover probability minus exact-book implied probability
   - recalculated independently for the selected sportsbook

8. **Defense vs Prop**
   - opponent allowance for the relevant stat / position / market
   - qualitative read (Great / Good / Neutral / Poor) derived from the real source
   - sample / season context visible

9. **Matchup**
   - sport-aware player-vs-opponent matchup verdict
   - team/opponent identity
   - position / role context
   - no generic matchup grade without a source-backed basis

10. **Sim Defense**
    - simulation defensive stop / suppression probability where an actual simulation field exists
    - unavailable state when the model does not supply this field

11. **L5**
    - exact-line selected-side record
    - e.g. 4/5 UNDER, 3/5 OVER

12. **L10**
    - exact-line selected-side record

13. **H2H**
    - verified head-to-head exact-line record vs the current opponent
    - never infer H2H from unrelated season totals

### Desktop presentation
- Preserve the dense professional-table feel from 1.0.
- Use a horizontally scrollable command table when necessary rather than deleting useful columns.
- Freeze / visually anchor the player identity column.
- Keep column headers aligned with every row.
- Sorting is available on the research metrics where meaningful.
- Color is semantic:
  - positive / favorable
  - neutral
  - negative / unfavorable
  - no decorative green/red that implies unsupported conclusions.

### Mobile presentation
Do **not** force the entire desktop table into a tiny unreadable grid.

Use:
- compact player + exact-pick summary card,
- primary projection / cover probability / edge strip,
- L5 / L10 / H2H quick row,
- expandable research tray for defense, matchup, simulation, usage and charts.

The mobile information must be the **same information**, reorganized rather than removed.

### Sport-specific mapping

#### NFL
Add / surface:
- pass / rush / receiving projection
- snaps
- target share / carry share
- routes / usage where sourced
- red-zone work
- defense allowed by position / prop
- exact-line L5 / L10 / H2H
- role / usage ring
- workload-mix visual
- player-vs-defense comparison bars
- simulation distribution where real simulation data exists

#### NHL
Add / surface:
- SOG / goals / assists / points / blocks / saves projection
- TOI / recent TOI
- shot / scoring / assist rates
- opponent shots / goals allowed
- goalie context
- exact-line L5 / L10 / H2H
- recent-game exact-line chart
- matchup factor visual
- simulation / distribution only when genuinely supplied

#### MLB
Add / surface:
- hits / total bases / HR / RBI / H+R+RBI / SB and supported pitching props
- exact projection vs line
- L10 average
- exact-line L5 / L10 / H2H when verified
- probable pitcher
- handedness / platoon split
- BvP with sample-size warning
- Statcast quality
- pitch mix / arsenal
- zone matchup
- park factor
- weather / wind
- recent-game exact-line chart
- Statcast and pitch-zone visual suite

#### NBA
Required parity once verified NBA research is connected:
- points / rebounds / assists / threes / PRA and supported combinations
- projection vs exact line
- L10 average
- exact-line L5 / L10 / H2H
- minutes
- usage
- starter / bench role
- injuries / lineup context
- opponent positional defense
- pace
- role / minutes trend
- matchup comparison
- distribution only after a genuine NBA model/simulation feed exists

### Visual detail tied to each prop row
The INTEL / Deep Research experience should include the redesigned 2.0 versions of:
- exact-line recent-game bar chart,
- projection vs line comparison,
- L5 / L10 / H2H hit-rate visualization,
- player vs opponent comparison bars,
- role / usage visualization,
- model / market probability comparison,
- simulation distribution where real data exists,
- sportsbook price / line movement timeline,
- sport-specific visual modules (Statcast, pitch zones, goalie/defense context, etc.).

### Integrity rules
- Exact player + market + side + threshold only.
- No nearby-line historical substitution.
- No fake projection.
- No fake cover probability.
- No fake defense grade.
- No fake simulation stop percentage.
- No fake H2H.
- If one field is unsupported for a sport/market, show **— / unavailable** while keeping the rest of the row useful.
- Market-only rows remain usable but do not pretend to have a TSO model.

**Status:** HARD REQUIREMENT / UNIVERSAL PROP MIGRATION IN PROGRESS

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
