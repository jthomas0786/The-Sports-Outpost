#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { renderNflPlaystageV886EHTML, __V886E_TEST__ } from '../sports/nfl/playstage-v886e.js';

const {FIELD,SCENE,scenePoint,lineAt,fieldYardToAbs,ballState,yardLabel}=__V886E_TEST__;
assert.equal(FIELD.total,120);
assert.equal(FIELD.leftEnd,10);
assert.equal(FIELD.play,100);
assert.equal(FIELD.rightEnd,10);
assert.equal(fieldYardToAbs(0),10);
assert.equal(fieldYardToAbs(50),60);
assert.equal(fieldYardToAbs(100),110);
assert.deepEqual([10,20,30,40,50,60,70,80,90].map(yardLabel),[10,20,30,40,50,40,30,20,10]);
assert.equal(SCENE.w,1672);
assert.equal(SCENE.h,415);

const demo={
  away:{abbr:'NE',name:'Patriots',logo:'https://example.com/ne.png'},
  home:{abbr:'SEA',name:'Seahawks',logo:'https://example.com/sea.png'},
  possession:'NE',
  liveScore:{ballOn:'NE 42',downDistance:'2nd & 9',distance:9,winProbAway:68},
  currentPlay:{type:'pass right',playerName:'Drake Maye',playerPos:'QB',playerNo:'10',targetName:'Hunter Henry',description:'Pass right'}
};
assert.equal(ballState(demo).fieldYard,42,'NE 42 must map to field yard 42');
const html=renderNflPlaystageV886EHTML(demo,{player:{name:'Drake Maye',pos:'QB',number:'10',headshot:'https://example.com/maye.png'},halftime:{warming:true}});
assert(html.includes('/sports/nfl/stadium-shell-v886e.png?v=88.6e'));
assert(html.includes('tso-ps886e__downlines'));
assert(html.includes('tso-ps886e__routes'));
assert(html.includes('tso-ps886e__actorSpot'));
assert(html.includes('Henry')); // target label uses the last name on-field
assert(html.includes('https://example.com/ne.png'));
assert(html.includes('https://example.com/maye.png'));
assert(html.includes('Halftime Lab Warming Up'));
assert(!html.includes('chibiSvg'));

const playerJs=fs.readFileSync('sports/nfl/playstage-v886e.js','utf8');
const styleJs=fs.readFileSync('sports/nfl/gamecast-v886e-styles.js','utf8');
assert(playerJs.includes("pose:'qb'"));
assert(playerJs.includes("pose:'line'"));
assert(playerJs.includes("pose:'defense'"));
assert(playerJs.includes("beam(los,'#00a9ff')"));
assert(playerJs.includes("beam(fd,'#ffd900')"));
assert(styleJs.includes('.tso-ps886e__downlines{z-index:2'));
assert(styleJs.includes('.tso-ps886e__routes{z-index:4'));
assert(styleJs.includes('width:46px;height:92px'));
assert(styleJs.includes('border-radius:70% 55% 70% 55%'));

const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(preview.includes("renderNflPlaystageV886EHTML(g,{halftime:state.halftime,player:p})"));
assert(preview.includes("playstage-v886e.js?v=88.6e"));
assert(preview.includes("gamecast-v886e-styles.js?v=88.6e"));
assert(router.includes("nfl-preview.js?v=88.6e"));
assert(index.includes("sports/router.js?v=88.6e"));
assert.equal(pkg.scripts['nfl:v88.6e:test'],'node scripts/nfl-v886e-selftest.mjs');

console.log('✓ v88.6e player/overlay concept-match self-test passed');
console.log('✓ adult player proportions + role-specific stances present');
console.log('✓ concept focus rings + neutral route ghosts present');
console.log('✓ LOS / line-to-gain are neon beams below actors');
console.log('✓ football-shaped live marker present');
console.log('✓ regulation 10 + 100 + 10 geometry preserved');
console.log('✓ full cache chain = v88.6e');
