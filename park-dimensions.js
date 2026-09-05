/**
 * Real MLB ballpark outfield dimensions, by direction, for all 30 parks.
 *
 * WHY THIS EXISTS: the app's own slate.json only ever carries a single,
 * aggregate `parkFactor` number per venue (e.g. 108) — nothing about
 * fence distance by direction. A genuine batted-ball outcome model needs
 * to know how far a ball actually has to travel at a SPECIFIC spray
 * angle to clear the fence, since real parks vary enormously by
 * direction (Fenway's Green Monster sits ~310ft down the left-field
 * line but the deepest part of that same park is ~420ft). This table is
 * that missing piece, compiled from public sources since it doesn't
 * exist anywhere in the app's current data pipeline.
 *
 * HONEST LIMITATIONS — read before trusting this blindly:
 *
 * 1. PARK DIMENSIONS CHANGE. This isn't hypothetical — while building
 *    this specific file, cross-checking one entry (Kauffman Stadium)
 *    against multiple sources surfaced a real discrepancy: two
 *    aggregator sites gave different, both-stale numbers, and the
 *    ballpark's actual current dimensions (364-L/379-LC/410-C/379-RC/
 *    364-R, 8.5ft walls) only appeared in MLB.com's own current guide
 *    page, reflecting a change the Royals announced in January 2026.
 *    The other 29 parks below have NOT been individually re-verified
 *    against a current, authoritative source with the same rigor —
 *    they're compiled from public reference tables as of September
 *    2026 and could be stale for any park that's undergone recent
 *    renovation. Treat this as a real, usable improvement over having
 *    zero directional data at all, not as a guaranteed-current source.
 *
 * 2. ONLY THREE POINTS PER PARK (left line, straightaway center, right
 *    line) are given real, sourced numbers. Real "power alley"
 *    (intermediate angle) distances exist and often differ meaningfully
 *    from a straight-line interpolation between these three points, but
 *    compiling verified power-alley numbers for all 30 parks was out of
 *    scope for this pass. getFenceDistance() (see park-geometry.js)
 *    interpolates between these three known points — a real, honest
 *    approximation, not equivalent to true power-alley-specific data.
 *
 * 3. Wall height is only well-documented for a small number of famous
 *    exceptions (Fenway's 37ft Green Monster being the obvious one).
 *    Most parks use a reasonable, documented default (8ft, a genuinely
 *    common MLB outfield wall height) rather than a fabricated
 *    park-specific number this file can't actually back up.
 *
 * Distances in feet, from home plate. cfBearing/roof/elevation are
 * NOT duplicated here — those already exist correctly in slate.json's
 * venue object and should keep being read from there.
 */
