#!/usr/bin/env node
import assert from 'node:assert/strict';
import {availabilityFilteredInputs,gameExclusions,verifiedRosterFilteredInputs,verifiedTeamActiveRoster,assertSimulatedRoster} from './availability.js';
import {buildGameProfile} from './profile.js';
import fs from 'node:fs';
const game={gameId:'401873007',away:{abbr:'DAL'},home:{abbr:'GB'},players:[
 {name:'Mitch Van Vooren',team:'DAL',position:'TE'},
 {name:'Jake Ferguson',team:'DAL',position:'TE'},
 {name:'Josh Jacobs',team:'GB',position:'RB'},
 {name:'Jordan Love',team:'GB',position:'QB'}]};
const research={players:[...game.players]};
const override={season:2026,updatedAt:'2026-10-16',games:{
 '401873007':{season:2026,team:'GB',excluded:[
  {team:'DAL',name:'Mitch Van Vooren',status:'WAIVED'},
  {team:'GB',name:'Josh Jacobs',status:'COMMISSIONER_EXEMPT'}]}
}};
const known=gameExclusions(game,override);
assert.deepEqual(known.map(p=>p.team).sort(),['DAL','GB']);
const filtered=availabilityFilteredInputs(game,research,override);
assert.deepEqual(filtered.game.players.map(p=>p.name),['Jake Ferguson','Jordan Love']);
assert.deepEqual(filtered.research.players.map(p=>p.name),['Jake Ferguson','Jordan Love']);
const fetchImpl=async url=>{
 if(String(url).endsWith('/nfl/injuries'))return {ok:true,json:async()=>({
  season:{year:2026},injuries:[
   {team:{abbreviation:'DAL'},injuries:[
    {athlete:{fullName:'CeeDee Lamb',position:{abbreviation:'WR'}},status:'Questionable',date:'2026-10-16'},
    {athlete:{fullName:'Test Defensive Corner',position:{abbreviation:'CB'}},status:'Out',date:'2026-10-16'}
   ]},
   {team:{abbreviation:'GB'},injuries:[
    {athlete:{fullName:'Josh Jacobs',position:{abbreviation:'RB'}},status:'Injured Reserve',date:'2026-08-20'},
    {athlete:{fullName:'Tucker Kraft',position:{abbreviation:'TE'}},status:'Questionable',date:'2026-10-16'}
   ]}
  ]})};
 const isDAL=String(url).includes('/dal/roster');
 const names=isDAL?['Dak Prescott','Jake Ferguson','CeeDee Lamb','George Pickens','Javonte Williams','Sam Howell','Brevyn Spann-Ford','Luke Schoonmaker','Tyler Goodson','Ryan Flournoy']:['Jordan Love','Christian Watson','Tucker Kraft','MarShawn Lloyd','Matthew Golden','Jonnu Smith','Pierre Strong Jr.','Kaleb Johnson','Bo Melton','Chris Brooks'];
 return {ok:true,json:async()=>({season:{year:2026},athletes:[{position:'offense',items:names.map(displayName=>({displayName,status:{type:'active'}}))},{position:'practiceSquad',items:[{displayName:'Mitch Van Vooren',status:{type:'practice-squad'}}]}]})};
};
const observed=await verifiedRosterFilteredInputs(game,research,{fetchImpl,cache:false});
assert.deepEqual(observed.game.players.map(p=>p.name),['Jake Ferguson','Jordan Love']);
assert.ok(observed.exclusions.some(p=>p.name==='Mitch Van Vooren'));
assert.ok(observed.exclusions.some(p=>p.name==='Josh Jacobs'));
assert.equal(observed.rosterAudit.finalInactivesVerified,false);
assert.equal(observed.rosterAudit.injuryReportVerified,true);
assert.ok(observed.rosterAudit.injuryTeams[0].uncertain.some(p=>p.name==='CeeDee Lamb'));
assert.ok(observed.rosterAudit.injuryTeams[1].excluded.some(p=>p.name==='Josh Jacobs'));
assert.ok(observed.rosterAudit.injuryTeams[0].excluded.some(p=>p.name==='Test Defensive Corner'));

