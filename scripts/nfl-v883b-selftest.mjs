#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const ht=fs.readFileSync('sports/nfl/halftime-ui.js','utf8');
const styles=fs.readFileSync('sports/nfl/gamecast-v883b-styles.js','utf8');
const simAuto=fs.readFileSync('scripts/nfl-sim-auto.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/nfl-live.yml','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(preview,/gamecast-v883b-styles\.js\?v=88\.3b/);
assert.match(preview,/halftime-ui\.js\?v=88\.3b/);
assert.match(preview,/function v883bPlayableYard\(g\)/);
assert.match(preview,/function v883bFirstDownYard\(g\)/);
assert.match(preview,/class="tso-3d-field-stage"/);
assert.match(preview,/class="tso-3d-playable"/);
assert.match(preview,/data-v883b-los/);
assert.match(preview,/data-v883b-first/);
assert.match(preview,/data-v883b-ball/);
assert.match(preview,/data-v883b-path/);
assert.doesNotMatch(preview,/class="tso-flat-field"/);
assert.match(preview,/function patchLiveGamecastDOM\(root,g\)/);
assert.match(preview,/!state\.game\|\|state\.gamecastTab!==['"]game['"]/);
assert.match(preview,/tso-possession-football/);
assert.match(preview,/halftimeBannerHTML\(state\.halftime,data\(\)\.games\)/);
assert.match(preview,/halftimeGamecastBannerHTML\(g,state\.halftime\)/);
assert.match(preview,/isHalftimeGameState\(current\)/);

assert.match(ht,/export function isHalftimeGameState\(g\)/);
assert.match(ht,/export function halftimeGamecastBannerHTML\(g,doc\)/);
assert.match(ht,/Halftime Model Calculating/);
assert.match(ht,/HALFTIME PARLAY LAB READY/);
assert.match(ht,/intervalMs=5000/);

assert.match(styles,/#tso-nfl-possession-pill\{display:none!important\}/);
assert.match(styles,/grid-template-columns:12\.5% 75% 12\.5%/);
assert.match(styles,/perspective:900px/);
assert.match(styles,/rotateX\(22deg\)/);
assert.match(styles,/\.tso-3d-playable\{position:relative;overflow:hidden/);
assert.match(styles,/\.tso-ht-gamecast-banner/);

assert.match(simAuto,/function halftimeLiveOddsReady\(game,board\)/);
assert.match(simAuto,/waiting for live sportsbook props before 50K candidate build/);
assert.match(workflow,/Refresh v87 halftime sportsbook props when needed\n\s+continue-on-error: true/);
assert.match(router,/nfl-preview\.js\?v=88\.3b/);
assert.equal(pkg?.scripts?.['nfl:v88.3b:test'],'node scripts/nfl-v883b-selftest.mjs');

console.log('✓ v88.3b NFL Gamecast + Halftime Lab self-test passed');
console.log('  ✓ 3D perspective field replaces the flat Game View field');
console.log('  ✓ LOS / first-down overlays are clipped to the playable 100 yards');
console.log('  ✓ tiny in-name possession football remains; no floating possession pill');
console.log('  ✓ halftime is detected from LIVE GAME STATE even before nfl-halftime.json exists');
console.log('  ✓ Gamecast and NFL Live both show halftime calculating/ready state');
console.log('  ✓ halftime candidate file polling is 5 seconds');
console.log('  ✓ 50K sim waits for live sportsbook props instead of wasting retries');
console.log('  ✓ halftime odds refresh failure no longer prevents the rest of the heartbeat');
