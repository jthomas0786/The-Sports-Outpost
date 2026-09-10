#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{if(!fs.existsSync(p))throw new Error(`Missing ${p}. Run from /workspaces/The-Sports-Outpost.`);return fs.readFileSync(p,'utf8')};
const write=(p,s)=>fs.writeFileSync(p,s);
function once(src,oldText,newText,label){
  const i=src.indexOf(oldText);
  if(i<0) throw new Error(`v88.3 anchor not found: ${label}`);
  return src.slice(0,i)+newText+src.slice(i+oldText.length);
}
function replaceRx(src,rx,repl,label){
  if(!rx.test(src)) throw new Error(`v88.3 regex anchor not found: ${label}`);
  return src.replace(rx,repl);
}
for(const p of ['sports/nfl/gamecast-live-upgrade.js','scripts/nfl-v883-selftest.mjs']){
  if(!fs.existsSync(p)) throw new Error(`v88.3 package file missing: ${p}`);
}

// ------------------------------------------------------ nfl-preview import + mount + render hook
{
  const p='sports/nfl-preview.js';
  let s=read(p);

  if(!s.includes("./nfl/gamecast-live-upgrade.js?v=88.3")){
    const candidates=[
      `import { getNflDemoMode, hydrateNflDemoState, postRenderNflDemoSync } from './nfl/demo-mode.js?v=88.2';`,
      `import { ensureHalftimeLabStyles, halftimeBannerHTML, openHalftimeParlayLab, startHalftimeBoardPolling } from './nfl/halftime-ui.js?v=88';`,
      `import { ensureHalftimeLabStyles, halftimeBannerHTML, openHalftimeParlayLab, startHalftimeBoardPolling } from './nfl/halftime-ui.js?v=88.1';`
    ];
    let inserted=false;
    for(const anchor of candidates){
      if(s.includes(anchor)){
        s=once(s,anchor,anchor+`\nimport { ensureNflGamecastUpgradeStyles, mountOrUpdateNflGamecastUpgrade } from './nfl/gamecast-live-upgrade.js?v=88.3';`,'gamecast upgrade import');
        inserted=true;
        break;
      }
    }
    if(!inserted) throw new Error('v88.3 anchor not found: import block for gamecast upgrade');
  }

  if(!s.includes('ensureNflGamecastUpgradeStyles()')){
    const oldMount=`export async function mount(){
  ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles();`;
    const newMount=`export async function mount(){
  ensureNflGamecastConceptStyles(); ensureNflLaunchStyles(); ensureHalftimeLabStyles(); ensureNflGamecastUpgradeStyles();`;
    if(s.includes(oldMount)) s=once(s,oldMount,newMount,'mount style init');
    else throw new Error('v88.3 anchor not found: mount function start');
  }

  if(!s.includes('__TSO_V883_RENDER_PATCHED__')){
    s += `

// v88.3 smooth gamecast upgrade hook
if(!globalThis.__TSO_V883_RENDER_PATCHED__){
  const __tsoV883Render = render;
  render = function(...args){
    const out = __tsoV883Render.apply(this,args);
    try{
      requestAnimationFrame(()=>mountOrUpdateNflGamecastUpgrade({ state, root: document.getElementById('nflView') }));
    }catch(err){
      console.warn('TSO v88.3 gamecast upgrade skipped', err);
    }
    return out;
  };
  globalThis.__TSO_V883_RENDER_PATCHED__ = true;
}
`;
  }

  write(p,s);
}

// ------------------------------------------------------ router cache bust
{
  const p='sports/router.js';
  let s=read(p);
  s=replaceRx(s,/import\('\.\/nfl-preview\.js\?v=88(?:\.1|\.2)?'\)/g,"import('./nfl-preview.js?v=88.3')",'router NFL preview cache bust');
  if(!s.includes("nfl-preview.js?v=88.3")) throw new Error('v88.3 validation failed: router cache bust');
  write(p,s);
}

// ------------------------------------------------------ package script
{
  const p='package.json';
  const obj=JSON.parse(read(p));
  obj.scripts=obj.scripts||{};
  obj.scripts['nfl:v88.3:test']='node scripts/nfl-v883-selftest.mjs';
  write(p,JSON.stringify(obj,null,2)+'\n');
}

const checks=[
  ['sports/nfl-preview.js','gamecast-live-upgrade.js?v=88.3'],
  ['sports/nfl-preview.js','ensureNflGamecastUpgradeStyles'],
  ['sports/nfl-preview.js','mountOrUpdateNflGamecastUpgrade'],
  ['sports/nfl-preview.js','__TSO_V883_RENDER_PATCHED__'],
  ['sports/router.js','nfl-preview.js?v=88.3'],
  ['package.json','nfl:v88.3:test'],
  ['sports/nfl/gamecast-live-upgrade.js','tso-nfl-possession-pill'],
];
for(const [p,n] of checks){
  if(!read(p).includes(n)) throw new Error(`v88.3 validation failed: ${p} missing ${n}`);
}

console.log('✓ Applied TSO v88.3 NFL smooth gamecast drive tracker');
console.log('  • new ESPN-style current-drive field in TSO theme');
console.log('  • preserves the existing game score header');
console.log('  • adds a switching possession football pill in the header');
console.log('  • smooth incremental marker / line updates on each render');
console.log('  • router cache bust -> nfl-preview.js?v=88.3');
