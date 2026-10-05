/**
 * TSO 2.0 Deep Research Worker runtime.
 *
 * This fragment powers /api/research-detail in the tso2-preview Worker.
 * It intentionally reads the existing source-backed research snapshots on
 * main and returns a compact, player-specific response instead of sending
 * multi-megabyte research files to the browser.
 *
 * Keep the marker comments intact; preview deployment tooling preserves this
 * runtime while replacing only the inlined SITE payload.
 */

// TSO2_DEEP_RESEARCH_RUNTIME_START
const DEEP_RESEARCH_BASE="https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/";
async function deepResearchFetch(path,ttl=180){
  const r=await fetch(DEEP_RESEARCH_BASE+path,{headers:{"accept":"application/json","user-agent":"Mozilla/5.0"},cf:{cacheTtl:ttl,cacheEverything:true}});
  if(!r.ok)throw new Error("Research source "+path+" HTTP "+r.status);
  return r.json();
}
function deepResearchNameKey(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function deepResearchTeam(value){return String(value||"").toUpperCase().replace(/^LA(R|C)$/,"LA$1");}
function deepResearchTrimGames(rows,count=30){return Array.isArray(rows)?rows.slice(0,count):[];}
async function buildDeepResearch(u){
  const sport=String(u.searchParams.get("sport")||"").toLowerCase();
  const playerId=String(u.searchParams.get("playerId")||"").trim();
  const name=String(u.searchParams.get("name")||"").trim();
  const team=deepResearchTeam(u.searchParams.get("team")||"");
  const opponent=deepResearchTeam(u.searchParams.get("opponent")||"");
  const wanted=deepResearchNameKey(name);

  if(sport==="nfl"){
    const doc=await deepResearchFetch("slates/nfl-research.json",180);
    const players=Array.isArray(doc?.players)?doc.players:[];
    let p=players.find(x=>playerId&&[x?.espnId,x?.gsisId,x?.pfrId].some(id=>String(id||"")===playerId));
    if(!p&&wanted)p=players.find(x=>deepResearchNameKey(x?.name)===wanted&&(!team||deepResearchTeam(x?.team)===team));
    if(!p&&wanted)p=players.find(x=>deepResearchNameKey(x?.name)===wanted);
    if(!p)return {available:false,sport,generatedAt:doc?.generatedAt||null,reason:"Player not found in current NFL research snapshot"};
    return {
      available:true,sport,generatedAt:doc?.generatedAt||null,
      sources:doc?.sources||null,sourceHealth:doc?.sourceHealth||null,
      player:{
        espnId:p.espnId||null,gsisId:p.gsisId||null,pfrId:p.pfrId||null,
        name:p.name||name,team:p.team||team,position:p.position||null,jersey:p.jersey||null,headshot:p.headshot||null,
        rosterStatus:p.rosterStatus||null,active:p.active,experience:p.experience,age:p.age,
        depth:p.depth||null,injury:p.injury||null,opponent:p.opponent||opponent||null,gameId:p.gameId||null,
        model:p.model||null,previousSeason:p.previousSeason||null,currentSeason:p.currentSeason||null,
        last5:p.last5?{...p.last5,gamesLog:deepResearchTrimGames(p.last5.gamesLog,5)}:null,
        gameLog:deepResearchTrimGames(p.gameLog,12),snapTrend:p.snapTrend||null,matchup:p.matchup||null
      }
    };
  }

  if(sport==="nhl"){
    const [doc,slate]=await Promise.all([
      deepResearchFetch("slates/nhl-research.json",120),
      deepResearchFetch("slates/nhl.json",60).catch(()=>null)
    ]);
    const p=playerId?doc?.players?.[playerId]:null;
    if(!p)return {available:false,sport,generatedAt:doc?.generatedAt||null,reason:"Player ID not found in current NHL research snapshot"};
    const eventId=String(u.searchParams.get("eventId")||"");
    const games=Array.isArray(slate?.games)?slate.games:[];
    let match=null;
    if(eventId){
      const g=games.find(x=>String(x?.id||"")===eventId);
      const pl=g?.players?.find(x=>String(x?.id||"")===playerId);
      if(g&&pl)match={g,pl};
    }
    if(!match){
      for(const g of games){
        const pl=g?.players?.find(x=>String(x?.id||"")===playerId&&x?.propsEligible!==false);
        if(pl){match={g,pl};break;}
      }
    }
    const resolvedTeam=deepResearchTeam(match?.pl?.team||team||"");
    const resolvedOpponent=match?.g
      ? deepResearchTeam(String(match.g?.away?.abbr||"").toUpperCase()===resolvedTeam?match.g?.home?.abbr:match.g?.away?.abbr)
      : opponent;
    const defense=resolvedOpponent?doc?.teamDefense?.teams?.[resolvedOpponent]||null:null;
    return {
      available:true,sport,generatedAt:doc?.generatedAt||null,slateGeneratedAt:slate?.generatedAt||null,
      season:doc?.season||null,currentSeason:doc?.currentSeason||null,
      sources:{player:"ESPN season statistics + event logs + game summaries",slate:"TSO refreshed NHL slate",defense:defense?.source||"ESPN game summaries"},
      player:{
        id:playerId,name:name||match?.pl?.name||null,team:resolvedTeam||null,opponent:resolvedOpponent||null,
        position:match?.pl?.position||null,gameId:match?.g?.id||null,
        season:p.season||null,games:p.games||0,rates:p.rates||null,shootingPct:p.shootingPct??null,savePct:p.savePct??null,
        source:p.source||null,fetchedAt:p.fetchedAt||null,recentAverages:p.recentAverages||null,
        recentGames:deepResearchTrimGames(p.recentGames,30),recentSource:p.recentSource||null,recentFetchedAt:p.recentFetchedAt||null
      },
      opponentDefense:defense
    };
  }

  if(sport==="mlb"){
    const doc=await deepResearchFetch("slate.json",180);
    let found=null;
    for(const game of doc?.games||[]){
      for(const side of ["away","home"]){
        const club=game?.[side]||{};
        const hitter=(club.lineup||[]).find(h=>(playerId&&String(h?.id||"")===playerId)||(wanted&&deepResearchNameKey(h?.name)===wanted));
        if(!hitter)continue;
        const other=side==="away"?"home":"away";
        found={game,side,other,club,hitter,opp:game?.[other]||{}};
        break;
      }
      if(found)break;
    }
    if(!found)return {available:false,sport,generatedAt:doc?.generatedAt||null,reason:"Player not found in current MLB slate research snapshot"};
    const {game,side,club,hitter,opp}=found;
    const detail=hitter.detail||null;
    return {
      available:true,sport,generatedAt:doc?.generatedAt||null,statcastEnrichedAt:doc?.statcastEnrichedAt||null,
      sources:doc?.sources||null,warnings:doc?.warnings||[],
      game:{
        gamePk:game.gamePk||null,startTimeUTC:game.startTimeUTC||null,status:game.status||null,detailedStatus:game.detailedStatus||null,
        venue:game.venue||null,weather:game.weather||null
      },
      player:{
        id:hitter.id||playerId||null,name:hitter.name||name,team:club.abbr||club.name||team||null,side,
        position:hitter.pos||null,bats:hitter.bats||null,battingOrder:hitter.battingOrder??null,
        season:hitter.season||null,last10:hitter.last10||null,gameLog:deepResearchTrimGames(hitter.gameLog,10),
        splits:hitter.splits||null,vsPitcher:hitter.vsPitcher||null,
        statcast:hitter.statcast||null,statcastL5:hitter.statcastL5||null,statcastL10:hitter.statcastL10||null,
        detail:detail?{
          windowDays:detail.windowDays||null,
          pitchTypes:detail.pitchTypes||null,
          zones:detail.zones||null,
          zoneComparison:detail.zoneComparison||null,
          battedBalls:deepResearchTrimGames(detail.battedBalls,30)
        }:null
      },
      opponent:{
        id:opp.id||null,name:opp.name||null,abbr:opp.abbr||null,
        pitcher:opp.pitcher||null,teamStats:opp.teamStats||null,
        catcher:club.oppCatcher||null
      }
    };
  }

  return {available:false,sport,reason:sport==="nba"?"NBA deep research history is not connected yet":"Unsupported research sport"};
}
// TSO2_DEEP_RESEARCH_RUNTIME_END
