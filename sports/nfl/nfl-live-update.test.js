// Tests for updateLiveDisplay() — the real fix for the NFL performance
// issue (a full innerHTML rebuild, including SVG field regeneration, on
// nearly every 15s live-poll tick). These import and call the ACTUAL
// functions from sports/nfl/ui.js, not a re-typed copy of their logic —
// a test against a mirror could pass even if the real code has a bug.
//
// No jsdom available in this environment (network-restricted, install
// blocked) — a minimal, purpose-built fake `document`/`window` is used
// instead: real stub elements for exactly the specific nodes the real
// code queries for by their exact real selectors, tracking what gets
// mutated on them, rather than a general-purpose HTML parser.
//
// Run with: node --test tests/nfl-live-update.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

/** A minimal fake element: tracks textContent/innerHTML/outerHTML
 *  writes, supports .dataset, and records addEventListener calls so a
 *  replaced card's re-wiring can be verified. */
function makeFakeEl(initial = {}) {
  return {
    textContent: initial.textContent ?? '',
    innerHTML: initial.innerHTML ?? '',
    outerHTML: initial.outerHTML ?? '',
    dataset: { ...(initial.dataset || {}) },
    _listeners: [],
    addEventListener(type, fn) { this._listeners.push({ type, fn }); },
  };
}

/** A fake root node: a plain map from exact selector string to fake
 *  element, matching precisely what the real code looks for. Logs every
 *  querySelector call so a test can assert nothing was queried at all. */
function makeFakeRoot(elements) {
  const queries = [];
  return {
    queries,
    querySelector(sel) { queries.push(sel); return elements[sel] || null; },
    querySelectorAll(sel) { queries.push(sel); return []; },
  };
}

// Minimal global `window`/`document` so importing the real module doesn't
// throw on its top-level `window.DW_NFL = { mount, render }` assignment.
// Real per-test DOM behavior is injected separately via __setTestState
// and by directly wiring the fake root into document.getElementById.
let fakeRoot = makeFakeRoot({});
globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || {
  getElementById: (id) => (id === 'nflView' ? fakeRoot : null),
};

const { __setTestState, updateLiveDisplay, wireGameCard, gameCard } =
  await import('../sports/nfl/ui.js');

test('CRITICAL: on a non-slate tab, updateLiveDisplay queries nothing at all', () => {
  fakeRoot = makeFakeRoot({});
  globalThis.document.getElementById = (id) => (id === 'nflView' ? fakeRoot : null);
  __setTestState({ activeNflTab: 'feed', activeGameId: null, slate: { games: [] } });

  updateLiveDisplay();
  assert.equal(fakeRoot.queries.length, 0, 'must not touch the DOM at all when Slate tab is not active');
});

test('gamecast view: only the three real live regions get updated, nothing else', () => {
  const kickEl = makeFakeEl();
  const detailEl = makeFakeEl();
  const oddsEl = makeFakeEl();
  fakeRoot = makeFakeRoot({
    '#nflGcKick': kickEl,
    '#nflGcDetail': detailEl,
    '#nflGcOdds': oddsEl,
  });
  globalThis.document.getElementById = (id) => (id === 'nflView' ? fakeRoot : null);

  const g = {
    gameId: 'g1', status: 'in',
    away: { abbr: 'KC', score: 24, rzDefense: {} },
    home: { abbr: 'BUF', score: 20, rzDefense: {} },
    statusDetail: 'Q4 2:15', liveScore: {},
  };
  __setTestState({ activeNflTab: 'slate', activeGameId: 'g1', slate: { games: [g] } });

  updateLiveDisplay();

  assert.equal(kickEl.textContent, '24–20');
  assert.equal(detailEl.textContent, 'Q4 2:15');
  assert.ok(oddsEl.innerHTML.length > 0, 'odds tile should be repopulated with real win-probability HTML');
  assert.ok(oddsEl.innerHTML.includes('KC') || oddsEl.innerHTML.includes('BUF'), 'odds HTML should reference the real teams');
});

