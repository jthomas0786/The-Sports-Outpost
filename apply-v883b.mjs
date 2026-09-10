#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>{const f=path.join(root,p);if(!fs.existsSync(f))throw new Error(`Missing ${p}. Run this from /workspaces/The-Sports-Outpost.`);return fs.readFileSync(f,'utf8')};
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const patchText=name=>fs.readFileSync(path.join(root,'patches',name),'utf8').trimEnd();
const must=(cond,msg)=>{if(!cond)throw new Error(`v88.3b: ${msg}`)};
function replaceOnce(s,a,b,label){const i=s.indexOf(a);must(i>=0,`anchor not found: ${label}`);return s.slice(0,i)+b+s.slice(i+a.length)}
function replaceRange(s,start,end,replacement,label){const a=s.indexOf(start);must(a>=0,`start anchor not found: ${label}`);const b=s.indexOf(end,a+start.length);must(b>=0,`end anchor not found: ${label}`);return s.slice(0,a)+replacement+'\n\n'+s.slice(b)}

for(const p of ['sports/nfl/gamecast-v883b-styles.js','scripts/nfl-v883b-selftest.mjs','patches/v883b-field.js.txt','patches/v883b-halftime.js.txt']){
  must(fs.existsSync(path.join(root,p)),`package file missing: ${p}`);
}

// ---------------- sports/nfl-preview.js
{
  const p='sports/nfl-preview.js';
  let s=read(p);

  // v88.3b — halftime UI must be visible from both NFL Live and the active
  // Gamecast, even before the candidate JSON exists. Cache-bust the module.
  s=s.replace(/import \{ ensureHalftimeLabStyles, halftimeBannerHTML, openHalftimeParlayLab, startHalftimeBoardPolling \} from '\.\/nfl\/halftime-ui\.js\?v=[^']+';/,
    `import { ensureHalftimeLabStyles, halftimeBannerHTML, halftimeGamecastBannerHTML, isHalftimeGameState, openHalftimeParlayLab, startHalftimeBoardPolling } from './nfl/halftime-ui.js?v=88.3b';`);

  if(!s.includes("./nfl/gamecast-v883b-styles.js?v=88.3b")){
    const anchor=`import { ensureNflGamecastV883aStyles } from './nfl/gamecast-v883a-styles.js?v=88.3a';`;
    const fallback=`import { getNflDemoMode, hydrateNflDemoState, postRenderNflDemoSync } from './nfl/demo-mode.js?v=88.2';`;
    if(s.includes(anchor)) s=replaceOnce(s,anchor,anchor+`\nimport { ensureNflGamecastV883bStyles } from './nfl/gamecast-v883b-styles.js?v=88.3b';`,'v88.3b style import');
    else if(s.includes(fallback)) s=replaceOnce(s,fallback,fallback+`\nimport { ensureNflGamecastV883bStyles } from './nfl/gamecast-v883b-styles.js?v=88.3b';`,'v88.3b fallback style import');
    else throw new Error('v88.3b: could not locate NFL preview import block');
  }

  if(!s.includes('function v883bPlayableYard(g){')){
    const fieldPatch=patchText('v883b-field.js.txt');
    if(s.includes('function v883aPlayYards(text){')){
      s=replaceRange(s,'function v883aPlayYards(text){','function offenseSideHTML(g){',fieldPatch,'v88.3a field block');
    }else if(s.includes('function fieldOverlayLiveRedesignHTML(g,p){')){
      s=replaceRange(s,'function fieldOverlayLiveRedesignHTML(g,p){','function offenseSideHTML(g){',fieldPatch,'legacy field block');
    }else{
      throw new Error('v88.3b: field renderer anchor not found');
    }
  }

  // Keep the exact existing score header, but make sure it has the tiny in-name
  // possession football hooks from v88.3a. Do not add a separate pill.
  const dashStart=s.indexOf('function gamecastDashboardHTML(g,p,{embedded=false,tab=null}={}){');
  const dashEnd=s.indexOf('  // Game View is the approved',dashStart);
  must(dashStart>=0&&dashEnd>dashStart,'gamecastDashboardHTML region not found');
  let r=s.slice(dashStart,dashEnd);
  if(!r.includes('data-v883a-team-name="away"') && !r.includes('data-v883b-team-name="away"')){
    const away=`<b>${'${esc(g.away.name)}'}</b>`;
    const home=`<b>${'${esc(g.home.name)}'}</b>`;
    must(r.includes(away)&&r.includes(home),'team-name anchors missing in score header');
    r=r.replace(away,`<b data-v883b-team-name="away">${'${esc(g.away.name)}'}${"${live&&ctx.poss==='away'?'<span data-v883b-possession-football class=\\\"tso-possession-football\\\">🏈</span>':''}"}</b>`);
    r=r.replace(home,`<b data-v883b-team-name="home">${"${live&&ctx.poss==='home'?'<span data-v883b-possession-football class=\\\"tso-possession-football\\\">🏈</span>':''}"}${'${esc(g.home.name)}'}</b>`);
  }
  s=s.slice(0,dashStart)+r+s.slice(dashEnd);

  const mountNeedle='ensureNflGamecastV883bStyles();';
  if(!s.includes(mountNeedle)){
    const mountAnchor='ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles(); ensureNflGamecastV883aStyles();';
    const mountFallback='ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles();';
    if(s.includes(mountAnchor)) s=s.replace(mountAnchor,mountAnchor+' ensureNflGamecastV883bStyles();');
    else if(s.includes(mountFallback)) s=s.replace(mountFallback,mountFallback+' ensureNflGamecastV883bStyles();');
    else throw new Error('v88.3b: mount style anchor not found');
  }

  // Live page: pending banner appears from live game state even if the
  // halftime candidate file has not been created yet.
  s=s.replace(/halftimeBannerHTML\(state\.halftime\)/g,'halftimeBannerHTML(state.halftime,data().games)');

  // Full Gamecast: show the Halftime Lab CTA directly below the preserved
  // score header. It switches from CALCULATING -> BUILD PARLAY automatically.
  if(!s.includes('${topbar}${scorebar}${halftimeGamecastBannerHTML(g,state.halftime)}')){
    const gameReturn='${topbar}${scorebar}<div class="nxg-gameview-modern">${gameView}</div>';
    const gameReturnNew='${topbar}${scorebar}${halftimeGamecastBannerHTML(g,state.halftime)}<div class="nxg-gameview-modern">${gameView}</div>';
    must(s.includes(gameReturn),'Gamecast halftime insertion anchor missing');
    s=s.replace(gameReturn,gameReturnNew);
  }

  // When live state crosses into/out of halftime, force ONE full render so the
  // CTA can be inserted/removed. Normal play updates remain DOM-patched.
  const fastPatch=`      if(state.game && state.gamecastTab==='game'){
        const current=gameForId(state.game);
        if(current && patchLiveGamecastDOM(root,current)) return;
      }`;
  if(s.includes(fastPatch)){
    s=s.replace(fastPatch,`      if(state.game && state.gamecastTab==='game'){
        const current=gameForId(state.game);
        const halfNow=!!(current&&isHalftimeGameState(current));
        const halfShown=!!root.querySelector('[data-tso-halftime-gamecast]');
        if(halfNow!==halfShown){ requestAnimationFrame(()=>render()); return; }
        if(current && patchLiveGamecastDOM(root,current)) return;
      }`);
  }

  // A newly published candidate board should update the open Gamecast too, not
  // only the NFL Live landing page.
  s=s.replace("if(state.tab==='live'&&!state.game) requestAnimationFrame(()=>render());",
    "if((state.tab==='live'&&!state.game)||(state.game&&state.gamecastTab==='game')) requestAnimationFrame(()=>render());");

  write(p,s);
}

