#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const router=read('sports/router.js');
const index=read('index.html');
const pkg=JSON.parse(read('package.json'));
const hydrate='hydrateNflDemoState(state,{data:state.data,research,odds,sim,halftime});';
const dataIdx=preview.indexOf('state.data={games:games.length?games:FALLBACK_GAMES');
const demoIdx=preview.indexOf(hydrate);
const pollIdx=preview.indexOf('if(!NFL_DEMO_MODE) startLivePolling(d,()=>{');

assert(dataIdx>=0,'canonical state.data assignment missing');
assert(demoIdx>dataIdx,'demo hydration must happen after canonical state.data mapping');
assert(pollIdx>demoIdx,'guarded live poll must happen after demo hydration');
assert.equal((preview.match(/hydrateNflDemoState\(state/g)||[]).length,1,'exactly one demo hydration call expected');
assert.match(preview,/demo-mode\.js\?v=88\.5b/);
assert.match(preview,/playstage-v885a\.js\?v=88\.5b/);
assert.match(router,/nfl-preview\.js\?v=88\.5b/);
assert.match(index,/sports\/router\.js\?v=88\.5b/);
assert.equal(pkg.scripts['nfl:v88.5b:test'],'node scripts/nfl-v885b-selftest.mjs');
console.log('✓ v88.5b demo-mode ordering self-test passed');
console.log('✓ state.data -> demo hydrate -> guarded live poll');
console.log('✓ full cache-bust chain is v88.5b');
