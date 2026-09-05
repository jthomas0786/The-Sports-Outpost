/**
 * Samples an individual batted ball (exit velocity + launch angle) for
 * one plate appearance, centered on a player's own real season averages,
 * then determines via actual park geometry whether that specific batted
 * ball would clear the fence.
 *
 * WHY SAMPLE AT ALL, RATHER THAN JUST USE THE PLAYER'S AVERAGE: a
 * player's average EV/LA describes their typical contact, but any
 * individual swing produces a real, different outcome — the entire
 * point of this model is to simulate an actual batted ball, not just
 * repeatedly evaluate the same average one. Real player-specific spread
 * (standard deviation) isn't available in this app's data — only the
 * mean ever reaches the client (see MODEL.md's "Opportunity model"
 * section for the same limitation affecting PA projection) — so a
 * single, documented league-typical spread is used for every player
 * instead of a real, player-specific one.
 *
 * SPREAD VALUES AND THEIR SOURCES:
 *   - Launch angle SD ≈ 26°. Grounded in real, cited research (Alex
 *     Chamberlain, FanGraphs): the 15 TIGHTEST-controlled hitters in the
 *     Statcast era (min. 1600 batted balls each) ranged from 21.8° to
 *     24.4° SD. Since that list is specifically the most consistent
 *     hitters in the league, a typical, average hitter's spread is
 *     reasonably higher than that range — 26° is a documented,
 *     reasoned estimate above the cited tight-hitter ceiling, not a
 *     precisely fitted league-wide number (that would require the raw,
 *     per-batted-ball data this app doesn't have access to).
 *   - Exit velocity SD ≈ 10.5 mph. A commonly-cited approximate figure
 *     in public sabermetric analysis of batted-ball spread; not
 *     independently re-derived here from raw data for the same reason.
 *
 * SPRAY ANGLE: real hitters have genuine pull tendencies (more batted
 * balls toward their pull side than oppo), but per-player spray
 * tendency isn't in this app's data either. Modeled here as a normal
 * distribution centered on straightaway center field (45° in this
 * file's 0-90° convention) — an honest simplification, not a claim that
 * real hitters spray evenly across the field.
 */
const LAUNCH_ANGLE_SD = 26;
const EXIT_VELO_SD = 10.5;
const SPRAY_ANGLE_SD = 20;   // degrees, centered on straightaway (45°)

/** Samples one real batted ball for a single plate appearance.
 *  randNormalFn is injected (rather than calling a global randNormal())
 *  so this stays testable with a fixed, deterministic sequence of draws
 *  instead of real randomness. */
function sampleBattedBall(meanEV, meanLaunchAngle, randNormalFn){
  const ev = Math.max(30, meanEV + randNormalFn() * EXIT_VELO_SD);
  const launchAngle = meanLaunchAngle + randNormalFn() * LAUNCH_ANGLE_SD;
  const sprayAngle = Math.max(0, Math.min(90, 45 + randNormalFn() * SPRAY_ANGLE_SD));
  return { ev, launchAngle, sprayAngle };
}

/** The actual physics decision: given a specific batted ball and a
 *  specific park's real geometry, does it clear the fence?
 *
 *  A negative or near-zero launch angle (grounder, weak liner) never
 *  has a realistic chance regardless of EV — carryDistance() already
 *  returns 0 for launchAngle <= 0, so this falls out naturally rather
 *  than needing a separate special case. */
function isHomeRun(battedBall, parkDims, elevationFt, tempF, carryDistanceFn, getFenceDistanceFn){
  const carry = carryDistanceFn(battedBall.ev, battedBall.launchAngle, elevationFt, tempF);
  const fenceDistance = getFenceDistanceFn(parkDims, battedBall.sprayAngle);
  return carry >= fenceDistance;
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { sampleBattedBall, isHomeRun, LAUNCH_ANGLE_SD, EXIT_VELO_SD, SPRAY_ANGLE_SD };
}
