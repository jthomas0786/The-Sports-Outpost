/* TSO3 multi-season player dashboard — offline deterministic quality gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const moduleCode=readFileSync(new URL('../player-dashboard.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sandbox={window:{}};
runInNewContext(moduleCode,sandbox);
const dashboard=sandbox.window.TSO3PlayerDashboard;
const base={player:{name:'Source Verified Player',team:'BOS',playerId:'123456'},
 odds:[],game:null,ui:{season:2026,tab:'overview',metric:'October:points',window:'l10',split:'all',opponent:'',phase:'all',lineKey:''}};
const sample=(year,value)=>({available:true,season:year,athleteId:'123456',athleteName:'Source Verified Player',
 sourceIdentification:'ESPN numeric ID confirmed',events:[{
 eventId:String(400000000+year),date:new Date(Date.UTC(year,9,15)).toISOString(),
 seasonType:'Regular Season',opponent:'CHI',homeAway:'home',
 stats:[{name:'October:points',label:'PTS',value:String(value),numeric:value}]
 }],seasonStats:[],officialSplits:[]});
test('NBA/NHL show the correct multi-year winter-season labels',()=>{
 const h=dashboard.render({...base,sport:'nba',doc:sample(2027,26),ui:{...base.ui,season:2027}});
 for(const label of ['2026–27','2025–26','2024–25'])assert.ok(h.includes(label),label);
});
test('MLB/WNBA/NFL/CFB show three calendar season options',()=>{
 for(const sport of ['mlb','wnba','nfl','cfb']){
  const h=dashboard.render({...base,sport,doc:sample(2026,12)});
  for(const year of ['2026','2025','2024'])assert.match(h,new RegExp('value="'+year+'"'));
 }
});
test('two ESPN seasons remain separate data, not merged results',()=>{
 const recent=dashboard.render({...base,sport:'mlb',doc:sample(2026,25)});
 const older=dashboard.render({...base,sport:'mlb',doc:sample(2025,12),ui:{...base.ui,season:2025}});
 assert.match(recent,/Official season 2026/);
 assert.match(older,/Official season 2025/);
 assert.match(recent,/25\.0/);
 assert.match(older,/12\.0/);
 assert.doesNotMatch(older,/25\.0/);
});
test('client fetch changes the season key and resets incompatible metric and line',()=>{
 assert.match(app,/const requested=Number\(state\.playerUI\.season\|\|current\)/);
 assert.match(app,/const key=sport\+':'\+id\+':'\+season/);
 assert.match(app,/if\(kind==='season'\)/);
 assert.match(app,/state\.playerUI\.metric=null;state\.playerUI\.lineKey=''/);
});
test('old-season evidence is expressly distinguished from live sportsbook offers',()=>{
 const h=dashboard.render({...base,sport:'nfl',doc:sample(2025,15),ui:{...base.ui,season:2025}});
 assert.match(h,/historical context, NOT evidence that those odds existed then/);
});
