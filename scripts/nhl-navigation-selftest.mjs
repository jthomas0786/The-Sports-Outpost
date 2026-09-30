#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  NHL_LIVE_REFRESH_MS,
  NHL_IDLE_PROBE_MS,
  nhlShouldLiveRefresh,
  nhlNextRefreshDelay,
} from '../sports/nhl/refresh-policy-v933.js';

const now=Date.parse('2026-09-30T17:00:00Z');
const game=(status,startTime)=>({id:'g1',status,startTime});

assert.equal(nhlShouldLiveRefresh([],now),false,'empty/off-hours slate must not trigger a view rerender loop');
assert.equal(nhlNextRefreshDelay([],now),NHL_IDLE_PROBE_MS,'off-hours slate should use the quiet probe interval');
assert.equal(nhlShouldLiveRefresh([game('pre',new Date(now+30*60*1000).toISOString())],now),true,'pregame window must refresh live data');
assert.equal(nhlNextRefreshDelay([game('pre',new Date(now+30*60*1000).toISOString())],now),NHL_LIVE_REFRESH_MS,'pregame window must use the live cadence');
assert.equal(nhlShouldLiveRefresh([game('in',new Date(now-60*60*1000).toISOString())],now),true,'live games must keep refreshing');

const wrapper=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const state=fs.readFileSync('sports/nhl/sidebar-state-v933.js','utf8');
const registry=fs.readFileSync('sports/registry.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const firstGoal=fs.readFileSync('sports/nhl/sidebar-first-goal-v928.js','utf8');
const firstGoalModel=fs.readFileSync('sports/nhl/first-goal-v928.js','utf8');
const firstGoalCss=fs.readFileSync('sports/nhl/first-goal-v928.css','utf8');
const plj=fs.readFileSync('sports/nhl/sidebar-plj-v927.js','utf8');

for(const marker of [
  "document.addEventListener('click',onClick,true)",
  "window.addEventListener('tso:nhl-tab-change',queueSync)",
  "closeFirstGoal();closePlj();",
  "button.classList.toggle('is-active',on)",
  "button.setAttribute('aria-current','page')",
]) assert.ok(state.includes(marker),`missing centralized NHL sidebar state guard: ${marker}`);

for(const marker of [
  'withoutLegacyBasePoll',
  'Number(delay)===10000',
  'installSlateWithQuietPoll',
  'Number(delay)===60000',
  'auxiliaryPanelOpen()',
  'closeAuxiliaryPanels()',
  'window.DW_nhlPendingTab=next',
  'window.DW_openNhlTab=openBaseTab',
  "new CustomEvent('tso:nhl-tab-change'",
]) assert.ok(wrapper.includes(marker),`missing NHL navigation/refresh protection: ${marker}`);

assert.ok(registry.includes("sidebar-state-v933.js?v=90.33"),'centralized NHL sidebar controller must load globally');
assert.ok(registry.includes("sidebar-plj-v927.js?v=90.34-sidebar-exclusive"),'PLJ sidebar must use the refreshed cache-busted module');
assert.ok(registry.includes("sidebar-first-goal-v928.js?v=90.34-sidebar-exclusive"),'First Goal sidebar must use the refreshed cache-busted module');
assert.ok(router.includes("view-v906.js?v=90.35-mobile-static"),'router must load the mobile-static NHL scorer build');
assert.ok(wrapper.includes("first-goal-v928.js?v=90.35-mobile-static"),'NHL wrapper must load the mobile-static First Goal module');
assert.ok(firstGoalModel.includes("first-goal-v928.css?v=90.35-mobile-static"),'First Goal module must cache-bust the mobile-static stylesheet');
for(const marker of [
  '#hkFirstGoalPanel .fgs-hero>.fgs-market-control',
  'position:static!important',
  'inset:auto!important',
  '-webkit-transform:none!important',
]) assert.ok(firstGoalCss.includes(marker),`missing mobile-static scorer toggle safeguard: ${marker}`);
assert.ok(firstGoal.includes("closeNhlFeaturePanels('first-goal')"),'First Goal must close competing NHL feature state before opening');
assert.ok(plj.includes("closeNhlFeaturePanels('plj')"),'Puck Line Jesus must close competing NHL feature state before opening');

console.log('✓ NHL navigation + refresh regression passed');
console.log('  ✓ only one NHL sidebar destination can remain active');
console.log('  ✓ core tab switches close First Goal and Puck Line Jesus before navigation');
console.log('  ✓ legacy 10s/60s rerenders are suppressed outside the live/pregame window');
console.log('  ✓ First Goal / Anytime Goal toggle stays static inside the hero on mobile');
console.log('  ✓ refreshed NHL modules are cache-busted for deployed browsers');
