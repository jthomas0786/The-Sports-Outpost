#!/usr/bin/env node
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { archiveFromGit, discoverReplayGames, option, writeReplayFile } from './lib/nfl-replay-io.mjs';
import { analyzeReplayCoverage } from '../sports/nfl/sim/replay-coverage.js';
import { scoreReplayReports } from '../sports/nfl/sim/accuracy.js';
async function main(){
  const discovery=discoverReplayGames({ref:option('ref','origin/main'),limit:Number(option('limit',100))});
  const inventory={schemaVersion:1,sourceHead:discovery.head,scannedCommits:discovery.scannedCommits,discoveredGames:discovery.games.length,games:[],readyGames:0,scoredGames:0,failures:[]};
  const reports=[],run=process.argv.includes('--run'),iterations=option('iterations');
  for(const game of discovery.games){
    if(!game.states.includes('post')){inventory.games.push({...game,ready:false,reason:'No recorded final'});continue;}
    try{
      // Pin all games to one immutable head, even if a bot pushes during this run.
      const archive=archiveFromGit({gameId:game.gameId,ref:discovery.head,limit:Number(option('limit',100))});
      const coverage=analyzeReplayCoverage(archive);inventory.games.push({...game,...coverage});
      if(!coverage.ready)continue;inventory.readyGames++;
      const archivePath=`artifacts/nfl-replay/corpus/${game.gameId}-archive.json`;
      await writeReplayFile(archivePath,archive);
      console.log(`${coverage.matchup}: ${coverage.selectedBuckets.join(', ')}; missing: ${coverage.missingBuckets.join(', ')}`);
      if(!run)continue;
      const reportPath=`artifacts/nfl-replay/corpus/${game.gameId}-report.json`;
      const args=['scripts/nfl-replay-sim.mjs','--archive',archivePath,'--out',reportPath,'--representative'];
      if(iterations!==null)args.push('--iterations',iterations);
      const child=spawnSync(process.execPath,args,{stdio:'inherit'});
      if(child.error||child.status!==0)throw new Error(child.error?.message||`Replay exited ${child.status}`);
      reports.push(JSON.parse(await fs.readFile(reportPath,'utf8')));
    }catch(error){inventory.failures.push({gameId:game.gameId,reason:error.message});console.error(`${game.gameId}: ${error.message}`);}
  }
  if(reports.length){
    const accuracy=scoreReplayReports(reports,{allowTest:iterations!==null});
    await writeReplayFile('artifacts/nfl-replay/corpus/accuracy.json',accuracy);
    inventory.scoredGames=accuracy.scoredGames;inventory.testIterations=accuracy.testIterations;
    inventory.modelCodeSha256=reports[0].modelCodeSha256;inventory.configSha256=reports[0].configSha256;
  }
  await writeReplayFile('artifacts/nfl-replay/corpus/coverage.json',inventory);
  console.log(`${inventory.discoveredGames} discovered; ${inventory.readyGames} ready; ${inventory.scoredGames} scored; ${inventory.failures.length} failures`);
  if(inventory.failures.length||run&&!inventory.scoredGames)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
