#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{ if(!fs.existsSync(p)) throw new Error(`Missing ${p}. Run from /workspaces/The-Sports-Outpost.`); return fs.readFileSync(p,'utf8'); };
const write=(p,s)=>fs.writeFileSync(p,s);

function ensureChanged(before, after, label){
  if(before===after) throw new Error(`v88.3d: could not update ${label}`);
  return after;
}

// 1) Force the browser to request a NEW router URL from index.html.
// v88.3c cache-busted router -> preview -> halftime, but if index.html itself
// still referenced an older router query string, a browser could keep serving
// the stale v88.3b import graph. This is the missing outer cache-bust.
{
  const p='index.html';
  let s=read(p);
  const before=s;
  s=s.replace(/((?:\.\/)?sports\/router\.js)(?:\?v=[^\"'\s<]+)?/g,'$1?v=88.3d');
  if(!/sports\/router\.js\?v=88\.3d/.test(s)){
    throw new Error('v88.3d: index.html does not contain a sports/router.js reference');
  }
  // If index already happened to be v88.3d, allow idempotent re-run.
  if(before!==s) write(p,s); else write(p,s);
}

// 2) Router -> preview cache bust.
{
  const p='sports/router.js';
  let s=read(p);
  s=s.replace(/\.\/nfl-preview\.js\?v=[^'\"]+/g,'./nfl-preview.js?v=88.3d');
  if(!s.includes("./nfl-preview.js?v=88.3d")) throw new Error('v88.3d: router NFL preview import not found');
  write(p,s);
}

// 3) Preview -> halftime module cache bust.
{
  const p='sports/nfl-preview.js';
  let s=read(p);
  s=s.replace(/\.\/nfl\/halftime-ui\.js\?v=[^'\"]+/g,'./nfl/halftime-ui.js?v=88.3d');
  if(!s.includes("./nfl/halftime-ui.js?v=88.3d")) throw new Error('v88.3d: halftime-ui import not found in nfl-preview.js');
  write(p,s);
}

// 4) Defensive repair: if a local branch still has the v88.3b halftime file
// without the exported style initializer, restore a minimal initializer so the
// ES module import can always resolve. Current main already has this export.
{
  const p='sports/nfl/halftime-ui.js';
  let s=read(p);
  if(!/export\s+function\s+ensureHalftimeLabStyles\s*\(/.test(s)){
    const anchor='export function isHalftimeGameState(g){';
    if(!s.includes(anchor)) throw new Error('v88.3d: halftime-ui repair anchor not found');
    const fn=`export function ensureHalftimeLabStyles(){\n  if(document.getElementById('tso-nfl-halftime-lab-v88')) return;\n  const st=document.createElement('style');\n  st.id='tso-nfl-halftime-lab-v88';\n  st.textContent='';\n  document.head.appendChild(st);\n}\n\n`;
    s=s.replace(anchor,fn+anchor);
  }
  if(!/export\s+function\s+ensureHalftimeLabStyles\s*\(/.test(s)) throw new Error('v88.3d: ensureHalftimeLabStyles export still missing');
  write(p,s);
}

// 5) Add test command.
{
  const p='package.json';
  const pkg=JSON.parse(read(p));
  pkg.scripts=pkg.scripts||{};
  pkg.scripts['nfl:v88.3d:test']='node scripts/nfl-v883d-selftest.mjs';
  write(p,JSON.stringify(pkg,null,2)+'\n');
}

console.log('✓ Applied v88.3d emergency outer cache-bust');
console.log('  • index.html -> sports/router.js?v=88.3d');
console.log('  • router -> nfl-preview.js?v=88.3d');
console.log('  • preview -> halftime-ui.js?v=88.3d');
console.log('  • ensureHalftimeLabStyles export verified/restored');
