import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const engine=read('sports/nfl/sim/engine.js');
const ui=read('sports/nfl/prop-model-edge-v8918.js');
const preview=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');
const registry=read('sports/registry.js');

assert.ok(engine.includes('probabilities:{atd:round(atdProb,4),twoPlusTd:round(twoTdProb,4)}'),'simulation engine must publish exact 2+ TD probability');
assert.ok(engine.includes("v=>v>=2"),'2+ TD must come from simulated touchdown counts');
assert.ok(ui.includes('playerSim?.probabilities?.twoPlusTd'),'v89.18 simulation enhancer must still consume twoPlusTd');
assert.ok(ui.includes('2+ TD'),'v89.18 enhancer must retain its visible label as a fallback');
assert.ok(ui.includes('data-tso-two-plus-td'),'v89.18 enhancer must expose the rendered value for QA');
assert.ok(preview.includes("prop-model-edge-v8918.js?v=89.18"),'production NFL preview must retain the v89.18 simulation enhancer');
assert.ok(preview.includes('installNflPropModelEdgeV8918'),'production NFL preview must install v89.18');
assert.ok(/\.\/nfl-preview-v893\.js\?v=89\.\d+/.test(router),'shared router must cache-bust the updated NFL preview');
assert.ok(registry.includes("'twoPlusTd'"),'NFL registry must declare twoPlusTd');

const sim=JSON.parse(read('slates/nfl-sim.json'));
let checked=0,positive=0;
const top=[];
for(const game of sim.games||[]){
  for(const p of game.players||[]){
    const atd=Number(p?.probabilities?.atd), two=Number(p?.probabilities?.twoPlusTd);
    if(!Number.isFinite(atd)||!Number.isFinite(two))continue;
    checked++;
    assert.ok(two>=0&&two<=1,`${p.name}: 2+ TD out of range`);
    assert.ok(two<=atd+1e-9,`${p.name}: 2+ TD cannot exceed ATD`);
    if(two>0)positive++;
    top.push({name:p.name,team:p.team,atd,two});
  }
}
assert.ok(checked>20,'expected broad simulation player coverage');
assert.ok(positive>0,'expected at least one positive 2+ TD probability');
top.sort((a,b)=>b.two-a.two);
console.log('NFL v89.18 2+ TD regression passed');
console.log('players checked:',checked,'positive:',positive);
console.log('top 10:',top.slice(0,10).map(x=>`${x.name} ${x.team} ${(x.two*100).toFixed(1)}% (ATD ${(x.atd*100).toFixed(1)}%)`).join(' | '));
