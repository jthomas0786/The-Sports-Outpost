#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNbaProjection,marketFairOver} from '../sports/nba/model-v202.js';

const view=fs.readFileSync('sports/nba/view-v201.js','utf8');
const css=fs.readFileSync('sports/nba/view-v201.css','utf8');

for(const marker of [
  'data-nba-prop-market',
  'data-nba-detail-market',
  'data-nba-detail-panel',
  'function projectionVsLineHTML',
  'function minutesTrendHTML',
  'function matchupIntelligenceHTML',
  'function hitRateHTML',
  'function whyTsoHTML',
  'WHY TSO LIKES',
  'Defensive Rank',
  'Expected Pace'
]) assert.ok(view.includes(marker),`NBA intelligence view missing: ${marker}`);

for(const cls of [
  '.nba3-intel-market-tabs',
  '.nba3-intel-hero',
  '.nba3-projline-track',
  '.nba3-minutes-chart',
  '.nba3-match-grid',
  '.nba3-why'
]) assert.ok(css.includes(cls),`NBA intelligence CSS missing: ${cls}`);

assert.match(view,/playerModal\(row\.dataset\.nbaPropPlayer,row\.dataset\.nbaPropMarket/,'clicked row must open exact market');
assert.match(view,/PRE dimmed/,'preseason context label must stay visible');
assert.match(view,/usedInProjection===false/,'preseason exclusion state must affect charts');

const research=JSON.parse(fs.readFileSync('slates/nba-research.json','utf8'));
const odds=JSON.parse(fs.readFileSync('slates/nba-odds.json','utf8'));
const allowed=new Set(['points','rebounds','assists','pra','threes']);
const groups=new Map();
for(const r of odds.rows||[]){
  if(!allowed.has(r.market)||!(Number(r.line)>0))continue;
  const key=[r.player,r.market,r.line].join('|');
  if(!groups.has(key))groups.set(key,{player:r.player,market:r.market,line:Number(r.line),homeTeam:r.homeTeam,awayTeam:r.awayTeam,commenceTime:r.commenceTime,rows:[]});
  groups.get(key).rows.push(r);
}
let modeled=0;
for(const g of groups.values()){
  const p=buildNbaProjection({research,row:g,market:g.market,line:g.line,fairOverProb:marketFairOver(g.rows)});
  if(p){
    modeled++;
    assert.ok(Number.isFinite(p.projection),'projection must be numeric');
    assert.ok(p.recentGames.length>0,'detail chart needs recent games');
    assert.ok(Number.isFinite(p.expectedPace)||p.expectedPace===null,'pace field must be valid');
    assert.ok(Number.isFinite(p.opponentAllowance)||p.opponentAllowance===null,'opponent allowance must be valid');
  }
}
if(groups.size)assert.ok(modeled>0,'current NBA prop board should produce at least one detailed projection');
console.log(`✓ NBA player intelligence self-test passed (${modeled}/${groups.size} current lines modeled)`);
