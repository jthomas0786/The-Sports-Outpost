#!/usr/bin/env node
import assert from 'node:assert/strict';
import {availabilityFilteredInputs,gameExclusions,verifiedRosterFilteredInputs} from './availability.js';
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
 const isDAL=String(url).includes('/dal/roster');
 const names=isDAL?['Dak Prescott','Jake Ferguson','CeeDee Lamb','George Pickens','Javonte Williams','Sam Howell','Brevyn Spann-Ford','Luke Schoonmaker','Tyler Goodson','Ryan Flournoy']:['Jordan Love','Christian Watson','Tucker Kraft','MarShawn Lloyd','Matthew Golden','Jonnu Smith','Pierre Strong Jr.','Kaleb Johnson','Bo Melton','Chris Brooks'];
 return {ok:true,json:async()=>({season:{year:2026},athletes:[{position:'offense',items:names.map(displayName=>({displayName,status:{type:'active'}}))},{position:'practiceSquad',items:[{displayName:'Mitch Van Vooren',status:{type:'practice-squad'}}]}]})};
};
const observed=await verifiedRosterFilteredInputs(game,research,{fetchImpl,cache:false});
assert.deepEqual(observed.game.players.map(p=>p.name),['Jake Ferguson','Jordan Love']);
assert.ok(observed.exclusions.some(p=>p.name==='Mitch Van Vooren'));
assert.ok(observed.exclusions.some(p=>p.name==='Josh Jacobs'));
assert.equal(observed.rosterAudit.finalInactivesVerified,false);
const nextGame={...game,gameId:'week7-other',home:{abbr:'GB'}};
assert.equal(gameExclusions(nextGame,override).length,0,'Week 6 exception must not ban a player forever');
await assert.rejects(()=>verifiedRosterFilteredInputs(game,research,{cache:false,fetchImpl:async()=>({ok:false,status:503})}),/roster source/i);
console.log('Verified 2026 roster eligibility: correct team, practice squad, waived players, future games and fail-closed behavior PASS');
