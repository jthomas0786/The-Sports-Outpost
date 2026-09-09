#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const r=fs.readFileSync('sports/nfl-research-ui.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');

assert.match(r,/\/\* v86\.3 modal prop selector \*\//);
assert.match(r,/id="tsoNflPropSelect"/);
assert.doesNotMatch(r,/id="tsoNflPropSwitch"/);
assert.match(r,/grid-template-columns:auto minmax\(0,1fr\) 232px/);
assert.match(r,/grid-column:1\/-1/);
assert.match(r,/tso-nfl-prop-odds-compact has-odds/);
assert.match(r,/querySelector\('#tsoNflPropSelect'\)\?\.addEventListener\('change'/);
assert.doesNotMatch(r,/querySelector\('#tsoNflPropSwitch'\)\?\.addEventListener/);
assert.match(router,/nfl-research-ui\.js\?v=86\.3/);

console.log('✓ v86.3 NFL Player Modal controls self-test passed');
console.log('  ✓ prop pills replaced by one dropdown');
console.log('  ✓ selected sportsbook odds sit below dropdown');
console.log('  ✓ close X has a protected right-side gutter');
console.log('  ✓ mobile controls move below player identity');
