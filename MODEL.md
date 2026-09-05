# MODEL.md — The Sports Outpost prediction methodology

This document describes how player-prop probabilities are actually
computed today, what's genuinely uncertain about them, and where the
model is known to fail. If a number appears in the UI, it has a
sentence here explaining it — that's the standard this file is held to.

**Status as of this document:** the frozen prediction contract and a
statistically-grounded uncertainty interval exist and are unit-tested
for the `hr` (home run) prop specifically. The deeper structural
rebuild the roadmap below describes — a genuine opportunity model, a
real batted-ball/flight model, shared per-path park/weather draws — is
**not yet built**. Today's engine is closer to "regressed season rate,
applied per plate appearance, with matchup context layered on top" than
the full path simulator described in the roadmap. This document says so
plainly rather than describing the target state as if it already exists.

---

## Target event

For the `hr` prop specifically: **did this player hit at least one home
run in this specific game.** Not "in this at-bat," not "over/under a
line" — a single game-level yes/no outcome.

Other props (`hits`, `tb`, `rbi`, `hrr`, `sb`) follow the same
game-level framing but are out of scope for the interval/contract work
described below — see "Known limitations" for why `hr` was prioritized
first.

## The frozen contract

Every `hr` prediction returned by `buildPropPrediction()` has this exact
shape:

| Field | Meaning |
|---|---|
| `prop_id` | Unique key: player, prop, game, and timestamp generated |
| `target` | Plain-English statement of the exact event being predicted |
| `p_hat` | The model's point-estimate probability (0-1) |
| `p_lo`, `p_hi` | An 80% credible interval around `p_hat` (see below) |
| `n_sims` | How many Monte Carlo paths this estimate is drawn from |
| `inputs_used` | Which real data sources actually fed this prediction |
| `fallback_flag` | `true` if Statcast enrichment was missing and season-rate stats were used instead |
| `model_version` | A hash of the live client-side model config |
| `calibration_bucket` | This player's current letter grade's real, observed hit-rate-vs-predicted from `calibration-history.json` |

Other props currently return a minimal, honest stub of this contract
with `fallback_flag: true` and null intervals — they have not yet been
given the same treatment.

## Data sources and refresh cadence

- **Season stats & rosters** — MLB Stats API, refreshed once daily when
  the slate builds.
- **Statcast (barrel%, exit velocity, hard-hit%, xSLG, launch angle)** —
  enriched from Baseball Savant pitch-level exports, both season-to-date
  and rolling 10/5-game windows. Not every player has this; see
  "Fallbacks" below.
- **Weather** — Open-Meteo, per-park, per-game, refreshed on the same
  cadence as live game state (roughly every 20 seconds during live play).
- **Pitcher matchup data (HR/9, K/9)** — same MLB Stats API pull as
  season stats.

## Distributions and shrinkage

Every per-PA rate (HR, walk, strikeout, etc.) is shrunk toward its
league-average value using a simple, real Bayesian mechanism: a
player's raw rate is blended with the league rate, weighted by how many
real plate appearances they have relative to a fixed "effective sample
size" of **220 PA**. A player with 20 PA is mostly league-average; a
player with 500 PA is almost entirely their own observed rate. This is
implemented in `paRates()` and is the single most load-bearing piece of
statistical machinery in the current model — it's what stops a 5-HR,
60-PA September call-up from outranking a full-season 35-homer bat.

**`p_lo`/`p_hi` is derived directly from this exact same shrinkage
mechanism**, not a separate, invented uncertainty number. The shrinkage
formula is mathematically the posterior mean of a Beta-Binomial model:
a `Beta(α₀, β₀)` prior with effective sample size 220 centered on the
league rate, updated by the player's own real hits and at-bats. The
interval reported is the 80% credible interval of that same posterior,
computed via the standard normal approximation to the Beta distribution
(`betaCredibleInterval()`), then propagated to a game-level probability
using `1 - (1 - rate)^n` for `n` projected plate appearances — the same
relationship already implicit in how the per-PA rate becomes a
game-level number elsewhere in the simulation.

## What is random vs. fixed per simulation path

**Fixed** (computed once per player, before any simulation runs):
- The player's regressed per-PA outcome rates (HR, 2B, 3B, 1B, BB, K)
- Context multipliers for park, pitcher quality, and weather — currently
  applied as deterministic scalars to the rate itself, not drawn
  per-path (see "Known limitations")
- Projected plate appearances for the game (`expPA`) — see "Opportunity
  model" below

