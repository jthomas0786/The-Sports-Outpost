/* TSO3 full NHL research, independently sourced from game ID + ESPN roster. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../player-dashboard.js',import.meta.url),'utf8');
const sandbox={window:{}};runInNewContext(source,sandbox);
const render=sandbox.window.TSO3PlayerDashboard.render;
const data=()=>({
 sport:'nhl',player:{id:'3895074',name:'Connor McDavid',team:'EDM',position:'C'},
 doc:{available:true,season:2027,athleteName:'Connor McDavid',
  athleteId:'3895074',events:[{eventId:'401994444',date:'2026-10-22T23:00:00Z',
    opponent:'CAR',seasonType:'2026-27 Regular Season',
    stats:[{name:'October:goals',numeric:2,value:'2'}]}]},
 odds:[],game:{id:'401994445',startTime:'2026-10-24T21:00:00Z',state:'pre',
  home:{abbr:'EDM'},away:{abbr:'CAR'}},
 ui:{tab:'matchup',metric:'October:goals',phase:'regular',split:'all',window:'l10',lineKey:''},
 nhlMatchup:{available:true,gameId:'401994445',athleteId:'3895074',
  team:'EDM',opponent:'CAR',position:'C',generatedAt:new Date().toISOString(),
  source:'TSO official NHL v4',defense:{games:10,goalsAllowedPerGame:2.83,
   shotsAllowedPerGame:29.1,recent10GoalsAllowedPerGame:2.35,
   recent10ShotsAllowedPerGame:27.11,position:{games:9,goalsPerGame:1.23,
     shotsPerGame:7.42,goalAllowedRank:10,rankedTeams:32}}}
});
test('official NHL current match renders opponent actual goals/shots per game',()=>{
 const text=render(data());
 assert.match(text,/TSO NHL verified opponent defense vs position/);
 assert.match(text,/CAR defense/);
 assert.match(text,/2\.83/);
 assert.match(text,/29\.10/);
 assert.match(text,/7\.42/);
 assert.match(text,/10 of 32/);
});
test('old-source NHL position matrix is excluded rather than masquerading as live matchup',()=>{
 const d=data();d.nhlMatchup.generatedAt='2025-10-01T12:00:00Z';
 const text=render(d);
 assert.doesNotMatch(text,/TSO NHL verified opponent defense vs position/);
});
test('NBA dashboard never displays unrelated NHL defensive data',()=>{
 const d=data();d.sport='nba';
 const text=render(d);
 assert.doesNotMatch(text,/TSO NHL verified opponent defense vs position/);
});
test('missing opponent sample does not invent ranking or defense allowance',()=>{
 const d=data();d.nhlMatchup.defense={position:null};
 const text=render(d);
 assert.match(text,/TSO NHL verified opponent defense vs position/);
 assert.doesNotMatch(text,/rank: 10 of 32/);
 assert.match(text,/—/);
});
