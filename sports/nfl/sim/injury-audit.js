/* Current-season NFL injury-report gate for TSO simulations.
 * ESPN roster "active" alone is insufficient: a separately reported IR/OUT
 * designation must win. Treat absent/malformed injury feeds as UNKNOWN.
 */
const canon=v=>String(v||'').toUpperCase().replace(/^GNB$/,'GB').replace(/^JAC$/,'JAX').replace(/^LAR$/,'LA').replace(/^WSH$/,'WAS');
const clean=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const idToTeam={'1':'ATL','2':'BUF','3':'CHI','4':'CIN','5':'CLE','6':'DAL','7':'DEN','8':'DET','9':'GB','10':'TEN','11':'IND','12':'KC','13':'LV','14':'LA','15':'MIA','16':'MIN','17':'NE','18':'NO','19':'NYG','20':'NYJ','21':'PHI','22':'ARI','23':'PIT','24':'LAC','25':'SF','26':'SEA','27':'TB','28':'WAS','29':'CAR','30':'JAX','33':'BAL','34':'HOU'};
const SOURCE='https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';
const outStatus=/^(?:out|o|inactive|injured[ -]?reserve|ir|reserve[ /-]?injured|pup|physically unable to perform|nfi|non[ -]?football injury|suspended?|suspension|commissioner(?:s|\\'s)? exempt|exempt|waived|released|free agent|practice squad|did not travel|doubtful)$/i;
const uncertainStatus=/^(?:questionable|probable|day[ -]?to[ -]?day|limited|game[ -]?time decision)$/i;
const text=v=>typeof v==='string'?v:typeof v==='object'&&v?String(v.description||v.displayName||v.name||v.abbreviation||v.type||''):'';
const normStatus=v=>text(v).trim().replace(/_/g,' ').replace(/\s+/g,' ');
const statusKind=s=>outStatus.test(s)?'OUT':uncertainStatus.test(s)?'UNCERTAIN':'UNKNOWN';
const normTeam=x=>canon(x?.team?.abbreviation||x?.team?.abbr||x?.teamAbbreviation||x?.team?.team?.abbreviation||idToTeam[String(x?.team?.id||x?.teamId||x?.id||'')]||'');
const reportTimestamp=x=>x?.reportedAt||x?.reportDate||x?.updatedAt||x?.date||x?.lastUpdated||null;
const currentForGame=(r,gameDate)=>{
 // A player's IR/PUP/suspension can predate the current week's practice report.
 // Use the CURRENT-SEASON league status even when the original placement date is older.
 if(/injured[ -]?reserve|^ir$|reserve[ /-]?injured|pup|physically unable|non[ -]?football|^nfi$|suspension|suspended|exempt/i.test(r.status))return true;
 if(!r.timestamp)return true; // roster audits and the season gate still apply
 const when=Date.parse(r.timestamp),match=Date.parse(gameDate||'');
 if(!Number.isFinite(when))return false;
 if(!Number.isFinite(match))return Math.abs(Date.now()-when)<10*86400000;
 return Math.abs(match-when)<11*86400000;
};
function rowStatus(row){
 const statusCandidates=[row.designation,row.gameStatus,row.injuryStatus,row.status,row.details?.status,row.details?.type,row.injury?.status,row.type];
 for(const val of statusCandidates){const status=normStatus(val);if(statusKind(status)!=='UNKNOWN')return status}
 return normStatus(statusCandidates.find(x=>text(x))||'Unknown');
}
export function parseLeagueInjuryReport(doc){
 if(Number(doc?.season?.year??doc?.season)!==2026)throw Error('ESPN injury report not verified for NFL 2026');
 const groups=Array.isArray(doc.injuries)?doc.injuries:null;
 if(!groups||!groups.length)throw Error('NFL injury-report feed missing or empty; cannot clear players as healthy');
 const rows=[],covered=new Set();
 for(const group of groups){
  const team=normTeam(group);
  if(!team)continue;
  covered.add(team);
  for(const entry of Array.isArray(group.injuries)?group.injuries:[]){
   const athlete=entry.athlete||entry.player||{};
   const name=athlete.displayName||athlete.fullName||athlete.name||entry.name||entry.playerName||'';
   if(!name)continue;
   const status=rowStatus(entry);
   rows.push({team,name,playerId:String(athlete.id||entry.playerId||''),position:athlete.position?.abbreviation||'',
    status,kind:statusKind(status),timestamp:reportTimestamp(entry)||reportTimestamp(group)||null,
    source:SOURCE});
  }
 }
 if(!covered.size)throw Error('NFL injury feed supplied no recognizable team reports');
 return {season:2026,source:SOURCE,coveredTeams:[...covered],rows};
}
let cached=null,cachedAt=0;
export async function verifiedLeagueInjuryReport({fetchImpl=fetch,cache=true}={}){
 if(cache&&cached&&Date.now()-cachedAt<15*60000)return cached;
 const request=(async()=>{
  let response=null;
  for(let retry=0;retry<3;retry++){
   try{
    response=await fetchImpl(SOURCE,{headers:{accept:'application/json'},
     signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(12000):undefined});
    if(response.ok)break;
    if(![429,500,502,503,504].includes(response.status))break;
   }catch(err){if(retry===2)throw err}
   await new Promise(resolve=>setTimeout(resolve,600*(retry+1)));
  }
  if(!response?.ok)throw Error('NFL injury-report source HTTP '+(response?.status??'unavailable'));
  const report=parseLeagueInjuryReport(await response.json());
  return {...report,checkedAt:new Date().toISOString()};
 })();
 if(cache){cached=request;cachedAt=Date.now()}
 try{return await request}catch(e){if(cache){cached=null;cachedAt=0}throw e}
}
export function injuryStatusForTeam(report,team,{gameDate}={}){
 const code=canon(team),rows=(report?.rows||[]).filter(row=>canon(row.team)===code&&currentForGame(row,gameDate));
 const excluded=rows.filter(r=>r.kind==='OUT');
 const uncertain=rows.filter(r=>r.kind==='UNCERTAIN');
 return {team:code,source:report?.source||SOURCE,checkedAt:report?.checkedAt,
  feedContainsTeam:(report?.coveredTeams||[]).some(x=>canon(x)===code),
  entries:rows.length,excluded,uncertain};
}
export function assertInjuryClear(players,teamStatuses,context='model'){
 const out=new Set(teamStatuses.flatMap(t=>t.excluded.map(p=>canon(t.team)+'|'+clean(p.name))));
 const invalid=(players||[]).filter(p=>out.has(canon(p.team)+'|'+clean(p.name)));
 if(invalid.length)throw Error(context+' includes ruled-out / IR players: '+invalid.slice(0,8).map(p=>p.team+' '+p.name).join(', '));
 return true;
}
