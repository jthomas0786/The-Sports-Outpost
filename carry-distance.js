/**
 * Approximates how far a batted ball actually travels, given exit
 * velocity and launch angle, adjusted for temperature/elevation.
 *
 * METHOD: computes the exact, standard vacuum (no-drag) projectile
 * distance — D = v²·sin(2θ)/g, real physics, not an approximation —
 * then applies a single "carry ratio" representing the real-world
 * reduction from aerodynamic drag, which a true model would derive from
 * numerically integrating drag and Magnus-force differential equations
 * (see Alan Nathan's actual trajectory work, University of Illinois,
 * baseball.physics.illinois.edu). That full simulation is out of scope
 * here; this uses one fixed, documented ratio instead.
 *
 * HONEST CALIBRATION NOTE: checked this ratio against TWO independent,
 * real reference points from Nathan's published research:
 *   - A HITf/x-calibrated analysis: 100mph/26° -> ~405ft mean distance
 *     implies a ratio of 0.769 against the vacuum distance.
 *   - Nathan's own worked trajectory example: 100mph/29°/2500rpm
 *     backspin -> 397ft actual vs 571ft vacuum, ratio 0.695.
 *   These disagree with each other by a meaningful amount (0.70 vs
 *   0.77) — which itself confirms the real ratio genuinely varies with
 *   conditions (backspin, exact launch angle, air density) rather than
 *   being one true constant. CARRY_RATIO_BASE below (0.735) is the
 *   midpoint between these two real, cited values — a documented
 *   compromise, not a precisely fitted number. Treat any single
 *   distance this produces as a rough estimate, not a precise
 *   prediction — it's meant to rank "would this batted ball plausibly
 *   clear THIS fence" relative to real geometry, not to reproduce
 *   Statcast's own actual measured distances.
 *
 * Temperature/elevation adjustment: warmer air and higher elevation are
 * both real, well-documented contributors to a ball carrying farther
 * (thinner air = less drag) — this is the entire reason Coors Field is
 * baseball's most famous hitter's park. Approximated here as roughly
 * +1.5% carry per 1000ft of elevation and +0.5% per 10°F above 70°F —
 * documented, reasonable rule-of-thumb magnitudes, not independently
 * re-derived from first-principles air-density physics for this project.
 *
 * ANGLE-DEPENDENT PENALTY, AND WHY IT'S NECESSARY: a single, flat carry
 * ratio applied uniformly can't be right — vacuum projectile physics
 * alone always peaks at exactly 45°, but real, documented research is
 * clear that actual fly balls peak at 25-30° (Nathan's own analysis,
 * cited above), because drag disproportionately punishes the longer
 * hang-time of a higher trajectory. A first version of this function
 * used one flat ratio and a test written specifically to check this
 * caught it immediately — the distance curve peaked at 45°, contradicting
 * the very research this function cites. Fixed with a quadratic penalty
 * centered at 28° (the middle of the real 25-30° optimal range),
 * numerically tuned so the overall distance curve's peak lands at
 * ~29-30° while both cited reference points still hold within a
 * documented ±15% tolerance. */
const CARRY_RATIO_BASE = 0.735;
const ANGLE_PENALTY_COEF = 0.006;   // tuned so peak distance lands at ~29-30°, matching real research
const ANGLE_PENALTY_CENTER = 28;    // degrees — middle of the documented 25-30° optimal range

function carryDistance(evMph, launchAngleDeg, elevationFt = 0, tempF = 70){
  if(evMph <= 0 || launchAngleDeg <= 0 || launchAngleDeg >= 90) return 0;

  const v = evMph * 1.46667;   // mph -> ft/s
  const g = 32.2;              // ft/s^2
  const rad = launchAngleDeg * Math.PI / 180;
  const vacuumDistance = (v * v * Math.sin(2 * rad)) / g;

  const anglePenalty = Math.max(0.3, 1 - ANGLE_PENALTY_COEF * Math.pow(launchAngleDeg - ANGLE_PENALTY_CENTER, 2));
  const carryRatio = CARRY_RATIO_BASE * anglePenalty;

  const elevationBoost = 1 + (elevationFt / 1000) * 0.015;
  const tempBoost = 1 + ((tempF - 70) / 10) * 0.005;

  return vacuumDistance * carryRatio * elevationBoost * tempBoost;
}

if(typeof module !== 'undefined' && module.exports) module.exports = { carryDistance, CARRY_RATIO_BASE };
