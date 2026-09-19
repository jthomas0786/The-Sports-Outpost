import assert from 'node:assert/strict';
import fs from 'node:fs';

const swipe=fs.readFileSync(new URL('../sports/mobile-edge-swipe-v894.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');

assert.ok(!swipe.includes('EDGE_PX'),'mobile nav must not be restricted to an edge-only start zone');
assert.ok(swipe.includes("document.addEventListener('touchstart'"),'swipe gesture must start from the shared document shell');
assert.ok(swipe.includes('ax>ay*1.2'),'normal pages must keep the existing rightward direction ratio');
assert.ok(swipe.includes('Math.max(ax,ay)>=LOCK_DISTANCE'),'normal gesture must keep its existing axis-lock threshold');
assert.ok(swipe.includes('dx>=OPEN_DISTANCE'),'normal drawer opening must keep its existing deliberate horizontal travel threshold');
assert.ok(swipe.includes("if(gesture.horizontal){\n      // Only suppress page drift"),'vertical scrolling must remain native until horizontal intent is locked');
assert.ok(swipe.includes('blockingOverlayOpen()'),'modal overlays must block the global swipe gesture');
assert.ok(swipe.includes("backdrop.classList.add('is-open')"),'existing backdrop behavior must be preserved');
assert.ok(swipe.includes("backdrop.classList.remove('is-open')"),'existing close/backdrop behavior must be preserved');
assert.ok(swipe.includes("document.getElementById('nflPlayerPropTool')"),'Player Prop Tool must be detected explicitly');
assert.ok(swipe.includes('if(playerPropToolActive()||!mobileViewport()'),'Player Prop Tool must reject swipe-to-open before a gesture is armed');
assert.ok(!swipe.includes('PROP_OPEN_DISTANCE'),'Player Prop Tool must no longer use a merely less-sensitive opening threshold');
assert.ok(!swipe.includes('PROP_LOCK_DISTANCE'),'Player Prop Tool must not arm a page-specific opening gesture');
assert.ok(swipe.includes('swipe it\n  // left from inside the drawer to dismiss it'),'swipe-to-close must remain available when the drawer is already open');
assert.ok(router.includes("./mobile-edge-swipe-v894.js?v=91.2")||router.includes("./mobile-edge-swipe-v894.js?v=93.5"),'shared router must load the swipe module');
assert.equal((router.match(/installMobileEdgeSwipeV894\(\);/g)||[]).length,1,'shared swipe installer must run exactly once');

console.log('Mobile swipe-anywhere selftest passed: normal pages retain current behavior and NFL Player Prop Tool disables swipe-to-open entirely.');