#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{ if(!fs.existsSync(p)) throw new Error(`Missing ${p}. Run from /workspaces/The-Sports-Outpost.`); return fs.readFileSync(p,'utf8'); };
const write=(p,s)=>fs.writeFileSync(p,s);
function once(src,oldText,newText,label){
  const i=src.indexOf(oldText);
  if(i<0) throw new Error(`v88.3c anchor not found: ${label}`);
  return src.slice(0,i)+newText+src.slice(i+oldText.length);
}

// 1) Restore the export/function accidentally dropped from halftime-ui.js.
{
  const p='sports/nfl/halftime-ui.js';
  let s=read(p);
  if(!/export\s+function\s+ensureHalftimeLabStyles\s*\(/.test(s)){
    const anchor='function boardForGame(doc,g){';
    const fn=`export function ensureHalftimeLabStyles(){
  if(document.getElementById('tso-nfl-halftime-lab-v88')) return;
  const st=document.createElement('style');
  st.id='tso-nfl-halftime-lab-v88';
  st.textContent=\`
  #nflView .tso-ht-banner{margin:0 0 16px;border:1px solid rgba(245,158,11,.45);border-radius:14px;background:linear-gradient(135deg,rgba(8,27,57,.98),rgba(16,31,55,.96));box-shadow:0 12px 28px rgba(0,0,0,.18);padding:14px 16px;display:flex;align-items:center;gap:14px}
  #nflView .tso-ht-bolt{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.34);font-size:22px}
  #nflView .tso-ht-banner-copy{min-width:0;flex:1}#nflView .tso-ht-banner-copy b{display:block;font:800 17px/1.1 'Oswald',sans-serif;color:#fff;letter-spacing:.02em;text-transform:uppercase}
  #nflView .tso-ht-banner-copy span{display:block;margin-top:5px;font:700 9px/1.35 'JetBrains Mono',monospace;color:#8faed3}
  #nflView .tso-ht-banner-copy strong{color:#59e99a}#nflView .tso-ht-banner button{flex:0 0 auto;border:1px solid #f59e0b;background:#f59e0b;color:#071326;border-radius:9px;padding:10px 15px;font:900 10px 'JetBrains Mono',monospace;cursor:pointer;text-transform:uppercase}
  #nflView .tso-ht-banner.pending{border-color:rgba(66,153,225,.35)}#nflView .tso-ht-banner.pending .tso-ht-bolt{border-color:rgba(66,153,225,.35);background:rgba(45,127,255,.1)}
  .tso-ht-backdrop{position:fixed;inset:0;z-index:10020;background:rgba(0,5,14,.68);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .tso-ht-drawer{position:fixed;z-index:10021;top:0;right:0;width:min(490px,94vw);height:100dvh;background:linear-gradient(180deg,#071326,#050d1c);border-left:1px solid rgba(45,127,255,.38);box-shadow:-18px 0 46px rgba(0,0,0,.38);display:flex;flex-direction:column;color:#e8f2ff}
  .tso-ht-head{padding:18px 20px 14px;border-bottom:1px solid rgba(45,127,255,.22);display:flex;gap:12px;align-items:flex-start}.tso-ht-head-main{flex:1;min-width:0}.tso-ht-kicker{font:900 8px 'JetBrains Mono',monospace;color:#f59e0b;letter-spacing:.12em;text-transform:uppercase}.tso-ht-head h2{margin:4px 0 0;font:800 25px/1 'Oswald',sans-serif;color:#fff}.tso-ht-head p{margin:7px 0 0;font:700 8px/1.45 'JetBrains Mono',monospace;color:#7f9fc5}.tso-ht-close{width:36px;height:36px;flex:0 0 36px;border-radius:50%;border:1px solid rgba(120,160,210,.24);background:#0b1930;color:#d8e9ff;font-size:20px;cursor:pointer}
  .tso-ht-livebar{margin:12px 20px 0;border:1px solid rgba(34,197,94,.25);background:rgba(5,61,42,.18);border-radius:9px;padding:9px 11px;display:flex;justify-content:space-between;gap:8px;font:800 8px 'JetBrains Mono',monospace;color:#83a8d0}.tso-ht-livebar b{color:#59e99a}
  .tso-ht-scroll{overflow:auto;flex:1;padding:14px 20px 100px}.tso-ht-section{margin-bottom:16px}.tso-ht-label{display:block;margin-bottom:7px;font:900 8px 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#7094bd}
  .tso-ht-seg{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.tso-ht-seg button,.tso-ht-maxgames button{border:1px solid rgba(67,126,196,.32);background:#091a34;color:#b6cbe5;border-radius:8px;height:34px;font:900 9px 'JetBrains Mono',monospace;cursor:pointer}.tso-ht-seg button.active,.tso-ht-maxgames button.active{background:#2d7fff;border-color:#56b9ff;color:#fff}
  .tso-ht-mode{width:100%;height:42px;border:1px solid rgba(72,157,255,.45);border-radius:9px;background:#0a2142;color:#fff;padding:0 10px;font:800 10px 'JetBrains Mono',monospace}.tso-ht-mode-copy{margin-top:6px;font:700 8px/1.4 'JetBrains Mono',monospace;color:#708fb4}
  .tso-ht-maxgames{display:flex;gap:6px}.tso-ht-maxgames button{width:48px}.tso-ht-games{display:flex;flex-direction:column;gap:7px}.tso-ht-game{display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid rgba(67,126,196,.25);border-radius:9px;background:#07182f;cursor:pointer}.tso-ht-game input{accent-color:#2d7fff}.tso-ht-game div{flex:1}.tso-ht-game b{display:block;font:800 11px 'Oswald',sans-serif;color:#fff}.tso-ht-game span{display:block;margin-top:2px;font:700 7px 'JetBrains Mono',monospace;color:#7697be}.tso-ht-game em{font:900 7px 'JetBrains Mono',monospace;color:#59e99a;font-style:normal}
  .tso-ht-generate{width:100%;height:46px;border:0;border-radius:10px;background:linear-gradient(180deg,#2d8cff,#176fe7);color:#fff;font:900 11px 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 20px rgba(45,127,255,.2)}
  .tso-ht-error{padding:10px;border:1px solid rgba(255,159,67,.3);border-radius:9px;background:rgba(84,43,8,.2);font:700 8px/1.5 'JetBrains Mono',monospace;color:#ffb86b}
  .tso-ht-result{margin-top:18px;padding-top:16px;border-top:1px solid rgba(45,127,255,.22)}.tso-ht-result-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.tso-ht-result-head b{font:900 14px 'Oswald',sans-serif;color:#fff;text-transform:uppercase}.tso-ht-result-head span{font:800 7px 'JetBrains Mono',monospace;color:#f59e0b}
  .tso-ht-leg{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;padding:11px 0;border-bottom:1px solid rgba(45,127,255,.14)}.tso-ht-leg-num{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:#0c2446;color:#60b9ff;font:900 9px 'JetBrains Mono',monospace}.tso-ht-leg-main b{display:block;font:800 13px 'Oswald',sans-serif;color:#fff}.tso-ht-leg-main strong{display:block;margin-top:2px;font:900 9px 'JetBrains Mono',monospace;color:#f3c340;text-transform:uppercase}.tso-ht-leg-main small{display:block;margin-top:5px;font:700 7px/1.4 'JetBrains Mono',monospace;color:#7798be}.tso-ht-leg-grade{width:40px;height:40px;border:3px solid #2d7fff;border-radius:50%;display:grid;place-items:center;color:#fff;font:900 11px 'Oswald',sans-serif}.tso-ht-corr{display:inline-block;margin-top:5px;padding:3px 6px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#59e99a!important}
  .tso-ht-summary{margin-top:12px;padding:12px;border:1px solid rgba(45,127,255,.25);border-radius:11px;background:#071a35}.tso-ht-summary h3{margin:0 0 9px;font:900 11px 'JetBrains Mono',monospace;color:#68c9ff;text-transform:uppercase}.tso-ht-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tso-ht-summary-grid div{padding:8px;border-radius:8px;background:#06142a}.tso-ht-summary-grid span{display:block;font:800 6.5px 'JetBrains Mono',monospace;color:#6e8fb5;text-transform:uppercase}.tso-ht-summary-grid b{display:block;margin-top:3px;font:900 15px 'Oswald',sans-serif;color:#fff}.tso-ht-summary-grid .good b{color:#59e99a}
  .tso-ht-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.tso-ht-actions button{height:42px;border-radius:9px;font:900 9px 'JetBrains Mono',monospace;cursor:pointer}.tso-ht-add{grid-column:1/-1;background:#f59e0b!important;border:1px solid #ffc348!important;color:#071326!important}.tso-ht-regen{background:#0b2141;border:1px solid rgba(65,143,236,.4);color:#cae0fa}.tso-ht-reset{background:#09172c;border:1px solid rgba(90,122,166,.25);color:#8fabce}
  .tso-ht-toast{position:fixed;z-index:10040;right:22px;bottom:22px;padding:11px 14px;border-radius:9px;background:#08253a;border:1px solid rgba(34,197,94,.4);color:#80efac;font:800 9px 'JetBrains Mono',monospace;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  @media(max-width:680px){#nflView .tso-ht-banner{padding:11px;align-items:center}#nflView .tso-ht-bolt{width:34px;height:34px;font-size:18px}#nflView .tso-ht-banner-copy b{font-size:14px}#nflView .tso-ht-banner button{padding:9px 10px;font-size:8px}.tso-ht-backdrop{background:rgba(0,5,14,.5)}.tso-ht-drawer{top:auto;bottom:0;left:0;right:0;width:100%;height:min(92dvh,820px);border-left:0;border-top:1px solid rgba(45,127,255,.4);border-radius:18px 18px 0 0}.tso-ht-drawer:before{content:'';position:absolute;top:7px;left:50%;width:42px;height:4px;transform:translateX(-50%);border-radius:99px;background:#385475}.tso-ht-head{padding-top:20px}.tso-ht-scroll{padding-left:15px;padding-right:15px}.tso-ht-summary-grid{grid-template-columns:1fr 1fr}}
  \`;
  document.head.appendChild(st);
}

`;
    s=once(s,anchor,fn+anchor,'restore ensureHalftimeLabStyles');
  }
  write(p,s);
}

// 2) Cache bust the repaired module import so browsers/CDN do not keep the broken module.
{
  const p='sports/nfl-preview.js';
  let s=read(p);
  s=s.replace(/\.\/nfl\/halftime-ui\.js\?v=88\.3b/g,'./nfl/halftime-ui.js?v=88.3c');
  if(!s.includes("./nfl/halftime-ui.js?v=88.3c")) throw new Error('v88.3c failed to cache-bust halftime-ui import');
  write(p,s);
}

// 3) Cache bust nfl-preview itself.
{
  const p='sports/router.js';
  let s=read(p);
  s=s.replace(/\.\/nfl-preview\.js\?v=88\.3b/g,'./nfl-preview.js?v=88.3c')
     .replace(/\.\/nfl-preview\.js\?v=88\.3a/g,'./nfl-preview.js?v=88.3c')
     .replace(/\.\/nfl-preview\.js\?v=88\.3'/g,"./nfl-preview.js?v=88.3c'");
  if(!s.includes("./nfl-preview.js?v=88.3c")) throw new Error('v88.3c failed to cache-bust nfl-preview router import');
  write(p,s);
}

// 4) Add a self-test command.
{
  const p='package.json';
  const pkg=JSON.parse(read(p));
  pkg.scripts=pkg.scripts||{};
  pkg.scripts['nfl:v88.3c:test']='node scripts/nfl-v883c-selftest.mjs';
  write(p,JSON.stringify(pkg,null,2)+'\n');
}

console.log('✓ Applied v88.3c halftime export repair');
console.log('  • restored ensureHalftimeLabStyles export');
console.log('  • cache-busted halftime-ui.js -> v88.3c');
console.log('  • cache-busted nfl-preview.js -> v88.3c');
