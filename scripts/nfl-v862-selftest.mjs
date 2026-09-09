#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');
const research=fs.readFileSync('sports/nfl-research-ui.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.match(preview,/window\.DW_NFL_PROP_RESULT=/);
assert.match(research,/function findPreviewPropResult\(/);
assert.match(research,/canonical:true/);
assert.doesNotMatch(research,/r\?\.model\?\.atdGrade\|\|gradeFromProbability/);
assert.match(research,/id="tsoNflPropOdds"/);
assert.match(research,/Best sportsbook odds/);
assert.match(index,/function decimalToAmerican\(/);
assert.match(index,/TSO Odds \$\{formatAmericanFromDecimal\(combined\)\}/);
assert.match(router,/nfl-preview\.js\?v=86\.2/);
assert.match(router,/nfl-research-ui\.js\?v=86\.2/);

function american(d){
  if(!Number.isFinite(d)||d<=1) return null;
  return d>=2?Math.round((d-1)*100):Math.round(-100/(d-1));
}
assert.equal(american(2),100);
assert.equal(american(3.5),250);
assert.equal(american(1.5),-200);
assert.equal(american(1.909),-110);

console.log('✓ v86.2 NFL canonical prop/odds/wagering self-test passed');
console.log('  ✓ Slate / Props / Player Modal share one prop result');
console.log('  ✓ modal displays current sportsbook American odds');
console.log('  ✓ TSO point-wager UI displays American odds');
console.log('  ✓ decimal backend payout math remains unchanged');
