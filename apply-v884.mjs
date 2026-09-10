#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{if(!fs.existsSync(p))throw new Error(`Missing ${p}. Run this from /workspaces/The-Sports-Outpost.`);return fs.readFileSync(p,'utf8');};
const write=(p,s)=>fs.writeFileSync(p,s);
function once(src,oldText,newText,label){const i=src.indexOf(oldText);if(i<0)throw new Error(`v88.4 anchor not found: ${label}`);return src.slice(0,i)+newText+src.slice(i+oldText.length);}
function replaceRx(src,rx,repl,label){if(!rx.test(src))throw new Error(`v88.4 regex anchor not found: ${label}`);return src.replace(rx,repl);}

for(const p of [
  'sports/nfl/halftime-ui-v884.js','sports/nfl/halftime-optimizer-v884.js','sports/nfl/gamecast-v884-styles.js',
  'scripts/nfl-halftime-window-refresh.mjs','scripts/nfl-v884-selftest.mjs'
]) if(!fs.existsSync(p)) throw new Error(`v88.4 package file missing: ${p}`);

// ---------------------------------------------------------------- NFL preview
{
  const p='sports/nfl-preview.js';let s=read(p);

  // Replace whichever v88.3x halftime module is currently imported.
  if(!s.includes("./nfl/halftime-ui-v884.js?v=88.4")){
    s=replaceRx(
      s,
      /from '\.\/nfl\/halftime-ui(?:-v884)?\.js\?v=[^']+';/,
      "from './nfl/halftime-ui-v884.js?v=88.4';",
      'halftime UI import'
    );
  }

  if(!s.includes("./nfl/gamecast-v884-styles.js?v=88.4")){
    const anchors=[
      "import { ensureNflGamecastV883bStyles } from './nfl/gamecast-v883b-styles.js?v=88.3b';",
      "import { ensureNflGamecastV883aStyles } from './nfl/gamecast-v883a-styles.js?v=88.3a';"
    ];
    const anchor=anchors.find(a=>s.includes(a));
    if(!anchor)throw new Error('v88.4 anchor not found: Gamecast style import');
    s=once(s,anchor,anchor+"\nimport { ensureNflGamecastV884Styles } from './nfl/gamecast-v884-styles.js?v=88.4';",'v88.4 style import');
  }

  if(!s.includes('ensureNflGamecastV884Styles();')){
    const anchor='ensureNflGamecastV883bStyles();';
    if(!s.includes(anchor))throw new Error('v88.4 anchor not found: mount v883b style init');
    s=s.replace(anchor,anchor+' ensureNflGamecastV884Styles();');
  }

  // Let the Gamecast banner see every game in the rolling Sunday window.
  s=s.replaceAll('halftimeGamecastBannerHTML(g,state.halftime)', 'halftimeGamecastBannerHTML(g,state.halftime,data().games)');

  // Team-palette helper for end zones.
  if(!s.includes('const V884_TEAM_COLORS=')){
    const anchor='function fieldOverlayLiveRedesignHTML(g,p){';
    if(!s.includes(anchor))throw new Error('v88.4 anchor not found: fieldOverlayLiveRedesignHTML');
    const helper=`const V884_TEAM_COLORS={\n  ARI:['#97233F','#000000'],ATL:['#A71930','#000000'],BAL:['#241773','#111111'],BUF:['#00338D','#C60C30'],CAR:['#0085CA','#101820'],CHI:['#0B162A','#C83803'],CIN:['#FB4F14','#000000'],CLE:['#311D00','#FF3C00'],DAL:['#003594','#041E42'],DEN:['#FB4F14','#002244'],DET:['#0076B6','#B0B7BC'],GB:['#203731','#FFB612'],HOU:['#03202F','#A71930'],IND:['#002C5F','#A2AAAD'],JAX:['#006778','#101820'],KC:['#E31837','#FFB81C'],LV:['#000000','#A5ACAF'],LAC:['#0080C6','#FFC20E'],LA:['#003594','#FFA300'],MIA:['#008E97','#FC4C02'],MIN:['#4F2683','#FFC62F'],NE:['#002244','#C60C30'],NO:['#D3BC8D','#101820'],NYG:['#0B2265','#A71930'],NYJ:['#125740','#FFFFFF'],PHI:['#004C54','#A5ACAF'],PIT:['#101820','#FFB612'],SF:['#AA0000','#B3995D'],SEA:['#002244','#69BE28'],TB:['#D50A0A','#34302B'],TEN:['#0C2340','#4B92DB'],WAS:['#5A1414','#FFB612']\n};\nfunction v884EndzoneStyle(abbr){\n  const [a,b]=V884_TEAM_COLORS[String(abbr||'').toUpperCase()]||['#0d3e75','#092a52'];\n  return \`--ez-primary:\${a};--ez-secondary:\${b};\`;\n}\nfunction v884MarkerLeft(yard){return \`clamp(16px, \${clamp(Number(yard)||0,0,100)}%, calc(100% - 16px))\`;}\n\n`;
    s=once(s,anchor,helper+anchor,'team palette helper');
  }

  // Team color end zones + horizontal names.
  s=s.replace(
    '<div class="tso-3d-endzone away">${awayLogo}<span>${esc(g.away.name)}</span></div>',
    '<div class="tso-3d-endzone away" data-team="${esc(g.away.abbr)}" style="${v884EndzoneStyle(g.away.abbr)}">${awayLogo}<span>${esc(g.away.name)}</span></div>'
  );
  s=s.replace(
    '<div class="tso-3d-endzone home">${homeLogo}<span>${esc(g.home.name)}</span></div>',
    '<div class="tso-3d-endzone home" data-team="${esc(g.home.abbr)}" style="${v884EndzoneStyle(g.home.abbr)}">${homeLogo}<span>${esc(g.home.name)}</span></div>'
  );

  // Initial ball stays completely inside the playable 100-yard surface, even at a goal line.
  s=s.replace(
    '<div class="tso-3d-ball" data-v883b-ball style="left:${ball}%"><span>🏈</span></div>',
    '<div class="tso-3d-ball" data-v883b-ball style="left:${v884MarkerLeft(ball)}"><span>🏈</span></div>'
  );
  s=s.replace(
    '<div class="tso-3d-yards" data-v883b-yards style="left:${clamp(ball+3,4,96)}%">',
    '<div class="tso-3d-yards" data-v883b-yards style="left:${v884MarkerLeft(clamp(ball+3,4,96))}">'
  );

  // Promote all initial/header possession football attributes to v88.4.
  s=s.replaceAll('data-v883a-possession-football','data-v884-possession-football');
  s=s.replaceAll('data-v883b-possession-football','data-v884-possession-football');

  // Live patch: remove every stale possession icon and add exactly one v88.4 icon.
  s=s.replace(
    "root.querySelectorAll('[data-v884-possession-football],[data-v884-possession-football]').forEach(el=>el.remove());",
    "root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football],[data-v884-possession-football]').forEach(el=>el.remove());"
  );
  s=s.replace(
    "root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football]').forEach(el=>el.remove());",
    "root.querySelectorAll('[data-v883a-possession-football],[data-v883b-possession-football],[data-v884-possession-football]').forEach(el=>el.remove());"
  );
  s=s.replace(
    "icon.dataset.v883bPossessionFootball='1';icon.className='tso-possession-football';icon.textContent='🏈';",
    "icon.dataset.v884PossessionFootball='1';icon.className='tso-possession-football';icon.textContent='🏈';"
  );
  // If a prior installer already renamed the dataset before this pass, normalize that too.
  s=s.replace(
    "icon.dataset.v884PossessionFootball='1';icon.className='tso-possession-football';icon.textContent='🏈';",
    "icon.dataset.v884PossessionFootball='1';icon.className='tso-possession-football';icon.textContent='🏈';"
  );

  // Smooth marker placement: LOS/first-down stay exactly on goal lines; the football itself stays visible.
  const oldMarker="if(los)los.style.left=`${ball}%`;if(fd)fd.style.left=`${first}%`;if(marker)marker.style.left=`${ball}%`;if(badge)badge.style.left=`${clamp(ball+3,4,96)}%`;";
  const newMarker="if(los)los.style.left=`${ball}%`;if(fd)fd.style.left=`${first}%`;if(marker)marker.style.left=v884MarkerLeft(ball);if(badge)badge.style.left=v884MarkerLeft(clamp(ball+3,4,96));";
  if(s.includes(oldMarker))s=once(s,oldMarker,newMarker,'live marker clamp');

  if(!s.includes('v884EndzoneStyle(g.away.abbr)')||!s.includes('v884MarkerLeft(ball)'))throw new Error('v88.4 validation failed: field/end-zone patch did not land');
  write(p,s);
}

