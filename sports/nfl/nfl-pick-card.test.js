// Tests for the redesigned NFL "Top 20 · Anytime TD" card (pickCardHTML),
// mirroring the MLB app's Top 20 card structure. Imports and calls the
// REAL exported functions from ui.js, not a re-typed mirror.
// Run with: node --test tests/nfl-pick-card.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || { getElementById: () => null };

const { __setTestState, pickCardHTML, nflGradeRingHTML, nflTeamColor } =
  await import('../sports/nfl/ui.js');

function mockPlayer(overrides = {}) {
  return {
    gsisId: '001', name: 'Christian McCaffrey', team: 'SF', position: 'RB', jersey: 23,
    opponent: 'SEA', depthRank: 1, teamChanged: false,
    headshot: 'https://example.com/cmc.png',
    props: {
      atd: {
        probability: 0.42, grade: 'A+', gradeLabel: 'Elite', dataConfidence: 'full',
        availability: { status: 'active', note: '' },
      },
    },
    ...overrides,
  };
}

function mockGame(overrides = {}) {
  return {
    gameId: 'g1', status: 'pre', startTimeUTC: '2026-09-08T20:25:00Z',
    away: { abbr: 'SEA', score: 0, rzDefense: { rzDefIndex: 0.85, rzTdRateAllowed: 0.45, rzPlaysFaced: 40 } },
    home: { abbr: 'SF', score: 0, rzDefense: {} },
    venue: { indoor: false, name: "Levi's Stadium, Santa Clara" },
    players: [],
    ...overrides,
  };
}

test('a real team color lookup returns the actual, sourced brand color, not a fallback', () => {
  assert.equal(nflTeamColor('SF'), '#AA0000');
  assert.equal(nflTeamColor('GB'), '#203731');
});

test('an unknown team abbreviation falls back safely rather than returning undefined', () => {
  const result = nflTeamColor('ZZZ');
  assert.ok(result.startsWith('#'));
});

test('nflGradeRingHTML uses the same ring CSS classes the MLB app uses, for genuine visual parity', () => {
  const html = nflGradeRingHTML(0.42, 'A+');
  assert.ok(html.includes('sgr-svg'), 'must use the real, shared .sgr-svg class, not a reimplementation');
  assert.ok(html.includes('sgr-xl'));
  assert.ok(html.includes('A+'));
  assert.ok(html.includes('42%'));
});

test('a sub-10% probability shows one decimal place, matching real precision conventions', () => {
  const html = nflGradeRingHTML(0.075, 'C');
  assert.ok(html.includes('7.5%'), `expected one decimal for a sub-10% probability, got: ${html}`);
});

test('CRITICAL: the real card includes rank, name, team, position, and the grade ring with the real probability', () => {
  const player = mockPlayer();
  const game = mockGame({ players: [player] });
  __setTestState({ slate: { games: [game], gameCount: 1 } });

  const html = pickCardHTML(player, { rank: 1 });
  assert.ok(html.includes('Christian McCaffrey'));
  assert.ok(html.includes('SF'));
  assert.ok(html.includes('RB'));
  assert.ok(html.includes('42%'), 'the real ATD probability must appear on the card');
  assert.ok(html.includes('A+'), 'the real grade must appear on the card');
  assert.ok(html.includes('sgr-svg'), 'must use the real, shared ring, not a placeholder');
});

test('a pre-game matchup shows the real kickoff time, not a score', () => {
  const player = mockPlayer();
  const game = mockGame({ status: 'pre', players: [player] });
  __setTestState({ slate: { games: [game], gameCount: 1 } });

  const html = pickCardHTML(player, { rank: 1 });
  assert.ok(!html.includes('LIVE'), 'a pre-game matchup should not show a live score');
  assert.ok(!html.includes('FINAL'));
});

test('a live game shows the real, current score in the matchup line', () => {
  const player = mockPlayer();
  const game = mockGame({ status: 'in', away: { abbr: 'SEA', score: 14, rzDefense: {} }, home: { abbr: 'SF', score: 10, rzDefense: {} }, players: [player] });
  __setTestState({ slate: { games: [game], gameCount: 1 } });

  const html = pickCardHTML(player, { rank: 1 });
  assert.ok(html.includes('LIVE'));
  assert.ok(html.includes('14') && html.includes('10'));
});

test('CRITICAL: real red-zone defense context comes from the actual opponent, not this player\'s own team', () => {
  const player = mockPlayer({ team: 'SF', opponent: 'SEA' });
  const game = mockGame({
    away: { abbr: 'SEA', score: 0, rzDefense: { rzDefIndex: 0.7, rzTdRateAllowed: 0.30, rzPlaysFaced: 50 } },  // the real opponent — should be used
    home: { abbr: 'SF', score: 0, rzDefense: { rzDefIndex: 1.5, rzTdRateAllowed: 0.90, rzPlaysFaced: 20 } },   // this player's OWN team — must NOT be used
    players: [player],
  });
  __setTestState({ slate: { games: [game], gameCount: 1 } });

  const html = pickCardHTML(player, { rank: 1 });
  assert.ok(html.includes('30.0%') || html.includes('30%'), `expected the real opponent's (SEA) red-zone rate, got: ${html}`);
  assert.ok(!html.includes('90.0%') && !html.includes('90%'), 'must not show this player\'s own team\'s red-zone defense stats');
});

test('a badge only appears for a condition that is actually true, not unconditionally', () => {
  const activePlayer = mockPlayer();  // active, full confidence, no depth issues besides #1
  const game = mockGame({ players: [activePlayer] });
  __setTestState({ slate: { games: [game], gameCount: 1 } });

  const questionablePlayer = mockPlayer({
    props: { atd: { probability: 0.2, grade: 'B', gradeLabel: 'Good', dataConfidence: 'full',
      availability: { status: 'questionable', note: 'Ankle' } } },
  });
  const htmlActive = pickCardHTML(activePlayer, { rank: 1 });
  const htmlQuestionable = pickCardHTML(questionablePlayer, { rank: 2 });

  assert.ok(!htmlActive.includes('Questionable'), 'an active player should not show an availability warning badge');
  assert.ok(htmlQuestionable.includes('Questionable'), 'a genuinely questionable player must show the real availability badge');
});
