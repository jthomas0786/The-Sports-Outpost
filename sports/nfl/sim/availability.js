// Confirmed game-specific NFL availability exclusions. Never apply a Week 6
// exclusion blindly to Week 7; an eligible return is not a confirmed active.
export const normalizedName=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export const normalizedTeam=v=>String(v||'').toUpperCase().replace(/^GNB$/,'GB').replace(/^JAC$/,'JAX').replace(/^LAR$/,'LA');
export function gameExclusions(game,availability){
 const id=String(game?.gameId||game?.id||'');
 if(availability?.season!==2026||!id)return [];
 const list=availability?.games?.[id];
 if(!list||list.season!==2026)return [];
 const code=normalizedTeam(list.team);
 if(code!==normalizedTeam(game?.home?.abbr)&&code!==normalizedTeam(game?.away?.abbr))return [];
 return (list.excluded||[]).filter(item=>item&&item.name&&['OUT','INJURED_RESERVE','COMMISSIONER_EXEMPT','INACTIVE','PUP','SUSPENDED','WAIVED','FREE_AGENT','PRACTICE_SQUAD'].includes(item.status))
  .map(item=>({...item,team:normalizedTeam(item.team||code)}))
  .filter(item=>[game?.home?.abbr,game?.away?.abbr].some(t=>normalizedTeam(t)===item.team));
}
export function availabilityFilteredInputs(game,research,availability){
 const exclusions=gameExclusions(game,availability);
 if(!exclusions.length)return {game,research,exclusions:[]};
 const byKey=new Set(exclusions.map(p=>p.team+'|'+normalizedName(p.name)));
 const excluded=p=>byKey.has(normalizedTeam(p?.team)+'|'+normalizedName(p?.name));
 const unavailable=p=>({...p,active:false,availability:'OUT',injury:{...(p.injury||{}),status:'OUT'},rosterStatus:'OUT'});
 const gameWithStatus={...game,players:(game.players||[]).filter(p=>!excluded(p))};
 // The auto pipeline calls this per game; do not mutate the shared weekly
 // research or erase a player from a future matchup.
 const researchWithStatus={...research,players:(research?.players||[]).filter(p=>!excluded(p))};
 return {game:gameWithStatus,research:researchWithStatus,exclusions};
}
export function excludeUnavailableResultPlayers(players=[],exclusions=[]){
 const ids=new Set(exclusions.map(p=>p.team+'|'+normalizedName(p.name)));
 return (players||[]).filter(p=>!ids.has(normalizedTeam(p.team)+'|'+normalizedName(p.name)));
}

/* Active NFL rosters verified before Monte Carlo input construction.
 * This is a current roster check, not a historical eligibility snapshot.
 * Practice squad, injured reserve, and waived players are not accepted
 * unless reactivated in the current active-roster source.
 */
const currentRosters=new Map();
const rosterAbbr=team=>({LA:'lar',JAX:'jax',WSH:'wsh',GB:'gb'}[normalizedTeam(team)]||normalizedTeam(team).toLowerCase());
export async function verifiedTeamActiveRoster(team,{fetchImpl=fetch,cache=true}={}){
 const canonical=normalizedTeam(team),abbr=rosterAbbr(canonical);
 if(cache&&currentRosters.has(canonical))return currentRosters.get(canonical);
 const action=(async()=>{
  if(!/^[a-z]{2,3}$/.test(abbr))throw Error('Invalid NFL team code: '+team);
  const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+abbr+'/roster';
  let response=null;
  for(let attempt=0;attempt<4;attempt++){
   try{
    response=await fetchImpl(url,{headers:{accept:'application/json'},
     signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(12000):undefined});
    if(response.ok)break;
    if(![429,500,502,503,504].includes(response.status))break;
   }catch(error){if(attempt===3)throw error}
   await new Promise(resolve=>setTimeout(resolve,1200*(attempt+1)));
  }
  if(!response?.ok)throw Error('Active NFL roster source '+canonical+' HTTP '+(response?.status||'unavailable'));
  const doc=await response.json(),offense=doc.athletes?.find(group=>group.position==='offense');
  if(doc.season?.year!==2026||!Array.isArray(offense?.items)||offense.items.length<9)
   throw Error('Verified 2026 active offensive roster unavailable for '+canonical);
  const active=new Set(offense.items.filter(a=>a.status?.type==='active').map(a=>normalizedName(a.displayName||a.fullName)));
  if(active.size<9)throw Error('Incomplete 2026 active roster for '+canonical);
  return {team:canonical,active,checkedAt:new Date().toISOString(),
   source:'ESPN team roster; final 90-minute game-day inactive report not yet checked'};
 })();
 if(cache)currentRosters.set(canonical,action);
 try{return await action}catch(e){if(cache)currentRosters.delete(canonical);throw e}
}
export async function verifiedRosterFilteredInputs(game,research,{fetchImpl=fetch,cache=true}={}){
 const teams=[normalizedTeam(game?.away?.abbr),normalizedTeam(game?.home?.abbr)];
 if(teams.some(x=>!x))throw Error('Missing matchup teams; cannot verify NFL player eligibility');
 const [away,home]=await Promise.all(teams.map(team=>verifiedTeamActiveRoster(team,{fetchImpl,cache})));
 const allowed=new Map([[away.team,away.active],[home.team,home.active]]);
 const isApplicable=p=>allowed.has(normalizedTeam(p?.team));
 const notActive=p=>isApplicable(p)&&!allowed.get(normalizedTeam(p.team)).has(normalizedName(p.name));
 const removed=new Map();
 for(const p of [...(game?.players||[]),...(research?.players||[])].filter(notActive)){
  removed.set(normalizedTeam(p.team)+'|'+normalizedName(p.name),{team:normalizedTeam(p.team),name:p.name,status:'NOT_ACTIVE_2026_ROSTER'});
 }
 const safeGame={...game,players:(game?.players||[]).filter(p=>!notActive(p))};
 const safeResearch={...research,players:(research?.players||[]).filter(p=>!notActive(p))};
 return {game:safeGame,research:safeResearch,exclusions:[...removed.values()],
  rosterAudit:{season:2026,checkedAt:new Date().toISOString(),source:'2026 ESPN active offense roster',
   teams:teams.slice(),counts:[away.active.size,home.active.size],
   finalInactivesVerified:false}};
}
