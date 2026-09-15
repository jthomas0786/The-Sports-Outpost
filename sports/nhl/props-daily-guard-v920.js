const SLATE_TIME_ZONE='America/New_York';
const PAGE_SIZE=60;
let preferredPromise=null;

const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const playerKey=(name,team)=>`${norm(team)}:${norm(name)}`;
const matchup=g=>`${g?.away?.abbr||''} @ ${g?.home?.abbr||''}`.trim();
function easternDate(value){
 const ms=Date.parse(value);if(!Number.isFinite(ms))return null;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:SLATE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
 const get=type=>parts.find(p=>p.type===type)?.value;
 const y=get('year'),m=get('month'),d=get('day');return y&&m&&d?`${y}-${m}-${d}`:null;
}
function ensureStyle(){
 if(document.getElementById('nhl-props-guard-v920-style'))return;
 const style=document.createElement('style');
 style.id='nhl-props-guard-v920-style';
 style.textContent=`
 #nhlView .hk-prop-card{content-visibility:auto;contain-intrinsic-size:140px}
 #nhlView .hk-prop-more-v920{display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 0 6px;color:#8fbce7;font-size:12px}
 #nhlView .hk-prop-more-v920 button{border:1px solid #21517d;border-radius:10px;background:#071d33;color:#d9efff;padding:9px 14px;font:inherit;font-weight:800;cursor:pointer}
 #nhlView .hk-prop-more-v920 button:hover{background:#0b2a49}
 `;
 document.head.appendChild(style);
}
async function preferredMatchups(){
 if(preferredPromise)return preferredPromise;
 preferredPromise=fetch(`./slates/nhl.json?v=90.20-${Date.now()}`,{cache:'no-store'}).then(async r=>{
  if(!r.ok)return new Map();
  const doc=await r.json(),map=new Map();
  for(const g of doc?.games||[]){
   const gameDate=g?.slateDate||easternDate(g?.startTime);
   if(doc?.date&&gameDate&&gameDate!==doc.date)continue;
   for(const p of g.players||[]){
    if(p.propsEligible===false)continue;
    const key=playerKey(p.name,p.team);if(key!==':'&&!map.has(key))map.set(key,matchup(g));
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
function paginate(list,cards){
 list.parentElement?.querySelector(':scope > .hk-prop-more-v920')?.remove();
 if(cards.length<=PAGE_SIZE)return;
 const total=cards.length,stash=cards.slice(PAGE_SIZE);let visible=PAGE_SIZE;
 for(const card of stash)card.remove();
 const more=document.createElement('div');more.className='hk-prop-more-v920';
 const label=document.createElement('span'),button=document.createElement('button');button.type='button';
 const sync=()=>{
  label.textContent=`Showing ${visible} of ${total}`;
  const next=Math.min(PAGE_SIZE,total-visible);
  if(next<=0){more.remove();return;}
  button.textContent=`Show ${next} more`;
 };
 button.addEventListener('click',()=>{
  const batch=stash.splice(0,PAGE_SIZE),frag=document.createDocumentFragment();
  for(const card of batch)frag.appendChild(card);
  list.appendChild(frag);visible+=batch.length;sync();
 });
 more.append(label,button);list.after(more);sync();
}
async function processList(host,list){
 if(!list||list.dataset.nhlPropsProcessedV920==='1'||list.dataset.nhlPropsRunningV920==='1')return;
 list.dataset.nhlPropsRunningV920='1';
 const previousDisplay=list.style.display;list.style.display='none';
 try{
  const cards=[...list.querySelectorAll('.hk-prop-card')];
  if(!cards.length)return;
  const preferred=await preferredMatchups();if(!list.isConnected)return;
  const groups=new Map();
  for(const card of [...list.querySelectorAll('.hk-prop-card')]){
   const info=cardInfo(card);if(!info.key||info.key===':')continue;
   if(!groups.has(info.key))groups.set(info.key,[]);groups.get(info.key).push(info);
  }
  for(const [key,rows] of groups)if(rows.length>1){
   const keep=bestCard(rows,preferred.get(key));for(const row of rows)if(row!==keep)row.card.remove();
  }
  const kept=[...list.querySelectorAll('.hk-prop-card')];
  kept.forEach((card,i)=>{const rank=card.querySelector('.hk-prop-rank'),next=String(i+1);if(rank&&rank.textContent!==next)rank.textContent=next;});
  const count=host.querySelector('.hk-prop-note b'),totalText=String(kept.length);if(count&&count.textContent!==totalText)count.textContent=totalText;
  paginate(list,kept);
 }finally{
  if(list.isConnected){list.style.display=previousDisplay;list.dataset.nhlPropsProcessedV920='1';delete list.dataset.nhlPropsRunningV920;}
 }
}
function listsAdded(records){
 const lists=[];
 for(const record of records)for(const node of record.addedNodes||[]){
  if(node?.nodeType!==1)continue;
  if(node.matches?.('.hk-prop-list'))lists.push(node);
  else{const list=node.querySelector?.('.hk-prop-list');if(list)lists.push(list);}
 }
 return lists;
}
export function installNhlPropsDailyGuardV920(host=document.getElementById('nhlView')){
 if(!host||host.dataset.nhlPropsDailyGuardV920==='1')return;
 host.dataset.nhlPropsDailyGuardV920='1';ensureStyle();
 const run=list=>processList(host,list).catch(()=>{if(list?.isConnected)list.style.display='';});
 const current=host.querySelector('.hk-prop-list');if(current)run(current);
 new MutationObserver(records=>{for(const list of listsAdded(records))run(list);}).observe(host,{childList:true,subtree:true});
}
