import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync('tso2/theme-studio.js','utf8');
const css=fs.readFileSync('tso2/theme-system.css','utf8');
const html=fs.readFileSync('tso2/index.html','utf8');
const app=fs.readFileSync('tso2/app.js','utf8');
const pages=fs.readFileSync('tso2/pages.js','utf8');
assert.match(html,/theme-system\.css/,'Theme overrides must load in HTML');
assert.match(html,/theme-studio\.js/,'Owner editor script must load');
assert.match(html,/data-theme-open/,'Editor accessible from owner profile');
assert.match(app,/theme:'Theme \/ CSS Dashboard'/,'Dedicated owner route');
assert.match(app,/route==='admin'\|\|route==='theme'/,'Owner navigation authorization');
assert.match(pages,/data-theme-studio/,'Owner-only Theme Studio mount point');
assert.match(css,/--tso-sidebar-bg/);
assert.match(css,/--tso-page-gutter/);
assert.match(css,/\.tso-theme-preview/);
assert.ok(css.indexOf('.gb2-root')>css.indexOf(':root'),'Theme bridge overrides Games module after stylesheet cascade');
assert.ok(!script.includes('service_role'),'Never expose service role in theme editor');
const context={
 window:{TSO_AUTH:{status:'loading',user:null},addEventListener(){}},
 document:{readyState:'loading',addEventListener(){}},
 setTimeout(){},console
};
vm.runInNewContext(script,context);
const studio=context.window.TSO2ThemeStudio;
assert.ok(studio&&typeof studio.mount==='function');
assert.equal(studio.definitions.length>=32,true,'Expose at least 32 actual design settings');
assert.equal(studio.definitions.some(d=>d.name==='--outpost-orange'),true);
assert.equal(studio.definitions.some(d=>d.name==='--r'),true);
assert.equal(studio.definitions.some(d=>d.name==='--tso-side-nav-width'),true);
assert.equal(studio.definitions.some(d=>d.name==='--tso-font-family'),true);
assert.equal(studio.validate({'--bg':'#112233','--card':'url(https://x)','--r':'2200px'})['--bg'],'#112233');
assert.equal(studio.validate({'--bg':'url(https://example.com)'})['--bg'],undefined,'No remote CSS URLs');
assert.equal(studio.validate({'--r':'-9px'})['--r'],undefined,'Reject negative radius');
assert.equal(studio.validate({'--whatever':'red'})['--whatever'],undefined,'No invented custom CSS variable names');
// The approved TSO2 broadcast aesthetic is black/orange/gold, NOT the older
// generic navy/blue starter dashboard. Prevent future regression at source.
const approved={
 '--bg':'#05070a','--surface':'#0c1016','--card':'#0a0d12',
 '--outpost-orange':'#ff4d1c','--outpost-gold':'#ffd84d',
 '--tso-primary-btn':'#ff4d1c','--tso-sidebar-bg':'#070a0f'
};
for(const [name,value] of Object.entries(approved)){
 assert.equal(studio.defaults[name],value,name+' Theme Studio default is not the approved 2.0 broadcast palette');
 assert.ok(css.includes(name+':'+value+';'),name+' global CSS should initialize same source-of-truth value');
}
const games=fs.readFileSync('tso2/games-board-v2.css','utf8');
assert.match(games,/--gb2-accent:var\(--outpost-orange\)/,'Games Chrome must use approved orange branding');
assert.match(games,/--gb2-accent-light:var\(--outpost-gold\)/,'Games highlights must use approved gold branding');
assert.doesNotMatch(games,/--gb2-accent:var\(--blue\)/,'Games may not use model blue as global brand accent');
assert.match(css,/TSO2_APPROVED_OUTPOST_SHARED_CHROME_V1/,'Global Outpost shared component system required');
console.log('TSO2 THEME STUDIO UNIT PASS',studio.definitions.length,'shared design settings; owner route, sanitization and native tokens verified');
