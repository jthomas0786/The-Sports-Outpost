import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __MLB_PLAYSTAGE_V901_TEST__ as t } from '../sports/mlb/playstage-v901.js';

assert.equal(t.playKind({result:{eventType:'home_run'}}),'home_run');
assert.equal(t.playKind({result:{eventType:'single'}}),'single');
assert.equal(t.playKind({result:{eventType:'strikeout'}}),'strikeout');
assert.equal(t.playKind({result:{eventType:'field_out',description:'Batter flies out to center fielder.'},hitData:{trajectory:'fly_ball'}}),'fly_out');
assert.equal(t.playKind({result:{eventType:'field_out',description:'Batter grounds out, shortstop to first baseman.'},hitData:{trajectory:'ground_ball'}}),'ground_out');
assert.deepEqual(t.hitTarget({result:{description:'Fly ball to left field'}},'fly_out'),[27,45]);
assert.equal(t.endBase({result:{description:'Grounded to shortstop'}}),'first');
assert.ok(t.playerImg(592450).includes('/people/592450/headshot/'));
assert.ok(t.teamLogo(147).includes('/147.svg'));
assert.deepEqual(t.DEF_POS.C,[50,90]);
assert.deepEqual(t.BASE_POS.second,[50,58]);
assert.deepEqual(t.DEF_POS.CF,[50,40]);

const src=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
for(const marker of [
  'Schematic reconstruction · official MLB play data · not optical player tracking',
  'statsapi.mlb.com/api/v1.1/game',
  'ps-batter',
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

for(const marker of ['runnerMoves','currentRunners','seedRunners','ps-runner','ps-windup','outBaseSequence','nearestFielderAt','getBoundingClientRect']) assert.ok(src.includes(marker),`PlayStage polish missing ${marker}`);
for(const marker of ['latestEvent','pitchInfo','wireStageTabs','data-ps-tab','data-ps-panel','boxRailHTML','fieldRailHTML']) assert.ok(src.includes(marker),`PlayStage finish missing ${marker}`);

const concept=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v904.js',import.meta.url),'utf8');
for(const marker of [
  'tso-mlb-concept-v904','ps3d-rig','ps3d-stadium','ps3d-scoreboard','ps3d-face','ps3d-bat','ps3d-glove',
  'ps3dWindupBody','ps3dThrowArm','ps3dSwingBody','ps3dRunBob','ps3dCatchBody',
]) assert.ok(concept.includes(marker),`Approved concept missing ${marker}`);

const conceptV905=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v905.js',import.meta.url),'utf8');
for(const marker of [
  'tso-mlb-concept-v905','ps905-stadium','ps905-grandstand','ps905-board-shell','ps905-rig','ps905WindupCore',
  'ps905PitchArm','ps905SwingCore','ps905RunBob','ps905FieldGrounder','ps905TrackFly','ps905DpCore','ps905CatcherPop',
  'ps905SlideCore','ps905TagCore','ps905-rounding','ps-chibi.ps-batter .ps905-mitt',
]) assert.ok(conceptV905.includes(marker),`v905 concept missing ${marker}`);

const conceptV915=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v915.js',import.meta.url),'utf8');
assert.ok(conceptV915.includes("const FIELD_SRC='./field-bg.jpg'"),'v915 must use the approved field-bg.jpg');
assert.ok(!conceptV915.includes('playstage-field-v914.jpg'),'v915 must not fall back to the old v914 field artwork');
assert.ok(conceptV915.includes('applyNativeAspect'),'v915 must size the stage from the approved image dimensions');
assert.ok(conceptV915.includes("img.setAttribute('src',FIELD_SRC)"),'v915 must replace the field node created by v914');
assert.ok(conceptV915.includes('object-fit:contain!important'),'v915 must preserve the entire approved image');
assert.ok(conceptV915.includes('/* v915 responsive shell:'),'v915 must include responsive Gamecast shell');
assert.ok(conceptV915.includes('@media(max-width:900px)'),'v915 must collapse the three-column shell for tablets/mobile');
assert.ok(conceptV915.includes('@media(max-width:620px)'),'v915 must include phone-specific scaling');
assert.ok(conceptV915.includes('.ps-chibi.ps-runner{\n  opacity:0!important'),'runner role alone must remain hidden while idle');

const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.4"),'Router must cache-bust MLB PlayStage');
assert.ok(router.includes("./mlb/playstage-concept-v904.js?v=90.4"),'Router must load approved MLB concept');
assert.ok(router.includes("./mlb/playstage-concept-v905.js?v=90.51"),'Router must load v905 MLB concept');
assert.ok(router.includes("./mlb/playstage-concept-v915.js?v=91.52"),'Router must load the corrected v915 field layer');
assert.ok(router.includes('installMlbPlaystageV901'),'Router must install MLB PlayStage');
assert.ok(router.includes('installMlbPlaystageConceptV904'),'Router must install approved MLB concept');
assert.ok(router.includes('installMlbPlaystageConceptV905'),'Router must install v905 MLB concept');
assert.ok(router.includes('installMlbPlaystageConceptV915'),'Router must install v915 after the established concept stack');

console.log('MLB PlayStage regression: game data, Chibi renderer, approved field-bg.jpg, native aspect, animations and router wiring OK');
