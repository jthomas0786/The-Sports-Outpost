import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outDir=path.join(root,'qa');
fs.mkdirSync(outDir,{recursive:true});
const gamePk='822928';
const harness=path.join(root,'mlb-v920-mobile-qa.html');
const concepts=[904,905,906,907,908,909,910,911,912,913,914,915,916,917];
const imports=concepts.map(v=>`import {installMlbPlaystageConceptV${v}} from '/sports/mlb/playstage-concept-v${v}.js?v=qa920';`).join('\n');
const installs=concepts.map(v=>`installMlbPlaystageConceptV${v}();`).join('');
fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff}body{padding:8px}#tsoMlbInlineGamecast{width:100%;margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=qa920';
${imports}
import {installMlbPlaystageConceptV920Mobile} from '/sports/mlb/playstage-concept-v920-mobile.js?v=qa920';
installMlbPlaystageV901();${installs}installMlbPlaystageConceptV920Mobile();
</script></body></html>`);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');const target=path.resolve(root,rel||'index.html');if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}if(!fs.statSync(target).isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});

const browser=await chromium.launch({headless:true});
let report={};
try{
  const page=await browser.newPage({viewport:{width:390,height:1200},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4173/mlb-v920-mobile-qa.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tso-mlb-mobile-v920',{timeout:30000});
  await page.waitForSelector('.ps914-field',{timeout:30000});
  await page.waitForTimeout(1200);
  report=await page.evaluate(()=>{
    const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
    const visibleTabs=qa('.ps-right-tabs [data-ps-tab]').filter(x=>getComputedStyle(x).display!=='none').map(x=>({id:x.dataset.psTab,text:x.textContent.trim()}));
    const boxes=qa('.ps-bottom-box').map(x=>({label:x.querySelector('label')?.textContent.trim(),...(()=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}})()}));
    const inning=(q('.ps-inning')?.textContent||'').replace(/\s+/g,' ').trim();
    const stage=q('.ps-stage')?.getBoundingClientRect(),img=q('.ps914-field')?.getBoundingClientRect(),weather=q('.ps-weather')?.getBoundingClientRect(),bottom=q('.ps-bottom')?.getBoundingClientRect(),right=q('.ps-right')?.getBoundingClientRect(),lines=q('.ps-linescore')?.getBoundingClientRect();
    return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,mobileLayout:q('.tso-mlb-playstage-v901')?.dataset.mobileLayout||'',gridDisplay:getComputedStyle(q('.ps-grid')).display,stage:stage&&{x:stage.x,y:stage.y,w:stage.width,h:stage.height,b:stage.bottom},field:img&&{x:img.x,y:img.y,w:img.width,h:img.height,b:img.bottom,fit:getComputedStyle(q('.ps914-field')).objectFit},bottom:bottom&&{y:bottom.y,b:bottom.bottom,w:bottom.width},right:right&&{y:right.y,b:right.bottom,w:right.width},lines:lines&&{y:lines.y,b:lines.bottom,w:lines.width},weather:weather&&{w:weather.width,h:weather.height},inning,visibleTabs,boxes,baseMiniDisplay:q('.ps-bases-mini')?getComputedStyle(q('.ps-bases-mini')).display:'missing'};
  });
  if(report.docWidth>390) throw new Error(`mobile horizontal overflow ${report.docWidth}`);
  if(report.mobileLayout!=='v920'||report.gridDisplay!=='block') throw new Error(`v920 mobile layout not active: ${JSON.stringify(report)}`);
  if(!(report.stage?.w>=370&&Math.abs(report.field.w-report.stage.w)<2&&Math.abs(report.field.h-report.stage.h)<2&&report.field.fit==='contain')) throw new Error(`field does not fit mobile stage: ${JSON.stringify(report)}`);
  if(JSON.stringify(report.visibleTabs)!==JSON.stringify([{id:'live',text:'Live'},{id:'box',text:'Box'}])) throw new Error(`expected only Live/Box buttons: ${JSON.stringify(report.visibleTabs)}`);
  if(/OUT|\d\s*-\s*\d/.test(report.inning)||!['none','missing'].includes(report.baseMiniDisplay)) throw new Error(`header still contains count/outs/bases: ${JSON.stringify({inning:report.inning,base:report.baseMiniDisplay})}`);
  if(!(report.weather?.w<=54)) throw new Error(`weather is still too wide: ${JSON.stringify(report.weather)}`);
  const byLabel=Object.fromEntries(report.boxes.map(x=>[x.label,x]));
  if(!byLabel.Outs||!byLabel.Count||!byLabel.Bases) throw new Error(`missing mobile state boxes: ${JSON.stringify(report.boxes)}`);
  if(Math.max(byLabel.Outs.y,byLabel.Count.y,byLabel.Bases.y)-Math.min(byLabel.Outs.y,byLabel.Count.y,byLabel.Bases.y)>2) throw new Error('Outs/Count/Bases are not in one row');
  if(!(report.lines.y>Math.max(byLabel.Outs.b,byLabel.Count.b,byLabel.Bases.b)-2)) throw new Error('innings line is not beneath state row');
  if(!(report.bottom.y>=report.stage.b-2&&report.right.y>=report.bottom.b-2)) throw new Error(`mobile order must be field -> state/innings -> tabs: ${JSON.stringify(report)}`);
  await page.click('[data-ps-tab="box"]');
  await page.waitForTimeout(100);
  const boxState=await page.evaluate(()=>({box:!document.querySelector('[data-ps-panel="box"]')?.hidden,live:!document.querySelector('[data-ps-panel="live"]')?.hidden}));
  if(!boxState.box||boxState.live) throw new Error(`Box switch failed: ${JSON.stringify(boxState)}`);
  await page.click('[data-ps-tab="live"]');
  await page.waitForTimeout(100);
  const liveState=await page.evaluate(()=>({box:!document.querySelector('[data-ps-panel="box"]')?.hidden,live:!document.querySelector('[data-ps-panel="live"]')?.hidden}));
  if(!liveState.live||liveState.box) throw new Error(`Live switch failed: ${JSON.stringify(liveState)}`);
  report.tabSwitch={passed:true,boxState,liveState};
  await page.screenshot({path:path.join(outDir,'mlb-playstage-v920-mobile.png'),fullPage:true});
  fs.writeFileSync(path.join(outDir,'mlb-playstage-v920-mobile.json'),JSON.stringify(report,null,2));
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(harness,{force:true});
}
console.log('MLB v920 mobile visual QA OK',report);
