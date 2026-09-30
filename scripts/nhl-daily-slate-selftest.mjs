#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeScoreboard,dedupeSlatePlayers,easternDate,centralDate} from '../sports/nhl/data.js';
import {nhlSlateDate} from '../sports/nhl/slate-date.js';
import {nhlShouldLiveRefresh,nhlNextRefreshDelay,NHL_IDLE_PROBE_MS,NHL_LIVE_REFRESH_MS} from '../sports/nhl/refresh-policy-v933.js';

const team=(id,abbr,homeAway)=>({id:String(id),homeAway,score:'0',team:{abbreviation:abbr,displayName:abbr}});
const event=(id,date,away,home)=>({id,date,season:{type:1},competitions:[{competitors:[team(away.id,away.abbr,'away'),team(home.id,home.abbr,'home')],status:{type:{state:'pre',shortDetail:'Scheduled'},period:0,displayClock:'0:00'}}]});
const feed={
 day:{date:'2026-09-19'},
 leagues:[{season:{displayName:'2026-27'}}],
 events:[
  event('early','2026-09-19T23:00:00Z',{id:10,abbr:'MTL'},{id:21,abbr:'TOR'}),
  event('late','2026-09-20T02:30:00Z',{id:1,abbr:'BOS'},{id:2,abbr:'NYR'}),
  event('tomorrow','2026-09-20T23:00:00Z',{id:21,abbr:'TOR'},{id:10,abbr:'MTL'}),
 ],
};
const now=Date.parse('2026-09-19T16:00:00Z');
const slate=normalizeScoreboard(feed,now);
assert.equal(slate.date,'2026-09-19');
assert.deepEqual(slate.games.map(g=>g.id),['early','late'],'late-night UTC rollover must stay on the Eastern slate date');
assert.ok(slate.games.every(g=>g.slateDate===slate.date));
assert.equal(easternDate('2026-09-20T02:30:00Z'),'2026-09-19');
assert.equal(centralDate('2026-09-20T04:59:59Z'),'2026-09-19','Central calendar date must not roll before midnight Chicago time');
assert.equal(centralDate('2026-09-20T05:00:00Z'),'2026-09-20','Central calendar date itself rolls at midnight');
assert.equal(nhlSlateDate('2026-09-20T05:06:59Z'),'2026-09-19','NHL automatic slate must hold yesterday through 12:06:59 AM Central');
assert.equal(nhlSlateDate('2026-09-20T05:07:00Z'),'2026-09-20','NHL automatic slate must roll at 12:07 AM Central');
const selected=normalizeScoreboard(feed,now,'2026-09-20');
assert.equal(selected.date,'2026-09-20');
assert.deepEqual(selected.games.map(g=>g.id),['tomorrow'],'explicit slate date must override a multi-day feed');

const farGame={id:'far',status:'pre',startTime:'2026-09-20T20:00:00Z'};
assert.equal(nhlShouldLiveRefresh([farGame],Date.parse('2026-09-20T18:59:59Z')),false,'NHL view must stay quiet more than one hour before puck drop');
assert.equal(nhlShouldLiveRefresh([farGame],Date.parse('2026-09-20T19:00:00Z')),true,'NHL view must wake one hour before puck drop');
assert.equal(nhlShouldLiveRefresh([{...farGame,status:'in'}],Date.parse('2026-09-20T21:00:00Z')),true,'live NHL games must keep fast refreshes active');
assert.equal(nhlShouldLiveRefresh([{...farGame,status:'post'}],Date.parse('2026-09-20T23:00:00Z')),false,'final-only slates must return to quiet mode');
assert.equal(nhlNextRefreshDelay([],Date.parse('2026-09-20T10:00:00Z')),NHL_IDLE_PROBE_MS,'no-game slates must use lightweight idle probes');
assert.equal(nhlNextRefreshDelay([farGame],Date.parse('2026-09-20T19:30:00Z')),NHL_LIVE_REFRESH_MS,'pregame window must use live refresh cadence');

