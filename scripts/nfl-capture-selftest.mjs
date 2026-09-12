import assert from 'node:assert/strict';
import { captureInputs } from './lib/nfl-capture.mjs';
const now=Date.parse('2026-09-13T18:00:00Z');
const game={gameId:'g',startTimeUTC:new Date(now-3600000).toISOString(),away:{abbr:'NE'},home:{abbr:'SEA'}};
const live={status:'in',statusDetail:'Halftime',period:2,clockMin:0,awayScore:7,homeScore:10,playerStats:{byId:{p:{team:'NE',name:'Receiver',flat:{recYds:40}}}},lastFetchedAt:now};
const args={now,slate:{games:[game]},liveDoc:{games:{g:live}},research:{generatedAt:new Date(now-60000).toISOString(),players:[{gameId:'g',team:'NE',name:'Receiver'},{gameId:'other',name:'Other'}]},odds:{games:[]}};
const original=JSON.stringify(args),a=captureInputs(args).captures[0];
assert.equal(a.frame.liveGame.clockMin,0);assert.equal(a.inputs.research.players.length,1);
assert.equal(a.frame.liveGame.playerStats.byId.p.flat.recYds,40);
assert.equal(JSON.stringify(args),original);
assert.equal(captureInputs({...args,now:now+60000,liveDoc:{games:{g:{...live,lastFetchedAt:now+60000}}}}).captures[0].key,a.key,'unchanged halftime deduplicates across refreshes');
assert.notEqual(captureInputs({...args,liveDoc:{games:{g:{...live,period:3,clockMin:15}}}}).captures[0].key,a.key,'Q3 becomes a new capture');
assert.equal(captureInputs({...args,liveDoc:{games:{g:{...live,lastFetchedAt:now-121000}}}}).captures.length,0);
assert.equal(captureInputs({...args,liveDoc:{games:{g:{...live,summaryError:'failed'}}}}).captures.length,0);
assert.equal(captureInputs({...args,liveDoc:{games:{g:{...live,playerStats:null}}}}).captures.length,0);
const final={...args,liveDoc:{games:{g:{...live,status:'post'}}}};
assert.equal(captureInputs(final).captures[0].key,captureInputs({...final,research:{players:[]}}).captures[0].key,'unchanged final is not copied whenever research refreshes');
assert.notEqual(captureInputs(final).captures[0].key,captureInputs({...final,liveDoc:{games:{g:{...live,status:'post',awayScore:14}}}}).captures[0].key,'final score correction is retained');
const pre={...args,slate:{games:[{...game,startTimeUTC:new Date(now+1800000).toISOString()}]},liveDoc:{games:{g:{status:'pre',lastFetchedAt:now}}}};
assert.equal(captureInputs(pre).captures.length,1);
assert.equal(captureInputs({...pre,slate:{games:[{...game,startTimeUTC:new Date(now+4*3600000).toISOString()}]}}).captures.length,0);
console.log('NFL capture: halftime snapshots, freshness, input isolation and correction deduplication passed');
// Verify committed capture references can be discovered and replayed without a
// legacy slates/nfl-live.json history at all.
const fs=await import('node:fs/promises');
const os=await import('node:os');
const path=await import('node:path');
const {execFileSync}=await import('node:child_process');
const {archiveFromGit,discoverReplayGames}=await import('./lib/nfl-replay-io.mjs');
const {prepareReplayFrame}=await import('../sports/nfl/sim/replay.js');
const cwd=process.cwd(),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'nfl-capture-test-'));
try{
 process.chdir(tmp);
 for(const [kind,ref] of Object.entries(a.frame.refs)){
  await fs.mkdir('history/nfl/inputs',{recursive:true});
  await fs.writeFile(`history/nfl/inputs/${ref}.json`,JSON.stringify(a.inputs[kind]));
 }
 await fs.mkdir('history/nfl/frames/g',{recursive:true});
 await fs.writeFile(`history/nfl/frames/g/${a.key}.json`,JSON.stringify(a.frame));
 const git=(...args)=>execFileSync('git',args,{stdio:'pipe'});
 git('init');git('add','history');git('-c','user.name=Test','-c','user.email=test@example.com','commit','-m','Capture fixture');
 assert.equal(discoverReplayGames({ref:'HEAD'}).games[0].gameId,'g');
 const archive=archiveFromGit({ref:'HEAD',gameId:'g'}),prepared=prepareReplayFrame(archive,0);
 assert.equal(prepared.liveGame.statusDetail,'Halftime');
 assert.equal(prepared.liveGame.playerStats.byId.p.flat.recYds,40);
 assert.equal(prepared.research.players[0].name,'Receiver');
 assert.equal(archive.frames.length,1);
 await fs.writeFile(`history/nfl/inputs/${a.frame.refs.research}.json`,JSON.stringify({players:[]}));
 git('add','history');git('-c','user.name=Test','-c','user.email=test@example.com','commit','-m','Corrupt fixture');
 assert.throws(()=>archiveFromGit({ref:'HEAD',gameId:'g'}),/No archived frames/,'modified input content cannot impersonate a capture hash');
}finally{process.chdir(cwd);await fs.rm(tmp,{recursive:true,force:true});}
console.log('Immutable capture -> Git discovery -> replay input round trip passed');
