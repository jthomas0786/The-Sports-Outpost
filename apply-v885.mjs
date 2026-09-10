#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{ if(!fs.existsSync(p)) throw new Error(`Missing ${p}. Run this from /workspaces/The-Sports-Outpost.`); return fs.readFileSync(p,'utf8'); };
const write=(p,s)=>fs.writeFileSync(p,s);
const ensureDir=p=>{ if(p) fs.mkdirSync(p,{recursive:true}); };
const addImport=(src,line)=>src.includes(line) ? src : `${line}\n${src}`;

for (const rel of [
  'sports/nfl/gamecast-v885-styles.js',
  'sports/nfl/playstage-v885.js',
  'scripts/nfl-v885-selftest.mjs',
  'README-v88.5.txt'
]) {
  // no-op presence check: these files should exist after unzip
  const fileContents = read(rel);
  ensureDir(rel.split('/').slice(0,-1).join('/'));
  write(rel, fileContents);
}

{
  const p='sports/nfl-preview.js';
  let s=read(p);
  s=addImport(s, "import { ensureNflPlaystageV885Styles } from './nfl/gamecast-v885-styles.js?v=88.5';");
  s=addImport(s, "import { mountOrUpdateNflPlaystageV885 } from './nfl/playstage-v885.js?v=88.5';");
  if(!s.includes('ensureNflPlaystageV885Styles();')){
    if(s.includes('ensureNflGamecastV884Styles();')) s=s.replace('ensureNflGamecastV884Styles();','ensureNflGamecastV884Styles(); ensureNflPlaystageV885Styles();');
    else if(s.includes('ensureNflGamecastV883bStyles();')) s=s.replace('ensureNflGamecastV883bStyles();','ensureNflGamecastV883bStyles(); ensureNflPlaystageV885Styles();');
    else if(s.includes('ensureHalftimeLabStyles();')) s=s.replace('ensureHalftimeLabStyles();','ensureHalftimeLabStyles(); ensureNflPlaystageV885Styles();');
    else throw new Error('v88.5 anchor not found: style initialization point');
  }
  if(!s.includes('__tsoV885MountFromDom')){
    s += `
function __tsoV885ResolveGameContext(){
  try{
    if(typeof activeGame!=='undefined' && activeGame) return activeGame;
    if(typeof selectedGame!=='undefined' && selectedGame) return selectedGame;
    if(typeof state!=='undefined'){
      if(state?.activeGame) return state.activeGame;
      if(state?.selectedGame) return state.selectedGame;
      if(state?.liveGame) return state.liveGame;
    }
    if(typeof data==='function'){
      const payload=data();
      const games=Array.isArray(payload?.games) ? payload.games : [];
      return games.find(g=>String(g?.status||'').toLowerCase()==='in' || g?.isLive || g?.live) || games[0] || null;
    }
  }catch(_err){}
  return null;
}
function __tsoV885Root(){
  return document.querySelector('[data-nfl-root], .nfl-root, .nfl-page, .sports-page, main') || document.body;
}
function __tsoV885MountFromDom(){
  if(typeof document==='undefined') return;
  try{
    const g=__tsoV885ResolveGameContext();
    if(!g) return;
    mountOrUpdateNflPlaystageV885(__tsoV885Root(), g, { halftime: typeof state!=='undefined' ? state?.halftime : null });
  }catch(err){ console.warn('TSO v88.5 PlayStage mount failed', err); }
}
function __tsoV885InstallObserver(){
  if(typeof document==='undefined' || globalThis.__TSO_V885_OBSERVER__) return;
  const fire=()=>{ clearTimeout(globalThis.__TSO_V885_TICK__); globalThis.__TSO_V885_TICK__=setTimeout(__tsoV885MountFromDom, 60); };
  const obs=new MutationObserver(fire);
  obs.observe(document.body,{childList:true,subtree:true});
  globalThis.__TSO_V885_OBSERVER__=obs;
  fire();
}
`;
    if(s.includes('export async function mount(')) s=s.replace(/export async function mount\(([^)]*)\)\s*\{/, 'export async function mount($1){ __tsoV885InstallObserver(); __tsoV885MountFromDom();');
    else if(s.includes('export function mount(')) s=s.replace(/export function mount\(([^)]*)\)\s*\{/, 'export function mount($1){ __tsoV885InstallObserver(); __tsoV885MountFromDom();');
  }
  write(p,s);
}

{
  const p='package.json';
  const obj=JSON.parse(read(p));
  obj.scripts=obj.scripts||{};
  obj.scripts['nfl:v88.5:test']='node scripts/nfl-v885-selftest.mjs';
  write(p, JSON.stringify(obj,null,2)+'\n');
}
{
  const p='sports/router.js';
  let s=read(p);
  if(/import\('\.\/nfl-preview\.js\?v=[^']+'\)/.test(s)) s=s.replace(/import\('\.\/nfl-preview\.js\?v=[^']+'\)/g, "import('./nfl-preview.js?v=88.5')");
  else if(s.includes("import('./nfl-preview.js')")) s=s.replaceAll("import('./nfl-preview.js')", "import('./nfl-preview.js?v=88.5')");
  else throw new Error('v88.5 anchor not found: sports/router.js nfl-preview import');
  write(p,s);
}
{
  const p='index.html';
  let s=read(p);
  if(/sports\/router\.js\?v=[A-Za-z0-9._-]+/.test(s)) s=s.replace(/sports\/router\.js\?v=[A-Za-z0-9._-]+/g, 'sports/router.js?v=88.5');
  else if(s.includes('sports/router.js')) s=s.replace('sports/router.js','sports/router.js?v=88.5');
  else throw new Error('v88.5 anchor not found: index router import');
  write(p,s);
}

const checks=[
  ['sports/nfl-preview.js','./nfl/gamecast-v885-styles.js?v=88.5'],
  ['sports/nfl-preview.js','./nfl/playstage-v885.js?v=88.5'],
  ['sports/nfl-preview.js','__tsoV885MountFromDom'],
  ['sports/nfl/gamecast-v885-styles.js','tso-playstage-v885__fieldWrap'],
  ['sports/nfl/playstage-v885.js','mountOrUpdateNflPlaystageV885'],
  ['sports/router.js','nfl-preview.js?v=88.5'],
  ['index.html','sports/router.js?v=88.5']
];
for(const [p,needle] of checks){ if(!read(p).includes(needle)) throw new Error(`v88.5 validation failed: ${p} missing ${needle}`); }
console.log('✓ Applied TSO v88.5');
console.log('  • signature PlayStage gamecast inserted below the existing score header');
console.log('  • legacy field/drive presentation suppressed');
console.log('  • smooth token-based play animation scaffold added');
console.log('  • bottom analytics rail mirrors approved concept');
console.log('  • possession football limited to the team name in the header');
console.log('  • cache bust updated to v88.5');
