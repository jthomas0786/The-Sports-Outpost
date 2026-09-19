import assert from 'node:assert/strict';
import fs from 'node:fs';

const swipe=fs.readFileSync(new URL('../sports/mobile-edge-swipe-v894.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');

assert.ok(!swipe.includes('EDGE_PX'),'mobile nav must not be restricted to an edge-only start zone');
assert.ok(swipe.includes("document.addEventListener('touchstart'"),'swipe gesture must start from the shared document shell');
assert.ok(swipe.includes('horizontalRatio:1.2'),'normal pages must keep the existing rightward direction ratio');
assert.ok(swipe.includes('Math.max(ax,ay)>=tuning.lockDistance'),'gesture must use its scoped axis-lock threshold before suppressing scrolling');
assert.ok(swipe.includes('dx>=tuning.openDistance'),'drawer must require the scoped deliberate horizontal travel threshold');
assert.ok(swipe.includes("if(gesture.horizontal){\n      // Only suppress page drift"),'vertical scrolling must remain native until horizontal intent is locked');
assert.ok(swipe.includes('blockingOverlayOpen()'),'modal overlays must block the global swipe gesture');
assert.ok(swipe.includes("backdrop.classList.add('is-open')"),'existing backdrop behavior must be preserved');
assert.ok(swipe.includes("backdrop.classList.remove('is-open')"),'existing close/backdrop behavior must be preserved');
assert.ok(swipe.includes("document.getElementById('nflPlayerPropTool')"),'Player Prop Tool must have page-scoped swipe tuning');
assert.ok(swipe.includes('PROP_OPEN_DISTANCE=118'),'Player Prop Tool must require a longer opening swipe');
assert.ok(swipe.includes('PROP_LOCK_DISTANCE=26'),'Player Prop Tool must require more horizontal travel before direction lock');
assert.ok(swipe.includes('PROP_MAX_VERTICAL=52'),'Player Prop Tool must tolerate less vertical drift');
assert.ok(swipe.includes('PROP_HORIZONTAL_RATIO=1.75'),'Player Prop Tool must require strongly horizontal intent');
assert.ok(router.includes("./mobile-edge-swipe-v894.js?v=91.2"),'shared router must load the scoped-sensitivity swipe module');
assert.equal((router.match(/installMobileEdgeSwipeV894\(\);/g)||[]).length,1,'shared swipe installer must run exactly once');

console.log('Mobile swipe-anywhere selftest passed: normal pages retain current behavior and NFL Player Prop Tool uses less-sensitive open thresholds.');
