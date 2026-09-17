import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const preview=read('sports/nfl-preview.js');
const research=read('sports/nfl-research-ui.js');
const v890=read('sports/nfl-preview-v890.js');
const v893=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const index=read('index.html');
const sim=JSON.parse(read('slates/nfl-sim.json'));
const slate=JSON.parse(read('slates/nfl.json'));

assert.ok(!preview.includes("String(candidate?.engineVersion||'').startsWith('v86')"),'preview must not reject newer compatible simulation engines');
assert.ok(preview.includes("Array.isArray(candidate?.games)&&Number(candidate?.schemaVersion)>=2&&candidate.games.some(g=>Array.isArray(g?.players))"),'preview must validate simulation compatibility by schema/shape');
assert.ok(research.includes("canonicalAtd?.twoPlusTd==null?NaN:Number(canonicalAtd.twoPlusTd)"),'modal must preserve missing 2+ TD as missing instead of Number(null)=0');

assert.ok(Array.isArray(sim.games),'simulation cache must contain games');
assert.ok(Number(sim.schemaVersion)>=2,'simulation cache schema must be compatible');
assert.ok(sim.games.some(g=>Array.isArray(g?.players)),'simulation cache must contain player results');

let slateGibbs=null, slateGame=null;
for(const g of slate.games||[]){
  const p=(g.players||[]).find(x=>x?.name==='Jahmyr Gibbs'&&String(x?.team||'').toUpperCase()==='DET');
  if(p){slateGibbs=p;slateGame=g;break;}
}
assert.ok(slateGibbs&&slateGame,'Jahmyr Gibbs must exist in the current NFL slate');
const simGame=(sim.games||[]).find(g=>String(g?.game?.gameId)===String(slateGame.gameId));
assert.ok(simGame,'Gibbs slate game must exist in the simulation cache');
const simGibbs=(simGame.players||[]).find(p=>p?.name==='Jahmyr Gibbs'&&String(p?.team||'').toUpperCase()==='DET');
assert.ok(simGibbs,'Gibbs must match from slate to simulation by game/team/name');
const simAtd=Number(simGibbs?.probabilities?.atd);
const two=Number(simGibbs?.probabilities?.twoPlusTd);
const modelAtd=Number(slateGibbs?.props?.atd?.probability);
assert.ok(Number.isFinite(simAtd)&&simAtd>0&&simAtd<=1,'Gibbs simulated ATD must be a valid probability');
assert.ok(Number.isFinite(two)&&two>0&&two<=simAtd,'Gibbs 2+ TD must be positive and no greater than ATD');
assert.ok(Number.isFinite(modelAtd)&&modelAtd>0&&modelAtd<=1,'Gibbs model ATD must be valid');
const w=sim?.meta?.probabilityBlend||{};
const sw=Number(w.simulationWeight)||.7, mw=Number(w.existingModelWeight)||.3, total=sw+mw;
const blended=(simAtd*sw+modelAtd*mw)/total;
assert.ok(blended>0&&blended<=1,'Gibbs blended ATD must be valid');

assert.ok(/\.\/nfl-preview\.js\?v=89\.\d+/.test(v890),'base preview cache bust missing');
assert.ok(/\.\/nfl-preview-v890\.js\?v=89\.\d+/.test(v893),'wrapper preview cache bust missing');
assert.ok(/\.\/nfl-preview-v893\.js\?v=89\.\d+/.test(router),'router NFL cache bust missing');
assert.ok(/\.\/nfl-research-ui\.js\?v=86\.\d+/.test(router),'router research UI cache bust missing');
assert.ok(/\.\/sports\/router\.js\?v=\d+\.\d+/.test(index),'outer router cache bust missing');

console.log('NFL v89.20 simulation loader regression passed');
console.log(`Gibbs current cache: model ATD ${(modelAtd*100).toFixed(1)}% | sim ATD ${(simAtd*100).toFixed(1)}% | blended ${(blended*100).toFixed(1)}% | 2+ TD ${(two*100).toFixed(1)}%`);
