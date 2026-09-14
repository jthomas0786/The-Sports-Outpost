import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const outDir=path.join(root,'qa','showcase');
fs.mkdirSync(outDir,{recursive:true});

const eventHitData=p=>{
  if(p?.hitData) return p.hitData;
  const ev=[...(p?.playEvents||[])].reverse().find(e=>e?.hitData);
  return ev?.hitData||null;
};
const isHr=p=>String(p?.result?.eventType||'').toLowerCase()==='home_run';
const usefulHit=p=>{
  const h=eventHitData(p)||{};
  return h.launchSpeed!=null||h.launchAngle!=null||h.totalDistance!=null;
};

async function findGame(){
  let fallback=null;
  for(const n of Array.from({length:14},(_,i)=>i+1)){
    const date=new Date(Date.now()-n*86400000).toISOString().slice(0,10);
    const sched=await (await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)).json();
    for(const g of (sched.dates||[]).flatMap(d=>d.games||[])){
      try{
        const feed=await (await fetch(`https://statsapi.mlb.com/api/v1.1/game/${g.gamePk}/feed/live?language=en`)).json();
        const plays=feed?.liveData?.plays?.allPlays||[];
        if(plays.some(p=>isHr(p)&&usefulHit(p))) return {gamePk:String(g.gamePk),preferred:'home_run'};
        if(!fallback&&plays.some(usefulHit)) fallback={gamePk:String(g.gamePk),preferred:'hit'};
      }catch{}
    }
  }
  if(fallback) return fallback;
  throw new Error('No recent MLB game with usable hit data found');
}

