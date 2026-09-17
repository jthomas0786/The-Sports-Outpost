const STYLE_ID='tso-mlb-player-modal-bvp-v902';
const SECTION_CLASS='tso-mlb-bvp-history';
let installed=false,observer=null,queued=false,slatePromise=null;

const normalizeName=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function hasBvpHistory(history){
  if(!history||typeof history!=='object')return false;
  return (finite(history.pa)??0)>0||(finite(history.ab)??0)>0;
}
function formatRate(v){
  const n=finite(v);if(n==null)return '—';
  return n.toFixed(3).replace(/^0(?=\.)/,'');
}
function cardPlayerName(card){
  const h=card?.querySelector?.('.who h2');if(!h)return '';
  const direct=[...h.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent||'').join(' ').replace(/\s+/g,' ').trim();
  if(direct)return direct;
  const clone=h.cloneNode(true);
  clone.querySelectorAll('.dq-badge,.pb-badge-row,.pb-badge,[data-tso-badge]').forEach(n=>n.remove());
  return String(clone.textContent||'').replace(/\s+/g,' ').trim();
}
function findBvpMatchup(slate,playerName){
  const key=normalizeName(playerName);if(!key)return null;
  for(const game of slate?.games||[]){
    for(const side of ['away','home']){
      const team=game?.[side]||{};
      const batter=(team.lineup||[]).find(p=>normalizeName(p?.name)===key);
      if(!batter)continue;
      const opp=game?.[side==='away'?'home':'away']||{};
      const pitcher=opp.pitcher||{};
      return {
        batter,
        history:batter.vsPitcher||null,
        pitcherName:pitcher.name||opp.probablePitcherName||'Opposing starter',
        pitcherId:pitcher.id||opp.probablePitcherId||null,
        game
      };
    }
  }
  return null;
}
function findSection(card,label){
  const want=String(label||'').trim().toUpperCase();
  const h=[...card.querySelectorAll('.sec-h h3')].find(x=>String(x.textContent||'').trim().toUpperCase()===want);
  return h?.closest('.sec')||null;
}
function historySignature(matchup){
  const h=matchup?.history||{};
  return [matchup?.batter?.id,matchup?.pitcherId,h.pa,h.ab,h.h,h.hr,h.avg,h.slg,h.so].join('|');
}
function historyMarkup(matchup){
  const h=matchup.history||{};
  const pa=finite(h.pa),ab=finite(h.ab),hits=finite(h.h),hr=finite(h.hr),so=finite(h.so);
  const sample=pa??ab??0;
  const cells=[
    [pa!=null?pa:(ab??'—'),'PA'],
    [hits??'—','H'],
    [hr??'—','HR'],
    [formatRate(h.avg),'AVG'],
    [formatRate(h.slg),'SLG'],
    [so??'—','K']
  ];
  return `<div class="sec ${SECTION_CLASS}" data-tso-mlb-bvp="1"><div class="sec-h"><h3>Batter vs Pitcher</h3><span class="note">Head-to-head</span></div><div class="tso-mlb-bvp-matchup"><b>${esc(matchup.batter?.name||'Batter')}</b><span>vs</span><strong>${esc(matchup.pitcherName)}</strong></div><div class="tso-mlb-bvp-grid">${cells.map(([value,label])=>`<div><b>${esc(value)}</b><span>${label}</span></div>`).join('')}</div><p class="tso-mlb-bvp-foot">Recorded head-to-head sample · ${esc(sample)} PA${sample&&sample<20?' · small sample':''}</p></div>`;
}

async function loadSlate(){
  if(!slatePromise){
    slatePromise=fetch('./slate.json?ts='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
  }
  return slatePromise;
}
function ensureStyles(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-matchup{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:-2px 0 11px;color:var(--muted);font-size:12px;line-height:1.35}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-matchup b,html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-matchup strong{color:var(--text);font:600 14px 'Oswald',sans-serif}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-matchup strong{color:var(--gold)}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid>div{min-width:0;padding:11px 6px 9px;text-align:center;border:1px solid var(--border);border-radius:10px;background:var(--panel3)}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid b{display:block;color:var(--text);font:700 18px/1 'JetBrains Mono',monospace}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid span{display:block;margin-top:7px;color:var(--muted);font:800 10px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
    html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-foot{margin:10px 0 0;color:var(--muted);font-size:11.5px;line-height:1.4}
    @media(max-width:680px){html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid b{font-size:17px}html[data-sport="mlb"] #modalBody .${SECTION_CLASS} .tso-mlb-bvp-grid span{font-size:10px}}
  `;document.head.appendChild(s);
}
async function enhanceCard(card){
  if(!card||document.documentElement.getAttribute('data-sport')!=='mlb')return;
  const swing=findSection(card,'SWING FACTORS');
  const contact=findSection(card,'CONTACT QUALITY');
  if(!swing||!contact)return;
  const playerName=cardPlayerName(card);
  const playerKey=normalizeName(playerName);
  if(!playerKey)return;
  card.dataset.tsoBvpPending=playerKey;
  const slate=await loadSlate();
  if(!card.isConnected||card.dataset.tsoBvpPending!==playerKey||normalizeName(cardPlayerName(card))!==playerKey)return;
  const matchup=findBvpMatchup(slate,playerName);
  const old=card.querySelector(`.${SECTION_CLASS}`);
  if(!matchup||!hasBvpHistory(matchup.history)){
    old?.remove();
    delete card.dataset.tsoBvpSig;
    return;
  }
  const sig=historySignature(matchup);
  if(old&&card.dataset.tsoBvpSig===sig)return;
  const wrap=document.createElement('div');wrap.innerHTML=historyMarkup(matchup);
  const section=wrap.firstElementChild;
  if(old)old.replaceWith(section);else contact.before(section);
  card.dataset.tsoBvpSig=sig;
}
function scan(){
  queued=false;
  if(typeof document==='undefined'||document.documentElement.getAttribute('data-sport')!=='mlb')return;
  document.querySelectorAll('#modalBody .player-card-v2').forEach(card=>{enhanceCard(card).catch(()=>{});});
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}

export function installMlbPlayerModalBvpV902(){
  if(typeof document==='undefined')return;
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('#modalBody'))setTimeout(queue,0);},true);
  window.addEventListener('hashchange',queue);
  queue();
}

export const __MLB_PLAYER_MODAL_BVP_V902_TEST__={normalizeName,hasBvpHistory,formatRate,findBvpMatchup,historyMarkup};
