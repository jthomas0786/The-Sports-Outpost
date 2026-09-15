import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'qa');
fs.mkdirSync(out,{recursive:true});
const gamePk='822928';
const harness=path.join(root,'mlb-v923-desktop-qa.html');

fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff;font-family:Arial}body{padding:16px}#tsoMlbInlineGamecast{width:1440px;max-width:calc(100vw - 32px);margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=qa923';
import {installMlbPlaystageConceptV904} from '/sports/mlb/playstage-concept-v904.js?v=qa923';
import {installMlbPlaystageConceptV905} from '/sports/mlb/playstage-concept-v905.js?v=qa923';
import {installMlbPlaystageConceptV906} from '/sports/mlb/playstage-concept-v906.js?v=qa923';
import {installMlbPlaystageConceptV907} from '/sports/mlb/playstage-concept-v907.js?v=qa923';
import {installMlbPlaystageConceptV908} from '/sports/mlb/playstage-concept-v908.js?v=qa923';
import {installMlbPlaystageConceptV909} from '/sports/mlb/playstage-concept-v909.js?v=qa923';
import {installMlbPlaystageConceptV910} from '/sports/mlb/playstage-concept-v910.js?v=qa923';
import {installMlbPlaystageConceptV911} from '/sports/mlb/playstage-concept-v911.js?v=qa923';
import {installMlbPlaystageConceptV912} from '/sports/mlb/playstage-concept-v912.js?v=qa923';
import {installMlbPlaystageConceptV913} from '/sports/mlb/playstage-concept-v913.js?v=qa923';
import {installMlbPlaystageConceptV914} from '/sports/mlb/playstage-concept-v914.js?v=qa923';
import {installMlbPlaystageConceptV915} from '/sports/mlb/playstage-concept-v915.js?v=qa923';
import {installMlbPlaystageConceptV916} from '/sports/mlb/playstage-concept-v916.js?v=qa923';
import {installMlbPlaystageConceptV917} from '/sports/mlb/playstage-concept-v917.js?v=qa923';
import {installMlbPlaystageConceptV920Mobile} from '/sports/mlb/playstage-concept-v920-mobile.js?v=qa923';
import {installMlbPlaystageConceptV921Mobile} from '/sports/mlb/playstage-concept-v921-mobile.js?v=qa923';
import {installMlbPlaystageConceptV922Desktop} from '/sports/mlb/playstage-concept-v922-desktop.js?v=qa923';
import {installMlbPlaystageConceptV923DesktopTabs} from '/sports/mlb/playstage-concept-v923-desktop-tabs.js?v=qa923';
installMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();installMlbPlaystageConceptV916();installMlbPlaystageConceptV917();installMlbPlaystageConceptV920Mobile();installMlbPlaystageConceptV921Mobile();installMlbPlaystageConceptV922Desktop();installMlbPlaystageConceptV923DesktopTabs();
</script></body></html>`);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');
    const target=path.resolve(root,rel||'index.html');
    if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
    if(!fs.statSync(target).isFile()){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});

let patchedFeed=null;
async function getPatchedFeed(){
  if(patchedFeed) return structuredClone(patchedFeed);
  const raw=await (await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live?language=en`)).json();
  const plays=raw?.liveData?.plays?.allPlays||[];
  const hr=plays.find(p=>String(p?.result?.eventType||'').toLowerCase()==='home_run')||plays.at(-1);
  if(hr){raw.liveData.plays.currentPlay=hr;raw.gameData.status={...(raw.gameData.status||{}),detailedState:'In Progress'};}
  patchedFeed=raw;
  return structuredClone(raw);
}

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1536,height:1150},deviceScaleFactor:1});
  await page.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',async route=>{
    try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await getPatchedFeed())});}
    catch(e){await route.abort();}
  });
  await page.goto('http://127.0.0.1:4173/mlb-v923-desktop-qa.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tso-mlb-desktop-v923',{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('.ps-chibi[data-actor-kind="defender"]').length===9,{timeout:30000});
  await page.waitForTimeout(500);

  const layout=await page.evaluate(()=>{
    const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],rr=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null};
    const root=q('.tso-mlb-playstage-v901'),footer=q('.v923-game-footer'),state=q('.v923-state-wrap'),live=q('.v923-live-wrap'),line=q('.ps-linescore'),boxes=qa('.ps-bottom-box'),batter=q('.ps-chibi[data-actor-kind="batter"]');
    return {
      viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
      root:rr(root),grid:rr(q('.ps-grid')),center:rr(q('.ps-center')),rightDisplay:getComputedStyle(q('.ps-right')).display,
      nav:qa('.v923-view-tabs button').map(b=>b.textContent.trim()),
      footer:rr(footer),state:rr(state),live:rr(live),line:rr(line),boxes:boxes.map(rr),
      banner:rr(q('.ps-play-banner')),batter:rr(batter),desktopView:root?.dataset.desktopView||'',desktopLayout:root?.dataset.desktopLayout||''
    };
  });

  if(layout.docWidth>layout.viewport) throw new Error(`desktop overflow: ${JSON.stringify(layout)}`);
  if(layout.rightDisplay!=='none') throw new Error('old right rail is still visible');
  if(JSON.stringify(layout.nav)!==JSON.stringify(['Gamecast','Box Score','Play by Play'])) throw new Error(`wrong top tabs: ${JSON.stringify(layout.nav)}`);
  if(layout.desktopLayout!=='v923'||layout.desktopView!=='gamecast') throw new Error(`v923 state missing: ${JSON.stringify(layout)}`);
  if(!layout.footer||layout.footer.left<layout.root.left-1||layout.footer.right>layout.root.right+1) throw new Error(`footer escapes border: ${JSON.stringify(layout)}`);
  if(!(layout.live.x>layout.state.x&&layout.state.right<=layout.live.x)) throw new Error(`live PBP is not beside state area: ${JSON.stringify(layout)}`);
  if(layout.boxes.length!==3||!layout.boxes.every(b=>Math.abs(b.y-layout.boxes[0].y)<2)) throw new Error(`bases/count/outs not on one row: ${JSON.stringify(layout.boxes)}`);
  if(!(layout.line.y>layout.boxes[0].y+20)) throw new Error(`innings are not beneath state boxes: ${JSON.stringify(layout)}`);
  if(!layout.batter||Math.abs(layout.batter.w-50)>1||Math.abs(layout.batter.h-72)>1) throw new Error(`batter not normal scale: ${JSON.stringify(layout.batter)}`);
  await page.screenshot({path:path.join(out,'mlb-v923-desktop-gamecast.png'),fullPage:true});

  await page.click('.v923-view-tabs [data-v923-view="box"]');
  await page.waitForSelector('.v923-alt-screen[data-v923-view="box"] .v923-box-teams .v923-table tbody tr',{timeout:15000});
  const boxState=await page.evaluate(()=>({view:document.querySelector('.tso-mlb-playstage-v901')?.dataset.desktopView,grid:document.querySelector('.ps-grid')?.hidden,teams:document.querySelectorAll('.v923-box-teams .v923-team-box').length,tables:document.querySelectorAll('.v923-box-teams .v923-table').length}));
  if(boxState.view!=='box'||!boxState.grid||boxState.teams!==2||boxState.tables<4) throw new Error(`box score screen failed: ${JSON.stringify(boxState)}`);
  await page.screenshot({path:path.join(out,'mlb-v923-desktop-box-score.png'),fullPage:true});

  await page.click('.v923-view-tabs [data-v923-view="plays"]');
  await page.waitForSelector('.v923-alt-screen[data-v923-view="plays"] .v923-pbp-row',{timeout:15000});
  const playsState=await page.evaluate(()=>({view:document.querySelector('.tso-mlb-playstage-v901')?.dataset.desktopView,rows:document.querySelectorAll('.v923-pbp-row').length}));
  if(playsState.view!=='plays'||playsState.rows<10) throw new Error(`play-by-play screen failed: ${JSON.stringify(playsState)}`);
  await page.screenshot({path:path.join(out,'mlb-v923-desktop-play-by-play.png'),fullPage:true});

  fs.writeFileSync(path.join(out,'mlb-v923-desktop-qa.json'),JSON.stringify({gamePk,layout,boxState,playsState},null,2));
  console.log('MLB v923 desktop visual QA passed',JSON.stringify({layout,boxState,playsState}));
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(harness,{force:true});
}
