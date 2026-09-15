const num=v=>v==null||v===''?0:Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):0;
const fresh=(g,doc,now)=>{const raw=g?.lastFetchedAt??doc?.lastFetchedAt;const t=Number(raw)||Date.parse(raw||'');return Number.isFinite(t)&&now-t<=120000&&t<=now+60000;};
const liveStatus=s=>['in','live'].includes(String(s||'').toLowerCase());
const statKeys=['passYds','rushYds','recYds','receptions','carries','passTds','rushTds','recTds'];
function snapshot(row){const f=row?.flat||{};return Object.fromEntries(statKeys.map(k=>[k,num(f[k])]));}
function maxMerge(prev,next){const out={};for(const k of statKeys)out[k]=Math.max(num(prev?.[k]),num(next?.[k]));return out;}
function delta(prev,next,key){return Math.max(0,num(next?.[key])-num(prev?.[key]));}
function currentTotals(v){
 const bits=[];
 if(v.passYds)bits.push(`${v.passYds} pass yds`);
 if(v.rushYds)bits.push(`${v.rushYds} rush yds`);
 if(v.recYds)bits.push(`${v.recYds} rec yds`);
 if(v.receptions)bits.push(`${v.receptions} rec`);
 return bits.join(' · ');
}
export function nflWatchlistEventDelta(doc,state=new Map(),now=Date.now()){
 const events=[];
 for(const [gameId,g] of Object.entries(doc?.games||{})){
  if(!liveStatus(g?.status)||!fresh(g,doc,now))continue;
  const rows=Object.values(g?.playerStats?.byId||{}).filter(r=>r?.id&&r?.name);
  for(const row of rows){
   const playerId=String(row.id),key=`${gameId}|${playerId}`,next=snapshot(row),prev=state.get(key);
   if(prev){
    const d={};for(const k of statKeys)d[k]=delta(prev.values,next,k);
    const scoringRushOrRec=d.rushTds>0||d.recTds>0;
    const parts=[];
    // A rushing/receiving TD is already delivered by the league-wide TD push.
    // Suppress the simultaneous yardage watch alert to avoid a double buzz.
    if(!scoringRushOrRec){
      if(d.passYds>0)parts.push(`+${d.passYds} passing yards`);
      if(d.rushYds>0)parts.push(`+${d.rushYds} rushing yards`);
      if(d.recYds>0)parts.push(`+${d.recYds} receiving yards`);
      if(d.receptions>0&&d.recYds===0)parts.push(`+${d.receptions} reception${d.receptions===1?'':'s'}`);
    }
    // The league-wide TD alert follows the scorer. A watched quarterback still
    // deserves a passing-TD alert because the receiver is the scoring player.
    if(d.passTds>0)parts.unshift(`+${d.passTds} passing TD${d.passTds===1?'':'s'}`);
    if(parts.length){
      const totals=currentTotals(next),period=Number(g.period)||null,clock=g.clock||g.displayClock||g.statusClock||'';
      events.push({
        sport:'nfl',kind:'watchlist',key:`nfl:watch:${gameId}:${playerId}:${next.passYds}:${next.rushYds}:${next.recYds}:${next.passTds}:${next.receptions}`,
        gameId,playerId,playerName:row.name,team:row.team||'',text:parts.join(' · '),totals,
        away:g.awayAbbr||'',home:g.homeAbbr||'',awayScore:g.awayScore,homeScore:g.homeScore,
        period,clock,ts:now,
      });
    }
   }
   state.set(key,{at:now,values:maxMerge(prev?.values,next)});
  }
 }
 // Forget games/players that have disappeared for more than 4 hours.
 for(const [key,v] of state)if(now-num(v?.at)>4*60*60*1000)state.delete(key);
 return events.filter((e,i,a)=>a.findIndex(x=>x.key===e.key)===i);
}
