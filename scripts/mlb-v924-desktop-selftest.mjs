import assert from 'node:assert/strict';
import fs from 'node:fs';

const play=fs.readFileSync('sports/mlb/playstage-v901.js','utf8');
const fit=fs.readFileSync('sports/mlb/playstage-concept-v924-desktop-fit.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  'const mustRender=!root||!!shouldAnimate;',
  'root.dataset.lastPollAt=String(Date.now())',
]) assert.ok(play.includes(marker),`playstage missing ${marker}`);

for(const marker of [
  'width:calc(100% - 24px)!important;max-width:none!important',
  "root.dataset.desktopFit='v924'",
]) assert.ok(fit.includes(marker),`v924 missing ${marker}`);

// The footer gap must be structural. Runtime measurement/repositioning caused the
// Bases / Count / Outs block to jump whenever live PlayStage DOM mutations fired.
assert.ok(/\.tso-mlb-desktop-v924 \.ps-stage\{[\s\S]*?margin:0 0 72px!important;/.test(fit),'desktop stage must reserve deterministic Live At-Bat/footer space');
assert.ok(fit.includes("root.dataset.footerGapMode='structural'"),'v924 structural footer-gap marker missing');
assert.ok(!fit.includes('v924FooterGap'),'legacy measured footer-gap marker must stay removed');
assert.ok(!fit.includes('function settleFooterGap'),'legacy runtime footer measurement must stay removed');
assert.ok(!fit.includes('function tighten(root)'),'legacy mutation-driven footer correction must stay removed');
assert.ok(!fit.includes("footer.style.setProperty('margin-top'"),'footer must not be repositioned with inline margin writes');

assert.ok(router.includes("./mlb/playstage-v901.js?v=90.46"),'playstage cache bust missing');
const fitImport=router.match(/\.\/mlb\/playstage-concept-v924-desktop-fit\.js\?v=(\d+)\.(\d+)/);
assert.ok(fitImport,'v924 layer missing');
assert.ok(Number(fitImport[1])>92||(Number(fitImport[1])===92&&Number(fitImport[2])>=43),'v924 fit cache must remain at 92.43 or newer');
assert.equal((router.match(/conceptV924\.installMlbPlaystageConceptV924DesktopFit\?\.\(\);/g)||[]).length,1,'v924 installer must run exactly once');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.37")||router.includes("./nfl-preview-v893.js?v=89.40"),'NFL live hotfix must remain');
const outer=index.match(/\.\/sports\/router\.js\?v=(\d+)\.(\d+)/);
assert.ok(outer,'outer cache bust missing');
assert.ok(Number(outer[1])>90||(Number(outer[1])===90&&Number(outer[2])>=58),'stable-footer outer cache bust missing');
assert.ok(!fit.includes('@media(max-width:720px)'),'v924 must not touch mobile');
console.log('MLB v924 regression passed: full-width desktop fit, structural footer spacing, no mutation-driven bounce, stable polling');
