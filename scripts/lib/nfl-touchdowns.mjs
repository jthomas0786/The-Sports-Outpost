import { touchdownScorer } from '../../sports/nfl/td-scorer.js';
// Keep a baseline per game. A first observation or a gap is never a new score.
export function touchdownDelta(doc, state=new Map(), now=Date.now()) {
 const events=[];
 for(const [id,g] of Object.entries(doc?.games||{})){
  const at=Number(g.lastFetchedAt??doc.lastFetchedAt)||Date.parse(g.lastFetchedAt??doc.lastFetchedAt);
  if(!Number.isFinite(at)||now-at>120000||at>now+60000||!Array.isArray(g.scoringPlays))continue;
  const plays=g.scoringPlays.filter(p=>/\btouchdown\b/i.test(p.type||'')&&p.id);
  const previous=state.get(id),keys=new Set(plays.map(p=>String(p.id)));
  if(previous&&now-previous.at<=120000&&['in','live','post','final'].includes(g.status)){
   for(const p of plays){
    if(previous.keys.has(String(p.id)))continue;
    const scorer=touchdownScorer({gameId:id,liveScore:g},p);
    events.push({sport:'nfl',key:`nfl:td:${id}:${p.id}`,scorer:scorer?.name||p.team||'Touchdown',gameId:id,
     text:String(p.text||'Touchdown').slice(0,220),period:p.period,clock:p.clock,team:p.team,
     away:g.awayAbbr,home:g.homeAbbr,awayScore:p.awayScore,homeScore:p.homeScore,ts:now});
   }
  }
  // Keep corrected/deleted play IDs seen so a feed correction cannot re-alert.
  state.set(id,{at:now,keys:new Set([...(previous?.keys||[]),...keys])});
 }
 return events.filter((e,i,a)=>a.findIndex(x=>x.key===e.key)===i);
}
