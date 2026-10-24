/* TSO3 pregame source readiness regression. No provider calls or forecast writes.
   Run: node --test tso3/tests/nfl-slate-readiness.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const from=code.indexOf('function nflOddsAgeLimitMinutes(');
const to=code.indexOf('async function nflArchiveStatus(',from);
assert.ok(from>=0&&to>from,'readiness helper must exist');
const check=runInNewContext(code.slice(from,to)+';nflCaptureReadiness');
const NOW=Date.parse('2026-10-24T01:47:00.000Z');
const iso=minutes=>new Date(NOW+minutes*60000).toISOString();
const source={checked_at:iso(-17),source_snapshot_at:iso(-38),status:'fresh'};
const game=(n)=>({game_id:String(n),kickoff:iso(1800+n*15),
 quote_at:iso(-38),atd_quote_at:iso(-38),exact_quote_at:iso(-38),
 model_at:iso(-50),atd_model_at:iso(-50),exact_model_at:iso(-50),
 markets:7,books:8,atd:6,exact:9});
const all=()=>Array.from({length:13},(_,i)=>game(i+1));
test('all 13 archived upcoming games require current odds and both model families',()=>{
 const r=check(source,all(),NOW);
 assert.equal(r.status,'READY_FOR_CAPTURE');
 assert.equal(r.readyGames,13);assert.equal(r.expectedGames,13);
});
test('one current game is partial coverage, not slate-wide freshness',()=>{
 const rows=all().map((g,i)=>i===0?g:{...g,quote_at:iso(-135),
  atd_quote_at:iso(-135),exact_quote_at:iso(-135)});
 const r=check(source,rows,NOW);
 assert.equal(r.status,'PARTIAL_COVERAGE');assert.equal(r.readyGames,1);
});
test('current ATD but stale exact-line source remains partial',()=>{
 const rows=all();rows[0].exact_quote_at=iso(-135);
 const r=check(source,rows,NOW);
 assert.equal(r.status,'PARTIAL_COVERAGE');assert.equal(r.readyGames,12);
});
test('stale ATD model prevents game readiness',()=>{
 const rows=all();rows[0].atd_model_at=iso(-49*60);
 const r=check(source,rows,NOW);
 assert.equal(r.status,'PARTIAL_COVERAGE');assert.equal(r.readyGames,12);
});
test('missed scheduled checks override otherwise full source coverage',()=>{
 const r=check({...source,checked_at:iso(-90)},all(),NOW);
 assert.equal(r.status,'CHECK_DELAYED');
});
test('upstream failed source cannot show ready',()=>{
 assert.equal(check({...source,status:'unavailable'},all(),NOW).status,'SOURCE_UNAVAILABLE');
});
test('no upcoming archived games produces no made-up coverage',()=>{
 const r=check(source,[],NOW);
 assert.equal(r.expectedGames,0);assert.equal(r.status,'NO_UPCOMING_ARCHIVED_GAMES');
});
test('kickoff-sensitive limits cannot be widened',()=>{
 const rows=all().map(g=>({...g,kickoff:iso(60)}));
 const r=check(source,rows,NOW);
 assert.equal(r.readyGames,0);assert.equal(r.status,'PARTIAL_COVERAGE');
});
