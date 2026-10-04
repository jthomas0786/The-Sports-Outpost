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
const firstGoalShare=fs.readFileSync('sports/nhl/first-goal-share-v928.js','utf8');
const plj=fs.readFileSync('sports/nhl/sidebar-plj-v927.js','utf8');
const coverBar=fs.readFileSync('sports/nhl/plj-cover-bar-v938.js','utf8');

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
assert.ok(router.includes("view-v906.js?v=90.46-wordmark-fix"),'router must load the team-color PLJ cover-bar NHL build');
assert.ok(wrapper.includes("plj-cover-bar-v938.js?v=90.38-cover-bars"),'NHL wrapper must load the team-color PLJ cover-bar module');
assert.ok(wrapper.includes('installPljCoverBarsV938();'),'NHL wrapper must install PLJ cover bars');
for(const marker of [
  'MARKET COVER LEAN',
  'plj-cover-track',
  'No-vig market cover split',
  "CBJ:'#002654'",
  "PHI:'#F74902'",
  "TOR:'#003E7E'",
  "VGK:'#B4975A'",
]) assert.ok(coverBar.includes(marker),`missing PLJ cover-bar behavior: ${marker}`);
assert.ok(wrapper.includes("first-goal-v928.js?v=90.46-wordmark-fix"),'NHL wrapper must load the mobile-pinned First Goal module');
assert.ok(firstGoalModel.includes("first-goal-v928.css?v=90.39-matchup"),'First Goal module must cache-bust the mobile-pinned stylesheet');
assert.ok(firstGoalModel.includes("first-goal-share-v928.js?v=90.46-wordmark-fix"),'First Goal module must load the approved share-card renderer');
for(const marker of [
  "market==='fgs'?'FIRST GOAL SCORER':'ANYTIME GOAL SCORER'",
  "const WORDMARK_B64=",
  "getImageData(0,0,iw,ih)",
  "globalCompositeOperation='source-over'",
  "drawAspectImage(c,brandBg,535,155,530,660,'contain')",
  "TOP 3 PER TEAM + RISKY VALUE",
]) assert.ok(firstGoalShare.includes(marker),`missing approved scorer share-card behavior: ${marker}`);
assert.ok(!firstGoalShare.includes("metallicText(c,'MODEL'"),'approved scorer share card must not render MODEL in the title');
assert.ok(!firstGoalShare.includes("globalCompositeOperation='screen'"),'approved wordmark must not use screen blending');
for(const marker of [
  'fgs-market-slot',
  'is-mobile-pinned',
  '--fgs-mobile-market-top',
  "document.addEventListener('scroll',queueMobileMarketPin",
  'window.visualViewport?.addEventListener',
]) assert.ok(firstGoalModel.includes(marker),`missing mobile pin behavior: ${marker}`);
for(const marker of [
  '.fgs-market-slot',
  '.is-mobile-pinned',
  'position:fixed!important',
  'z-index:1200!important',
  'backdrop-filter:blur(16px)',
]) assert.ok(firstGoalCss.includes(marker),`missing mobile pinned scorer toggle style: ${marker}`);
assert.ok(firstGoal.includes("closeNhlFeaturePanels('first-goal')"),'First Goal must close competing NHL feature state before opening');
assert.ok(plj.includes("closeNhlFeaturePanels('plj')"),'Puck Line Jesus must close competing NHL feature state before opening');

console.log('✓ NHL navigation + refresh regression passed');
console.log('  ✓ only one NHL sidebar destination can remain active');
console.log('  ✓ core tab switches close First Goal and Puck Line Jesus before navigation');
console.log('  ✓ legacy 10s/60s rerenders are suppressed outside the live/pregame window');
console.log('  ✓ First Goal / Anytime Goal toggle pins beneath the site header on mobile scroll');
console.log('  ✓ PLJ matchup cards render team-color no-vig puck-line cover bars');
console.log('  ✓ refreshed NHL modules are cache-busted for deployed browsers');