**Random** (drawn independently on every simulated path):
- Whether the player gets the floor or ceiling number of plate
  appearances that game (a fractional `expPA` becomes a coin-flip
  between the two integers)
- The outcome of each individual simulated plate appearance, drawn
  against the player's cumulative rate thresholds (`mapPARoll()`)
- Secondary events conditioned on reaching base (whether a runner
  scores, whether a ball in play produces an RBI)

## Opportunity model

`projectExpPA()` replaces what was previously a flat, universal constant
(4.3 PA, applied to literally every player in every game — `p.expPA` was
never actually set anywhere in the pipeline, so the fallback fired 100%
of the time with zero exceptions, confirmed by checking every player in
a real slate.json).

**Honest scope:** the original roadmap called for a lineup-slot /
platoon / bullpen-chain opportunity model. That isn't buildable right
now — `battingOrder` is null for every single player in the current
slate.json (checked directly: 0 of 386 players had it populated), so
there is no real batting-order signal in the data to build on yet.

What's implemented instead is a genuine, different, honest signal: each
player's own observed season PA-per-game rate, shrunk toward the league
average (4.30) by games played using the same shrinkage principle
already used for per-PA rates elsewhere in this model. A real leadoff
hitter who has actually accumulated more plate appearances per game
over a full season projects above league average; a real bottom-of-order
hitter projects below it; a small early-season sample stays close to
league average rather than trusting a noisy few-game rate. Verified
against real players from an actual slate: an established, high-PA
player like Fernando Tatis Jr. projects to within 0.01 of his own
observed rate, while a 23-game sample gets pulled meaningfully toward
league average even though its raw rate looks similar.

This deliberately does NOT also factor in tonight's specific team
scoring environment, even though that data (`teamStats.runsPerGame`) is
available — `MODEL.role.teamOffense` already feeds a runsPerGame-based
signal into other props' rate contexts, and stacking the same underlying
number into PA projection too would double-count one piece of evidence
as if it were two independent ones.

## Uncertainty and honesty in the UI

`buildPropPrediction()` — the frozen contract, with real `fallback_flag`,
`p_lo`/`p_hi`, and PA-projection data — was built during the "freeze the
contract" step, but a check before starting this step found it was never
actually called anywhere. The full contract existed as real, tested,
unused code for an entire step of this project. Fixed now:

- **Rate-stats fallback** — when a player has no usable Statcast data,
  the player modal now visibly shows a "rate-stats fallback" tag next to
  the graded probability, rather than presenting a Statcast-quality
  number with no visible difference from one that's actually backed by
  real batted-ball data.
- **The real uncertainty interval** — `p_lo`–`p_hi` is now shown
  alongside the point estimate, matching the spec's explicit instruction
  not to show a single number and imply false precision.
- **PA-driver transparency** — shown specifically when a player's
  projected plate appearances have moved meaningfully away from league
  average (more than 0.15 PA), matching the spec's own example format
  ("HR 18% | 4.1 PA proj.") — not shown unconditionally on every card,
  since that would bury the specific cases where it's actually
  informative.
- **Checked, not assumed**: the word "odds" is never used anywhere in
  this app to describe a model-derived probability — it's reserved for
  real market/sportsbook odds pulled from a separate `p.odds` field.
  Confirmed this directly rather than assuming it was already true.

Scoped to the `hr` prop specifically, matching the contract's own
current scope — other props don't yet have this same treatment since
they don't have a real contract to draw from.

**A second, related gap found while building this**: `calibration_bucket`
in the contract has always been null in practice, because
`loadCalibrationCache()` — the function that actually populates it — was
defined but never called anywhere, the same "built but never wired"
pattern as `buildPropPrediction()` itself before this. Fixed by calling
it once, fire-and-forget, during boot.

With that fixed, `calibrationLabel()` implements the spec's own "ship
rule" directly: don't show a bare percentage as if it were simply true —
if a grade's real, historical hit rate meaningfully diverges from what
the model has actually claimed on average (a gap of 3+ percentage
points, gated on at least 30 real observations so a thin sample doesn't
get confidently mislabeled), the player card now says so, as
"overconfident" or "underconfident," pulling directly from
`calibration-history.json`.

This isn't hypothetical — checked against the real, current data:
grade A+ shows a genuine gap right now (n=142, actual hit rate ~16.9%
vs. a claimed average of ~24.5%), and the label now correctly surfaces
that as "overconfident" rather than showing 20-25% probabilities to
users with no indication the model has been running hot for this
specific grade.

## Correlation and parlay pricing

