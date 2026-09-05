// Guard test: the contact/flight physics model was disabled on Sept 5,
// 2026 after being found to systematically under-count real HR
// probability by a large, compounding margin (see MODEL.md's "Contact/
// flight model" section for the full incident). This test exists so
// that flag can't silently flip back to true in a future edit without
// someone consciously deciding to re-enable it — and, when it IS
// re-enabled, this test should be the first thing updated, alongside
// real validation against the Statcast reference points documented in
// MODEL.md (a 105mph/25° batted ball should be a home run 77.2% of the
// time — the target that was NOT hit during the Sept 5 attempt).
// Run with: node --test tests/physics-model-disabled.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('PHYSICS_MODEL_ENABLED is false — do not flip this without real recalibration and updated tests', () => {
  const match = html.match(/const PHYSICS_MODEL_ENABLED = (true|false);/);
  assert.ok(match, 'could not find the PHYSICS_MODEL_ENABLED flag at all — has it been renamed or removed?');
  assert.equal(match[1], 'false',
    'PHYSICS_MODEL_ENABLED was flipped to true without updating this guard test — before doing that, re-read MODEL.md\'s "Contact/flight model" incident writeup and validate against the real 105mph/25deg -> 77.2% HR reference point first');
});
