#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { renderNflPlaystageV886DHTML, __V886D_TEST__ } from '../sports/nfl/playstage-v886d.js';

const {FIELD,SCENE,scenePoint,lineAt,fieldYardToAbs,ballState,yardLabel}=__V886D_TEST__;
assert.equal(FIELD.total,120);
assert.equal(FIELD.leftEnd,10);
assert.equal(FIELD.play,100);
assert.equal(FIELD.rightEnd,10);
assert.equal(fieldYardToAbs(0),10);
assert.equal(fieldYardToAbs(50),60);
assert.equal(fieldYardToAbs(100),110);
assert.deepEqual([10,20,30,40,50,60,70,80,90].map(yardLabel),[10,20,30,40,50,40,30,20,10]);

const demo={away:{abbr:'NE',name:'Patriots'},home:{abbr:'SEA',name:'Seahawks'},possession:'NE',liveScore:{ballOn:'SEA 42',downDistance:'1st & 10',distance:10,winProbAway:68},currentPlay:{type:'pass right',playerName:'Drake Maye',playerPos:'QB',playerNo:'10',description:'Pass right'}};
assert.equal(ballState(demo).fieldYard,58,'SEA 42 must map to field yard 58');
const html=renderNflPlaystageV886DHTML(demo,{player:{name:'Drake Maye',pos:'QB',number:'10',headshot:'https://example.com/maye.png'},halftime:{warming:true}});
assert(html.includes('/sports/nfl/stadium-shell-v886d.png?v=88.6d'));
assert(html.includes('Drake Maye'));
assert(html.includes('https://example.com/maye.png'));
assert(html.includes('Halftime Lab Warming Up'));
assert(!html.includes('FOOTBALL LIVES HERE</div><div class="tso-ps886d'), 'no duplicate external banner row should exist');

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(preview.includes("renderNflPlaystageV886DHTML(g,{halftime:state.halftime,player:p})"));
assert(preview.includes("playstage-v886d.js?v=88.6d"));
assert(preview.includes("gamecast-v886d-styles.js?v=88.6d"));
assert(router.includes("nfl-preview.js?v=88.6d"));
assert(index.includes("sports/router.js?v=88.6d"));
assert.equal(pkg.scripts['nfl:v88.6d:test'],'node scripts/nfl-v886d-selftest.mjs');

console.log('✓ v88.6d exact-concept/regulation self-test passed');
console.log('✓ 120-yard geometry = 10 + 100 + 10');
console.log('✓ number sequence = 10 20 30 40 50 40 30 20 10');
console.log('✓ SEA 42 -> field yard 58');
console.log('✓ actual headshot path reaches Current Play / Featured Player');
console.log('✓ full cache chain = v88.6d');
