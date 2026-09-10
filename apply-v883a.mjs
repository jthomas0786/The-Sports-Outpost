#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>{const f=path.join(root,p);if(!fs.existsSync(f))throw new Error(`Missing ${p}. Run this from the repo root.`);return fs.readFileSync(f,'utf8')};
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const patchText=name=>fs.readFileSync(path.join(root,'patches',name),'utf8').trimEnd();
const must=(cond,msg)=>{if(!cond)throw new Error(`v88.3a: ${msg}`)};
function replaceOnce(s,a,b,label){const i=s.indexOf(a);must(i>=0,`anchor not found: ${label}`);return s.slice(0,i)+b+s.slice(i+a.length)}
function replaceRange(s,start,end,replacement,label){const a=s.indexOf(start);must(a>=0,`start anchor not found: ${label}`);const b=s.indexOf(end,a+start.length);must(b>=0,`end anchor not found: ${label}`);return s.slice(0,a)+replacement+'\n\n'+s.slice(b)}

// ---------- sports/nfl-preview.js
{
  const p='sports/nfl-preview.js';
  let s=read(p);

  // Remove the v88.3 globally mounted panel. That was the reason Current Drive
  // appeared on Live, Feed, Props, and other screens instead of only Gamecast.
  s=s.replace(/^import \{ ensureNflGamecastUpgradeStyles, mountOrUpdateNflGamecastUpgrade \} from '\.\/nfl\/gamecast-live-upgrade\.js\?v=88\.3';\n/m,'');
  s=s.replace(/\s*ensureNflGamecastUpgradeStyles\(\);/g,'');
  const oldHook='// v88.3 smooth gamecast upgrade hook';
  const hookAt=s.indexOf(oldHook);
  if(hookAt>=0) s=s.slice(0,hookAt).trimEnd()+'\n';

  if(!s.includes("./nfl/gamecast-v883a-styles.js?v=88.3a")){
    const importAnchor=`import { getNflDemoMode, hydrateNflDemoState, postRenderNflDemoSync } from './nfl/demo-mode.js?v=88.2';`;
    s=replaceOnce(s,importAnchor,importAnchor+`\nimport { ensureNflGamecastV883aStyles } from './nfl/gamecast-v883a-styles.js?v=88.3a';`,'v88.3a styles import');
  }

  // Replace ONLY the actual Game View field renderer. The new drive tracker is
  // now part of Gamecast itself, never mounted at the nflView root.
  const fieldPatch=patchText('v883a-field.js.txt');
  s=replaceRange(s,'function fieldOverlayLiveRedesignHTML(g,p){','function offenseSideHTML(g){',fieldPatch,'Gamecast field renderer');

  // Improve touchdown scorer matching and make the TD feed a native TSO card
  // layout with player photo + stored pregame sportsbook price.
  const scorerPatch=patchText('v883a-feed.js.txt');
  s=replaceRange(s,'function tdScorerForPlay(g,play){','function firstTdPlayForGame(g,play){',scorerPatch,'TD scorer matcher');
  const feedPatch=patchText('v883a-feed-html.js.txt');
  s=replaceRange(s,'function feedHTML(){','function propToolbar(){',feedPatch,'TD Feed renderer');

  // Add the possession football INSIDE the team name and data hooks for the
  // incremental live patcher. All other scoreboard/header layout is unchanged.
  const fnStart=s.indexOf('function gamecastDashboardHTML(g,p,{embedded=false,tab=null}={}){');
  const fnEnd=s.indexOf('  // Game View is the approved',fnStart);
  must(fnStart>=0&&fnEnd>fnStart,'gamecastDashboardHTML region not found');
  let r=s.slice(fnStart,fnEnd);
  const reps=[
    [`<b>${'${esc(g.away.name)}'}</b>`,`<b data-v883a-team-name="away">${'${esc(g.away.name)}'}${"${live&&ctx.poss==='away'?'<span data-v883a-possession-football class=\\\"tso-possession-football\\\">🏈</span>':''}"}</b>`],
    [`<b>${'${esc(g.home.name)}'}</b>`,`<b data-v883a-team-name="home">${"${live&&ctx.poss==='home'?'<span data-v883a-possession-football class=\\\"tso-possession-football\\\">🏈</span>':''}"}${'${esc(g.home.name)}'}</b>`],
    [`<div class="nxg-score">${'${scoreNum(g.away)}'}</div>`,`<div class="nxg-score" data-v883a-away-score>${'${scoreNum(g.away)}'}</div>`],
    [`<div class="nxg-score">${'${scoreNum(g.home)}'}</div>`,`<div class="nxg-score" data-v883a-home-score>${'${scoreNum(g.home)}'}</div>`],
    [`<div class="nxg-period">${'${esc(topLabel)}'}</div>`,`<div class="nxg-period" data-v883a-period>${'${esc(topLabel)}'}</div>`],
    [`<div class="nxg-clock">${'${esc(displayClock)}'}</div>`,`<div class="nxg-clock" data-v883a-clock>${'${esc(displayClock)}'}</div>`],
    [`<span>${'${esc(situationPrimary)}'}</span><i></i><span>${'${esc(situationSecondary)}'}</span>`,`<span data-v883a-situation-primary>${'${esc(situationPrimary)}'}</span><i></i><span data-v883a-situation-secondary>${'${esc(situationSecondary)}'}</span>`],
    [`<div class="nxg-posstext">`,`<div class="nxg-posstext" data-v883a-posstext>`]
  ];
  for(const [a,b] of reps){must(r.includes(a),`score header sub-anchor missing: ${a.slice(0,60)}`);r=r.replace(a,b)}
  s=s.slice(0,fnStart)+r+s.slice(fnEnd);

  // Live Gamecast gets DOM-patched in place rather than root.innerHTML being
  // rebuilt on every poll. This is the no-jump path.
  const pollStart=s.indexOf('    startLivePolling(d,()=>{');
  const pollEnd=s.indexOf('    });\n  }catch(e){',pollStart);
  must(pollStart>=0&&pollEnd>pollStart,'live polling callback region not found');
  const newPoll=`    startLivePolling(d,()=>{\n      syncPreviewGamesFromRaw(d);\n      const root=document.getElementById('nflView');\n      if(!root || root.hidden || !(state.tab==='slate' || state.tab==='live' || state.tab==='feed' || state.game)) return;\n      if(state.game && state.gamecastTab==='game'){\n        const current=gameForId(state.game);\n        if(current && patchLiveGamecastDOM(root,current)) return;\n      }\n      if(state.tab==='slate' && !state.game && 'requestIdleCallback' in window){\n        requestIdleCallback(()=>{ if(state.tab==='slate' && !state.game) render(); },{timeout:1200});\n      }else{\n        requestAnimationFrame(()=>render());\n      }\n`;
  s=s.slice(0,pollStart)+newPoll+s.slice(pollEnd);

  // initialize only the stylesheet, not a global panel.
  const mountAnchor='ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles();';
  must(s.includes(mountAnchor),'mount style anchor not found');
  s=s.replace(mountAnchor,`${mountAnchor} ensureNflGamecastV883aStyles();`);

  write(p,s);
}

