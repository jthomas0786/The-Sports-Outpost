#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { renderNflPlaystageV886CHTML } from '../sports/nfl/playstage-v886c.js';

const css = fs.readFileSync('sports/nfl/gamecast-v886c-styles.js', 'utf8');
const preview = fs.readFileSync('sports/nfl-preview.js', 'utf8');
const router = fs.readFileSync('sports/router.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(css.includes('width:8.333333%'), 'end zones must each be exactly 10/120 of total field');
assert(css.includes('left:8.333333%;right:8.333333%'), 'playing field must occupy 100/120 of total field');
assert(css.includes('rotate(180deg)'), 'far sideline numbers must face the opposite direction');
assert(!css.includes('width:11.5%'), 'old oversized end-zone geometry must be gone');

const html = renderNflPlaystageV886CHTML({
  away:{abbr:'NE',name:'Patriots'},
  home:{abbr:'SEA',name:'Seahawks'},
  possession:'NE',
  liveScore:{ballOn:'SEA 42',downDistance:'1st & 10',winProbAway:68},
  currentPlay:{type:'pass right',playerName:'Drake Maye',playerPos:'QB',playerNo:'10',description:'Drake Maye drops back.'}
},{halftime:{warming:true}});

assert(html.includes('class="tso-ps886c__line los" style="left:58%"'), 'SEA 42 must map to 58 yards from the away goal line');
for (const label of ['10','20','30','40','50']) assert(html.includes(`>${label}</span>`), `missing yard number ${label}`);
assert.equal((html.match(/tso-ps886c__yardNum top/g)||[]).length, 9, 'top sideline needs 9 major numbers');
assert.equal((html.match(/tso-ps886c__yardNum bottom/g)||[]).length, 9, 'bottom sideline needs 9 major numbers');
assert.equal((html.match(/tso-ps886c__yardLine/g)||[]).length, 21, 'must render every 5-yard line from goal line to goal line');
assert(preview.includes("renderNflPlaystageV886CHTML(g,{halftime:state.halftime})"), 'preview must directly render v88.6c');
assert(router.includes("nfl-preview.js?v=88.6c"), 'router cache bust missing');
assert(index.includes('sports/router.js?v=88.6c'), 'index cache bust missing');

console.log('✓ v88.6c regulation-field self-test passed');
console.log('✓ 120-yard geometry verified');
console.log('✓ 10-yard end zones verified');
console.log('✓ 100-yard field of play verified');
console.log('✓ exact mirrored yard numbers verified');
console.log('✓ opposite sideline orientation verified');
console.log('✓ SEA 42 -> field yard 58 verified');
