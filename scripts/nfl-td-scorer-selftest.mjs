import assert from 'node:assert/strict';
import fs from 'node:fs';
import { touchdownScorer } from '../sports/nfl/td-scorer.js';
const game={id:'g'},players=[{gameId:'g',name:'Brock Purdy',team:'SF',headshot:'qb.png'},{gameId:'g',name:'Mike Evans',team:'SF',headshot:'evans.png'},{gameId:'g',name:'Deebo Samuel Sr.',team:'SF'},{gameId:'g',name:'Kyren Williams',team:'LA'}];
const td=text=>({text,team:'SF'});
const text='Mike Evans 2 Yd pass from Brock Purdy (Eddy Pineiro Kick)';
assert.equal(touchdownScorer(game,td(text),players),players[1]);
assert.equal(touchdownScorer(game,td(text),[...players].reverse()).headshot,'evans.png');
assert.equal(touchdownScorer(game,td(text),players.filter(p=>p.name!=='Mike Evans')).name,'Mike Evans');
assert.equal(touchdownScorer(game,td('Deebo Samuel Sr. 15 Yd pass from Brock Purdy (Eddy Pineiro Kick)'),players),players[2]);
assert.equal(touchdownScorer(game,{text:'Kyren Williams 5 Yd Rush (Harrison Mevis Kick)',team:'LA'},players),players[3]);
assert.equal(touchdownScorer(game,td('B.Purdy pass short right to M.Evans for 2 yards, TOUCHDOWN.'),players),players[1]);
assert.equal(touchdownScorer(game,td('Brock Purdy pass for a touchdown'),players),null,'never guess the passer for an unidentified receiver');
assert.notEqual(touchdownScorer(game,td(text),[{...players[1],team:'TB'},players[0]]).headshot,'evans.png');
const live=JSON.parse(fs.readFileSync('slates/nfl-live.json'));
const research=JSON.parse(fs.readFileSync('slates/nfl-research.json'));
for(const [id,g] of Object.entries(live.games||{}))for(const p of g.scoringPlays||[]){
 if(!/touchdown/i.test(p.type||''))continue;
 const result=touchdownScorer({id,liveScore:g},p,research.players);
 const expected=p.text.match(/^(.+?)\s+\d+\s+Yd/i)?.[1];
 if(expected)assert.equal(result?.name,expected,`archived touchdown ${p.text}`);
}
console.log('TD scorer: receiver/runner attribution and archived scoring plays passed');
