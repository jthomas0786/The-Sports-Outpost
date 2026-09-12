import assert from 'node:assert/strict';
import { analyzeReplayCoverage } from '../sports/nfl/sim/replay-coverage.js';
const game={gameId:'g',away:{abbr:'NE'},home:{abbr:'SEA'}};
const at=m=>new Date(Date.UTC(2026,8,10,0,m)).toISOString();
const live={status:'in',period:3,clockMin:10,homeScore:3,awayScore:7,playerStats:{byId:{},byName:{}}};
const archive={schemaVersion:1,game,research:[{availableAt:at(1),data:{players:[{gameId:'g',name:'QB',team:'NE',position:'QB'}]}}],odds:[],frames:[
 {at:at(0),liveGame:{status:'pre'}},
 {at:at(2),liveGame:{status:'pre'}},
 {at:at(3),liveGame:{...live,period:2,clockMin:0,statusDetail:'Halftime'}},
 {at:at(4),liveGame:live},
 {at:at(5),liveGame:{...live,clockMin:5}},
 {at:at(6),liveGame:{...live,status:'post'}},
 {at:at(7),liveGame:{...live,status:'post',homeScore:10}},
]};
const before=JSON.stringify(archive),coverage=analyzeReplayCoverage(archive);
assert.equal(coverage.ready,true);
assert.deepEqual(coverage.selectedIndices,[1,2,3,6],'choose earliest valid forecast per bucket and latest final correction');
assert.deepEqual(coverage.selectedBuckets,['pregame','halftime','live:Q3']);
assert.equal(coverage.hasHalftime,true);assert.equal(coverage.rejectedFrames.length,1);
assert.ok(coverage.missingBuckets.includes('live:Q1'));
assert.equal(JSON.stringify(archive),before);
const noFinal={...archive,frames:archive.frames.slice(0,5)};
assert.equal(analyzeReplayCoverage(noFinal).reason,'No recorded final');
assert.equal(analyzeReplayCoverage({...archive,frames:[archive.frames[6]]}).reason,'No eligible forecast before final');
const after={...archive,frames:[...archive.frames,{at:at(8),liveGame:{...live,period:4}}]};
assert.ok(!analyzeReplayCoverage(after).selectedBuckets.includes('live:Q4'),'late forecast after final is not eligible');
console.log('NFL historical coverage: valid selection, missing phases, correction and cutoff tests passed');
