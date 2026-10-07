import {fairPair,edgePercentages,edgeLeader,formatAmerican,lineNumber} from '../shared/game-edge-v100.js?v=1.0';

const SLATE='./slates/nhl.json';
const LINES='./slates/nhl-puck-lines.json';
const CSS_ID='tso-game-edge-v100-css';
let panel=null,timer=null,loading=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function ensureCss(){
 if(document.getElementById(CSS_ID))return;
 const link=document.createElement('link');link.id=CSS_ID;link.rel='stylesheet';
 link.href=new URL('../shared/game-edge-v100.css?v=1.0',import.meta.url).href;document.head.appendChild(link);
}
async function json(url){const r=await fetch(`${url}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`Game Edge data request failed (${r.status})`);return r.json();}
function status(g){if(g.status==='post')return 'FINAL';if(g.status==='in')return g.detail||`P${g.period||'—'} ${g.clock||''}`;return new Date(g.startTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
function gameLine(lines,id){return (lines?.games||[]).find(x=>String(x.gameId)===String(id))||null;}
function meter({title,lineText,leftLabel,leftSub,rightLabel,rightSub,pair,total=false,reason}){
 const p=edgePercentages(pair),leader=edgeLeader(pair);
 const leftStrong=leader.side==='left',rightStrong=leader.side==='right';
 return `<section class="ge-market"><div class="ge-market-top"><b>${esc(title)}</b><span>${esc(lineText)}</span></div>
  <div class="ge-labels"><div><b>${leftStrong?'★ ':''}${esc(leftLabel)}</b><span>${esc(leftSub)}</span></div><div><b>${rightStrong?'★ ':''}${esc(rightLabel)}</b><span>${esc(rightSub)}</span></div></div>
  <div class="ge-bar${total?' total':''}"><i class="left" style="width:${p.left.toFixed(1)}%"></i><i class="right" style="width:${p.right.toFixed(1)}%"></i></div>
  <div class="ge-pcts"><span>${p.available?p.left.toFixed(0)+'%':'—'}</span><span>${p.available?p.right.toFixed(0)+'%':'—'}</span></div>
  <div class="ge-reason">${reason}</div></section>`;
}
function spreadMarket(g,l){
 const s=l?.puckLine;if(!s)return meter({title:'Spread',lineText:'No line',leftLabel:g.away.abbr,leftSub:'—',rightLabel:g.home.abbr,rightSub:'—',pair:null,reason:'No two-sided spread market is available yet.'});
 const favAway=s.favoriteAbbr===g.away.abbr;
 const favPair=fairPair({leftPrice:s.price,rightPrice:s.underdogPrice});
 const pair=favPair?(favAway?favPair:{left:favPair.right,right:favPair.left}):null;
 const awayLine=favAway?s.line:s.underdogLine,homeLine=favAway?s.underdogLine:s.line;
 const p=edgePercentages(pair),lean=p.left>p.right?`${g.away.abbr} ${lineNumber(awayLine,{signed:true})}`:`${g.home.abbr} ${lineNumber(homeLine,{signed:true})}`;
 const why=pair?`<strong>${esc(lean)}</strong> carries the stronger no-vig cover probability from the current two-sided puck-line price across ${Number(s.sportsbookCount||0)} book${Number(s.sportsbookCount||0)===1?'':'s'}.`:'The spread line is posted, but both side prices are not available yet.';
 return meter({title:'Spread',lineText:'Puck Line',leftLabel:`${g.away.abbr} ${lineNumber(awayLine,{signed:true})}`,leftSub:favAway?formatAmerican(s.price):formatAmerican(s.underdogPrice),rightLabel:`${g.home.abbr} ${lineNumber(homeLine,{signed:true})}`,rightSub:favAway?formatAmerican(s.underdogPrice):formatAmerican(s.price),pair,reason:why});
}
function moneylineMarket(g,l){
 const m=l?.moneyline;
 const pair=m?fairPair({leftProbability:m.awayFair,rightProbability:m.homeFair}):null;
 const p=edgePercentages(pair),lean=p.left>p.right?g.away.abbr:g.home.abbr;
 const why=pair?`<strong>${esc(lean)} moneyline</strong> is the market favorite at ${Math.max(p.left,p.right).toFixed(0)}% fair win probability across ${Number(m.books||0)} books.`:'No two-sided moneyline consensus is available yet.';
 return meter({title:'Moneyline',lineText:'Win outright',leftLabel:g.away.abbr,leftSub:formatAmerican(m?.awayBest),rightLabel:g.home.abbr,rightSub:formatAmerican(m?.homeBest),pair,reason:why});
}
function totalMarket(g,l){
 const t=l?.total,line=t?.line;
 const pair=t?fairPair({leftPrice:t.underPrice,rightPrice:t.overPrice}):null;
 const p=edgePercentages(pair),lean=p.left>p.right?'Under':'Over';
 const why=pair?`<strong>${lean} ${lineNumber(line)}</strong> has the stronger no-vig side at ${Math.max(p.left,p.right).toFixed(0)}% from current two-sided total pricing.`:`The total is ${lineNumber(line)}, but there is not enough two-sided price data for a lean yet.`;
 return meter({title:'Total',lineText:line!=null?`O/U ${lineNumber(line)}`:'No total',leftLabel:`Under ${lineNumber(line)}`,leftSub:formatAmerican(t?.underPrice),rightLabel:`Over ${lineNumber(line)}`,rightSub:formatAmerican(t?.overPrice),pair,total:true,reason:why});
}
function card(g,l){
 return `<article class="ge-game"><div class="ge-game-head"><div class="ge-team"><img src="${esc(g.away.logo||'')}" alt=""><div><b>${esc(g.away.abbr)}</b><span>${esc(g.away.name)}</span></div></div><div class="ge-vs"><b>@</b><span>${esc(status(g))}</span></div><div class="ge-team home"><div><b>${esc(g.home.abbr)}</b><span>${esc(g.home.name)}</span></div><img src="${esc(g.home.logo||'')}" alt=""></div></div><div class="ge-markets">${spreadMarket(g,l)}${moneylineMarket(g,l)}${totalMarket(g,l)}</div></article>`;
}
async function render(){
 if(!panel||loading)return;loading=true;
 const body=panel.querySelector('[data-ge-body]');if(body)body.innerHTML='<div class="ge-empty">Loading Game Edge…</div>';
 try{
  const [slate,lines]=await Promise.all([json(SLATE),json(LINES)]);
  const games=slate?.games||[];
  const html=games.map(g=>card(g,gameLine(lines,g.id))).join('');
  if(body)body.innerHTML=html?`<div class="ge-grid">${html}</div><div class="ge-note">Bars show no-vig market preference, not certainty. Spread compares the two cover sides, Moneyline compares outright win probability, and Total compares Under vs Over. Game Edge is designed to use this same three-market layout across every sport.</div>`:'<div class="ge-empty">No NHL games are available on the current slate.</div>';
 }catch(error){if(body)body.innerHTML=`<div class="ge-empty"><b>Game Edge is unavailable.</b><br>${esc(error?.message||error)}</div>`;}
 finally{loading=false;}
}
export function closeNhlGameEdgeV940(){if(timer){clearInterval(timer);timer=null;}panel?.remove();panel=null;window.dispatchEvent(new Event('tso:game-edge-panel'));window.DW_syncNhlSidebarState?.();}
export function openNhlGameEdgeV940(){
 ensureCss();closeNhlGameEdgeV940();
 panel=document.createElement('div');panel.id='hkGameEdgePanel';panel.className='ge-overlay';
 panel.innerHTML=`<section class="ge-shell"><header class="ge-head"><div class="ge-title"><small>The Sports Outpost · NHL 2.0</small><h2>Game Edge</h2><p>Spread. Moneyline. Total. One glance, one short reason.</p></div><div class="ge-actions"><button class="ge-btn" type="button" data-ge-refresh>Refresh</button><button class="ge-btn" type="button" data-ge-close>Close</button></div></header><div class="ge-body" data-ge-body></div></section>`;
 panel.addEventListener('click',e=>{if(e.target===panel||e.target.closest('[data-ge-close]'))closeNhlGameEdgeV940();else if(e.target.closest('[data-ge-refresh]'))render();});
 document.body.appendChild(panel);render();timer=setInterval(()=>{if(panel&&!document.hidden)render();},60000);window.dispatchEvent(new Event('tso:game-edge-panel'));window.DW_syncNhlSidebarState?.();
}
export function installNhlGameEdgeV940(){
 window.DW_openGameEdge=openNhlGameEdgeV940;window.DW_closeGameEdge=closeNhlGameEdgeV940;
 if(window.DW_nhlPendingGameEdge){window.DW_nhlPendingGameEdge=false;setTimeout(openNhlGameEdgeV940,0);}
}
