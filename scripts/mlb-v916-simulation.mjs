import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const outDir=path.join(root,'qa','showcase');
fs.mkdirSync(outDir,{recursive:true});

const eventHitData=p=>p?.hitData||[...(p?.playEvents||[])].reverse().find(e=>e?.hitData)?.hitData||null;
const isHr=p=>String(p?.result?.eventType||'').toLowerCase()==='home_run';
const usefulHit=p=>{const h=eventHitData(p)||{};return h.launchSpeed!=null||h.launchAngle!=null||h.totalDistance!=null;};
const runnerCount=p=>{
  const batter=String(p?.matchup?.batter?.id||'');
  const ids=new Set();
  for(const r of p?.runners||[]){
    const id=String(r?.details?.runner?.id||r?.details?.runner?.person?.id||'');
    const start=String(r?.movement?.start||'').toLowerCase();
    if(id&&id!==batter&&start&&start!=='home'&&start!=='score') ids.add(id);
  }
  return ids.size;
};

async function chooseGame(){
  let best=null;
  for(let n=1;n<=30;n++){
    const date=new Date(Date.now()-n*86400000).toISOString().slice(0,10);
    const sched=await (await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)).json();
    for(const g of (sched.dates||[]).flatMap(d=>d.games||[])){
      try{
        const feed=await (await fetch(`https://statsapi.mlb.com/api/v1.1/game/${g.gamePk}/feed/live?language=en`)).json();
        const hrs=(feed?.liveData?.plays?.allPlays||[]).filter(p=>isHr(p)&&usefulHit(p)).sort((a,b)=>runnerCount(b)-runnerCount(a));
        if(!hrs.length) continue;
        const r=runnerCount(hrs[0]);
        if(!best||r>best.runnerCount) best={gamePk:String(g.gamePk),runnerCount:r};
        if(r>=2) return best;
      }catch{}
    }
  }
  if(best) return best;
  throw new Error('No recent home run with Statcast data found');
}

const picked=await chooseGame();
const harness=path.join(root,'mlb-v916-simulation.html');
fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff;font-family:Arial}body{padding:12px}#tsoMlbInlineGamecast{width:min(1256px,calc(100vw - 24px));margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${picked.gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=sim916';
import {installMlbPlaystageConceptV904} from '/sports/mlb/playstage-concept-v904.js?v=sim916';
import {installMlbPlaystageConceptV905} from '/sports/mlb/playstage-concept-v905.js?v=sim916';
import {installMlbPlaystageConceptV906} from '/sports/mlb/playstage-concept-v906.js?v=sim916';
import {installMlbPlaystageConceptV907} from '/sports/mlb/playstage-concept-v907.js?v=sim916';
import {installMlbPlaystageConceptV908} from '/sports/mlb/playstage-concept-v908.js?v=sim916';
import {installMlbPlaystageConceptV909} from '/sports/mlb/playstage-concept-v909.js?v=sim916';
import {installMlbPlaystageConceptV910} from '/sports/mlb/playstage-concept-v910.js?v=sim916';
import {installMlbPlaystageConceptV911} from '/sports/mlb/playstage-concept-v911.js?v=sim916';
import {installMlbPlaystageConceptV912} from '/sports/mlb/playstage-concept-v912.js?v=sim916';
import {installMlbPlaystageConceptV913} from '/sports/mlb/playstage-concept-v913.js?v=sim916';
import {installMlbPlaystageConceptV914} from '/sports/mlb/playstage-concept-v914.js?v=sim916';
import {installMlbPlaystageConceptV915} from '/sports/mlb/playstage-concept-v915.js?v=sim916';
import {installMlbPlaystageConceptV916} from '/sports/mlb/playstage-concept-v916.js?v=sim916';
installMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();installMlbPlaystageConceptV916();
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

const patchFeed=async route=>{
  try{
    const response=await route.fetch();
    const feed=await response.json();
    const plays=feed?.liveData?.plays?.allPlays||[];
    const hrs=plays.filter(p=>isHr(p)&&usefulHit(p)).sort((a,b)=>runnerCount(b)-runnerCount(a));
    const target=hrs[0]||plays.at(-1);
    if(target){
      if(!target.hitData){const h=eventHitData(target);if(h)target.hitData=h;}
      feed.liveData.plays.currentPlay=target;
      feed.gameData.status={...(feed.gameData.status||{}),detailedState:'In Progress'};
    }
    await route.fulfill({status:response.status(),headers:response.headers(),contentType:'application/json',body:JSON.stringify(feed)});
  }catch(e){
    if(!/Target page|Target context|Target browser|closed/i.test(String(e?.message||e))) throw e;
  }
};

const browser=await chromium.launch({headless:true});
const videoDir=path.join('/tmp','tso-mlb-v916-sim');
fs.rmSync(videoDir,{recursive:true,force:true});fs.mkdirSync(videoDir,{recursive:true});
let metadata={gamePk:picked.gamePk,selectedRunnerCount:picked.runnerCount};
try{
  const ctx=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:videoDir,size:{width:1280,height:900}}});
  const page=await ctx.newPage();
  await page.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',patchFeed);
  await page.goto('http://127.0.0.1:4173/mlb-v916-simulation.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tso-mlb-concept-v916',{timeout:30000});
  await page.waitForFunction(()=>{
    const root=document.querySelector('.tso-mlb-playstage-v901');
    const actors=[...document.querySelectorAll('.ps-chibi')];
    const defense=actors.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner'));
    return root?.dataset?.fieldActors==='v916'&&defense.length===9&&actors.some(x=>x.classList.contains('ps-batter'));
  },{timeout:30000});
  metadata.start=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')];
    return {
      defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,
      batter:a.filter(x=>x.classList.contains('ps-batter')).length,
      runners:a.filter(x=>x.classList.contains('ps-runner')).length,
      visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length,
      headline:(document.querySelector('.ps-play-banner b')?.textContent||'').trim(),
      description:(document.querySelector('.ps-play-banner span:last-child')?.textContent||'').trim(),
      metrics:[...document.querySelectorAll('.ps-metric b')].map(x=>(x.textContent||'').trim())
    };
  });
  await page.waitForTimeout(7800);
  metadata.end=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')];
    return {defense:a.filter(x=>!x.classList.contains('ps-batter')&&!x.classList.contains('ps-runner')).length,batter:a.filter(x=>x.classList.contains('ps-batter')).length,runners:a.filter(x=>x.classList.contains('ps-runner')).length,visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length};
  });
  const video=page.video();
  await page.unrouteAll({behavior:'ignoreErrors'});
  await page.close();
  const videoPath=await video.path();
  await ctx.close();
  fs.copyFileSync(videoPath,path.join(outDir,'mlb-gamecast-home-run-simulation.webm'));
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
  fs.rmSync(harness,{force:true});
}

if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.visible<10) throw new Error(`v916 actor validation failed: ${JSON.stringify(metadata)}`);
fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json'),JSON.stringify(metadata,null,2));

const webm=path.join(outDir,'mlb-gamecast-home-run-simulation.webm');
const gif=path.join(outDir,'mlb-gamecast-home-run-simulation.gif');
const mp4=path.join(outDir,'mlb-gamecast-home-run-simulation.mp4');
let r=spawnSync('ffmpeg',['-y','-i',webm,'-vf','fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer','-loop','0',gif],{stdio:'inherit'});
if(r.status!==0) throw new Error('GIF conversion failed');
r=spawnSync('ffmpeg',['-y','-i',webm,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'inherit'});
if(r.status!==0) throw new Error('MP4 conversion failed');
console.log('MLB v916 simulation complete',metadata);
