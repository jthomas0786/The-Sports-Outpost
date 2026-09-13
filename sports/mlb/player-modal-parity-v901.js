const STYLE_ID='tso-mlb-player-modal-parity-v901';
const CARD_CLASS='tso-mlb-nfl-player-parity';
const PROP_LABELS=new Set(['HR','HITS','TB','H+R+RBI','RBI','SB']);
let installed=false,observer=null,queued=false;

const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toUpperCase();

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`
 html[data-sport="mlb"] #modalBody .${CARD_CLASS}{--tso-parity-gap:6px}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr{display:grid!important;grid-template-columns:auto minmax(0,1fr) 232px!important;align-items:start!important;column-gap:14px!important;row-gap:8px!important;padding-right:58px!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr>.ava-reticle{grid-column:1;grid-row:1}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr>.who{grid-column:2;grid-row:1;min-width:0;padding-right:6px}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} [data-tso-mlb-native-props="1"],html[data-sport="mlb"] #modalBody .${CARD_CLASS} [data-tso-mlb-native-prop="1"]{display:none!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-control{grid-column:3;grid-row:1;width:232px;min-width:0;margin:0;align-self:start}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-label{display:block;margin:0 0 5px;color:#6f8daf;font:900 7px 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-wrap{position:relative;width:100%}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-select{appearance:none;width:100%;height:40px;padding:0 34px 0 12px;border:1px solid rgba(45,127,255,.58);border-radius:10px;background:#09264b;color:#fff;font:800 10px 'JetBrains Mono',monospace;outline:none;cursor:pointer}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-chevron{pointer-events:none;position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#5fc9ff;font-size:10px}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr-stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;width:100%!important;max-width:440px!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .verdict{box-sizing:border-box!important;width:100%!important;min-height:137px!important;display:grid!important;grid-template-columns:122px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;padding:16px 20px!important;border:1px solid rgba(120,176,239,.19)!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(17,49,91,.98),rgba(13,39,75,.98))!important;overflow:hidden!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .verdict .ring{width:98px!important;height:98px!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .bars-toolbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;margin:0 0 8px!important;width:100%!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .filters,html[data-sport="mlb"] #modalBody .${CARD_CLASS} .venue-filters{display:flex!important;align-items:center!important;gap:6px!important;min-width:0!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .bars-toolbar .chip{height:27px!important;min-width:34px!important;padding:0 10px!important;border-radius:7px!important;font:900 7px/1 'JetBrains Mono',monospace!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .venue-filters .chip{min-width:58px!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars{box-sizing:border-box!important;display:grid!important;grid-template-columns:repeat(var(--tso-parity-count,5),minmax(0,1fr))!important;gap:var(--tso-parity-gap,6px)!important;width:100%!important;height:112px!important;min-width:0!important;margin:0!important;padding:0!important;overflow:visible!important;align-items:stretch!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars>.b{box-sizing:border-box!important;display:grid!important;grid-template-rows:minmax(0,1fr) 34px!important;min-width:0!important;width:100%!important;max-width:none!important;height:100%!important;margin:0!important;padding:0!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars>.b>.plot{box-sizing:border-box!important;position:relative!important;display:flex!important;align-items:flex-end!important;justify-content:stretch!important;width:100%!important;max-width:none!important;min-width:0!important;height:100%!important;min-height:0!important;margin:0!important;padding:18px 0 0!important;border-bottom:1px solid rgba(120,176,239,.14)!important;overflow:visible!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars>.b>.plot>.bar{box-sizing:border-box!important;position:relative!important;display:block!important;flex:1 1 auto!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;border-radius:5px 5px 0 0!important;transform:none!important;background:linear-gradient(180deg,rgba(45,127,255,.55),rgba(45,127,255,.20))!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars>.b.on>.plot>.bar{background:linear-gradient(180deg,var(--green-bright,#3ee37a),var(--green,#1aa957))!important;box-shadow:0 0 12px rgba(62,227,122,.28)!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars>.b.td2>.plot>.bar{background:linear-gradient(180deg,#f5c842,#c99411)!important;box-shadow:0 0 12px rgba(245,200,66,.24)!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars .bar>.v{position:absolute!important;left:50%!important;top:4px!important;transform:translateX(-50%)!important;width:max-content!important;color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.55)!important;font:800 8px/1 'JetBrains Mono',monospace!important;z-index:2!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars .xbottom{padding-top:6px!important;text-align:center!important;min-width:0!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars .xd{color:#9aaec7!important;font:800 7.5px/1.15 'JetBrains Mono',monospace!important;white-space:nowrap!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars .xo{margin-top:3px!important;color:#788da9!important;font:800 7px/1.15 'JetBrains Mono',monospace!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 html[data-sport="mlb"] #modalBody .${CARD_CLASS} .cta{box-sizing:border-box!important;width:100%!important;min-height:48px!important;border-radius:10px!important;font:900 13px/1 'JetBrains Mono',monospace!important;letter-spacing:.025em!important;text-transform:uppercase!important}
 @media(max-width:680px){
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr{grid-template-columns:auto minmax(0,1fr)!important;padding-right:48px!important;row-gap:12px!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr>.ava-reticle{grid-column:1;grid-row:1}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .hdr>.who{grid-column:2;grid-row:1}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-control{grid-column:1/-1;grid-row:2;width:100%;max-width:none}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-mlb-parity-prop-select{font-size:16px}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .verdict{min-height:122px!important;grid-template-columns:96px minmax(0,1fr)!important;padding:13px 14px!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .verdict .ring{width:84px!important;height:84px!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .bars-toolbar{align-items:flex-start!important;flex-direction:column!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .filters,html[data-sport="mlb"] #modalBody .${CARD_CLASS} .venue-filters{width:100%!important;overflow-x:auto!important;scrollbar-width:none!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .tso-nfl-parity-bars{height:112px!important}
  html[data-sport="mlb"] #modalBody .${CARD_CLASS} .cta{min-height:46px!important;font-size:11px!important}
 }
 `;
 document.head.appendChild(style);
}

