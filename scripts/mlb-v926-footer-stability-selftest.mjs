import assert from 'node:assert/strict';
import fs from 'node:fs';

const fit=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v924-desktop-fit.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');

assert.match(fit,/\.tso-mlb-desktop-v924 \.ps-stage\{[\s\S]*?margin:0 0 72px!important;/,'desktop stage must reserve deterministic space for the Live At-Bat banner');
assert.ok(fit.includes("root.dataset.footerGapMode='structural'"),'v924 must advertise structural footer spacing');
assert.ok(!fit.includes('function settleFooterGap'),'runtime footer measurement must stay removed');
assert.ok(!fit.includes('function tighten(root)'),'mutation-driven footer correction must stay removed');
assert.ok(!fit.includes("style.setProperty('margin-top'"),'footer must not be repositioned with inline margin writes');
assert.ok(router.includes("./mlb/playstage-concept-v924-desktop-fit.js?v=92.43"),'router must cache-bust stable v924 layout');
assert.equal((router.match(/conceptV924\.installMlbPlaystageConceptV924DesktopFit\?\.\(\);/g)||[]).length,1,'v924 installer must run exactly once');

console.log('MLB v926 footer stability selftest passed');
