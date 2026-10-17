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
 return (list.excluded||[]).filter(item=>item&&item.name&&['OUT','INJURED_RESERVE','COMMISSIONER_EXEMPT','INACTIVE','PUP','SUSPENDED'].includes(item.status))
  .map(item=>({...item,team:code}));
}
export function availabilityFilteredInputs(game,research,availability){
 const exclusions=gameExclusions(game,availability);
 if(!exclusions.length)return {game,research,exclusions:[]};
 const byKey=new Set(exclusions.map(p=>p.team+'|'+normalizedName(p.name)));
 const excluded=p=>byKey.has(normalizedTeam(p?.team)+'|'+normalizedName(p?.name));
 const unavailable=p=>({...p,active:false,availability:'OUT',injury:{...(p.injury||{}),status:'OUT'},rosterStatus:'OUT'});
 const gameWithStatus={...game,players:(game.players||[]).map(p=>excluded(p)?unavailable(p):p)};
 // The auto pipeline calls this per game; do not mutate the shared weekly
 // research or erase a player from a future matchup.
 const researchWithStatus={...research,players:(research?.players||[]).map(p=>excluded(p)?unavailable(p):p)};
 return {game:gameWithStatus,research:researchWithStatus,exclusions};
}
export function excludeUnavailableResultPlayers(players=[],exclusions=[]){
 const ids=new Set(exclusions.map(p=>p.team+'|'+normalizedName(p.name)));
 return (players||[]).filter(p=>!ids.has(normalizedTeam(p.team)+'|'+normalizedName(p.name)));
}
