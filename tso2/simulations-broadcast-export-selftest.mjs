#!/usr/bin/env node
// Staging regression: one final screen, away left/home right, with embedded music.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('./',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const win={},context={window:win};
for(const name of ['simulations-soundtrack.js','simulations-stats-ui.js'])
 vm.runInNewContext(read(name),context,{filename:name});
const video=read('simulations-video-export.js').replace(
 'global.TSO2SimulationVideo={export:exportVideo,boxPages};',
 'global.TSO2SimulationVideo={export:exportVideo,boxPages,finalSlide,encodeSoundtrack};');
vm.runInNewContext(video,context,{filename:'simulations-video-export.js'});

const mk=(name,x={})=>({name,passAtt:0,passComp:0,passYds:0,passTd:0,int:0,sacks:0,
 carries:0,rushYds:0,rushTd:0,targets:0,receptions:0,recYds:0,recTd:0,...x});
const teamPlayers=(team,n)=>Object.fromEntries([
 [team+'QB',mk(team+' QB',{passAtt:35,passComp:27,passYds:281,passTd:2})],
 [team+'RB',mk(team+' RB',{carries:22,rushYds:119,rushTd:1})],
 ...Array.from({length:n},(_,i)=>[team+'WR'+i,mk(team+' WR'+i,{
  targets:i+1,receptions:i,recYds:i*8,recTd:i%3===0?1:0})])
]);
const teams=Object.fromEntries(['DAL','GB'].map(team=>[team,{team,points:24,
 quarter:[7,7,3,7],totalYds:350,passing:281,rushing:69,firstDowns:18,
 passComp:27,passAtt:35,rushAtt:23,interceptions:0,sacksAllowed:2,punts:3,fieldGoals:1}]));
const game={away:{abbr:'DAL'},home:{abbr:'GB'}};
const snap={teams,players:{DAL:teamPlayers('DAL',9),GB:teamPlayers('GB',12)}};
const pages=win.TSO2SimulationVideo.boxPages(game,snap);
assert.equal(pages.length,2);
assert.deepEqual(Object.keys(pages[1].teams),['DAL','GB']);
const html=win.TSO2StatsUI.full(game,snap,[]);
assert.ok(html.indexOf('DAL · AWAY')<html.indexOf('GB · HOME'));
assert.equal((html.match(/<h5>PASSING<\/h5>/g)||[]).length,2);
assert.equal((html.match(/<h5>RUSHING<\/h5>/g)||[]).length,2);
assert.equal((html.match(/<h5>RECEIVING<\/h5>/g)||[]).length,2);
const calls=[];
const c={beginPath(){},roundRect(){},fill(){},stroke(){},fillRect(){},drawImage(){},
 createLinearGradient(){return {addColorStop(){}}},fillText(value,x,y){calls.push({value:String(value),x,y})},
 measureText(v){return {width:String(v).length*8}},save(){},restore(){}};
win.TSO2SimulationVideo.finalSlide(c,game,[null,null],snap,pages[1],1,2);
const actors=calls.filter(x=>/^(DAL|GB) WR/.test(x.value));
assert.equal(actors.length,21);
assert.ok(actors.filter(x=>x.value.startsWith('DAL')).every(x=>x.x<640));
assert.ok(actors.filter(x=>x.value.startsWith('GB')).every(x=>x.x>640));
assert.ok(actors.every(x=>x.y>300&&x.y<657),'all active rows must fit the 720p player slide');
const music=win.TSO2SimSoundtrack;
assert.equal(music.sampleRate,48000);
assert.equal(music.numberOfChannels,2);
const samples=music.render(96000,4096,480000);
assert.equal(samples.length,8192);
assert.ok(samples.some(x=>Math.abs(x)>.005),'exported music should not be silent');
assert.ok(Math.abs(music.render(479999,1,480000)[0])<.0001,'music fades out');
const htmlSource=read('index.html');
assert.ok(htmlSource.indexOf('simulations-soundtrack.js')<htmlSource.indexOf('simulations-video-export.js'));
assert.ok(read('theme-system.css').includes('.tso-sim-final-team-grid'));
console.log('PASS: away-left/home-right, all three categories for each team on one 720p slide, and original stereo music.');