// ---------------------------------------------------------------- Simulation warmup state helper
{
  const p='sports/nfl/sim/auto.js';let s=read(p);
  if(!s.includes('export function isHalftimeWarmupState')){
    const anchor='export function automationPhase(liveGame){';
    if(!s.includes(anchor))throw new Error('v88.4 anchor not found: automationPhase');
    const helper=`export function isHalftimeWarmupState(liveGame,thresholdMinutes=2){\n  if(isHalftimeState(liveGame)) return true;\n  if(!liveGame || String(liveGame.status||'').toLowerCase()!=='in') return false;\n  const period=Number(liveGame.period),clock=Number(liveGame.clockMin),limit=Math.max(0,Number(thresholdMinutes)||0);\n  return period===2 && Number.isFinite(clock) && clock>=0 && clock<=limit;\n}\n\n`;
    s=once(s,anchor,helper+anchor,'halftime warmup helper');
  }
  write(p,s);
}

// ---------------------------------------------------------------- Halftime sim waits for live sportsbook board
{
  const p='scripts/nfl-sim-auto.mjs';let s=read(p);
  if(!s.includes('function halftimeLiveOddsReady')){
    const anchor='const [slate,research,odds,config,existing,stateDoc,liveBoard,liveOdds,halftimeExisting]=await Promise.all([';
    if(!s.includes(anchor))throw new Error('v88.4 anchor not found: sim auto Promise.all');
    const helper=`function halftimeLiveOddsReady(game,liveOdds){\n  const id=String(game?.gameId||game?.id||'');\n  const pair=[String(game?.away?.abbr||'').toUpperCase(),String(game?.home?.abbr||'').toUpperCase()].sort().join('|');\n  const g=(liveOdds?.games||[]).find(x=>String(x?.gameId||'')===id || [String(x?.away||'').toUpperCase(),String(x?.home||'').toUpperCase()].sort().join('|')===pair);\n  return !!(g && Array.isArray(g.players) && g.players.some(p=>p?.odds && Object.keys(p.odds).length));\n}\n\n`;
    s=once(s,anchor,helper+anchor,'halftime live odds helper');
  }
  if(!s.includes('halftime 50K waiting for staged live sportsbook props')){
    const rx=/^(\s*)console\.log\(`▶ \${pair}: \${decision\.reason} — \${Number\(decision\.iterations\)\.toLocaleString\(\)} simulations`\);/m;
    const m=s.match(rx);
    if(!m)throw new Error('v88.4 anchor not found: sim run log');
    const indent=m[1]||'';
    const gate=`${indent}if(decision.phase==='halftime' && !halftimeLiveOddsReady(game,liveOdds)){\n${indent}  console.log(\`· \${pair}: halftime 50K waiting for staged live sportsbook props\`);\n${indent}  continue;\n${indent}}\n`;
    s=s.replace(rx,gate+'$&');
  }
  write(p,s);
}