const PARK_DIMENSIONS = {
  'American Family Field':    { lf: 342, cf: 400, rf: 337, wallHeight: 8 },
  'Angel Stadium':             { lf: 347, cf: 396, rf: 350, wallHeight: 8 },
  'Busch Stadium':             { lf: 336, cf: 400, rf: 335, wallHeight: 8 },
  'Camden Yards':               { lf: 333, cf: 400, rf: 318, wallHeight: 7 },  // "Flag Court" in RF is taller; 318 line itself is a modest wall
  'Chase Field':                { lf: 330, cf: 407, rf: 334, wallHeight: 8 },
  'Citi Field':                 { lf: 335, cf: 408, rf: 330, wallHeight: 8 },
  'Citizens Bank Park':         { lf: 329, cf: 401, rf: 330, wallHeight: 8 },
  'Comerica Park':              { lf: 345, cf: 412, rf: 330, wallHeight: 8 },
  'Coors Field':                { lf: 347, cf: 415, rf: 350, wallHeight: 8 },
  'Dodger Stadium':             { lf: 330, cf: 395, rf: 330, wallHeight: 8 },
  'Fenway Park':                { lf: 310, cf: 420, rf: 302, wallHeight: 37, wallHeightNote: 'Green Monster in LF only — RF wall is a standard ~5ft; using LF height here as this table has one height per park' },
  'Globe Life Field':           { lf: 329, cf: 407, rf: 326, wallHeight: 8 },
  'Great American Ball Park':   { lf: 328, cf: 404, rf: 325, wallHeight: 8 },
  'Rate Field':                 { lf: 330, cf: 400, rf: 335, wallHeight: 8 },
  'Kauffman Stadium':           { lf: 364, cf: 410, rf: 364, wallHeight: 8.5 },  // verified against MLB.com's current guide, Jan 2026 fence-move
  'loanDepot Park':             { lf: 344, cf: 400, rf: 335, wallHeight: 8 },
  'Daikin Park':                { lf: 315, cf: 409, rf: 326, wallHeight: 8, wallHeightNote: 'LF "Crawford Boxes" wall is ~19ft — using standard default here since this table has one height per park' },
  'Nationals Park':             { lf: 337, cf: 402, rf: 335, wallHeight: 8 },
  'Oracle Park':                { lf: 339, cf: 391, rf: 309, wallHeight: 8, wallHeightNote: 'RF wall (into McCovey Cove) is ~24ft — using standard default here since this table has one height per park' },
  'Petco Park':                 { lf: 336, cf: 396, rf: 322, wallHeight: 8 },
  'PNC Park':                   { lf: 325, cf: 399, rf: 320, wallHeight: 8 },
  'Progressive Field':          { lf: 325, cf: 400, rf: 325, wallHeight: 8 },
  'RingCentral Coliseum':       { lf: 330, cf: 400, rf: 300, wallHeight: 8 },
  'Rogers Centre':              { lf: 328, cf: 400, rf: 328, wallHeight: 8 },
  'T-Mobile Park':              { lf: 331, cf: 401, rf: 326, wallHeight: 8 },
  'Target Field':               { lf: 339, cf: 404, rf: 328, wallHeight: 8 },
  'Tropicana Field':            { lf: 315, cf: 404, rf: 322, wallHeight: 8 },
  'Truist Park':                { lf: 335, cf: 400, rf: 325, wallHeight: 8 },
  'Wrigley Field':              { lf: 355, cf: 400, rf: 353, wallHeight: 11.5 },
  'Yankee Stadium':             { lf: 318, cf: 408, rf: 314, wallHeight: 8 },
};

/**
 * REAL BUG THIS TABLE ALREADY CAUSED, DOCUMENTED HERE RATHER THAN
 * QUIETLY FORGOTTEN: MLB ballpark sponsorship names change — not
 * hypothetically, this already broke production. On Sept 5, 2026, the
 * live Top 20 Home Run list was dominated almost entirely by two games
 * (Twins @ White Sox, D-backs @ Astros) because their venues' CURRENT
 * names ("Rate Field" and "Daikin Park") didn't match this table's
 * then-current keys ("Guaranteed Rate Field" and "Minute Maid Park") —
 * both real, confirmed sponsor renames (White Sox effective the 2025
 * season; Astros' rename wasn't independently dated but was confirmed
 * directly from the live app's own MLB API data on the day this broke).
 * Since the park lookup is an exact string match, ANY mismatch meant
 * the physics-based HR check silently never ran for that game — those
 * players' HR-caliber rolls never got the same downgrade check every
 * other game's did, so their probabilities stayed artificially high
 * relative to the rest of the slate and dominated the ranking.
 *
 * This alias table is the actual fix, not just correcting the two names
 * that happened to break: old/alternate names resolve to the same
 * canonical entry above, so a future rename (or the API returning a
 * name this table hasn't been updated for) degrades gracefully instead
 * of silently disabling the physics model for that game. getParkDimensions()
 * below is the real lookup path everything should use — direct
 * PARK_DIMENSIONS[name] indexing bypasses this protection entirely.
 */
const PARK_NAME_ALIASES = {
  'Guaranteed Rate Field': 'Rate Field',       // pre-2025 name
  'Minute Maid Park': 'Daikin Park',            // pre-rename name
  'Uniqlo Field': 'Dodger Stadium',             // field-level sponsor name announced Mar 2026; stadium itself is still "Dodger Stadium"
};

/** The real lookup path — checks the canonical table first, then known
 *  aliases, so a stale or alternate venue name degrades gracefully
 *  instead of silently disabling the physics model for that game. */
function getParkDimensions(venueName){
  if(!venueName) return null;
  if(PARK_DIMENSIONS[venueName]) return PARK_DIMENSIONS[venueName];
  const canonical = PARK_NAME_ALIASES[venueName];
  return canonical ? PARK_DIMENSIONS[canonical] : null;
}

if(typeof module !== 'undefined' && module.exports) module.exports = { PARK_DIMENSIONS };
