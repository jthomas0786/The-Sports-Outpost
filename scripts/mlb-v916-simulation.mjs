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
const harness=path.join(root,'mlb-v919-simulation.html');
fs.writeFileSync(harness,`<!doctype html><html lang="en" data-sport="mlb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#020814;color:#fff;font-family:Arial}body{padding:12px}#tsoMlbInlineGamecast{width:min(1256px,calc(100vw - 24px));margin:auto}.mlb-live-gc-shell{min-height:0}</style></head><body><div id="tsoMlbInlineGamecast" data-game-pk="${picked.gamePk}"><div class="mlb-live-gc-shell"></div></div><script type="module">
import {installMlbPlaystageV901} from '/sports/mlb/playstage-v901.js?v=sim919';
import {installMlbPlaystageConceptV904} from '/sports/mlb/playstage-concept-v904.js?v=sim919';
import {installMlbPlaystageConceptV905} from '/sports/mlb/playstage-concept-v905.js?v=sim919';
import {installMlbPlaystageConceptV906} from '/sports/mlb/playstage-concept-v906.js?v=sim919';
import {installMlbPlaystageConceptV907} from '/sports/mlb/playstage-concept-v907.js?v=sim919';
import {installMlbPlaystageConceptV908} from '/sports/mlb/playstage-concept-v908.js?v=sim919';
import {installMlbPlaystageConceptV909} from '/sports/mlb/playstage-concept-v909.js?v=sim919';
import {installMlbPlaystageConceptV910} from '/sports/mlb/playstage-concept-v910.js?v=sim919';
import {installMlbPlaystageConceptV911} from '/sports/mlb/playstage-concept-v911.js?v=sim919';
import {installMlbPlaystageConceptV912} from '/sports/mlb/playstage-concept-v912.js?v=sim919';
import {installMlbPlaystageConceptV913} from '/sports/mlb/playstage-concept-v913.js?v=sim919';
import {installMlbPlaystageConceptV914} from '/sports/mlb/playstage-concept-v914.js?v=sim919';
import {installMlbPlaystageConceptV915} from '/sports/mlb/playstage-concept-v915.js?v=sim919';
import {installMlbPlaystageConceptV916} from '/sports/mlb/playstage-concept-v916.js?v=sim919';
import {installMlbPlaystageConceptV917} from '/sports/mlb/playstage-concept-v917.js?v=sim919';
installMlbPlaystageV901();installMlbPlaystageConceptV904();installMlbPlaystageConceptV905();installMlbPlaystageConceptV906();installMlbPlaystageConceptV907();installMlbPlaystageConceptV908();installMlbPlaystageConceptV909();installMlbPlaystageConceptV910();installMlbPlaystageConceptV911();installMlbPlaystageConceptV912();installMlbPlaystageConceptV913();installMlbPlaystageConceptV914();installMlbPlaystageConceptV915();installMlbPlaystageConceptV916();installMlbPlaystageConceptV917();
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
const videoDir=path.join('/tmp','tso-mlb-v919-sim');
fs.rmSync(videoDir,{recursive:true,force:true});fs.mkdirSync(videoDir,{recursive:true});
let metadata={simulationVersion:'v919',gamePk:picked.gamePk,selectedRunnerCount:picked.runnerCount};
try{
  const ctx=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:videoDir,size:{width:1280,height:900}}});
  const page=await ctx.newPage();
  await page.route('https://statsapi.mlb.com/api/v1.1/game/**/feed/live?language=en',patchFeed);
  await page.goto('http://127.0.0.1:4173/mlb-v919-simulation.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tso-mlb-concept-v917',{timeout:30000});
  await page.waitForFunction(()=>{
    const root=document.querySelector('.tso-mlb-playstage-v901');
    const actors=[...document.querySelectorAll('.ps-chibi')];
    const defense=actors.filter(x=>x.dataset.actorKind==='defender');
    const runners=actors.filter(x=>x.dataset.actorKind==='runner');
    const batter=actors.filter(x=>x.dataset.actorKind==='batter');
    return root?.dataset?.actorRoles==='v917'&&defense.length===9&&batter.length===1&&runners.length===2;
  },{timeout:30000});
  metadata.start=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')],take=x=>({id:x.dataset.playerId||'',kind:x.dataset.actorKind||'',role:x.dataset.actorRole||'',team:x.dataset.team||'',base:x.dataset.base||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0,c1:getComputedStyle(x).getPropertyValue('--c1').trim(),c2:getComputedStyle(x).getPropertyValue('--c2').trim()});
    const defenders=a.filter(x=>x.dataset.actorKind==='defender'),runners=a.filter(x=>x.dataset.actorKind==='runner'),batters=a.filter(x=>x.dataset.actorKind==='batter');
    return {
      defense:defenders.length,defenderState:defenders.map(take),
      batter:batters.length,batterState:batters.map(take),
      runners:runners.length,runnerState:runners.map(take),
      offensiveActors:runners.length+batters.length,
      visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length,
      labels:a.map(x=>(x.querySelector('.ps-actor-label b')?.textContent||'').trim()),
      teams:[...new Set(a.map(x=>x.dataset.team).filter(Boolean))],
      headline:(document.querySelector('.ps-play-banner b')?.textContent||'').trim(),
      description:(document.querySelector('.ps-play-banner span:last-child')?.textContent||'').trim(),
      metrics:[...document.querySelectorAll('.ps-metric b')].map(x=>(x.textContent||'').trim())
    };
  });
  await page.waitForSelector('.ps-trajectory.is-active',{timeout:15000});
  await page.waitForTimeout(520);
  metadata.trajectory=await page.evaluate(()=>{
    const svg=document.querySelector('.ps-trajectory'),line=document.querySelector('.ps-trajectory-flight'),glow=document.querySelector('.ps-trajectory-glow'),head=document.querySelector('.ps-trajectory-head'),dot=document.querySelector('.ps-trajectory-landing'),ball=document.querySelector('.ps-ball'),rf=document.querySelector('.ps-chibi[data-actor-kind="defender"][data-actor-role="RF"]'),stage=document.querySelector('.ps-stage');
    const cs=line?getComputedStyle(line):null,rr=rf?.getBoundingClientRect(),sr=stage?.getBoundingClientRect();
    return {
      active:!!svg?.classList.contains('is-active'),
      path:line?.getAttribute('d')||'',glowPath:glow?.getAttribute('d')||'',
      stroke:cs?.stroke||'',strokeWidth:cs?.strokeWidth||'',strokeDasharray:cs?.strokeDasharray||'',
      landing:{x:Number(dot?.getAttribute('cx')),y:Number(dot?.getAttribute('cy'))},landingOpacity:dot?Number(getComputedStyle(dot).opacity):0,
      head:{x:Number(head?.getAttribute('cx')),y:Number(head?.getAttribute('cy')),opacity:head?Number(getComputedStyle(head).opacity):0},
      ball:{x:parseFloat(ball?.style.left)||0,y:parseFloat(ball?.style.top)||0,opacity:ball?Number(getComputedStyle(ball).opacity):0},
      rightFielder:rr&&sr?{x:((rr.left+rr.width/2-sr.left)/sr.width)*100,y:((rr.top+rr.height/2-sr.top)/sr.height)*100}:null
    };
  });
  await page.waitForTimeout(7800);
  metadata.end=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('.ps-chibi')],take=x=>({id:x.dataset.playerId||'',kind:x.dataset.actorKind||'',role:x.dataset.actorRole||'',team:x.dataset.team||'',left:parseFloat(x.style.left)||0,top:parseFloat(x.style.top)||0,opacity:parseFloat(getComputedStyle(x).opacity)||0});
    const defenders=a.filter(x=>x.dataset.actorKind==='defender'),runners=a.filter(x=>x.dataset.actorKind==='runner'),batters=a.filter(x=>x.dataset.actorKind==='batter');
    return {defense:defenders.length,defenderState:defenders.map(take),batter:batters.length,batterState:batters.map(take),runners:runners.length,runnerState:runners.map(take),visible:a.filter(x=>parseFloat(getComputedStyle(x).opacity)>.01).length};
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

if(metadata.simulationVersion!=='v919') throw new Error('Simulation recorder did not upgrade to v919');
if(!metadata.trajectory?.active||!metadata.trajectory?.path) throw new Error(`Blue trajectory was not rendered: ${JSON.stringify(metadata.trajectory)}`);
if(metadata.trajectory.path!==metadata.trajectory.glowPath) throw new Error('Trajectory glow and flight line must follow the same path');
if(!metadata.trajectory?.head||metadata.trajectory.head.opacity<=0) throw new Error(`Moving trajectory glow head is not visible: ${JSON.stringify(metadata.trajectory?.head)}`);
if(Math.hypot(metadata.trajectory.head.x-metadata.trajectory.ball.x,metadata.trajectory.head.y-metadata.trajectory.ball.y)>.8) throw new Error(`Glow head is not following the baseball: ${JSON.stringify({head:metadata.trajectory.head,ball:metadata.trajectory.ball})}`);
if(metadata.trajectory.strokeDasharray&&metadata.trajectory.strokeDasharray!=='none'&&metadata.trajectory.strokeDasharray!=='0px') throw new Error(`Trajectory must be solid, not dashed/dotted: ${metadata.trajectory.strokeDasharray}`);
if(!metadata.trajectory.rightFielder||metadata.trajectory.rightFielder.y<34||metadata.trajectory.rightFielder.x>86) throw new Error(`Right fielder left playable outfield: ${JSON.stringify(metadata.trajectory.rightFielder)}`);

if(!/45, 127, 255|45,127,255|#2d7fff/i.test(String(metadata.trajectory.stroke))) throw new Error(`Trajectory is not Sports Outpost blue: ${metadata.trajectory.stroke}`);
if(!(metadata.trajectory.landing?.x>55&&metadata.trajectory.landing?.y<32)) throw new Error(`Home-run landing is not deep right field: ${JSON.stringify(metadata.trajectory.landing)}`);
if(!String(metadata.start?.metrics?.[2]||'').includes('357 FT')) throw new Error(`Expected 357 FT showcase homer: ${JSON.stringify(metadata.start?.metrics)}`);
metadata.hitProjection={passed:true,landing:metadata.trajectory.landing,deepRight:true,trajectoryBlue:true,solidTrail:true,glowFollowsBall:true,rightFielderPlayable:true};
if(metadata.start?.defense!==9||metadata.start?.batter!==1||metadata.start?.runners!==2||metadata.start?.offensiveActors!==3) throw new Error(`v917 actor validation failed: ${JSON.stringify(metadata.start)}`);
if(metadata.start.labels.filter(x=>x==='2B').length!==1) throw new Error(`Expected exactly one defensive 2B label: ${JSON.stringify(metadata.start.labels)}`);
if(metadata.start.labels.filter(x=>x==='RUN').length!==2||metadata.start.labels.filter(x=>x==='BAT').length!==1) throw new Error(`Offensive labels must be RUN/RUN/BAT: ${JSON.stringify(metadata.start.labels)}`);
if(metadata.start.teams.length!==2) throw new Error(`Expected two team identities: ${JSON.stringify(metadata.start.teams)}`);
const defColors=new Set((metadata.start.defenderState||[]).map(x=>`${x.c1}|${x.c2}`));
const offColors=new Set([...(metadata.start.runnerState||[]),...(metadata.start.batterState||[])].map(x=>`${x.c1}|${x.c2}`));
if(defColors.size!==1||offColors.size!==1||[...defColors][0]===[...offColors][0]) throw new Error(`Offense/defense team colors are not distinct: ${JSON.stringify({def:[...defColors],off:[...offColors]})}`);
if(metadata.end?.defense!==9) throw new Error(`v917 defender count changed: ${JSON.stringify(metadata.end)}`);
const startByRole=new Map((metadata.start?.defenderState||[]).map(x=>[String(x.role),x]));
const misplaced=(metadata.end?.defenderState||[]).filter(x=>{const start=startByRole.get(String(x.role));return !start||x.opacity<=.01||Math.hypot(x.left-start.left,x.top-start.top)>.75;});
if(misplaced.length) throw new Error(`Defenders left defensive positions after scoring play: ${JSON.stringify(misplaced)}`);
const homeIntruders=(metadata.end?.defenderState||[]).filter(x=>x.role!=='C'&&Math.hypot(x.left-50,x.top-90)<8);
if(homeIntruders.length) throw new Error(`Non-catcher defenders entered home-plate scoring path: ${JSON.stringify(homeIntruders)}`);
metadata.actorRoleIsolation={passed:true,defendersChecked:metadata.end.defenderState.length,offensiveRunners:metadata.start.runners,batter:metadata.start.batter,expectedScorers:3};
metadata.teamColorSeparation={passed:true,defense:[...defColors][0],offense:[...offColors][0]};
fs.writeFileSync(path.join(outDir,'mlb-gamecast-showcase.json'),JSON.stringify(metadata,null,2));

const webm=path.join(outDir,'mlb-gamecast-home-run-simulation.webm');
const gif=path.join(outDir,'mlb-gamecast-home-run-simulation.gif');
const mp4=path.join(outDir,'mlb-gamecast-home-run-simulation.mp4');
let r=spawnSync('ffmpeg',['-y','-i',webm,'-vf','fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer','-loop','0',gif],{stdio:'inherit'});
if(r.status!==0) throw new Error('GIF conversion failed');
r=spawnSync('ffmpeg',['-y','-i',webm,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'inherit'});
if(r.status!==0) throw new Error('MP4 conversion failed');
console.log('MLB v919 simulation complete',metadata);
