import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../sports/mlb/playstage-v901.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

assert.ok(src.includes('function offenseActor(root,id,{allowBatter=true}={})'),'runner animation must use an offense-only actor lookup');
assert.ok(src.includes(".ps-chibi.ps-runner[data-player-id"),'offense lookup must target runner actors');
assert.ok(src.includes(".ps-chibi.ps-batter[data-player-id"),'offense lookup may target the current batter when explicitly allowed');
assert.ok(src.includes("defensiveIds=new Set((s.defenders||[]).map"),'runner animation must explicitly deny defensive player IDs');
assert.ok(src.includes("if(!id||defensiveIds.has(id))continue"),'defenders must never enter base-running animation');
assert.ok(src.includes("const el=offenseActor(root,id,{allowBatter:!excludeBatter})"),'runner movement must not call generic actor lookup');
assert.ok(src.includes("if(fEl&&fielder?.pos&&DEF_POS[fielder.pos])await animateMove(fEl,DEF_POS[fielder.pos],420)"),'home-run fielder must return to defensive position after the play');

const fn=src.match(/async function animateRunnerMoves\([\s\S]*?\nfunction outBaseSequence/ )?.[0]||'';
assert.ok(fn,'animateRunnerMoves block must exist');
assert.ok(!fn.includes('const el=actor(root,m.id)'),'generic actor lookup is forbidden inside base-running animation');
assert.ok(router.includes("./mlb/playstage-v901.js?v=90.42"),'router must cache-bust isolated MLB PlayStage');
assert.ok(index.includes('./sports/router.js?v=90.42'),'index must cache-bust the updated router');

console.log('MLB v916 runner isolation regression: defenders cannot run bases or disappear at home');
