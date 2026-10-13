import assert from 'node:assert/strict';
import {normalizeOdds} from '../sports/nhl/odds.js';

// Observed 2026-10-13 ParlayAPI rows use zero for binary scorer YES markets.
// Verify exact odds survive without inventing prices, dates, players, or games.
const now=Date.parse('2026-10-13T13:30:00Z');
const start='2026-10-13T22:00:00Z';
const slate={games:[{
 id:'401892488',startTime:start,home:{name:'Detroit Red Wings'},
 away:{name:'New Jersey Devils'},players:[
  {id:'1',name:'Albert Johansson'},
  {id:'2',name:'Alex DeBrincat'}
 ]
}]};
const base={
 market_key:'player_anytime_goal',bookmaker:'fanduel',
 home_team:'Detroit Red Wings',away_team:'New Jersey Devils',
 commence_time:start,player:'Albert Johansson',line:0,over_price:2000,
 under_price:null,last_update:'2026-10-13T13:26:21Z',age_seconds:219
};
const input=[
 base,
 {...base,market_key:'player_first_goal_scorer',over_price:10000},
 {...base,market_key:'player_anytime_goalscorer',bookmaker:'draftkings',player:'Alex DeBrincat',line:null,over_price:145},
 {...base,market_key:'player_first_goalscorer___in_house',bookmaker:'draftkings',player:'Alex DeBrincat',line:null,over_price:2500},
 {...base,market_key:'player_shots_on_goal',line:2.5,over_price:-120},
 {...base,market_key:'player_anytime_goal',player:'Someone Not Rostered'},
 {...base,market_key:'player_anytime_goal',home_team:'Other Team'},
 {...base,market_key:'player_anytime_goal',age_seconds:4000},
 {...base,market_key:'player_anytime_goal',bookmaker:'unverified-sportsbook'}
];
const audit={};
const data=normalizeOdds(input,slate,now,audit);
const goal=data.quotes.filter(q=>['atg','fgs'].includes(q.market));
assert.equal(goal.length,4,'Real binary scorer prices from supported books must survive');
assert.ok(goal.every(q=>q.line===.5));
assert.ok(goal.some(q=>q.market==='atg'&&q.over===2000));
assert.ok(goal.some(q=>q.market==='fgs'&&q.over===10000));
assert.ok(goal.every(q=>q.gameId==='401892488'));
assert.equal(data.quotes.filter(q=>q.market==='sog').length,1,'Non-scorer markets retain their own lines');
assert.equal(data.quotes.find(q=>q.market==='sog').line,2.5);
assert.equal(audit.counts.player_match_failed,1);
assert.equal(audit.counts.game_match_failed,1);
assert.equal(audit.counts.quote_timestamp_invalid_or_stale,1);
assert.equal(audit.counts.book_not_allowed,1);
assert.ok(!data.rows.some(r=>r.overPrice===0||r.underPrice===0),'Never fabricate zero prices');
console.log('NHL zero-line scorer normalization, verified market aliases and strict identity/freshness: PASS');
