#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalWnbaTeam, normalizeBasketballPlayerIdentity, resolveWnbaQuoteEvent } from './lib/basketball-odds-quality.mjs';

const events=[
  {canonical_event_id:'min-nyl',commence_time:'2026-09-30T00:00:00Z',away_team:'Minnesota Lynx',home_team:'New York Liberty'},
  {canonical_event_id:'lva-phx',commence_time:'2026-09-30T02:00:00Z',away_team:'Las Vegas Aces',home_team:'Phoenix Mercury'}
];

assert.equal(canonicalWnbaTeam('Atlanta Dream'),'ATL');
assert.equal(canonicalWnbaTeam('NYL'),'NYL');
assert.equal(canonicalWnbaTeam('Las Vegas Aces'),'LVA');

{
  const identity=normalizeBasketballPlayerIdentity('WNBA','Sabrina Ionescu (NYL)',null);
  assert.equal(identity.player,'Sabrina Ionescu');
  assert.equal(identity.teamHint,'NYL');
  assert.equal(identity.strippedTeamSuffix,true);
  const context=resolveWnbaQuoteEvent({},events,identity.teamHint);
  assert.equal(context?.eventId,'min-nyl');
  assert.equal(context?.homeTeam,'New York Liberty');
}

{
  const identity=normalizeBasketballPlayerIdentity('WNBA','Allisha Gray (ATL)',null);
  assert.equal(identity.player,'Allisha Gray');
  assert.equal(identity.teamHint,'ATL');
  assert.equal(resolveWnbaQuoteEvent({},events,identity.teamHint),null,'orphan ATL quote must not be attached to an unrelated current game');
}

{
  const identity=normalizeBasketballPlayerIdentity('WNBA',"A'ja Wilson",'LVA');
  const context=resolveWnbaQuoteEvent({canonical_event_id:'lva-phx'},events,identity.teamHint);
  assert.equal(context?.eventId,'lva-phx');
  assert.equal(context?.awayTeam,'Las Vegas Aces');
}

{
  const identity=normalizeBasketballPlayerIdentity('WNBA','Example Player (ATL)',null);
  const ambiguous=[
    ...events,
    {canonical_event_id:'atl-chi',commence_time:'2026-10-01T00:00:00Z',away_team:'Atlanta Dream',home_team:'Chicago Sky'},
    {canonical_event_id:'atl-was',commence_time:'2026-10-03T00:00:00Z',away_team:'Washington Mystics',home_team:'Atlanta Dream'}
  ];
  assert.equal(resolveWnbaQuoteEvent({},ambiguous,identity.teamHint),null,'ambiguous team-only quote must not be guessed');
}

{
  const identity=normalizeBasketballPlayerIdentity('NBA','Example Player (ATL)',null);
  assert.equal(identity.player,'Example Player (ATL)','non-WNBA player text is unchanged by the WNBA-specific guard');
}

console.log('✓ basketball odds quality guard self-test passed');
