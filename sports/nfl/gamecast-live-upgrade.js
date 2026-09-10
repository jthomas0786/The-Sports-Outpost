const STYLE_ID='tso-nfl-gamecast-upgrade-v883';
const POSSESS_ID='tso-nfl-possession-pill';
const PANEL_ID='tso-nfl-drive-tracker';
const stateCache=new Map();

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
const txt=v=>v==null?'':String(v);
const up=v=>txt(v).trim().toUpperCase();

function teamAbbr(game,side){
  return up(game?.teams?.[side]?.abbr || game?.[`${side}Team`] || game?.[side]?.abbr || game?.[side]?.team || game?.[`${side}Abbr`]);
}
function teamName(game,side){
  return txt(game?.teams?.[side]?.name || game?.[`${side}Name`] || game?.[side]?.name || teamAbbr(game,side));
}
function teamScore(game,side){
  const raw=game?.teams?.[side]?.score ?? game?.score?.[side] ?? game?.[`${side}Score`];
  return raw==null?'—':String(raw);
}
function getGames(state){
  return Array.isArray(state?.data?.games) ? state.data.games : (Array.isArray(state?.data?.slate?.games) ? state.data.slate.games : []);
}
function getCurrentGame(state){
  const games=getGames(state);
  if(!games.length) return null;
  const target=String(state?.game || state?.selectedGameId || '').trim();
  const byId=target ? games.find(g=>String(g?.gameId||g?.id||g?.eventId||'')===target) : null;
  if(byId) return byId;
  const live=games.find(g=>/live|in progress|halftime/i.test(txt(g?.status||g?.statusText||g?.state?.status||g?.state?.statusDetail)));
  return live || games[0];
}

function getHeaderHost(root){
  const selectors=[
    '[data-tso-gamecast-header]',
    '.tso-gamecast-header',
    '.nfl-gamecast-header',
    '.gamecast-header',
    '.live-score-header',
    '.nfl-score-header',
    '.scoreboard-header',
    '.gc-header'
  ];
  for(const sel of selectors){
    const el=root.querySelector(sel);
    if(el) return el;
  }
  const fallback=[...root.querySelectorAll('div,section,article')].find(el=>{
    const text=el.textContent||'';
    return /game view|box score|play by play/i.test(text) && /live|kickoff|q1|q2|q3|q4/i.test(text);
  });
  return fallback || root.firstElementChild || root;
}

function findInsertAnchor(root){
  const header=getHeaderHost(root);
  return header?.nextElementSibling || header;
}

function maybeHideLegacyField(root){
  const selectors=[
    '.tso-nfl-legacy-field',
    '.nfl-live-field-art',
    '.nfl-field-stage',
    '.gamecast-field-stage',
    '.gamecast-field-art',
    '.tso-live-field',
    '.live-field-canvas'
  ];
  for(const sel of selectors){
    root.querySelectorAll(sel).forEach(el=>{
      if(el.id===PANEL_ID || el.closest(`#${PANEL_ID}`)) return;
      el.style.display='none';
      el.setAttribute('data-tso-hidden','1');
    });
  }
}

function parseBallOn(game){
  const raw=txt(game?.live?.yardLine || game?.state?.yardLine || game?.drive?.yardLine || game?.ballOn || game?.ball_on);
  const away=teamAbbr(game,'away');
  const home=teamAbbr(game,'home');
  if(!raw) return {label:'50', x:50, side:'MID', yard:50};
  const cleaned=raw.replace(/\s+/g,' ').trim().toUpperCase();
  const m=cleaned.match(/^([A-Z]{2,3})\s*(\d{1,2})$/);
  if(!m){
    const num=cleaned.match(/(\d{1,2})/);
    const x=num?clamp(Number(num[1]),1,99):50;
    return {label:cleaned, x, side:'MID', yard:x};
  }
  const side=m[1];
  const yard=clamp(Number(m[2]),1,99);
  let x=50;
  if(side===away) x=yard;
  else if(side===home) x=100-yard;
  else x=yard;
  return {label:`${side} ${yard}`, x, side, yard};
}