const picked=await findGame();
const harness=path.join(root,'mlb-gamecast-showcase.html');
fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff;font-family:Arial}body{padding:12px}#tsoMlbInlineGamecast{width:min(1512px,calc(100vw - 24px));margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${picked.gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=showcase';
import {installMlbPlaystageConceptV904} from '/sports/mlb/playstage-concept-v904.js?v=showcase';
import {installMlbPlaystageConceptV905} from '/sports/mlb/playstage-concept-v905.js?v=showcase';
import {installMlbPlaystageConceptV906} from '/sports/mlb/playstage-concept-v906.js?v=showcase';
import {installMlbPlaystageConceptV907} from '/sports/mlb/playstage-concept-v907.js?v=showcase';
import {installMlbPlaystageConceptV908} from '/sports/mlb/playstage-concept-v908.js?v=showcase';
import {installMlbPlaystageConceptV909} from '/sports/mlb/playstage-concept-v909.js?v=showcase';
import {installMlbPlaystageConceptV910} from '/sports/mlb/playstage-concept-v910.js?v=showcase';
import {installMlbPlaystageConceptV911} from '/sports/mlb/playstage-concept-v911.js?v=showcase';
import {installMlbPlaystageConceptV912} from '/sports/mlb/playstage-concept-v912.js?v=showcase';
import {installMlbPlaystageConceptV913} from '/sports/mlb/playstage-concept-v913.js?v=showcase';
import {installMlbPlaystageConceptV914} from '/sports/mlb/playstage-concept-v914.js?v=showcase';
import {installMlbPlaystageConceptV915} from '/sports/mlb/playstage-concept-v915.js?v=showcase';
installMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();
</script></body></html>`);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');
    const target=path.resolve(root,rel||'index.html');
    if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
    const st=fs.statSync(target);
    if(!st.isFile()){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});

const patchFeed=async route=>{
  const response=await route.fetch();
  const feed=await response.json();
  const plays=feed?.liveData?.plays?.allPlays||[];
  const preferred=[...plays].reverse().find(p=>isHr(p)&&usefulHit(p));
  const target=preferred||[...plays].reverse().find(usefulHit)||plays.at(-1);
  if(target){
    if(!target.hitData){
      const h=eventHitData(target);
      if(h) target.hitData=h;
    }
    feed.liveData.plays.currentPlay=target;
    feed.gameData.status={...(feed.gameData.status||{}),detailedState:'In Progress'};
  }
  await route.fulfill({status:response.status(),headers:response.headers(),contentType:'application/json',body:JSON.stringify(feed)});
};

async function ready(page){
  await page.waitForSelector('.tso-mlb-concept-v915',{timeout:30000});
  await page.waitForFunction(()=>{const f=document.querySelector('.ps914-field');return f?.complete&&f.naturalWidth>0&&f.getAttribute('src')==='./field-bg.jpg'},{timeout:30000});
}
async function inspect(page){
  return page.evaluate(()=>({
    viewport:innerWidth,
    docWidth:document.documentElement.scrollWidth,
    headline:(document.querySelector('.ps-play-banner b')?.textContent||'').trim(),
    description:(document.querySelector('.ps-play-banner span:last-child')?.textContent||'').trim(),
    metrics:[...document.querySelectorAll('.ps-metric b')].map(x=>(x.textContent||'').trim()),
    field:[document.querySelector('.ps914-field')?.naturalWidth||0,document.querySelector('.ps914-field')?.naturalHeight||0],
    fonts:{
      atBat:parseFloat(getComputedStyle(document.querySelector('.v915-atbat-card .ps-player h3')).fontSize),
      pitcher:parseFloat(getComputedStyle(document.querySelector('.v915-pitcher-card .ps-player h3')).fontSize),
      event:parseFloat(getComputedStyle(document.querySelector('.ps-play-banner b')).fontSize),
      metric:parseFloat(getComputedStyle(document.querySelector('.ps-metric b')).fontSize)
    }
  }));
}

const browser=await chromium.launch({headless:true});
try{
  const desktop=await browser.newPage({viewport:{width:1536,height:1100},deviceScaleFactor:1});
  await desktop.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',patchFeed);
  await desktop.goto('http://127.0.0.1:4173/mlb-gamecast-showcase.html',{waitUntil:'domcontentloaded'});
  await ready(desktop);await desktop.waitForTimeout(4300);
  await desktop.locator('.tso-mlb-playstage-v901').screenshot({path:path.join(outDir,'mlb-gamecast-desktop.png')});
  const d=await inspect(desktop);
  await desktop.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await mobile.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',patchFeed);
  await mobile.goto('http://127.0.0.1:4173/mlb-gamecast-showcase.html',{waitUntil:'domcontentloaded'});
  await ready(mobile);await mobile.waitForTimeout(4300);
  await mobile.locator('.tso-mlb-playstage-v901').screenshot({path:path.join(outDir,'mlb-gamecast-mobile.png')});
  const m=await inspect(mobile);
  await mobile.close();

  const videoDir=path.join('/tmp','tso-mlb-showcase-video');
  fs.rmSync(videoDir,{recursive:true,force:true});fs.mkdirSync(videoDir,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:videoDir,size:{width:1280,height:900}}});
  const page=await ctx.newPage();
  await page.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',patchFeed);
  await page.goto('http://127.0.0.1:4173/mlb-gamecast-showcase.html',{waitUntil:'domcontentloaded'});
  await ready(page);await page.waitForTimeout(6800);
  const video=page.video();
  await page.close();
  const videoPath=await video.path();
  await ctx.close();
  fs.copyFileSync(videoPath,path.join(outDir,'mlb-gamecast-home-run-simulation.webm'));

  fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json'),JSON.stringify({gamePk:picked.gamePk,preferred:picked.preferred,desktop:d,mobile:m},null,2));
  const metricsPopulated=d.metrics.some(x=>x&&x!=='—');
  if(!d.headline||!m.headline||!metricsPopulated||m.docWidth>m.viewport+1||m.fonts.atBat<10||m.fonts.pitcher<10||m.fonts.event<11||m.fonts.metric<9) throw new Error(`Showcase QA failed: ${JSON.stringify({d,m})}`);
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(harness,{force:true});
}

const webm=path.join(outDir,'mlb-gamecast-home-run-simulation.webm');
const gif=path.join(outDir,'mlb-gamecast-home-run-simulation.gif');
const mp4=path.join(outDir,'mlb-gamecast-home-run-simulation.mp4');
let r=spawnSync('ffmpeg',['-y','-i',webm,'-vf','fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer','-loop','0',gif],{stdio:'inherit'});
if(r.status!==0) throw new Error('GIF conversion failed');
r=spawnSync('ffmpeg',['-y','-i',webm,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'inherit'});
if(r.status!==0) throw new Error('MP4 conversion failed');
console.log('MLB Gamecast showcase capture complete',picked);