// ---------- sports/nfl/live.js: lower-latency polling + win probability
{
  const p='sports/nfl/live.js'; let s=read(p);
  s=s.replace(/const POLL_MS = \d+;[^\n]*/,'const POLL_MS = 2000; // v88.3a — fast live cadence; DOM patching keeps Gamecast smooth');
  if(!s.includes("live.winProbability?.home")){
    const sigAnchor=`    live.down ?? '', live.distance ?? '', live.downDistanceText || '', live.lastPlayText || '',`;
    s=replaceOnce(s,sigAnchor,sigAnchor+`\n    live.winProbability?.home ?? '', live.winProbability?.away ?? '',`,'live win probability signature');
  }
  if(!s.includes('winProbability: gl.winProbability || null')){
    const mergeAnchor=`          lastPlayText: gl.lastPlayText,`;
    s=replaceOnce(s,mergeAnchor,mergeAnchor+`\n          winProbability: gl.winProbability || null,`,'live win probability merge');
  }
  write(p,s);
}

// ---------- Supabase low-latency endpoint: expose ESPN win probability and cut cache delay
{
  const p='supabase/functions/nfl-live/index.ts'; let s=read(p);
  s=s.replace('"cache-control": "public, max-age=8, s-maxage=8"','"cache-control": "public, max-age=1, s-maxage=1"');
  if(!s.includes('function latestWinProbability(summary: any)')){
    const anchor='function playerStats(summary: any) {';
    const helper=`function latestWinProbability(summary: any) {\n  const rows = Array.isArray(summary?.winprobability) ? summary.winprobability : [];\n  const last = rows.at(-1);\n  const home = n(last?.homeWinPercentage);\n  if (home == null) return null;\n  const h = home > 1 ? home / 100 : home;\n  return { home: h, away: Math.max(0, 1 - h), tie: n(last?.tiePercentage) };\n}\n\n`;
    s=replaceOnce(s,anchor,helper+anchor,'edge win probability helper');
  }
  if(!s.includes('winProbability: latestWinProbability(summary)')){
    const anchor='              currentDrive: currentDrive(summary),';
    s=replaceOnce(s,anchor,anchor+`\n              winProbability: latestWinProbability(summary),`,'edge win probability output');
  }
  s=s.replace('schemaVersion: 3','schemaVersion: 4');
  write(p,s);
}