function commonParent(nodes,limit){
 if(!nodes.length)return null;
 let p=nodes[0].parentElement;
 while(p&&p!==limit){if(nodes.every(n=>p.contains(n)))return p;p=p.parentElement;}
 return null;
}
function propCandidates(card){
 return [...card.querySelectorAll('button,[role="tab"],[data-prop],[data-player-prop],[data-tab]')].filter(el=>PROP_LABELS.has(norm(el.textContent)));
}
function activeProp(el){return el.classList.contains('active')||el.classList.contains('on')||el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-pressed')==='true';}
function hideNativeProps(candidates,hdr,card){
 const insideHdr=candidates.every(el=>hdr.contains(el));
 const group=insideHdr?commonParent(candidates,hdr):commonParent(candidates,card);
 if(group&&group!==hdr&&group!==card){group.dataset.tsoMlbNativeProps='1';return 'group';}
 for(const el of candidates)el.dataset.tsoMlbNativeProp='1';
 return 'individual';
}
function enhancePropControl(card){
 const hdr=card.querySelector('.hdr');if(!hdr)return;
 const candidates=propCandidates(card);if(candidates.length<2)return;
 hideNativeProps(candidates,hdr,card);
 let host=hdr.querySelector('.tso-mlb-parity-prop-control');
 if(!host){host=document.createElement('div');host.className='tso-mlb-parity-prop-control';hdr.appendChild(host);}
 const selected=candidates.find(activeProp)||candidates[0];
 const sig=candidates.map(x=>`${norm(x.textContent)}:${activeProp(x)?1:0}`).join('|');
 if(host.dataset.sig===sig)return;host.dataset.sig=sig;
 host.innerHTML=`<label class="tso-mlb-parity-prop-label">Player Prop</label><div class="tso-mlb-parity-prop-wrap"><select class="tso-mlb-parity-prop-select" aria-label="Select player prop">${candidates.map((el,i)=>`<option value="${i}" ${el===selected?'selected':''}>${String(el.textContent||'').trim()}</option>`).join('')}</select><span class="tso-mlb-parity-prop-chevron" aria-hidden="true">▼</span></div>`;
 host.querySelector('select')?.addEventListener('change',e=>{const target=candidates[Number(e.currentTarget.value)];target?.click();setTimeout(queue,0);});
}
function enhanceRecentBars(card){
 const charts=[...card.querySelectorAll('.bars')].filter(b=>[...b.children].some(c=>c.classList?.contains('b')&&c.querySelector('.plot>.bar')));
 const chart=charts.find(b=>b.querySelector('.xbottom,.xd,.xo'))||charts[0];if(!chart)return;
 chart.classList.add('tso-nfl-parity-bars');
 const cols=[...chart.children].filter(c=>c.classList?.contains('b'));
 chart.style.setProperty('--tso-parity-count',String(Math.max(1,cols.length)));
 chart.style.setProperty('--tso-parity-gap',cols.length>20?'2px':cols.length>10?'4px':'6px');
}
function enhanceCard(card){
 if(!card)return;
 card.classList.add(CARD_CLASS,'tso-nfl-player-card-v70','tso-nfl-player-card-v72');
 enhancePropControl(card);
 enhanceRecentBars(card);
}
function scan(){queued=false;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll('#modalBody .player-card-v2').forEach(enhanceCard);}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}

export function installMlbPlayerModalParityV901(){
 ensureStyle();
 if(installed){queue();return;}
 installed=true;
 observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed']});
 document.addEventListener('click',e=>{if(e.target?.closest?.('#modalBody'))setTimeout(queue,0);},true);
 window.addEventListener('hashchange',queue);queue();
}
export const __MLB_PLAYER_MODAL_PARITY_V901_TEST__={norm,propCandidates,hideNativeProps,enhanceRecentBars};