Two teammates in the same game aren't independent — a night where the
ball is genuinely carrying well helps both of them at once. The old
model treated every player as fully independent regardless of whether
they shared a game, which understates the true probability of multiple
teammates all hitting together.

**The mechanism:** `getGameEffects()` draws a per-game "carry" factor —
`exp(N(0, σ))`, log-normal so it's always positive — once per simulated
path, cached on the game object, and reused for every player simulated
from that game. Every player's HR rate for a given simulated path is
scaled by that same shared draw, which is what produces real, measurable
correlation between teammates' simulated outcomes without needing to
change each player's own individual, marginal probability at all.

**Honest calibration note:** `GAME_EFFECT_SD = 0.12` is a documented,
conservative assumption, not fitted from real historical data. The
actual effect size this produces is modest — verified directly, a
2-leg same-game parlay with two ~8% shooters shows roughly a 2-3%
increase in true joint probability over the naive independent
assumption. A genuine calibration study of real game-to-game HR-rate
variance would be needed to tune this precisely; until then, treat the
magnitude as a reasonable placeholder, not a calibrated number.

**Wired all the way through to real payouts**, not just simulation
internals: `jointHRProbability()` computes the true joint probability
for same-game legs from their shared simulated paths, `computeCombinedOdds()`
turns that into a `correlationAdjustment` factor, and that factor is
submitted alongside the wager and applied server-side in
`place_wager()` (see `wagering-schema.sql`), clamped to `[0.5, 2.0]`
there rather than trusted outright from the client.

**A real bug caught and fixed during this work, worth documenting
rather than quietly correcting:** the first version of the client-side
preview shaded the *combined joint probability* once by the house edge.
The server, unchanged, shades *each leg separately* by the house edge
and multiplies the results — mathematically a different number, since
shading compounds across legs. Caught this with a test reimplementing
the server's actual formula independently and comparing outputs
directly, rather than testing the client's formula against a copy of
itself — the two disagreed by a meaningful margin on a real example.
The client-side function was rewritten to mirror the server's exact
per-leg-then-adjust formula, and a permanent test now asserts client and
server agree exactly on every commit, specifically because a silent
mismatch here means showing someone one number and paying them a
different one.

## How `p_hat` is aggregated

10,000 independent simulated games are run per player. `p_hat` is the
fraction of those simulated games in which the player recorded at least
one home run. This is a real Monte Carlo estimate of a fixed underlying
rate — see "Known limitations" for why the *rate itself* being fixed
per path (rather than drawn from its own uncertainty) is a real
simplification, not yet the "genuine path simulator" the roadmap
describes.

## Fallbacks

If a player has no usable Statcast enrichment (new call-up, sample too
thin, or the enrichment pipeline didn't have data for them that day),
the model falls back to season rate-stat regression alone —
`fallback_flag: true` in the contract, and this should visibly cap
displayed confidence in the UI (not yet implemented — see roadmap).

## Known failure modes

Documented plainly rather than glossed over:

- **Cold weather / unusual park conditions** — wind and temperature feed
  into weather context, but the model has no explicit handling for
  genuinely extreme or unusual conditions (freak wind reversals,
  unusually cold early-season games) beyond what the linear context
  multiplier captures.
- **New call-ups** — heavily regressed toward league average by design
  (see shrinkage above), which is deliberately conservative. This means
  a genuinely great rookie will be underrated for their first ~100 PA,
  by design — that's a known, accepted tradeoff, not a bug.
- **Openers / bullpen games** — the model does not yet have explicit
  handling for a start where the "starter" is a one-inning opener
  followed by a bulk reliever; pitcher-matchup context currently assumes
  a conventional start.
- **Extra innings** — plate-appearance projection does not currently
  account for the possibility of extra innings adding at-bats.
- **Shared park/weather is not yet actually shared across teammates
  within a single simulated path** — every player is currently
  simulated independently, so two teammates' individual HR simulations
  don't share a single, common "this game had 15mph wind out" draw the
  way a genuine path simulator would. This is the single largest
  structural gap between the current engine and the roadmap below.

## Roadmap (not yet built)

In priority order, matching the project's own stated sequencing:

1. ~~Freeze the prop definition~~ — done for `hr`.
2. ~~Baseline model + Brier score comparison~~ — see `backtest.js`.
3. ~~Opportunity model~~ — **partially done**: `projectExpPA()` replaces
   the flat constant with each player's own regressed season PA/G rate.
   The originally-envisioned lineup-slot/platoon/bullpen-chain version is
   still not built — `battingOrder` isn't currently in the data (see
   "Opportunity model" section above) — so this remains open until that
   data exists.
