import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildHalftimeBoard } from '../sports/nfl/sim/halftime.js';

// Exercise the actual automatic runner with no live sportsbook props. It must
// publish a 50K halftime result and leave candidate retries available.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tso-halftime-'));
try {
  const game={gameId:'test-half',startTimeUTC:'2026-09-12T00:00:00Z',away:{abbr:'NE'},home:{abbr:'SEA'}};
  const live={status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:7,homeScore:10};
  const inputs={
    'slate.json':{slateId:'test-week',games:[game]},
    'research.json':{players:[{gameId:game.gameId,espnId:'wr',name:'Test Receiver',team:'NE',position:'WR'}]},
    'odds.json':{games:[]},
    'live.json':{games:{[game.gameId]:live}},
    'live-odds.json':{games:[]},
  };
  for(const [name,data] of Object.entries(inputs))fs.writeFileSync(path.join(dir,name),JSON.stringify(data));
  const args=['scripts/nfl-sim-auto.mjs','--now','2026-09-12T01:30:00Z'];
  for(const [flag,name] of Object.entries({slate:'slate',research:'research',odds:'odds','live-file':'live','live-odds':'live-odds',out:'out',state:'state','halftime-out':'halftime','quarter-out':'quarter'}))args.push('--'+flag,path.join(dir,name+'.json'));
  execFileSync(process.execPath,args,{encoding:'utf8'});
  const result=JSON.parse(fs.readFileSync(path.join(dir,'out.json'))).games[0];
  const state=JSON.parse(fs.readFileSync(path.join(dir,'state.json'))).games[game.gameId];
  assert.equal(result.iterations,50000);
  assert.equal(result.automation.phase,'halftime');
  assert.equal(result.automation.halftimeCandidatesReady,false);
  assert.equal(result.automation.halftimeHasLiveOdds,false);
  assert.equal(state.halftimeCandidateAttempts,0);
  assert.equal(state.halftimeFingerprint,undefined);
} finally { fs.rmSync(dir,{recursive:true,force:true}); }

// The profile exposes rushing/receiving TDs separately. Passing TDs do not
// settle ATD; either a rushing or receiving TD does.
const offer={best:{book:'Test',price:150,ageSeconds:0}};
const game={gameId:'td',away:{abbr:'NE'},home:{abbr:'SEA'}};
for(const [current,eligible] of [[{rushTds:1,recTds:0},false],[{rushTds:0,recTds:1},false],[{rushTds:0,recTds:0,passTds:2},true]]){
  const board=buildHalftimeBoard({game,liveGame:{status:'in'},config:{},
    result:{iterations:100,players:[{playerId:'p',name:'Test Player',team:'NE',current}],_samples:{iterations:100,players:new Map([['p',{stats:{tds:new Float32Array(100).fill(1)}}]])}},
    liveOdds:{games:[{gameId:'td',away:'NE',home:'SEA',players:[{name:'Test Player',team:'NE',odds:{atd:offer}}]}]},
  });
  assert.equal(board.candidates.length,eligible?1:0);
}
console.log('v89.19 halftime execution and settled ATD tests passed');

// Cached quotes must age as wall-clock time passes. Nulls are missing data,
// including line=null: they must never silently become a valid zero line.
function quoteBoard(over, {line=50.5, fetchedAt='2026-09-12T01:00:00Z', under=null}={}){
  return buildHalftimeBoard({game,liveGame:{status:'in'},config:{},generatedAt:'2026-09-12T01:20:00Z',
    result:{iterations:100,players:[{playerId:'p',name:'Test Player',team:'NE',current:{recYds:20}}],
      _samples:{iterations:100,players:new Map([['p',{stats:{recYds:Float32Array.from({length:100},(_,i)=>i<75?80:30)}}]])}},
    liveOdds:{meta:{fetchedAt},games:[{gameId:'td',away:'NE',home:'SEA',players:[{name:'Test Player',team:'NE',odds:{recYds:{line,over:{best:over},under:under?{best:under}:null}}}]}]},
  });
}
const fresh={book:'Test',price:150,ts:'2026-09-12T01:19:30Z',ageSeconds:null};
assert.equal(quoteBoard(fresh).candidates[0].oddsAgeSeconds,30);
for(const ts of [1789175970,1789175970000]){
  assert.equal(quoteBoard({...fresh,ts}).candidates[0].oddsAgeSeconds,30,'seconds and milliseconds timestamps agree');
}
assert.equal(quoteBoard({price:150,ageSeconds:30}).candidates.length,0,'cached age includes elapsed fetch time');
assert.equal(quoteBoard({price:150,ageSeconds:0,ts:'2026-09-12T00:00:00Z'}).candidates.length,0,'stored zero age cannot override old timestamp');
assert.equal(quoteBoard({price:150,ageSeconds:null,ts:null}).candidates.length,0,'unknown freshness is not fresh');
assert.equal(quoteBoard(fresh,{line:null}).candidates.length,0,'null line is not zero');
assert.equal(quoteBoard({...fresh,price:null}).candidates.length,0);
assert.equal(quoteBoard(fresh,{line:0}).candidates.length,1,'explicit numeric zero line remains valid');
assert.equal(quoteBoard(fresh,{under:{price:-900,ts:'2026-09-12T00:00:00Z'}}).candidates[0].bookFairProbability,.4,'stale opposite quote must not enter de-vig calculation');
console.log('Halftime quote freshness and missing-field tests passed');
