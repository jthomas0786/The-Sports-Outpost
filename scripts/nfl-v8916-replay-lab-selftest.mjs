import fs from 'node:fs';

const lab=fs.readFileSync(new URL('../sports/nfl/gamecast-replay-lab-v8916.js',import.meta.url),'utf8');
for(const token of ['nflReplayLab','site.api.espn.com','startYardsToEndzone','endYardsToEndzone','participants','stopLivePolling','tso:nfl-live-snapshot','data-replay-stage-host']){
  if(!lab.includes(token))throw new Error(`missing replay lab token: ${token}`);
}
const preview=fs.readFileSync(new URL('../sports/nfl-preview-v893.js',import.meta.url),'utf8');
for(const token of ['installReplayLabIfRequested','gamecast-replay-lab-v8916.js?v=89.16']){
  if(!preview.includes(token))throw new Error(`Replay Lab not wired: ${token}`);
}
console.log('v89.16 Replay Lab static contract PASS');
