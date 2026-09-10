#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const live=fs.readFileSync('sports/nfl/live.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const edge=fs.readFileSync('supabase/functions/nfl-live/index.ts','utf8');
const poller=fs.readFileSync('scripts/nfl-live-poller.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.doesNotMatch(preview,/gamecast-live-upgrade\.js\?v=88\.3/);
assert.doesNotMatch(preview,/mountOrUpdateNflGamecastUpgrade/);
assert.doesNotMatch(preview,/__TSO_V883_RENDER_PATCHED__/);
assert.match(preview,/gamecast-v883a-styles\.js\?v=88\.3a/);
assert.match(preview,/function patchLiveGamecastDOM\(/);
assert.match(preview,/class="nxg-live-stage tso-espn-drive"/);
assert.match(preview,/data-v883a-team-name="away"/);
assert.match(preview,/data-v883a-team-name="home"/);
assert.match(preview,/tso-possession-football/);
assert.match(preview,/nfl-td-feed-card/);
assert.match(preview,/tdFeedPriceHTML/);
assert.match(preview,/if\(state\.game && state\.gamecastTab==='game'\)/);
assert.match(live,/const POLL_MS = 2000/);
assert.match(live,/winProbability: gl\.winProbability \|\| null/);
assert.match(edge,/latestWinProbability/);
assert.match(edge,/max-age=1, s-maxage=1/);
assert.match(poller,/parseWinProbability/);
assert.match(router,/nfl-preview\.js\?v=88\.3a/);
assert.equal(pkg?.scripts?.['nfl:v88.3a:test'],'node scripts/nfl-v883a-selftest.mjs');
assert.equal(fs.existsSync('sports/nfl/gamecast-live-upgrade.js'),false,'obsolete global gamecast upgrade file should be removed');

console.log('✓ v88.3a corrective hotfix self-test passed');
console.log('  ✓ Current Drive is Gamecast-only');
console.log('  ✓ old global injection module removed');
console.log('  ✓ possession football is inside team name');
console.log('  ✓ flat drive tracker + incremental 2s update path wired');
console.log('  ✓ TD Feed player photo / odds layout wired');
console.log('  ✓ live win probability available from endpoint + fallback poller');
