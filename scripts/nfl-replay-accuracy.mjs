#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scoreReplayReports } from '../sports/nfl/sim/accuracy.js';
import { option, writeReplayFile } from './lib/nfl-replay-io.mjs';
async function main(){
  const paths=String(option('reports','')).split(',').map(s=>s.trim()).filter(Boolean);
  if(!paths.length)throw new Error('Provide --reports <replay-report.json[,another-report.json]>');
  const files=await Promise.all(paths.map(file=>fs.readFile(file,'utf8')));
  const reports=files.map(text=>JSON.parse(text));
  const result=scoreReplayReports(reports,{allowTest:process.argv.includes('--allow-test')});
  result.sources=paths.map((file,i)=>({file,sha256:createHash('sha256').update(files[i]).digest('hex'),modelCodeSha256:reports[i].modelCodeSha256||null,configSha256:reports[i].configSha256||null}));
  const out=option('out','artifacts/nfl-replay/accuracy.json');
  await writeReplayFile(out,result);
  console.log(`Scored ${result.scoredGames} game(s); ${result.frames.length} historical forecasts. Wrote ${out}`);
  for(const [phase,summary] of Object.entries(result.byPhase)){
    console.log(`${phase}: ${summary.gameCount} game(s), ${summary.forecastCount} selected forecast(s)`);
    for(const metric of ['passYds','rushYds','recYds','receptions']){
      const row=summary.projections[metric];if(row)console.log(`  ${metric}: MAE ${row.mae.toFixed(2)}, bias ${row.bias.toFixed(2)}, n=${row.observations}`);
    }
  }
  if(!result.scoredGames)throw new Error('No evaluable forecasts; see exclusion details');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
