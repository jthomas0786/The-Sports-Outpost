let preferredPromise=null;
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const playerKey=(name,team)=>`${norm(team)}:${norm(name)}`;
const matchup=g=>`${g?.away?.abbr||''} @ ${g?.home?.abbr||''}`.trim();
async function preferredMatchups(){
 if(preferredPromise)return preferredPromise;
 preferredPromise=fetch(`./slates/nhl.json?v=90.19-${Date.now()}`,{cache:'no-store'}).then(async r=>{
  if(!r.ok)return new Map();
  const doc=await r.json(),map=new Map();
  for(const g of doc?.games||[]){
   if(doc?.date&&g?.slateDate&&g.slateDate!==doc.date)continue;
   for(const p of g.players||[]){
    if(p.propsEligible===false)continue;
    const key=playerKey(p.name,p.team);if(key!==':')map.set(key,matchup(g));
   }
  }
  return map;
 }).catch(()=>new Map()).finally(()=>setTimeout(()=>{preferredPromise=null;},30000));
 return preferredPromise;
}
function cardInfo(card){
 const name=card.querySelector('.hk-prop-name b')?.textContent||'';
 const team=(card.querySelector('.hk-prop-name span')?.textContent||'').split('·')[0].trim();
 const game=(card.querySelector('.hk-prop-match')?.textContent||'').split('·')[0].trim();
 const lineup=norm(card.querySelector('.hk-prop-detail')?.textContent||'');
 return {card,key:playerKey(name,team),game,lineup};
}
function bestCard(rows,preferred){
 const exact=preferred?rows.find(r=>r.game===preferred):null;if(exact)return exact;
 return rows.find(r=>/confirmed/.test(r.lineup))||rows[0];
}
async function dedupe(host){
 const list=host?.querySelector?.('.hk-prop-list');if(!list)return;
 const cards=[...list.querySelectorAll('.hk-prop-card')];if(cards.length<2)return;
 const preferred=await preferredMatchups();if(!list.isConnected)return;
 const groups=new Map();
 for(const card of [...list.querySelectorAll('.hk-prop-card')]){const info=cardInfo(card);if(!info.key||info.key===':')continue;if(!groups.has(info.key))groups.set(info.key,[]);groups.get(info.key).push(info);}
 for(const [key,rows] of groups)if(rows.length>1){const keep=bestCard(rows,preferred.get(key));for(const row of rows)if(row!==keep)row.card.remove();}
 const kept=[...list.querySelectorAll('.hk-prop-card')];kept.forEach((card,i)=>{const rank=card.querySelector('.hk-prop-rank');if(rank)rank.textContent=String(i+1);});
 const count=host.querySelector('.hk-prop-note b');if(count)count.textContent=String(kept.length);
}
export function installNhlPropsDailyGuardV919(host=document.getElementById('nhlView')){
 if(!host||host.dataset.nhlPropsDailyGuardV919==='1')return;
 host.dataset.nhlPropsDailyGuardV919='1';
 let queued=false;const run=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;dedupe(host);});};
 new MutationObserver(run).observe(host,{childList:true,subtree:true});
 run();
}