const matthews=id=>({id:'4024123',gameId:id,team:'TOR',name:'Auston Matthews',position:'C',active:true,availability:'Lineup unconfirmed'});
const split=[
 {id:'g1',status:'pre',startTime:'2026-09-19T23:00:00Z',players:[matthews('g1'),matthews('g1')]},
 {id:'g2',status:'pre',startTime:'2026-09-19T23:00:00Z',players:[{...matthews('g2'),lineupConfirmed:true},{id:'96',gameId:'g2',team:'TOR',name:'Mitch Marner',position:'RW',active:true}]},
];
dedupeSlatePlayers(split);
assert.equal(split[0].players.filter(p=>p.id==='4024123').length,1,'duplicate roster rows inside one game must collapse');
assert.equal(split[0].players.find(p=>p.id==='4024123').propsEligible,false,'unconfirmed duplicate matchup must lose Props eligibility');
assert.equal(split[1].players.find(p=>p.id==='4024123').propsEligible,true,'confirmed matchup must win Props eligibility');
assert.equal(split.flatMap(g=>g.players).filter(p=>p.id==='4024123'&&p.propsEligible!==false).length,1,'player must be Props-eligible once per daily slate');

const data=fs.readFileSync('sports/nhl/data.js','utf8');
const wrapper=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const sidebar=fs.readFileSync('sports/nhl/sidebar-state-v933.js','utf8');
const guard=fs.readFileSync('sports/nhl/props-daily-guard-v920.js','utf8');
const compat=fs.readFileSync('sports/nhl/props-daily-guard-v919.js','utf8');
assert.ok(data.includes('normalizeSlateDate(date)||nhlSlateDate()'),'automatic NHL slate refresh must enforce the 12:07 AM Central cutoff');
assert.ok(wrapper.includes('installNhlPropsDailyGuardV920'),'NHL wrapper must install the non-blocking Props guard');
assert.ok(wrapper.indexOf('installNhlPropsDailyGuardV920(host)')<wrapper.indexOf('await base.mount()'),'Props guard must be armed before the large base render begins');
for(const marker of ['withoutLegacyBasePoll','Number(delay)===10000','auxiliaryPanelOpen','nhlShouldLiveRefresh','NHL_IDLE_PROBE_MS','DW_nhlShouldLiveRefresh'])assert.ok(wrapper.includes(marker),`missing NHL quiet-hours refresh safeguard: ${marker}`);
for(const marker of ['hkFirstGoalPanel','hkPuckLineJesusPanel','data-nhl-tab','is-active','DW_closeNhlFirstGoal','data-plj-close'])assert.ok(sidebar.includes(marker),`missing exclusive NHL sidebar safeguard: ${marker}`);
assert.ok(compat.includes('props-daily-guard-v920.js?v=90.20'),'cached v919 wrapper must forward to the freeze-safe guard after revalidation');
for(const marker of ["PAGE_SIZE=1000","g?.slateDate||easternDate","p.propsEligible===false","nhlPropsProcessedV920","addedNodes",".hk-prop-list","if(!list.isConnected)return","rank&&rank.textContent!==next","count&&count.textContent!==totalText","content-visibility:auto","Show ${next} more"])assert.ok(guard.includes(marker),`missing freeze-safe defensive Props safeguard: ${marker}`);
assert.ok(!guard.includes('new MutationObserver(run)'),'Props observer must not rerun on its own rank/count mutations');

console.log('✓ NHL daily slate + navigation + quiet-hours refresh regression passed');
console.log('  ✓ one Eastern-time date survives multi-day ESPN responses');
console.log('  ✓ automatic slate rollover waits until 12:07 AM America/Chicago');
console.log('  ✓ NHL full-view polling stays asleep until one hour before puck drop');
console.log('  ✓ First Goal, Puck Line Jesus and base NHL tabs are mutually exclusive');
console.log('  ✓ UTC rollover does not leak late-night games into the next slate');
console.log('  ✓ duplicate roster rows collapse and one same-day matchup owns Props eligibility');
console.log('  ✓ Props observer ignores its own DOM edits and is armed before render');
console.log('  ✓ the complete launch-day daily pool stays live while the existing Show More safeguard remains available above 1,000 rows');