assert.ok(observed.game.modelEligibleRosters.DAL.includes('jakeferguson'));
assert.equal(assertSimulatedRoster(observed.game,{players:[{team:'DAL',name:'Jake Ferguson'},{team:'GB',name:'Jordan Love'}]}).eligiblePlayers,2);
assert.throws(()=>assertSimulatedRoster(observed.game,{players:[{team:'DAL',name:'Mitch Van Vooren'}]}),/off-roster players/);
const config=JSON.parse(fs.readFileSync(new URL('./config.json',import.meta.url),'utf8'));
const adversarialResearch={players:[
 {team:'DAL',name:'Dak Prescott',position:'QB',gameId:'401873007'},
 {team:'DAL',name:'Jake Ferguson',position:'TE',gameId:'401873007'},
 {team:'DAL',name:'Mitch Van Vooren',position:'TE',gameId:'401873007'},
 {team:'GB',name:'Jordan Love',position:'QB',gameId:'401873007'},
 {team:'GB',name:'Christian Watson',position:'WR',gameId:'401873007'}
]};
const guardedProfile=buildGameProfile({game:observed.game,research:adversarialResearch,odds:{games:[]},config});
assert.ok(!guardedProfile.players.some(p=>p.name==='Mitch Van Vooren'),'Profile rejects waived player');
assert.ok(guardedProfile.players.some(p=>p.name==='Jake Ferguson'));
assert.ok(guardedProfile.players.some(p=>p.name==='Jordan Love'));
const nextGame={...game,gameId:'week7-other',home:{abbr:'GB'}};
assert.equal(gameExclusions(nextGame,override).length,0,'Week 6 exception must not ban a player forever');
await assert.rejects(()=>verifiedRosterFilteredInputs(game,research,{cache:false,fetchImpl:async()=>({ok:false,status:503})}),/roster source|injury-report source/i);
const activeButIr={...game,players:[...game.players,{team:'GB',name:'Tucker Kraft',position:'TE'},{team:'DAL',name:'CeeDee Lamb',position:'WR'}]};
const inj=await verifiedRosterFilteredInputs(activeButIr,{players:activeButIr.players},{fetchImpl,cache:false});
assert.ok(inj.game.players.some(p=>p.name==='Tucker Kraft'),'Questionable is not automatically OUT');
assert.ok(inj.game.players.some(p=>p.name==='CeeDee Lamb'),'Questionable is not automatically OUT');
const irGame={...activeButIr,players:[...activeButIr.players,{team:'GB',name:'Josh Jacobs',position:'RB'}]};
const irFiltered=await verifiedRosterFilteredInputs(irGame,{players:irGame.players},{fetchImpl,cache:false});
assert.ok(!irFiltered.game.players.some(p=>p.name==='Josh Jacobs'),'IR overrides stale research stats');
assert.throws(()=>assertSimulatedRoster(irFiltered.game,{
 players:[{team:'DAL',name:'Jake Ferguson'}],
 representativeWorld:{players:[{team:'GB',name:'Josh Jacobs'}]}
}),/off-roster players/);
await assert.rejects(()=>verifiedRosterFilteredInputs(game,research,{cache:false,fetchImpl:async url=>{
 if(String(url).endsWith('/nfl/injuries'))return {ok:false,status:503};
 return fetchImpl(url);
}}),/injury-report source HTTP 503/,'Missing injury feed must fail closed');
const washington=await verifiedTeamActiveRoster('WAS',{cache:false,fetchImpl:async url=>{
 assert.ok(String(url).endsWith('/teams/28/roster'),'ESPN Washington must use team ID 28, not WAS');
 return {ok:true,json:async()=>({season:{year:2026},athletes:[{position:'offense',items:Array.from({length:11},(_,i)=>({displayName:'Washington Player '+i,status:{type:'active'}}))}]})};
}});
assert.equal(washington.team,'WAS');
assert.equal(washington.active.size,11);
console.log('Verified 2026 roster eligibility: correct team, practice squad, waived players, WAS ESPN alias, future games and fail-closed behavior PASS');