// ---------------------------------------------------------------- Workflow: prefetch before halftime
{
  const p='.github/workflows/nfl-live.yml';let s=read(p);
  s=s.replace('Refresh v87 halftime sportsbook props when needed','Prefetch v88.4 Q2 / halftime sportsbook props');
  if(s.includes('run: node scripts/nfl-halftime-odds-refresh.mjs')){
    s=s.replace('run: node scripts/nfl-halftime-odds-refresh.mjs','run: node scripts/nfl-halftime-window-refresh.mjs');
  }
  if(!s.includes('node scripts/nfl-halftime-window-refresh.mjs'))throw new Error('v88.4 workflow patch failed');
  write(p,s);
}

// ---------------------------------------------------------------- Package + cache busts
{
  const p='package.json';const obj=JSON.parse(read(p));obj.scripts=obj.scripts||{};obj.scripts['nfl:v88.4:test']='node scripts/nfl-v884-selftest.mjs';write(p,JSON.stringify(obj,null,2)+'\n');
}
{
  const p='sports/router.js';let s=read(p);
  s=replaceRx(s,/import\('\.\/nfl-preview\.js\?v=[^']+'\)/g,"import('./nfl-preview.js?v=88.4')",'router NFL cache bust');
  write(p,s);
}
{
  const p='index.html';let s=read(p);
  const rx=/sports\/router\.js\?v=[A-Za-z0-9._-]+/g;
  if(rx.test(s))s=s.replace(rx,'sports/router.js?v=88.4');
  else if(s.includes('sports/router.js'))s=s.replace('sports/router.js','sports/router.js?v=88.4');
  else throw new Error('v88.4 anchor not found: index sports/router.js');
  write(p,s);
}

const checks=[
  ['sports/nfl-preview.js','halftime-ui-v884.js?v=88.4'],
  ['sports/nfl-preview.js','gamecast-v884-styles.js?v=88.4'],
  ['sports/nfl-preview.js','v884EndzoneStyle(g.away.abbr)'],
  ['sports/nfl-preview.js','v884MarkerLeft(ball)'],
  ['sports/nfl/sim/auto.js','isHalftimeWarmupState'],
  ['scripts/nfl-sim-auto.mjs','halftimeLiveOddsReady'],
  ['.github/workflows/nfl-live.yml','nfl-halftime-window-refresh.mjs'],
  ['sports/router.js','nfl-preview.js?v=88.4'],
  ['index.html','sports/router.js?v=88.4'],
];
for(const [p,needle] of checks)if(!read(p).includes(needle))throw new Error(`v88.4 validation failed: ${p} missing ${needle}`);

console.log('✓ Applied TSO v88.4');
console.log('  • possession football lives only beside the possessing team name');
console.log('  • team-color end zones + horizontal team names');
console.log('  • ball marker cannot disappear under the end zone');
console.log('  • Q2 2:00 UI warmup; backend odds prefetch begins by Q2 5:00');
console.log('  • rolling Sunday halftime lab with no arbitrary game/leg cap');
console.log('  • 50K halftime sim waits for staged live sportsbook props');
console.log('  • full import-chain cache bust -> v88.4');
