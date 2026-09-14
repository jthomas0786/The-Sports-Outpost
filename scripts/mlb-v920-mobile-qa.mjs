import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outDir=path.join(root,'qa');
fs.mkdirSync(outDir,{recursive:true});
const gamePk='822928';
const harness=path.join(root,'mlb-v921-mobile-qa.html');
const concepts=[904,905,906,907,908,909,910,911,912,913,914,915,916,917];
const imports=concepts.map(v=>`import {installMlbPlaystageConceptV${v}} from '/sports/mlb/playstage-concept-v${v}.js?v=qa921';`).join('\n');
const installs=concepts.map(v=>`installMlbPlaystageConceptV${v}();`).join('');
fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff}body{padding:8px}#tsoMlbInlineGamecast{width:100%;margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=qa921';
${imports}
import {installMlbPlaystageConceptV920Mobile} from '/sports/mlb/playstage-concept-v920-mobile.js?v=qa921';
import {installMlbPlaystageConceptV921Mobile} from '/sports/mlb/playstage-concept-v921-mobile.js?v=qa921';
installMlbPlaystageV901();${installs}installMlbPlaystageConceptV920Mobile();installMlbPlaystageConceptV921Mobile();
</script></body></html>`);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');const target=path.resolve(root,rel||'index.html');if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}if(!fs.statSync(target).isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});

const browser=await chromium.launch({headless:true});
let report={};
try{
  const page=await browser.newPage({viewport:{width:390,height:1200},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4173/mlb-v921-mobile-qa.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tso-mlb-mobile-v921',{timeout:30000});
  await page.waitForSelector('.ps914-field',{timeout:30000});
  await page.waitForTimeout(1200);
  report=await page.evaluate(()=>{
    const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
    const rr=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2}:null};
    const visibleTabs=qa('.ps-center > .ps-right-tabs [data-ps-tab]').filter(x=>getComputedStyle(x).display!=='none').map(x=>({id:x.dataset.psTab,text:x.textContent.trim()}));
    const boxes=qa('.ps-bottom-box').map(x=>({label:x.querySelector('label')?.textContent.trim(),...rr(x)}));
    const inning=(q('.ps-inning')?.textContent||'').replace(/\s+/g,' ').trim();
    const teams=qa('.ps-score .ps-team').map(rr),scores=qa('.ps-score-num').map(rr);
    const baseboard=rr(q('.ps-baseboard'));
    const basesBox=boxes.find(x=>x.label==='Bases')||null;
    return {
      viewport:innerWidth,
      docWidth:document.documentElement.scrollWidth,
      mobileLayout:q('.tso-mlb-playstage-v901')?.dataset.mobileLayout||'',
      mobilePolish:q('.tso-mlb-playstage-v901')?.dataset.mobilePolish||'',
      gridDisplay:getComputedStyle(q('.ps-grid')).display,
      stage:rr(q('.ps-stage')),
      field:{...rr(q('.ps914-field')),fit:getComputedStyle(q('.ps914-field')).objectFit},
      banner:rr(q('.ps-play-banner')),
      tabs:rr(q('.ps-center > .ps-right-tabs')),
      bottom:rr(q('.ps-bottom')),
      right:rr(q('.ps-right')),
      lines:rr(q('.ps-linescore')),
      weather:rr(q('.ps-weather')),
      weatherBlock:rr(q('.ps-weather-block')),
      inning,visibleTabs,boxes,baseboard,basesBox,teams,scores,
      baseMiniDisplay:q('.ps-bases-mini')?getComputedStyle(q('.ps-bases-mini')).display:'missing'
    };
  });

  if(report.docWidth>390) throw new Error(`mobile horizontal overflow ${report.docWidth}`);
  if(report.mobileLayout!=='v920'||report.mobilePolish!=='v921'||report.gridDisplay!=='block') throw new Error(`v921 mobile layout not active: ${JSON.stringify(report)}`);
  if(!(report.stage?.w>=370&&Math.abs(report.field.w-report.stage.w)<2&&Math.abs(report.field.h-report.stage.h)<2&&report.field.fit==='contain')) throw new Error(`field does not fit mobile stage: ${JSON.stringify(report)}`);
  if(JSON.stringify(report.visibleTabs)!==JSON.stringify([{id:'live',text:'Live'},{id:'box',text:'Box'}])) throw new Error(`expected visible Live/Box buttons: ${JSON.stringify(report.visibleTabs)}`);
  if(/OUT|\d\s*-\s*\d/.test(report.inning)||!['none','missing'].includes(report.baseMiniDisplay)) throw new Error(`header still contains count/outs/bases: ${JSON.stringify({inning:report.inning,base:report.baseMiniDisplay})}`);
  if(!(report.weather?.w<=36&&report.weatherBlock?.w<=36)) throw new Error(`weather is still too wide: ${JSON.stringify({weather:report.weather,block:report.weatherBlock})}`);

  if(!(report.banner?.y>=report.stage.b+4)) throw new Error(`Live At-Bat banner still overlaps field: ${JSON.stringify({stage:report.stage,banner:report.banner})}`);
  if(!(report.tabs?.y>=report.banner.b-2)) throw new Error(`Live/Box tabs are not below live status: ${JSON.stringify({banner:report.banner,tabs:report.tabs})}`);
  if(!(report.bottom?.y>=report.tabs.b-2)) throw new Error(`game state must follow Live/Box tabs: ${JSON.stringify({tabs:report.tabs,bottom:report.bottom})}`);
  if(!(report.right?.y>=report.bottom.b-2)) throw new Error(`selected panel must follow mobile scoreboard: ${JSON.stringify({bottom:report.bottom,right:report.right})}`);

  const byLabel=Object.fromEntries(report.boxes.map(x=>[x.label,x]));
  if(!byLabel.Outs||!byLabel.Count||!byLabel.Bases) throw new Error(`missing mobile state boxes: ${JSON.stringify(report.boxes)}`);
  if(Math.max(byLabel.Outs.y,byLabel.Count.y,byLabel.Bases.y)-Math.min(byLabel.Outs.y,byLabel.Count.y,byLabel.Bases.y)>2) throw new Error('Outs/Count/Bases are not in one row');
  if(!(report.lines.y>Math.max(byLabel.Outs.b,byLabel.Count.b,byLabel.Bases.b)-2)) throw new Error('innings line is not beneath state row');
  if(!(report.baseboard&&report.basesBox&&Math.abs(report.baseboard.cx-report.basesBox.cx)<=3&&report.baseboard.x>=report.basesBox.x&&report.baseboard.r<=report.basesBox.r)) throw new Error(`bases diamond is not centered/contained: ${JSON.stringify({board:report.baseboard,box:report.basesBox})}`);

  if(report.teams.length!==2||report.scores.length!==2) throw new Error(`score header parts missing: ${JSON.stringify({teams:report.teams,scores:report.scores})}`);
  const awayGap=report.scores[0].x-report.teams[0].r;
  const homeGap=report.teams[1].x-report.scores[1].r;
  report.scorePairGaps={away:awayGap,home:homeGap};
  if(awayGap<0||awayGap>10||homeGap<0||homeGap>10) throw new Error(`scores are not tight to team names/logos: ${JSON.stringify(report.scorePairGaps)}`);

  await page.click('.ps-center > .ps-right-tabs [data-ps-tab="box"]');
  await page.waitForTimeout(100);
  const boxState=await page.evaluate(()=>({box:!document.querySelector('[data-ps-panel="box"]')?.hidden,live:!document.querySelector('[data-ps-panel="live"]')?.hidden}));
  if(!boxState.box||boxState.live) throw new Error(`Box switch failed: ${JSON.stringify(boxState)}`);
  await page.click('.ps-center > .ps-right-tabs [data-ps-tab="live"]');
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
console.log('MLB v921 mobile visual QA OK',report);
