#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeScoreboard,dedupeSlatePlayers,easternDate} from '../sports/nhl/data.js';

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
const selected=normalizeScoreboard(feed,now,'2026-09-20');
assert.equal(selected.date,'2026-09-20');
assert.deepEqual(selected.games.map(g=>g.id),['tomorrow'],'explicit slate date must override a multi-day feed');

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

const wrapper=fs.readFileSync('sports/nhl/view-v906.js','utf8');
const guard=fs.readFileSync('sports/nhl/props-daily-guard-v920.js','utf8');
const compat=fs.readFileSync('sports/nhl/props-daily-guard-v919.js','utf8');
assert.ok(wrapper.includes('installNhlPropsDailyGuardV920'),'NHL wrapper must install the non-blocking Props guard');
assert.ok(wrapper.indexOf('installNhlPropsDailyGuardV920(host)')<wrapper.indexOf('await base.mount()'),'Props guard must be armed before the large base render begins');
assert.ok(compat.includes('props-daily-guard-v920.js?v=90.20'),'cached v919 wrapper must forward to the freeze-safe guard after revalidation');
for(const marker of ["PAGE_SIZE=1000","g?.slateDate||easternDate","p.propsEligible===false","nhlPropsProcessedV920","addedNodes",".hk-prop-list","if(!list.isConnected)return","rank&&rank.textContent!==next","count&&count.textContent!==totalText","content-visibility:auto","Show ${next} more"])assert.ok(guard.includes(marker),`missing freeze-safe defensive Props safeguard: ${marker}`);
assert.ok(!guard.includes('new MutationObserver(run)'),'Props observer must not rerun on its own rank/count mutations');

console.log('✓ NHL daily slate + freeze-safe Props regression passed');
console.log('  ✓ one Eastern-time date survives multi-day ESPN responses');
console.log('  ✓ UTC rollover does not leak late-night games into the next slate');
console.log('  ✓ duplicate roster rows collapse and one same-day matchup owns Props eligibility');
console.log('  ✓ Props observer ignores its own DOM edits and is armed before render');
console.log('  ✓ the complete launch-day daily pool stays live while the existing Show More safeguard remains available above 1,000 rows');