function getPossession(game){
  const away=teamAbbr(game,'away');
  const home=teamAbbr(game,'home');
  const raw=up(game?.live?.possession || game?.state?.possession || game?.drive?.possession || game?.possession || game?.offenseTeam);
  if(raw===away || raw===home) return raw;
  const ball=parseBallOn(game);
  if(ball.side===away||ball.side===home) return ball.side;
  return away || home || '';
}

function parseDownDistance(game){
  const raw=txt(game?.live?.down || game?.state?.down || game?.drive?.down || game?.downDistance || game?.down_distance || game?.situation);
  let label=raw || '1st & 10';
  const m=label.toUpperCase().match(/(1ST|2ND|3RD|4TH)\s*&\s*(GOAL|\d{1,2})/);
  if(!m) return {label, distance:10};
  return {label:`${m[1]} & ${m[2]}`, distance:m[2]==='GOAL'?10:clamp(Number(m[2]),1,25)};
}

function computeFirstDownX(game){
  const ball=parseBallOn(game);
  const down=parseDownDistance(game);
  const poss=getPossession(game);
  const away=teamAbbr(game,'away');
  const dir=poss && poss===away ? 1 : -1;
  return clamp(ball.x + dir*down.distance, 1, 99);
}

function getCurrentDrive(game){
  const drive=game?.drive || game?.live?.drive || {};
  const plays=drive.plays ?? drive.numPlays ?? '—';
  const yards=drive.yards ?? drive.netYards ?? '—';
  const time=drive.time ?? drive.possession ?? drive.clock ?? '—';
  return {plays:txt(plays), yards:txt(yards), time:txt(time), result:txt(drive.result || drive.summary || '')};
}

function getWinPct(game){
  const raw=game?.live?.winPct ?? game?.state?.winPct ?? game?.winPct ?? game?.probabilities?.win;
  const n=Number(raw);
  if(Number.isFinite(n)) return n>1?Math.round(n):Math.round(n*100);
  return null;
}

function getPlayInfo(game){
  const play=game?.lastPlay || game?.live?.lastPlay || game?.play || {};
  const title=txt(play.title || play.shortText || play.type || game?.live?.playTitle || 'Current Play');
  const desc=txt(play.description || play.text || game?.live?.playText || 'Live drive and play information updates here as the feed changes.');
  const type=txt(play.type || play.result || title);
  const player=play.player || play.primaryPlayer || game?.featuredPlayer || game?.watchlist?.[0] || null;
  return {title, desc, type, player};
}

function getFeaturedPlayer(playInfo, game){
  const p=playInfo?.player;
  if(typeof p==='string') return {name:p, meta:'Live player update', line:''};
  if(p && typeof p==='object'){
    const name=txt(p.name || p.playerName || p.label || 'Featured Player');
    const pos=txt(p.position || p.pos || '');
    const num=txt(p.number || p.jersey || '');
    const team=txt(p.team || p.teamAbbr || getPossession(game));
    const statA=txt(p.stat || p.value || p.result || '');
    const statB=txt(p.secondary || p.subtitle || '');
    return {name, meta:[team,pos,num&&`#${num}`].filter(Boolean).join(' · '), line:[statA,statB].filter(Boolean).join(' · ')};
  }
  const watch=game?.watchlist?.[0];
  if(watch) return {name:txt(watch.value || watch.name || 'Player to Watch'), meta:txt(watch.label || 'Players to watch'), line:''};
  return {name:'Live Update', meta:'Player tracking', line:'Stat line updates with each play'};
}

