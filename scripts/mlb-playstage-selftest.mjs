import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as t } from '../sports/mlb/playstage-v901.js';

assert.equal(t.playKind({result:{eventType:'home_run'}}),'home_run');
assert.equal(t.playKind({result:{eventType:'single'}}),'single');
assert.equal(t.playKind({result:{eventType:'strikeout'}}),'strikeout');
assert.equal(t.playKind({result:{eventType:'field_out',description:'Batter flies out to center fielder.'},hitData:{trajectory:'fly_ball'}}),'fly_out');
assert.equal(t.playKind({result:{eventType:'field_out',description:'Batter grounds out, shortstop to first baseman.'},hitData:{trajectory:'ground_ball'}}),'ground_out');
assert.deepEqual(t.hitTarget({result:{description:'Fly ball to left field'}},'fly_out'),[25,30]);
assert.equal(t.endBase({result:{description:'Grounded to shortstop'}}),'first');
assert.ok(t.playerImg(592450).includes('/people/592450/headshot/'));
assert.ok(t.teamLogo(147).includes('/147.svg'));
assert.deepEqual(t.DEF_POS.C,[50,88]);
assert.deepEqual(t.BASE_POS.second,[50,49]);

const src=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
for(const marker of [
  'Schematic reconstruction · official MLB play data · not optical player tracking',
  'statsapi.mlb.com/api/v1.1/game',
  'ps-chibi-batter',
  'ps-chibi-glove',
  'ps-chibi-bat',
  'animateBall',
  'animateMove',
  'home_run',
  'double_play',
  'ground_out',
  'fly_out',
  'launchSpeed',
  'launchAngle',
  'totalDistance',
  'img.mlbstatic.com/mlb-photos',
  'www.mlbstatic.com/team-logos',
  'At Bat',
  'Pitching',
  'On Deck',
]) assert.ok(src.includes(marker),`PlayStage missing ${marker}`);

const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.1"),'Router must cache-bust MLB PlayStage');
assert.ok(router.includes('installMlbPlaystageV901'),'Router must install MLB PlayStage');

console.log('MLB PlayStage regression: game data, Chibi renderer, animations, Statcast metrics and router wiring OK');
