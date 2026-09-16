import assert from 'node:assert/strict';
import fs from 'node:fs';

const swipe=fs.readFileSync(new URL('../sports/mobile-edge-swipe-v894.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');

assert.ok(!swipe.includes('EDGE_PX'),'mobile nav must not be restricted to an edge-only start zone');
assert.ok(swipe.includes("document.addEventListener('touchstart'"),'swipe gesture must start from the shared document shell');
assert.ok(swipe.includes('dx>0&&ax>ay*1.2'),'rightward movement must clearly dominate vertical movement before locking');
assert.ok(swipe.includes('Math.max(ax,ay)>=LOCK_DISTANCE'),'gesture must use an axis-lock threshold before suppressing scrolling');
assert.ok(swipe.includes('dx>=OPEN_DISTANCE'),'drawer must require a deliberate horizontal travel threshold');
assert.ok(swipe.includes("if(gesture.horizontal){\n      // Only suppress page drift"),'vertical scrolling must remain native until horizontal intent is locked');
assert.ok(swipe.includes('blockingOverlayOpen()'),'modal overlays must block the global swipe gesture');
assert.ok(swipe.includes("backdrop.classList.add('is-open')"),'existing backdrop behavior must be preserved');
assert.ok(swipe.includes("backdrop.classList.remove('is-open')"),'existing close/backdrop behavior must be preserved');
assert.ok(router.includes("./mobile-edge-swipe-v894.js?v=91.1"),'shared router must load the swipe-anywhere module');
assert.equal((router.match(/installMobileEdgeSwipeV894\(\);/g)||[]).length,1,'shared swipe installer must run exactly once');

console.log('Mobile swipe-anywhere selftest passed');
