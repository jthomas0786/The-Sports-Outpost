#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { simulateReplayFrame } from '../sports/nfl/sim/replay.js';
import { archiveFromGit, option, writeReplayFile } from './lib/nfl-replay-io.mjs';

async function main(){
  const file=option('archive'),gameId=option('game');
  if(!file&&!gameId)throw new Error('Provide --archive <archive.json> or --game <id> to read historical Git snapshots');
  const archive=file?JSON.parse(await fs.readFile(file,'utf8')):archiveFromGit({gameId,ref:option('ref','origin/main'),limit:Number(option('limit',100))});
  const configText=await fs.readFile(option('config','sports/nfl/sim/config.json'),'utf8');
  const config=JSON.parse(configText),override=option('iterations');
  const modelHash=createHash('sha256');
  for(const file of (await fs.readdir('sports/nfl/sim')).filter(f=>f.endsWith('.js')).sort()){modelHash.update(file);modelHash.update(await fs.readFile(path.join('sports/nfl/sim',file)));}
  const report={schemaVersion:1,gameId:archive.game.gameId,model:'Retrospective evaluation of the current engine using archived inputs',modelCodeSha256:modelHash.digest('hex'),seed:Number(option('seed',8922)),configSha256:createHash('sha256').update(configText).digest('hex'),archiveSha256:createHash('sha256').update(JSON.stringify(archive)).digest('hex'),testIterations:override!==null,frames:[],rejected:[],coverage:{}};
  for(let index=0;index<archive.frames.length;index++){
    try{
      const frame=simulateReplayFrame(archive,index,{config,seed:Number(option('seed',8922)),iterations:override===null?null:Number(override)});
      report.frames.push(frame);report.coverage[frame.phase]=(report.coverage[frame.phase]||0)+1;
      console.log(`${frame.at}: ${frame.phase} · ${frame.iterations.toLocaleString()} simulations`);
    }catch(error){report.rejected.push({index,at:archive.frames[index].at,reason:error.message});console.warn(`Frame ${index} excluded: ${error.message}`);}
  }
  const out=option('out',`artifacts/nfl-replay/${archive.game.gameId}-report.json`);
  await writeReplayFile(out,report);
  if(!file)await writeReplayFile(`artifacts/nfl-replay/${archive.game.gameId}-archive.json`,archive);
  console.log(`Wrote ${out}; coverage: ${JSON.stringify(report.coverage)}; rejected: ${report.rejected.length}`);
  if(!report.frames.some(f=>f.result))throw new Error('No usable predictive frames; report contains coverage/rejection details');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
