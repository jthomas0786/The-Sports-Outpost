import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dedupeSlatePlayers,markSplitSquadSlate} from '../sports/nhl/data.js';

const read=p=>fs.readFileSync(p,'utf8');
const slate=JSON.parse(read('slates/nhl.json'));
const launch=read('sports/nhl/launch-v922.js');
const launchCss=read('sports/nhl/launch-v922.css');
const view=read('sports/nhl/view.js');
const wrapper=read('sports/nhl/view-v906.js');
const modal=read('sports/nhl/player-modal-v911.js');
const slateUi=read('sports/nhl/slate-v906.js');
const propsGuard=read('sports/nhl/props-daily-guard-v920.js');
const router=read('sports/router.js');
const index=read('index.html');

assert.match(String(slate.date||''),/^\d{4}-\d{2}-\d{2}$/,'launch slate must expose one valid daily slate date');
assert(Array.isArray(slate.games),'launch slate must expose a games array');
assert.equal(new Set(slate.games.map(g=>g.slateDate)).size,slate.games.length?1:0,'slate must contain one calendar date only');
assert.equal(slate.games.every(g=>g.slateDate===slate.date),true,'every game must match the daily slate date');
assert.equal(new Set(slate.games.map(g=>String(g.id))).size,slate.games.length,'daily slate must not duplicate game IDs');
assert(slate.games.every(g=>g.away?.abbr&&g.home?.abbr&&g.startTime),'every daily slate game must retain matchup and start-time identity');

const eligibleKeys=new Map();
for(const g of slate.games)for(const p of g.players||[]){
 if(p.propsEligible===false)continue;
 const key=String(p.id||p.name||'').toLowerCase();
 if(!key)continue;
 assert(!eligibleKeys.has(key),`eligible player duplicated across daily slate: ${p.name}`);
 eligibleKeys.set(key,g.id);
}
assert(slate.games.filter(g=>!g.splitSquad).every(g=>(g.players||[]).some(p=>p.propsEligible!==false)),'non-split games should retain an eligible player pool');

const fake=[
 {id:'a',seasonType:1,status:'pre',away:{abbr:'MTL'},home:{abbr:'TOR'},players:[{id:'1',team:'MTL',name:'Split Player',active:true}]},
 {id:'b',seasonType:1,status:'pre',away:{abbr:'TOR'},home:{abbr:'MTL'},players:[{id:'1',team:'MTL',name:'Split Player',active:true}]}
];
markSplitSquadSlate(fake);dedupeSlatePlayers(fake);
assert(fake.every(g=>g.splitSquad),'duplicate-team preseason games must be recognized as split squad');
assert(fake.every(g=>g.players[0].propsEligible===false&&g.players[0].splitSquadAssignmentPending===true),'ambiguous split-squad player must be withheld rather than guessed');
fake[0].players[0].lineupConfirmed=true;dedupeSlatePlayers(fake);
assert.equal(fake[0].players[0].propsEligible,true,'confirmed event assignment must make the correct split-squad occurrence eligible');
assert.equal(fake[1].players[0].propsEligible,false,'other split-squad occurrence must remain ineligible');

for(const marker of [
 "atg:'Anytime Goal'","sog:'Shots on Goal'","points:'Points'","assists:'Assists'","blocks:'Blocked Shots'","saves:'Goalie Saves'",
 'hkLaunchSearch','hkLaunchTeam','hkLaunchPos','hkLaunchGame','hkLaunchSort','hkLaunchClear','openGameModal','openPlayer','openLive',
 'decorateFeed','notifyGoal','ccExtraHTML','Top Goal Threats','Launch Slate','installNhlLaunchV922','setPropsMarketState','resetPropsControls'
])assert(launch.includes(marker),`launch controller missing ${marker}`);
for(const marker of ['hk-launch-props-controls','hk-launch-market-tabs','hk-launch-modal-backdrop','hk-launch-goal-toast','@media(max-width:900px)','@media(max-width:620px)'])assert(launchCss.includes(marker),`launch CSS missing ${marker}`);
assert(view.includes("dedupeSlatePlayers(next.games);doc=next"),'browser refresh must re-apply the same daily/split-squad eligibility gate');
assert(view.includes('},10000);'),'live NHL refresh cadence must be 10 seconds');
assert(modal.includes('export function openNhlPlayerModal'),'canonical NHL player modal opener must be exported');
assert(modal.includes("window.DW_openNhlPlayerModal=openNhlPlayerModal"),'canonical player modal opener must be globally available to launch surfaces');
assert(modal.includes("[data-hk-player-open]"),'player modal must accept direct player/game references');
assert(slateUi.includes('data-hk-player='),'Slate player rows must carry exact player IDs');
assert(slateUi.includes('data-hk-game='),'Slate player rows must carry exact game IDs');
assert.equal(Number((propsGuard.match(/const PAGE_SIZE=(\d+);/)||[])[1])>=1000,true,'Props guard must expose the complete daily pool rather than cap it at 60');
assert(wrapper.includes("import {installNhlLaunchV922} from './launch-v922.js?v=90.22'"),'production NHL wrapper must import launch controller');
assert(wrapper.includes('await installNhlLaunchV922(host);'),'production NHL wrapper must install launch controller');
assert(launch.includes('if(host){setPropsMarketState'),'launch Props controls must stay mounted across observer scans so typing cannot detach the input');
assert(launch.includes("Object.assign(filters,{q:'',team:'ALL',pos:'ALL',game:'ALL',sort:'model'});resetPropsControls()"),'Clear must reset both filter state and the stable control surface');
assert(/\.\/nhl\/view-v906\.js\?[^'\"]*props=2[^'\"]*slate=3[^'\"]*launch=1/.test(router),'router must point at launch-ready NHL wrapper with required flags');
assert(/\.\/sports\/nhl\/view-v906\.js\?[^'\"]*props=2[^'\"]*slate=3[^'\"]*launch=1/.test(index),'Command Center lazy-load must use the full launch-ready NHL build');
assert(/sports\/router\.js\?v=[A-Za-z0-9._-]+/.test(index),'index must cache-bust the sports router');

console.log(`NHL launch v90.22: ${slate.date} daily slate, split-squad safety, complete Props controls, stable filters, modal wiring, 10s Live, Goal Feed alerts, Command Center and responsive launch CSS passed`);