function buildShell(){
  const wrap=document.createElement('section');
  wrap.id=PANEL_ID;
  wrap.className='tso-drive-upgrade';
  wrap.innerHTML=`
    <div class="tso-drive-toprow">
      <div>
        <div class="tso-drive-kicker">Current Drive</div>
        <div class="tso-drive-meta" data-role="drive-meta">0 plays, 0 yards, 0:00</div>
      </div>
      <button class="tso-drive-expand" type="button" aria-label="Expand drive view" data-role="expand">⤢</button>
    </div>
    <div class="tso-drive-divider"></div>
    <div class="tso-drive-status">
      <div class="tso-drive-playtype" data-role="play-type">Live Play</div>
      <div class="tso-drive-situation">
        <div><span>Down:</span><strong data-role="down">1st & 10</strong></div>
        <div><span>Ball on:</span><strong data-role="ball">50</strong></div>
      </div>
    </div>
    <div class="tso-drive-fieldwrap">
      <div class="tso-drive-field" data-role="field">
        <div class="tso-endzone tso-endzone-away" data-role="away-endzone"><span data-role="away-abbr">AWY</span></div>
        <div class="tso-endzone tso-endzone-home" data-role="home-endzone"><span data-role="home-abbr">HOME</span></div>
        <div class="tso-yardgrid"></div>
        <div class="tso-los" data-role="los"></div>
        <div class="tso-firstdown" data-role="firstdown"></div>
        <div class="tso-playpath" data-role="playpath"></div>
        <div class="tso-ball-marker" data-role="ball-marker">
          <div class="tso-ball-pill">🏈</div>
        </div>
        <div class="tso-play-badge" data-role="play-badge">0 yds</div>
        <div class="tso-yardlabels">
          <span>NE</span><span>40</span><span>30</span><span>20</span><span>10</span><span>50</span><span>10</span><span>20</span><span>30</span><span>40</span><span>SEA</span>
        </div>
      </div>
    </div>
    <div class="tso-lastplay-card">
      <div class="tso-lastplay-main">
        <div class="tso-lastplay-title" data-role="play-title">Current Play</div>
        <div class="tso-lastplay-desc" data-role="play-desc">Live play detail will appear here.</div>
      </div>
      <div class="tso-lastplay-side">
        <div class="tso-win-row"><span>Win %</span><strong data-role="win-pct">—</strong></div>
        <div class="tso-lastplay-tag">Last Play</div>
      </div>
    </div>
    <div class="tso-player-card">
      <div class="tso-player-avatar" data-role="player-badge">P</div>
      <div class="tso-player-copy">
        <div class="tso-player-name" data-role="player-name">Featured Player</div>
        <div class="tso-player-meta" data-role="player-meta">Team · Pos</div>
      </div>
      <div class="tso-player-line" data-role="player-line">Stat line</div>
    </div>
    <div class="tso-drive-footer" data-role="drive-footer">This panel updates smoothly from the live state feed.</div>
  `;
  wrap.querySelector('[data-role="expand"]').addEventListener('click',()=>{
    wrap.classList.toggle('tso-drive-expanded');
  });
  return wrap;
}

function setText(root,role,value){
  const el=root.querySelector(`[data-role="${role}"]`);
  if(el) el.textContent=value;
}

function setStylePct(root,role,pct){
  const el=root.querySelector(`[data-role="${role}"]`);
  if(el) el.style.left=`calc(${pct}% - ${role==='ball-marker' ? 18 : 1}px)`;
}

function setPlayPath(root,start,end){
  const el=root.querySelector('[data-role="playpath"]');
  if(!el) return;
  const left=Math.min(start,end);
  const width=Math.max(1,Math.abs(end-start));
  el.style.left=`${left}%`;
  el.style.width=`${width}%`;
  el.classList.toggle('is-negative', end < start);
}

function upsertPossessionPill(root, game){
  const header=getHeaderHost(root);
  if(!header) return;
  header.style.position=header.style.position||'relative';
  let pill=header.querySelector(`#${POSSESS_ID}`);
  if(!pill){
    pill=document.createElement('div');
    pill.id=POSSESS_ID;
    pill.className='tso-possession-pill';
    header.appendChild(pill);
  }
  const poss=getPossession(game);
  pill.innerHTML=`<span class="tso-ball-dot">🏈</span><span>${poss || '—'} ball</span>`;
}

export function ensureNflGamecastUpgradeStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #${PANEL_ID}{margin:20px 0 18px;border:1px solid #1b3f74;border-radius:18px;padding:18px 18px 16px;background:linear-gradient(180deg,#0c1f3a 0%,#07182e 100%);box-shadow:0 18px 42px rgba(0,0,0,.28);color:#f5fbff}
    #${PANEL_ID}.tso-drive-expanded{position:relative;z-index:12}
    #${PANEL_ID} .tso-drive-toprow{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
    #${PANEL_ID} .tso-drive-kicker{font:800 13px/1.2 Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#ffffff}
    #${PANEL_ID} .tso-drive-meta{margin-top:4px;font:500 14px/1.2 Inter, Arial, sans-serif;color:#9eb7d7}
    #${PANEL_ID} .tso-drive-expand{width:38px;height:38px;border-radius:12px;border:1px solid #244c87;background:#0a1730;color:#d7e7ff;font-size:20px;cursor:pointer}
    #${PANEL_ID} .tso-drive-divider{margin:14px 0 16px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.22),rgba(255,255,255,.05))}
    #${PANEL_ID} .tso-drive-status{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
    #${PANEL_ID} .tso-drive-playtype{font:700 22px/1.1 Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;color:#ffffff}
    #${PANEL_ID} .tso-drive-situation{display:flex;gap:26px;flex-wrap:wrap;justify-content:center;color:#9eb7d7}
    #${PANEL_ID} .tso-drive-situation div{display:flex;gap:7px;align-items:baseline}
    #${PANEL_ID} .tso-drive-situation strong{color:#ffffff;font:800 16px/1.1 Inter, Arial, sans-serif}
    #${PANEL_ID} .tso-drive-fieldwrap{margin-top:14px}
    #${PANEL_ID} .tso-drive-field{position:relative;height:174px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#eff5fb 0%,#dee7f1 100%);border:1px solid rgba(255,255,255,.16)}
    #${PANEL_ID} .tso-endzone{position:absolute;top:34px;bottom:38px;width:12%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#0e376d 0%,#0b2650 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
    #${PANEL_ID} .tso-endzone-away{left:4%}
    #${PANEL_ID} .tso-endzone-home{right:4%}
    #${PANEL_ID} .tso-endzone span{writing-mode:vertical-rl;transform:rotate(180deg);font:900 24px/1 Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;letter-spacing:.05em;color:#ffffff;opacity:.92}
    #${PANEL_ID} .tso-yardgrid{position:absolute;left:14%;right:14%;top:34px;bottom:38px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.12) 0 1px,transparent 1px 10%)}
    #${PANEL_ID} .tso-yardgrid::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(0,0,0,.07) calc(10% - 1px) 10%)}
    #${PANEL_ID} .tso-yardgrid::after{content:'';position:absolute;left:0;right:0;top:50%;border-top:2px dotted rgba(0,0,0,.12)}
    #${PANEL_ID} .tso-los,#${PANEL_ID} .tso-firstdown,#${PANEL_ID} .tso-playpath,#${PANEL_ID} .tso-ball-marker,#${PANEL_ID} .tso-play-badge{transition:all .34s ease}
    #${PANEL_ID} .tso-los{position:absolute;top:26px;bottom:30px;width:3px;background:#38a1ff;box-shadow:0 0 12px rgba(56,161,255,.45)}
    #${PANEL_ID} .tso-firstdown{position:absolute;top:26px;bottom:30px;width:3px;background:#ffd32a;box-shadow:0 0 12px rgba(255,211,42,.45)}
    #${PANEL_ID} .tso-playpath{position:absolute;top:84px;height:4px;border-radius:999px;background:#101721;box-shadow:0 0 0 1px rgba(0,0,0,.06)}
    #${PANEL_ID} .tso-playpath::after{content:'';position:absolute;right:-6px;top:-4px;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid #101721}
    #${PANEL_ID} .tso-playpath.is-negative::after{right:auto;left:-6px;border-left:none;border-right:10px solid #101721}
    #${PANEL_ID} .tso-ball-marker{position:absolute;top:52px;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.28);backdrop-filter:blur(3px);display:grid;place-items:center;border:2px solid rgba(0,0,0,.22);box-shadow:0 10px 16px rgba(0,0,0,.18)}
    #${PANEL_ID} .tso-ball-pill{font-size:18px;transform:translateY(1px)}
    #${PANEL_ID} .tso-play-badge{position:absolute;top:96px;padding:5px 10px;border-radius:10px;background:#f0f3f8;color:#061426;font:800 13px/1 Inter,Arial,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.12)}
    #${PANEL_ID} .tso-yardlabels{position:absolute;left:5%;right:5%;bottom:10px;display:flex;justify-content:space-between;font:700 11px/1 Inter,Arial,sans-serif;color:#7a8492}
    #${PANEL_ID} .tso-lastplay-card{margin-top:16px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;padding:16px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(112,157,219,.26)}
    #${PANEL_ID} .tso-lastplay-title{font:800 16px/1.2 Inter,Arial,sans-serif;color:#ffffff}
    #${PANEL_ID} .tso-lastplay-desc{margin-top:8px;font:500 14px/1.45 Inter,Arial,sans-serif;color:#b9cce6}
    #${PANEL_ID} .tso-lastplay-side{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    #${PANEL_ID} .tso-win-row{display:flex;gap:8px;align-items:center;font:700 14px/1 Inter,Arial,sans-serif;color:#d5e5ff}
    #${PANEL_ID} .tso-lastplay-tag{padding:7px 10px;border-radius:10px;background:#e7ecf3;color:#17253d;font:800 12px/1 Inter,Arial,sans-serif}
    #${PANEL_ID} .tso-player-card{margin-top:14px;display:grid;grid-template-columns:42px 1fr auto;gap:12px;align-items:center;padding:14px 16px;border-radius:16px;border:1px solid rgba(112,157,219,.2);background:rgba(10,24,47,.65)}
    #${PANEL_ID} .tso-player-avatar{width:42px;height:42px;border-radius:999px;background:#2d7fff;color:#fff;display:grid;place-items:center;font:800 16px/1 Inter,Arial,sans-serif}
    #${PANEL_ID} .tso-player-name{font:800 15px/1.2 Inter,Arial,sans-serif}
    #${PANEL_ID} .tso-player-meta{margin-top:3px;font:500 13px/1.2 Inter,Arial,sans-serif;color:#9eb7d7}
    #${PANEL_ID} .tso-player-line{font:800 13px/1.2 Inter,Arial,sans-serif;color:#ffd24d;text-align:right}
    #${PANEL_ID} .tso-drive-footer{margin-top:12px;font:500 12px/1.35 Inter,Arial,sans-serif;color:#89a7ce}
    .${POSSESS_ID}, #${POSSESS_ID}{position:absolute;right:18px;top:14px;display:flex;gap:8px;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(4,16,34,.75);border:1px solid #295ca1;color:#eef7ff;font:800 12px/1 Inter,Arial,sans-serif;box-shadow:0 10px 18px rgba(0,0,0,.24)}
    #${POSSESS_ID} .tso-ball-dot{font-size:14px}
    @media (max-width: 900px){
      #${PANEL_ID}{padding:16px}
      #${PANEL_ID} .tso-drive-field{height:160px}
      #${PANEL_ID} .tso-endzone span{font-size:18px}
      #${PANEL_ID} .tso-lastplay-card{grid-template-columns:1fr}
      #${PANEL_ID} .tso-player-card{grid-template-columns:42px 1fr;}
      #${PANEL_ID} .tso-player-line{grid-column:1/-1;text-align:left}
      #${POSSESS_ID}{top:10px;right:10px;padding:7px 10px;font-size:11px}
    }
    @media (max-width: 640px){
      #${PANEL_ID} .tso-drive-playtype{font-size:18px}
      #${PANEL_ID} .tso-drive-meta{font-size:12px}
      #${PANEL_ID} .tso-drive-field{height:142px}
      #${PANEL_ID} .tso-endzone{top:28px;bottom:30px;width:14%}
      #${PANEL_ID} .tso-endzone span{font-size:15px}
      #${PANEL_ID} .tso-yardlabels{font-size:9px}
      #${PANEL_ID} .tso-play-badge{top:86px;font-size:12px;padding:4px 8px}
    }
  `;
  document.head.appendChild(style);
}

export function mountOrUpdateNflGamecastUpgrade({state,root}={}){
  if(!root || !state) return;
  const game=getCurrentGame(state);
  if(!game) return;
  ensureNflGamecastUpgradeStyles();
  upsertPossessionPill(root,game);

  const poss=getPossession(game);
  const away=teamAbbr(game,'away') || 'AWY';
  const home=teamAbbr(game,'home') || 'HOME';
  const ball=parseBallOn(game);
  const firstX=computeFirstDownX(game);
  const gameKey=String(game?.gameId||game?.id||`${away}-${home}`);
  const prev=stateCache.get(gameKey) ?? {ballX:ball.x};
  const ydsDelta=Math.round(ball.x-prev.ballX);
  stateCache.set(gameKey,{ballX:ball.x});

  maybeHideLegacyField(root);

  let panel=root.querySelector(`#${PANEL_ID}`);
  if(!panel){
    panel=buildShell();
    const anchor=findInsertAnchor(root);
    if(anchor?.parentNode) anchor.parentNode.insertBefore(panel,anchor.nextSibling);
    else root.appendChild(panel);
  }

  const drive=getCurrentDrive(game);
  const down=parseDownDistance(game);
  const play=getPlayInfo(game);
  const player=getFeaturedPlayer(play,game);
  const win=getWinPct(game);
  const footerState=txt(game?.state?.statusDetail || game?.statusText || game?.status || 'Live');
  const scoreLine=`${teamName(game,'away')} ${teamScore(game,'away')} · ${teamName(game,'home')} ${teamScore(game,'home')}`;

  setText(panel,'drive-meta',`${drive.plays} plays, ${drive.yards} yards, ${drive.time}`);
  setText(panel,'play-type',play.type || play.title || 'Live Play');
  setText(panel,'down',down.label);
  setText(panel,'ball',ball.label);
  setText(panel,'away-abbr',away);
  setText(panel,'home-abbr',home);
  setText(panel,'play-title',play.title || 'Current Play');
  setText(panel,'play-desc',play.desc);
  setText(panel,'win-pct',win==null ? '—' : `${poss} ${win}%`);
  setText(panel,'player-badge',txt(player.name).slice(0,1).toUpperCase() || 'P');
  setText(panel,'player-name',player.name);
  setText(panel,'player-meta',player.meta);
  setText(panel,'player-line',player.line || `${poss} possession`);
  setText(panel,'drive-footer',`${footerState} · ${scoreLine}${drive.result ? ` · ${drive.result}` : ''}`);

  const badgeX=clamp(ball.x+2,4,94);
  setStylePct(panel,'los',ball.x);
  setStylePct(panel,'firstdown',firstX);
  setStylePct(panel,'ball-marker',ball.x);
  setStylePct(panel,'play-badge',badgeX);
  setPlayPath(panel,prev.ballX,ball.x);

  const badge=panel.querySelector('[data-role="play-badge"]');
  if(badge) badge.textContent=`${ydsDelta===0 ? 0 : ydsDelta} yds`;
}