4. ~~Shared, per-path game effect~~ — **done**: `getGameEffects()` draws
   a per-game "carry" multiplier once per simulated path, shared across
   every player simulated from that game, creating real correlation
   between teammates. Wired all the way through to actual parlay
   pricing — see "Correlation and parlay pricing" below. This is
   specifically a residual/unmodeled variance effect, not yet the
   literal shared weather/park draw the roadmap originally described —
   see that section for the honest distinction.
5. ~~Contact/flight model~~ — **done, for the HR/not-HR decision
   specifically**: real per-PA batted balls are now sampled and checked
   against real park geometry. See "Contact/flight model" below for the
   full explanation, including two real bugs caught by testing during
   development and the model's honest limitations.
6. Calibration report surfaced in the app itself (About → Model
   Performance) — **done**, reads `calibration-history.json` directly.
7. Only then, tune `n_sims` up from the current 10,000 if the
   calibration curve is stable at a lower count first.

## Contact/flight model

When the rate-based model calls a simulated plate appearance "HR-caliber
contact," that's no longer automatically credited as a home run. Instead,
a real, individual batted ball — exit velocity and launch angle — is
sampled around the player's own actual season (or recent-window) Statcast
averages, and checked against this specific game's real park geometry to
see if it would actually clear the fence.

**Real research behind each piece, not invented physics:**
- **Carry distance** uses exact, standard projectile-motion physics for
  the no-drag baseline, then applies a real-world drag reduction ratio
  cross-checked against two independent, cited reference points from
  Alan Nathan's published trajectory research (University of Illinois) —
  documented fully in `data/carry-distance.js`.
- **Park geometry** — real, sourced left-field/center-field/right-field
  distances for all 30 parks (`data/park-dimensions.js`), with fence
  distance at any specific spray angle interpolated smoothly between
  those three real points (`data/park-geometry.js`).
- **Batted-ball spread** (since only each player's mean EV/launch angle
  ever reaches the client, never their real distribution) uses a
  documented launch-angle spread grounded in real, cited research on the
  tightest-controlled MLB hitters, and a commonly-cited exit-velocity
  spread — both explicitly flagged as league-typical approximations, not
  real per-player numbers, in `data/batted-ball-model.js`.

**Two real bugs, caught by testing rather than assumed away:**
1. An early version of the carry-distance formula used one flat drag
   ratio, which meant distance always peaked at exactly 45° — correct
   for vacuum physics, but contradicting the same cited research this
   function is built on, which shows real fly balls peak at 25-30°
   because drag punishes a higher trajectory's longer hang time. A test
   written specifically to check the peak landed in that real range
   caught it immediately. Fixed with an angle-dependent penalty,
   numerically tuned until the peak genuinely fell in the right place.
2. Wiring the physics check into `simulatePlayer()`'s existing loop
   introduced a real RBI-crediting bug: a plate appearance downgraded
   from "HR" to "fly out" still had its original `roll` value sitting in
   the HR-caliber range, which the RBI logic below was already using to
   mean "this was a hit" — silently crediting downgraded fly outs with
   hit-level RBI chances. Caught before shipping by writing a test that
   forced every physics check to fail and asserting HR count came out to
   exactly zero, then tracing the RBI math by hand. Fixed by explicitly
   tracking the downgrade rather than relying on the stale `roll` value.

**Honest limitations:**
- A ball that doesn't clear the fence always becomes a routine fly out —
  this doesn't yet distinguish a ball that fell just a few feet short
  (which in reality is often a double or triple off the wall) from a
  routine, short fly ball. That distinction would need real data on how
  a near-miss's remaining distance maps to what actually happens next,
  which isn't available.
- Spray angle is sampled from a simple, park-centered distribution —
  real hitters have genuine pull tendencies that aren't reflected here,
  since per-player spray tendency isn't in this app's data.
- Falls back cleanly to the original rate-based HR call — not the
  physics model — whenever a player's park isn't in the dimension table
  or they have no usable Statcast EV/launch angle at all. Verified
  directly: this fallback path produces byte-identical results to the
  pre-physics-model logic across 5,000 randomized trials.
- Sanity-checked with a realistic elite-slugger contact profile across
  three real parks: Coors Field's real, famous elevation advantage
  showed up correctly as the highest clear-rate of the three, without
  that being explicitly hand-coded anywhere — it fell out naturally from
  the elevation term in the real carry-distance physics.
