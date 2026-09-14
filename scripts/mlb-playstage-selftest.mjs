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
assert.ok(conceptV915.includes('const DESIGN_WIDTH=1440'),'v915 must retain the desktop design reference width');
assert.ok(conceptV915.includes('/* v915 overlay HUD refresh */'),'v915 must install the field-overlay HUD');
assert.ok(conceptV915.includes('function arrangeStageOverlays(root)'),'v915 must move player/event HUD elements into the field stage');
assert.ok(conceptV915.includes("'.v915-atbat-card','.v915-pitcher-card','.v915-ondeck-card','.ps-metrics','.ps-play-banner'"),'v915 must overlay At Bat, Pitching, On Deck, metrics and event banner');
assert.ok(conceptV915.includes('grid-template-columns:minmax(0,1fr) 205px!important'),'v915 desktop must reclaim the old left rail for the field');
assert.ok(conceptV915.includes('.ps-callout{display:none!important}'),'v915 must remove the duplicate bottom play message');
assert.ok(conceptV915.includes('left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important'),'v915 must center Statcast metrics at the top of the field');
assert.ok(conceptV915.includes('bottom:18px!important;transform:translateX(-50%)!important'),'v915 must move the richer event banner to bottom-center');
assert.ok(conceptV915.includes('@media(max-width:720px)'),'v915 must have a dedicated readable phone layout');
assert.ok(conceptV915.includes("root.dataset.ps915Scale='1.0000'"),'v915 phones must render at native CSS scale instead of shrinking the 1440px canvas');
assert.ok(conceptV915.includes('grid-template-columns:minmax(0,1fr) 96px!important'),'v915 phone must keep field and live rail side-by-side');
assert.ok(conceptV915.includes('applyGamecastScale'),'v915 must preserve proportional scaling above the phone breakpoint');
assert.ok(conceptV915.includes('position:relative!important;width:100%!important;height:auto!important'),'v915 field stage must participate in layout with no blank center track');
assert.ok(conceptV915.includes('.ps-chibi.ps-runner{\n  opacity:0!important'),'runner role alone must remain hidden while idle');

const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.4"),'Router must cache-bust MLB PlayStage');
assert.ok(router.includes("./mlb/playstage-concept-v904.js?v=90.4"),'Router must load approved MLB concept');
assert.ok(router.includes("./mlb/playstage-concept-v905.js?v=90.51"),'Router must load v905 MLB concept');
assert.ok(router.includes("./mlb/playstage-concept-v915.js?v=91.55"),'Router must load the corrected v915 field layer');
assert.ok(router.includes('installMlbPlaystageV901'),'Router must install MLB PlayStage');
assert.ok(router.includes('installMlbPlaystageConceptV904'),'Router must install approved MLB concept');
assert.ok(router.includes('installMlbPlaystageConceptV905'),'Router must install v905 MLB concept');
assert.ok(router.includes('installMlbPlaystageConceptV915'),'Router must install v915 after the established concept stack');

console.log('MLB PlayStage regression: game data, Chibi renderer, approved field-bg.jpg, native aspect, animations and router wiring OK');
