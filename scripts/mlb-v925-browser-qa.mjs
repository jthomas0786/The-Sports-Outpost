import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),out=path.join(root,'qa');fs.mkdirSync(out,{recursive:true});
const gamePk='822928';
const layoutHarness=path.join(root,'mlb-v925-layout-qa.html');
const selectorHarness=path.join(root,'mlb-v925-selector-qa.html');
const imports=['904','905','906','907','908','909','910','911','912','913','914','915','916','917'].map(v=>`import {installMlbPlaystageConceptV${v}} from '/sports/mlb/playstage-concept-v${v}.js?v=qa925';`).join('\n');
const calls=['904','905','906','907','908','909','910','911','912','913','914','915','916','917'].map(v=>`installMlbPlaystageConceptV${v}();`).join('');
fs.writeFileSync(layoutHarness,`<!doctype html><html data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814}body{padding:8px}#tsoMlbInlineGamecast{width:1440px;max-width:calc(100vw - 16px);margin:auto}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=qa925';
${imports}
import {installMlbPlaystageConceptV920Mobile} from '/sports/mlb/playstage-concept-v920-mobile.js?v=qa925';
import {installMlbPlaystageConceptV921Mobile} from '/sports/mlb/playstage-concept-v921-mobile.js?v=qa925';
import {installMlbPlaystageConceptV922Desktop} from '/sports/mlb/playstage-concept-v922-desktop.js?v=qa925';
import {installMlbPlaystageConceptV923DesktopTabs} from '/sports/mlb/playstage-concept-v923-desktop-tabs.js?v=qa925';
import {installMlbPlaystageConceptV924DesktopFit} from '/sports/mlb/playstage-concept-v924-desktop-fit.js?v=qa925';
installMlbPlaystageV901();${calls}installMlbPlaystageConceptV920Mobile();installMlbPlaystageConceptV921Mobile();installMlbPlaystageConceptV922Desktop();installMlbPlaystageConceptV923DesktopTabs();installMlbPlaystageConceptV924DesktopFit();
</script></body></html>`);
fs.writeFileSync(selectorHarness,`<!doctype html><html data-sport="mlb"><head><meta charset="utf-8"></head><body><main class="mlb-live-page"><button data-live-game-pk="1001">A</button><button data-live-game-pk="1002">B</button></main><script>var games=[{id:'1001',gamePk:'1001',awayName:'AAA',homeName:'BBB',liveScore:{balls:1,strikes:1,outs:1}},{id:'1002',gamePk:'1002',awayName:'CCC',homeName:'DDD',liveScore:{balls:2,strikes:1,outs:2}}];var liveDetailHTML=g=>'<div class="fake-detail">'+g.id+'</div>';var mountGamecasts=()=>{};var wireGamecastTabs=()=>{};var mlbInningLabel=()=> 'LIVE';</script><script type="module">import {installMlbLiveGameSwitcherV901} from '/sports/mlb/live-game-switcher-v901.js?v=qa925';installMlbLiveGameSwitcherV901();</script></body></html>`);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),rel=decodeURIComponent(u.pathname).replace(/^\/+/,''),target=path.resolve(root,rel||'index.html');if(!target.startsWith(root)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});
let patchedFeed=null;
async function feed(){if(patchedFeed)return structuredClone(patchedFeed);const raw=await (await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live?language=en`)).json();const plays=raw?.liveData?.plays?.allPlays||[],p=plays.find(x=>String(x?.result?.eventType||'').toLowerCase()==='home_run')||plays.at(-1);if(p){raw.liveData.plays.currentPlay=p;raw.gameData.status={...(raw.gameData.status||{}),detailedState:'In Progress'};}patchedFeed=raw;return structuredClone(raw);}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1365,height:1000}});
 await page.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await feed())}));
 await page.goto('http://127.0.0.1:4173/mlb-v925-layout-qa.html',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.tso-mlb-desktop-v924',{timeout:30000});
 await page.waitForFunction(()=>document.querySelectorAll('.ps-chibi[data-actor-kind="defender"]').length===9,{timeout:30000});
 await page.waitForTimeout(700);
 await page.evaluate(()=>{window.__v925Root=document.querySelector('.tso-mlb-playstage-v901');});
 const before=await page.evaluate(()=>{const q=s=>document.querySelector(s),r=e=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom}};const root=q('.tso-mlb-playstage-v901'),center=q('.ps-center'),stage=q('.ps-stage'),footer=q('.v923-game-footer'),banner=q('.ps-play-banner');return{root:r(root),center:r(center),stage:r(stage),footer:r(footer),banner:r(banner),docWidth:document.documentElement.scrollWidth,viewport:innerWidth,fit:root.dataset.desktopFit,gap:footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom};});
 if(before.fit!=='v924')throw new Error('v924 fit layer missing');
 if(before.docWidth>before.viewport+1)throw new Error(`horizontal overflow ${JSON.stringify(before)}`);
 if(before.center.w<before.root.w*.96||before.stage.w<before.root.w*.96)throw new Error(`field is not using full inner width ${JSON.stringify(before)}`);
 if(before.footer.right>before.root.right+1||before.footer.x<before.root.x-1||before.footer.bottom>before.root.bottom+1)throw new Error(`footer escapes root border ${JSON.stringify(before)}`);
 if(before.gap>24)throw new Error(`wasted vertical gap remains ${JSON.stringify(before)}`);
 await page.waitForTimeout(5600);
 const poll=await page.evaluate(()=>({same:window.__v925Root===document.querySelector('.tso-mlb-playstage-v901'),lastPoll:document.querySelector('.tso-mlb-playstage-v901')?.dataset.lastPollAt||'',fit:document.querySelector('.tso-mlb-playstage-v901')?.dataset.desktopFit||''}));
 if(!poll.same||!poll.lastPoll)throw new Error(`5-second poll replaced Gamecast root ${JSON.stringify(poll)}`);
 await page.screenshot({path:path.join(out,'mlb-v925-desktop-stable.png'),fullPage:true});
 await page.close();

 const sel=await browser.newPage({viewport:{width:1200,height:800}});
 const fakeSlate={games:[{gamePk:1001,away:{abbr:'AAA'},home:{abbr:'BBB'},startTimeUTC:new Date().toISOString(),detailedStatus:'In Progress'},{gamePk:1002,away:{abbr:'CCC'},home:{abbr:'DDD'},startTimeUTC:new Date().toISOString(),detailedStatus:'In Progress'}]};
 await sel.route('http://127.0.0.1:4173/slate.json**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fakeSlate)}));
 await sel.goto('http://127.0.0.1:4173/mlb-v925-selector-qa.html',{waitUntil:'domcontentloaded'});
 await sel.waitForFunction(()=>document.querySelectorAll('#tsoMlbLiveGameSwitcher select option').length===2,{timeout:10000});
 await sel.evaluate(()=>{window.__v925Select=document.querySelector('#tsoMlbLiveGameSwitcher select');});
 await sel.selectOption('#tsoMlbLiveGameSwitcher select','1002');
 await sel.waitForFunction(()=>document.querySelector('#tsoMlbInlineGamecast')?.dataset.gamePk==='1002',{timeout:5000});
 await sel.evaluate(()=>document.body.classList.toggle('qa-mutation'));
 await sel.waitForTimeout(250);
 const selector=await sel.evaluate(()=>{const s=document.querySelector('#tsoMlbLiveGameSwitcher select');return{same:s===window.__v925Select,value:s?.value,game:document.querySelector('#tsoMlbInlineGamecast')?.dataset.gamePk,options:s?.options?.length||0};});
 if(!selector.same||selector.value!=='1002'||selector.game!=='1002'||selector.options!==2)throw new Error(`game dropdown is unstable ${JSON.stringify(selector)}`);
 fs.writeFileSync(path.join(out,'mlb-v925-browser-qa.json'),JSON.stringify({layout:before,poll,selector},null,2));
 console.log('MLB v925 browser QA passed',JSON.stringify({layout:before,poll,selector}));
} finally {await browser.close();await new Promise(r=>server.close(r));fs.rmSync(layoutHarness,{force:true});fs.rmSync(selectorHarness,{force:true});}
