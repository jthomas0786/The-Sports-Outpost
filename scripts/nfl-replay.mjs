#!/usr/bin/env node
// Visual play-by-play QA only. For historical simulation use nfl-replay-sim.mjs.
import fs from 'node:fs/promises';
import { option, writeReplayFile } from './lib/nfl-replay-io.mjs';
import { summaryPlays, summaryReplayFrame } from './lib/nfl-summary-replay.mjs';
async function main(){
  const file=option('file'),event=option('event');
  let summary;
  if(file)summary=JSON.parse(await fs.readFile(file,'utf8'));
  else{
    if(!event)throw new Error('Provide --file <summary.json> or --event <ESPN event id>');
    const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(event)}`,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`ESPN: ${response.status}`);summary=await response.json();
  }
  const plays=summaryPlays(summary);if(!plays.length)throw new Error('No plays found');
  const delay=Math.max(0,Number(option('delay',2500))),out=option('out','artifacts/nfl-replay/nfl-live.json');
  console.log('Visual replay only: final box-score stats are intentionally unavailable.');
  for(let i=0;i<plays.length;i++){
    await writeReplayFile(out,summaryReplayFrame(summary,i));
    console.log(`${i+1}/${plays.length}: ${plays[i].text}`);
    if(i<plays.length-1&&delay)await new Promise(r=>setTimeout(r,delay));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