test('grid view: an unchanged-status game gets a targeted update, and the card itself is never replaced', () => {
  const scoreEl = makeFakeEl();
  const statusEl = makeFakeEl();
  const cardEl = makeFakeEl({ dataset: { status: 'in' } });
  const gamesHost = makeFakeRoot({
    '.nfl-game[data-game="g2"]': cardEl,
    '#nflScore-g2': scoreEl,
    '#nflStatus-g2': statusEl,
  });
  fakeRoot = makeFakeRoot({ '#nflGames': gamesHost });
  globalThis.document.getElementById = (id) => (id === 'nflView' ? fakeRoot : null);

  const g = {
    gameId: 'g2', status: 'in',
    away: { abbr: 'DAL', score: 17, rzDefense: {} },
    home: { abbr: 'PHI', score: 21, rzDefense: {} },
  };
  __setTestState({ activeNflTab: 'slate', activeGameId: null, slate: { games: [g] } });

  updateLiveDisplay();

  assert.ok(scoreEl.innerHTML.includes('17') && scoreEl.innerHTML.includes('21'));
  assert.equal(statusEl.textContent, 'LIVE');
  assert.equal(cardEl.outerHTML, '', 'the card itself must never be replaced when its status is unchanged');
});

test('CRITICAL: a real pre -> in status change triggers a full card replacement, and the new card is re-wired', () => {
  // Single, clear mechanism: querying '.nfl-game[data-game="g3"]' always
  // returns whatever `current` currently points to. Setting .outerHTML on
  // that element swaps `current` to a fresh "new" element — mirroring what
  // outerHTML actually does in a real DOM (replaces the node in place, so
  // the next query for the same selector finds the new one).
  let current = makeFakeEl({ dataset: { status: 'pre' } });
  const newCardEl = makeFakeEl({ dataset: { status: 'in' } });
  Object.defineProperty(current, 'outerHTML', {
    set() { current = newCardEl; },
    get() { return ''; },
  });

  const gamesHost = makeFakeRoot({});
  gamesHost.querySelector = (sel) => {
    gamesHost.queries.push(sel);
    return sel === '.nfl-game[data-game="g3"]' ? current : null;
  };

  fakeRoot = makeFakeRoot({ '#nflGames': gamesHost });
  globalThis.document.getElementById = (id) => (id === 'nflView' ? fakeRoot : null);

  const g = {
    gameId: 'g3', status: 'in',
    away: { abbr: 'SF', score: 7, rzDefense: {}, records: [] },
    home: { abbr: 'SEA', score: 0, rzDefense: {}, records: [] },
    players: [],
  };
  __setTestState({ activeNflTab: 'slate', activeGameId: null, slate: { games: [g] } });

  updateLiveDisplay();

  assert.equal(current, newCardEl, 'a genuine pre -> in transition must trigger a full card replacement');
  assert.ok(newCardEl._listeners.some(l => l.type === 'click'), 'the replaced card must be re-wired with a real click handler, or it becomes permanently unclickable');
});

test('gameCard() output carries the real, stable per-game IDs the targeted update depends on', () => {
  const g = {
    gameId: 'g4', status: 'in',
    away: { abbr: 'GB', name: 'Green Bay', score: 10, logo: '', records: [], rzDefense: {} },
    home: { abbr: 'CHI', name: 'Chicago', score: 3, logo: '', records: [], rzDefense: {} },
    players: [],
  };
  const html = gameCard(g);
  assert.ok(html.includes('data-status="in"'), 'card must carry its current status for change-detection to work');
  assert.ok(html.includes('id="nflScore-g4"'), 'score element must have the exact ID updateLiveDisplay looks for');
  assert.ok(html.includes('id="nflStatus-g4"'), 'status element must have the exact ID updateLiveDisplay looks for');
});
