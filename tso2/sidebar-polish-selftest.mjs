import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('tso2/index.html','utf8');
const css=fs.readFileSync('tso2/styles.css','utf8');
const svg=fs.readFileSync('tso2/brand/production/tso2-product-game-edge-approved.svg','utf8');

assert.match(html,/class="tso-side-brand-image--unboxed"/,'Original approved wordmark remains in sidebar');
assert.match(html,/data-route="gameedge"><img class="nav-approved-icon" src="\/brand\/production\/tso2-product-game-edge-approved\.svg"/,'Game Edge tile matches other navigation assets');
assert.doesNotMatch(html,/tso-game-edge-nav-mark/,'No mismatched circular symbol in markup');
assert.doesNotMatch(html,/Swipe right to open/,'Swipe instructions hidden from all layouts');
assert.match(css,/\.tso-side-brand \.tso-side-brand-image--unboxed/,'Logo matte blending active');
assert.match(css,/mix-blend-mode:lighten/,'Dark matte is visually removed');
assert.match(svg,/<svg /,'Icon is valid SVG markup');
assert.match(svg,/viewBox="0 0 64 64"/,'Icon uses a square tile');
assert.match(svg,/>EDGE<\/text>/,'Game Edge icon has micro-label');
console.log('TSO2 sidebar UI: approved wordmark, tile icon, swipe footer checks passed.');
