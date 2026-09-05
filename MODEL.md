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
- Projected plate appearances for the game (`expPA`)

**Random** (drawn independently on every simulated path):
- Whether the player gets the floor or ceiling number of plate
  appearances that game (a fractional `expPA` becomes a coin-flip
  between the two integers)
- The outcome of each individual simulated plate appearance, drawn
  against the player's cumulative rate thresholds (`mapPARoll()`)
- Secondary events conditioned on reaching base (whether a runner
  scores, whether a ball in play produces an RBI)

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
3. **Opportunity model** — replace the fixed `expPA` with a genuine
   projection from lineup slot, platoon matchup, and bullpen chain.
4. **Matchup + park/weather as shared, per-path draws** — rather than
   deterministic multipliers, draw the game's actual weather/park
   condition once per simulated path and share it across every player
   simulated in that same game.
5. **Contact/flight model** — simulate a batted-ball event (EV + launch
   angle from the player's own distribution) and map that through park
   dimensions and weather to an outcome, rather than sampling a discrete
   HR/2B/3B/1B/BB/K outcome directly.
6. Calibration report surfaced in the app itself (About → Model
   Performance) — **done**, reads `calibration-history.json` directly.
7. Only then, tune `n_sims` up from the current 10,000 if the
   calibration curve is stable at a lower count first.