// ---------- static fallback poller parity
{
  const p='scripts/nfl-live-poller.mjs'; let s=read(p);
  if(!s.includes('function parseWinProbability(summary)')){
    const anchor='function parsePlayerBox(summary){';
    const helper=`function parseWinProbability(summary){\n  const rows=Array.isArray(summary?.winprobability)?summary.winprobability:[]; const last=rows.at(-1);\n  const home=number(last?.homeWinPercentage); if(home==null)return null; const h=home>1?home/100:home;\n  return {home:h,away:Math.max(0,1-h),tie:number(last?.tiePercentage)};\n}\n\n`;
    s=replaceOnce(s,anchor,helper+anchor,'static poller win probability helper');
  }
  if(!s.includes('winProbability:parseWinProbability(summary)')){
    const old='return {...base,currentDrive:drive,plays:recent,playerStats:players,boxScore:parseFullBoxScore(summary),teamStats:teams,scoringPlays:scoringPlays(summary),lastPlayText:recent.at(-1)?.text||base.lastPlayText||null};';
    const neu='return {...base,currentDrive:drive,winProbability:parseWinProbability(summary),plays:recent,playerStats:players,boxScore:parseFullBoxScore(summary),teamStats:teams,scoringPlays:scoringPlays(summary),lastPlayText:recent.at(-1)?.text||base.lastPlayText||null};';
    s=replaceOnce(s,old,neu,'static poller win probability output');
  }
  write(p,s);
}

// ---------- router cache bust
{
  const p='sports/router.js';let s=read(p);
  s=s.replace(/import\('\.\/nfl-preview\.js\?v=88\.3'\)/g,"import('./nfl-preview.js?v=88.3a')");
  must(s.includes("nfl-preview.js?v=88.3a"),'router cache-bust failed');
  write(p,s);
}

// Remove the bad global-injection module after its import/hook are gone.
try{fs.rmSync(path.join(root,'sports/nfl/gamecast-live-upgrade.js'),{force:true})}catch{}

// ---------- package test script
{
  const p='package.json';const o=JSON.parse(read(p));o.scripts=o.scripts||{};o.scripts['nfl:v88.3a:test']='node scripts/nfl-v883a-selftest.mjs';write(p,JSON.stringify(o,null,2)+'\n');
}

console.log('✓ Applied v88.3a corrective hotfix');
console.log('  • removed global Current Drive injection from every NFL screen');
console.log('  • Game View now owns the flat ESPN-style TSO drive tracker');
console.log('  • possession football lives only inside the possessing team name');
console.log('  • live Gamecast patches in-place at a 2s client cadence');
console.log('  • TD Feed now shows scorer photo + pregame odds when available');
console.log('  • low-latency endpoint now exposes latest win probability');