// ---------------- sports/nfl/halftime-ui.js
{
  const p='sports/nfl/halftime-ui.js';
  let s=read(p);
  const halftimePatch=patchText('v883b-halftime.js.txt');
  if(!s.includes('export function isHalftimeGameState(g){')){
    s=replaceRange(s,'const isHalf=','export function startHalftimeBoardPolling',halftimePatch,'halftime state/banner block');
  }
  s=s.replace('export function startHalftimeBoardPolling(onUpdate,{intervalMs=30000}={}){',
    'export function startHalftimeBoardPolling(onUpdate,{intervalMs=5000}={}){');
  write(p,s);
}

// ---------------- scripts/nfl-sim-auto.mjs
{
  const p='scripts/nfl-sim-auto.mjs';
  let s=read(p);
  if(!s.includes('function halftimeLiveOddsReady(game,board){')){
    const anchor='function matchLive(game,board){ return board?.games?.[String(game.gameId||game.id)]||null; }';
    const helper=`${anchor}
function halftimeLiveOddsReady(game,board){
  const id=String(game?.gameId||game?.id||'');
  const row=(board?.games||[]).find(g=>String(g?.gameId||'')===id);
  return !!(row&&Array.isArray(row.players)&&row.players.length>0);
}`;
    s=replaceOnce(s,anchor,helper,'halftime live-odds readiness helper');
  }
  if(!s.includes('waiting for live sportsbook props before 50K candidate build')){
    const anchor='  if(!decision.run){\n    console.log(`· ${pair}: skip — ${decision.reason}`);\n    continue;\n  }';
    const replacement=anchor+"\n  if(decision.phase==='halftime' && !halftimeLiveOddsReady(game,liveOdds)){\n    console.log(`· ${pair}: halftime detected — waiting for live sportsbook props before 50K candidate build`);\n    continue;\n  }";
    s=replaceOnce(s,anchor,replacement,'halftime odds-before-sim gate');
  }
  write(p,s);
}

// ---------------- .github/workflows/nfl-live.yml
{
  const p='.github/workflows/nfl-live.yml';
  let s=read(p);
  const step='      - name: Refresh v87 halftime sportsbook props when needed\n';
  if(s.includes(step) && !s.includes(step+'        continue-on-error: true\n')){
    s=s.replace(step,step+'        continue-on-error: true\n');
  }
  write(p,s);
}

// ---------------- router cache bust
{
  const p='sports/router.js';
  let s=read(p);
  s=s.replace(/import\('\.\/nfl-preview\.js\?v=88\.3a'\)/g,"import('./nfl-preview.js?v=88.3b')");
  s=s.replace(/import\('\.\/nfl-preview\.js\?v=88\.3'\)/g,"import('./nfl-preview.js?v=88.3b')");
  must(s.includes("nfl-preview.js?v=88.3b"),'router cache-bust failed');
  write(p,s);
}

// ---------------- package test script
{
  const p='package.json';
  const o=JSON.parse(read(p));
  o.scripts=o.scripts||{};
  o.scripts['nfl:v88.3b:test']='node scripts/nfl-v883b-selftest.mjs';
  write(p,JSON.stringify(o,null,2)+'\n');
}

console.log('✓ Applied v88.3b Gamecast perspective-field correction');
console.log('  • Current Drive remains Gamecast-only');
console.log('  • LOS / first-down / play-path are clipped to the 100-yard playable field');
console.log('  • end zones are separate 3D regions with team logos');
console.log('  • Gamecast body aligns to the existing scoreboard width');
console.log('  • floating possession pill is hidden/removed; only tiny in-name 🏈 remains');
console.log('  • existing 2-second incremental live patch path is preserved');
