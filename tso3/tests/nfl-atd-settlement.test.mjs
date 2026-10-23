/* Regression checks for NFL ATD: run `node --test tso3/tests/nfl-atd-settlement.test.mjs`
   These are synthetic final-game fixtures, not proof of real-game grading. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const extract=(begin,end)=>{
 const a=source.indexOf(begin),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Expected source region: '+begin);
 return source.slice(a,b);
};
const snippets=extract('function nflTeamKey(','function nflEventMatch(')
 +extract('const archiveName=','function archiveTime(')
 +extract('const SETTLEMENT_SOURCE=','async function runNflSettlement(');
const {nflFinalBoxscore,auditNflSnapshot}=runInNewContext(
 snippets+';({nflFinalBoxscore,auditNflSnapshot})');
const event='401873004',kickoff='2026-10-18T20:00:00.000Z';
const player=(id,displayName,stats)=>({athlete:{id,displayName},stats});
const baseline=()=>({
 header:{id:event,competitions:[{
  date:kickoff,status:{type:{state:'post',completed:true}},
  competitors:[
   {homeAway:'home',score:'17',team:{id:'1',abbreviation:'LA'}},
   {homeAway:'away',score:'10',team:{id:'2',abbreviation:'ARI'}}
  ]
 }]},
 boxscore:{players:[
  {team:{id:'1',abbreviation:'LA'},statistics:[
   {name:'passing',labels:['C/ATT','YDS','TD'],athletes:[player('100','Quarter Back',['24/35','300','1'])]},
   {name:'rushing',labels:['CAR','YDS','TD'],athletes:[player('101','Running Back',['20','85','1'])]},
   {name:'receiving',labels:['REC','YDS','TD'],athletes:[
    player('102','Wide Receiver',['5','91','1']),player('103','Bench Player',['1','11','0'])]}
  ]},
  {team:{id:'2',abbreviation:'ARI'},statistics:[
   {name:'passing',labels:['C/ATT','YDS','TD'],athletes:[player('200','Other QB',['18/30','200','1'])]},
   {name:'rushing',labels:['CAR','YDS','TD'],athletes:[player('201','Other RB',['9','60','0'])]},
   {name:'receiving',labels:['REC','YDS','TD'],athletes:[player('202','Other WR',['2','65','1'])]}
  ]}
 ]},
 scoringPlays:[
  {id:'a',type:{text:'Rushing Touchdown'},team:{id:'1'},text:'Running Back 5 yard rush',homeScore:7,awayScore:0},
  {id:'b',type:{text:'Passing Touchdown'},team:{id:'2'},text:'Other WR 32 Yd pass from Other QB',homeScore:7,awayScore:7},
  {id:'c',type:{text:'Field Goal'},team:{id:'2'},text:'Kicker field goal',homeScore:7,awayScore:10},
  {id:'d',type:{text:'Passing Touchdown'},team:{id:'1'},text:'Wide Receiver 11 Yd pass from Quarter Back',homeScore:14,awayScore:10},
  {id:'e',type:{text:'Field Goal'},team:{id:'1'},text:'Kicker field goal',homeScore:17,awayScore:10}
 ]
});
const inspect=(doc,name='Bench Player',id='103')=>{
 const final=nflFinalBoxscore(doc,event,kickoff);
 assert.ok(final,'Fixture must be a verified final');
 return {evidence:final.atdEvidence,result:auditNflSnapshot({
  player_name:name,player_id:id,team:'LA',market:'atd',line:0.5
 },final)};
};
test('fully matched TD ledger grades an active non-scorer as a loss',()=>{
 const {evidence,result}=inspect(baseline());
 assert.equal(evidence.complete,true);assert.equal(result.grade?.outcome,'loss');
 assert.equal(result.grade?.realizedStat,0);
});
test('verified receiving scorer gets win',()=>{
 const {result}=inspect(baseline(),'Wide Receiver','102');
 assert.equal(result.grade?.outcome,'win');
});
test('passing QB is not credited with a receiving touchdown',()=>{
 assert.equal(inspect(baseline(),'Quarter Back','100').result.grade?.outcome,'loss');
});
test('verified rusher gets win',()=>{
 assert.equal(inspect(baseline(),'Running Back','101').result.grade?.outcome,'win');
});
test('missing scoring play blocks certified loss',()=>{
 const d=baseline();d.scoringPlays.splice(3,1);
 const x=inspect(d);assert.equal(x.evidence.complete,false);assert.equal(x.result.grade,null);
});
test('incorrect final score blocks certified loss',()=>{
 const d=baseline();d.header.competitions[0].competitors[0].score='20';
 const x=inspect(d);assert.equal(x.evidence.complete,false);assert.equal(x.result.grade,null);
});
test('unmatched receiver blocks certified loss',()=>{
 const d=baseline();d.scoringPlays[1].text='Other QB throws touchdown';
 const x=inspect(d);assert.equal(x.evidence.complete,false);assert.equal(x.result.grade,null);
});
test('mismatched player ID never settles',()=>{
 assert.equal(inspect(baseline(),'Bench Player','999').result.grade,null);
});
test('player TD stat contradiction blocks certified loss',()=>{
 const d=baseline();d.boxscore.players[0].statistics[2].athletes[0].stats[2]='2';
 const x=inspect(d);assert.equal(x.evidence.complete,false);assert.equal(x.result.grade,null);
});
test('unrecognized scoring type blocks certified loss',()=>{
 const d=baseline();d.scoringPlays[2].type.text='Touchdown';
 const x=inspect(d);assert.equal(x.evidence.complete,false);assert.equal(x.result.grade,null);
});
test('an archived player absent from the boxscore cannot be called a TD loser',()=>{
 const x=inspect(baseline(),'Missing Player','899');
 assert.equal(x.evidence.complete,true);assert.equal(x.result.grade,null);
});
