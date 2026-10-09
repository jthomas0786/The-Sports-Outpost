#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fairPair,edgePercentages,edgeLeader,formatAmerican} from '../sports/shared/game-edge-v100.js';

const view=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const edge=fs.readFileSync('sports/nhl/game-edge-v940.js','utf8');
const sidebar=fs.readFileSync('sports/nhl/sidebar-plj-v927.js','utf8');
const state=fs.readFileSync('sports/nhl/sidebar-state-v933.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const lines=JSON.parse(fs.readFileSync('slates/nhl-puck-lines.json','utf8'));

const even=fairPair({leftPrice:-110,rightPrice:-110});
assert.ok(Math.abs(even.left-.5)<.001&&Math.abs(even.right-.5)<.001);
const fav=fairPair({leftProbability:.58,rightProbability:.42});
assert.equal(edgeLeader(fav).side,'left');
assert.equal(Math.round(edgePercentages(fav).left),58);
assert.equal(formatAmerican(125),'+125');

for(const marker of [
  "installNhlGameEdgeV940",
  "#hkGameEdgePanel",
  "DW_closeGameEdge",
]) assert.ok(view.includes(marker),`NHL wrapper missing Game Edge marker: ${marker}`);

const baseView=fs.readFileSync('sports/nhl/view.js','utf8');
const baseCss=fs.readFileSync('sports/nhl/style.css','utf8');
assert.ok(baseView.includes('data-hk-game-edge'),'NHL page header must expose visible Game Edge access');
assert.ok(baseView.includes('window.DW_openGameEdge'),'NHL page header must open Game Edge');
assert.ok(baseCss.includes('.hk-game-edge-btn'),'visible NHL Game Edge header control must be styled');

for(const marker of [
  "Spread",
  "Moneyline",
  "Total",
  "One glance, one short reason",
  "fairPair",
  "ge-bar",
  "no-vig",
]) assert.ok(edge.includes(marker),`NHL Game Edge missing: ${marker}`);

assert.ok(sidebar.includes("btn.textContent='Game Edge'"),'fallback NHL sidebar injector must display Game Edge');
assert.ok(index.includes('data-nhl-game-edge="1">Game Edge</button>'),'Game Edge must be native to the TSO 2.0 NHL sidebar template');
assert.ok(index.includes("host.querySelectorAll('[data-nhl-game-edge]')"),'native Game Edge sidebar button must have a click handler');
assert.ok(sidebar.includes('DW_openGameEdge'),'sidebar must open Game Edge');
assert.ok(state.includes('hkGameEdgePanel'),'centralized sidebar state must track Game Edge');
assert.ok(!view.includes('installPuckLineJesusV923();'),'NHL 2.0 must not install the old Puck Line Jesus runtime');
assert.ok(Array.isArray(lines.games),'NHL line snapshot must contain games');

let usable=0;
for(const g of lines.games){
  if(g.moneyline?.homeFair!=null&&g.moneyline?.awayFair!=null){
    const p=fairPair({leftProbability:g.moneyline.awayFair,rightProbability:g.moneyline.homeFair});
    assert.ok(Math.abs(p.left+p.right-1)<1e-9,'moneyline fair probabilities must normalize');
    usable++;
  }
}
// Availability is not a code regression: books can withhold all moneylines, or
// yesterday's committed odds can age out while today's slate is being built.
// The deterministic fairPair/leader/format tests above always run.  Never block
// the scheduled slate refresh just because the PREVIOUS snapshot has no prices.
if(usable===0) {
  console.warn('⚠ No verified NHL moneylines in the prior snapshot; Game Edge will show unavailable until sportsbook quotes return.');
}
console.log(`✓ NHL Game Edge self-test passed (${usable} games with verified moneyline consensus)`);
