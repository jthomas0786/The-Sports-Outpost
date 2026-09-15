import assert from 'node:assert/strict';
import fs from 'node:fs';

const play=fs.readFileSync('sports/mlb/playstage-v901.js','utf8');
const fit=fs.readFileSync('sports/mlb/playstage-concept-v924-desktop-fit.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const marker of [
  'const mustRender=!root||!!shouldAnimate;',
  'root.dataset.lastPollAt=String(Date.now())',
  "width:calc(100% - 24px)!important;max-width:none!important",
  "root.dataset.desktopFit='v924'",
  'v924FooterGap',
]) assert.ok((marker.includes('width:')||marker.includes('desktopFit')||marker.includes('v924FooterGap')?fit:play).includes(marker),`v924 missing ${marker}`);

assert.ok(router.includes("./mlb/playstage-v901.js?v=90.46"),'playstage cache bust missing');
const fitImport=router.match(/\.\/mlb\/playstage-concept-v924-desktop-fit\.js\?v=(\d+)\.(\d+)/);
assert.ok(fitImport,'v924 layer missing');
assert.ok(Number(fitImport[1])>92||(Number(fitImport[1])===92&&Number(fitImport[2])>=40),'v924 fit cache must remain at 92.40 or newer');
assert.ok(router.includes('installMlbPlaystageConceptV924DesktopFit'),'v924 install missing');
assert.ok(router.includes("./nfl-preview-v893.js?v=89.37"),'NFL live hotfix must remain');
const outer=index.match(/\.\/sports\/router\.js\?v=(\d+)\.(\d+)/);
assert.ok(outer,'outer cache bust missing');
assert.ok(Number(outer[1])>90||(Number(outer[1])===90&&Number(outer[2])>=51),'v924-or-newer outer cache bust missing');
assert.ok(!fit.includes('@media(max-width:720px)'),'v924 must not touch mobile');
console.log('MLB v924 regression passed: full-width desktop fit, border containment, tight footer, stable 5s polling');
