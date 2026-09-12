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
