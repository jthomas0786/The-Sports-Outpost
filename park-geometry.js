/**
 * Interpolates fence distance at any spray angle from a park's three
 * known dimension points (left line, straightaway center, right line).
 *
 * Angle convention: 0° = straight down the LEFT field line, 45° =
 * straight to CENTER field, 90° = straight down the RIGHT field line.
 * This spans all fair territory in the outfield.
 *
 * HONEST NOTE: real MLB fences do not follow a perfectly smooth curve
 * between these three points — actual "power alley" (intermediate
 * angle) distances often depart from what a smooth interpolation alone
 * would predict (this is exactly the kind of discrepancy the research
 * literature on park dimensions describes — see park-dimensions.js's own
 * header). A cosine-eased blend is used here specifically because it's
 * smooth (no artificial kink exactly at center field, unlike a naive
 * piecewise-linear interpolation) and it exactly reproduces the three
 * real, sourced numbers at 0°/45°/90° — but it is still an
 * approximation between those anchor points, not real power-alley data.
 */
function getFenceDistance(dims, angleDeg){
  const angle = Math.max(0, Math.min(90, angleDeg));
  // Cosine ease: smoothly blends from 0 (at the first anchor) to 1 (at
  // the second anchor) with zero slope at both ends, avoiding a kink.
  const ease = (t) => (1 - Math.cos(t * Math.PI)) / 2;

  if(angle <= 45){
    const t = angle / 45;
    return dims.lf + (dims.cf - dims.lf) * ease(t);
  }
  const t = (angle - 45) / 45;
  return dims.cf + (dims.rf - dims.cf) * ease(t);
}

if(typeof module !== 'undefined' && module.exports) module.exports = { getFenceDistance };
