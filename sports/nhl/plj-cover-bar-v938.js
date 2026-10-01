const TEAM_COLORS={
 ANA:'#FC4C02',BOS:'#FFB81C',BUF:'#003087',CGY:'#D2001C',CAR:'#CC0000',CHI:'#CF0A2C',COL:'#6F263D',CBJ:'#002654',DAL:'#006847',DET:'#CE1126',EDM:'#FF4C00',FLA:'#C8102E',LA:'#111111',LAK:'#111111',MIN:'#154734',MTL:'#AF1E2D',NSH:'#FFB81C',NJ:'#CE1126',NJD:'#CE1126',NYI:'#00539B',NYR:'#0038A8',OTT:'#C52032',PHI:'#F74902',PIT:'#FCB514',SJ:'#006D75',SJS:'#006D75',SEA:'#68A2B9',STL:'#002F87',TB:'#002868',TBL:'#002868',TOR:'#003E7E',UTA:'#6CACE4',VAN:'#00843D',VGK:'#B4975A',WSH:'#C8102E',WPG:'#004C97'
};

let installed=false,observer=null,pending=false;
const clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
const pct=v=>Number(v).toFixed(1).replace(/\.0$/,'');
const color=abbr=>TEAM_COLORS[String(abbr||'').toUpperCase()]||'#2D7FFF';

function ensureStyle(){
 if(document.getElementById('nhl-plj-cover-bars-v938-css'))return;
 const style=document.createElement('style');
 style.id='nhl-plj-cover-bars-v938-css';
 style.textContent=`
 .plj-cover-chart{margin:10px 0 3px;padding:10px 11px 9px;border:1px solid rgba(148,163,184,.16);border-radius:14px;background:rgba(4,13,29,.52)}
 .plj-cover-chart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 1px 8px}
 .plj-cover-chart-head small{font:900 9px/1 Inter,system-ui,sans-serif;letter-spacing:.13em;color:#7f92aa}
 .plj-cover-chart-head b{font:850 11px/1.15 Inter,system-ui,sans-serif;color:#e8f2ff;text-align:right}
 .plj-cover-track{display:flex;width:100%;height:44px;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:#0a1322;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}
 .plj-cover-segment{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;padding:0 6px;background:var(--plj-team-color);color:#fff;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.92);transition:width .25s ease;box-sizing:border-box}
 .plj-cover-segment+ .plj-cover-segment{border-left:1px solid rgba(255,255,255,.42)}
 .plj-cover-segment b{overflow:hidden;font:900 10px/1 Inter,system-ui,sans-serif;letter-spacing:.025em;white-space:nowrap;text-overflow:ellipsis}
 .plj-cover-segment strong{flex:0 0 auto;font:950 12px/1 Inter,system-ui,sans-serif}
 .plj-cover-segment.is-leader{box-shadow:inset 0 0 0 2px rgba(255,255,255,.42)}
 .plj-cover-segment.is-narrow b{display:none}
 .plj-cover-chart-note{display:block;margin-top:7px;font:650 9px/1.25 Inter,system-ui,sans-serif;color:#71849b}
 @media(max-width:620px){
  .plj-cover-chart{margin-top:8px;padding:9px}
  .plj-cover-chart-head{align-items:flex-start}
  .plj-cover-chart-head b{max-width:58%;font-size:10px}
  .plj-cover-track{height:46px}
  .plj-cover-segment{gap:4px;padding:0 4px}
  .plj-cover-segment b{font-size:9px}
  .plj-cover-segment strong{font-size:11px}
 }
 `;
 document.head.appendChild(style);
}

function parseCard(card){
 const dogTile=card.querySelector('.plj-dog-cover');
 if(!dogTile)return null;
 const dogLabel=dogTile.querySelector('b')?.textContent||'';
 const dogDetail=dogTile.querySelector('span')?.textContent||'';
 const favLabel=card.querySelector('.plj-line > div:first-child b')?.textContent||'';
 const dogAbbr=dogLabel.match(/^\s*([A-Z]{2,3})\s+\+1\.5/i)?.[1]?.toUpperCase();
 const favAbbr=favLabel.match(/^\s*([A-Z]{2,3})\s+-1\.5/i)?.[1]?.toUpperCase();
 const dogPct=Number(dogDetail.match(/([0-9]+(?:\.[0-9]+)?)%\s+no-vig/i)?.[1]);
 if(!dogAbbr||!favAbbr||!Number.isFinite(dogPct))return null;
 const dog=clamp(dogPct),fav=clamp(100-dog);
 return {dogAbbr,favAbbr,dogPct:dog,favPct:fav};
}

function chartHTML(data){
 const dogLeads=data.dogPct>data.favPct;
 const favLeads=data.favPct>data.dogPct;
 const leader=dogLeads?`${data.dogAbbr} +1.5`:favLeads?`${data.favAbbr} -1.5`:'Even market';
 const favNarrow=data.favPct<34?' is-narrow':'';
 const dogNarrow=data.dogPct<34?' is-narrow':'';
 return `<div class="plj-cover-chart-head"><small>MARKET COVER LEAN</small><b>${leader==='Even market'?'Even market':`Favors ${leader}`}</b></div>
 <div class="plj-cover-track" role="img" aria-label="${data.favAbbr} minus 1.5 ${pct(data.favPct)} percent; ${data.dogAbbr} plus 1.5 ${pct(data.dogPct)} percent">
  <div class="plj-cover-segment${favLeads?' is-leader':''}${favNarrow}" style="width:${data.favPct}%;--plj-team-color:${color(data.favAbbr)}"><b>${data.favAbbr} -1.5</b><strong>${pct(data.favPct)}%</strong></div>
  <div class="plj-cover-segment${dogLeads?' is-leader':''}${dogNarrow}" style="width:${data.dogPct}%;--plj-team-color:${color(data.dogAbbr)}"><b>${data.dogAbbr} +1.5</b><strong>${pct(data.dogPct)}%</strong></div>
 </div>
 <span class="plj-cover-chart-note">No-vig market cover split from the current two-sided puck-line prices.</span>`;
}

function decorate(){
 const panel=document.getElementById('hkPuckLineJesusPanel');
 if(!panel)return;
 for(const card of panel.querySelectorAll('.plj-card')){
  const data=parseCard(card);if(!data)continue;
  const match=card.querySelector('.plj-match');if(!match)continue;
  const signature=`${data.favAbbr}:${pct(data.favPct)}|${data.dogAbbr}:${pct(data.dogPct)}`;
  let chart=card.querySelector(':scope > .plj-cover-chart');
  if(chart?.dataset.signature===signature)continue;
  if(!chart){chart=document.createElement('div');chart.className='plj-cover-chart';match.insertAdjacentElement('afterend',chart);}
  chart.dataset.signature=signature;
  chart.innerHTML=chartHTML(data);
 }
}

function schedule(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{pending=false;decorate();});
}

export function installPljCoverBarsV938(){
 if(installed||typeof document==='undefined')return;
 installed=true;ensureStyle();decorate();
 observer=new MutationObserver(schedule);
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 window.addEventListener('tso:nhl-tab-change',schedule);
}
