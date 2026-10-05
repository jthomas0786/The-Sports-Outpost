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

function propHistoryFinite(value){
  const n=Number(value);return value===null||value===undefined||value===''||!Number.isFinite(n)?null:n;
}
function propHistoryBookKey(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function propHistoryIso(value,fallback=null){
  if(Number.isFinite(Number(value))){
    const n=Number(value),ms=n>1e12?n:n>1e9?n*1000:null;
    if(ms){const d=new Date(ms);if(!Number.isNaN(d.getTime()))return d.toISOString();}
  }
  const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():fallback;
}
function propHistoryPath(sport){
  return ({nfl:'slates/nfl-odds.json',mlb:'slates/mlb-odds.json',nhl:'slates/nhl-odds.json',nba:'slates/nba-odds.json'})[sport]||null;
}
async function propHistoryCommits(path,ttl=180){
  const url='https://api.github.com/repos/jthomas0786/The-Sports-Outpost/commits?path='+encodeURIComponent(path)+'&per_page=30';
  const r=await fetch(url,{headers:{accept:'application/vnd.github+json','user-agent':'TheSportsOutpost/2.0'},cf:{cacheTtl:ttl,cacheEverything:true}});
  if(!r.ok)throw new Error('GitHub history HTTP '+r.status);
  const rows=await r.json();
  return (Array.isArray(rows)?rows:[]).map(x=>({sha:String(x?.sha||''),date:x?.commit?.committer?.date||x?.commit?.author?.date||null})).filter(x=>x.sha);
}
async function propHistorySnapshot(path,sha,ttl=300){
  const url='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/'+encodeURIComponent(sha)+'/'+path;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'TheSportsOutpost/2.0'},cf:{cacheTtl:ttl,cacheEverything:true}});
  if(!r.ok)return null;
  try{return await r.json();}catch{return null;}
}
function propHistoryPick(entries,book){
  const list=(entries||[]).filter(x=>propHistoryFinite(x?.price)!=null);
  if(!list.length)return null;
  const wanted=propHistoryBookKey(book);
  if(wanted){
    const exact=list.filter(x=>propHistoryBookKey(x?.book)===wanted);
    if(exact.length)return [...exact].sort((a,b)=>Number(b.price)-Number(a.price))[0];
  }
  return [...list].sort((a,b)=>Number(b.price)-Number(a.price))[0];
}
function propHistoryExtract(doc,{sport,eventId,player,market,line,side,book,commitDate}){
  const wantedName=deepResearchNameKey(player),wantedBook=propHistoryBookKey(book),wantedLine=propHistoryFinite(line);
  if(sport==='nfl'){
    const games=Array.isArray(doc?.games)?doc.games:[];
    let game=games.find(g=>String(g?.gameId||'')===String(eventId)||String(g?.fixtureId||'')===String(eventId));
    if(!game)game=games.find(g=>(g?.players||[]).some(p=>deepResearchNameKey(p?.name)===wantedName));
    const p=game?.players?.find(x=>deepResearchNameKey(x?.name)===wantedName);
    const m=p?.odds?.[market];if(!m)return null;
    let entries=[],effectiveLine=wantedLine;
    if(market==='atd'||market==='firstTd'){
      if(side==='under')return null;
      entries=Array.isArray(m.all)?m.all:(m.best?[m.best]:[]);
      effectiveLine=0.5;
    }else{
      if(wantedLine!=null&&Math.abs(Number(m.line)-wantedLine)>.001)return null;
      const branch=m?.[side];entries=Array.isArray(branch?.all)?branch.all:(branch?.best?[branch.best]:[]);
      effectiveLine=propHistoryFinite(m.line);
    }
    const picked=propHistoryPick(entries,book);if(!picked)return null;
    return {book:picked.book||book||null,price:propHistoryFinite(picked.price),line:effectiveLine,snapshotTime:propHistoryIso(picked.ts,commitDate),commitTime:commitDate};
  }
  if(sport==='mlb'||sport==='nba'){
    const rows=Array.isArray(doc?.rows)?doc.rows:[];
    const matches=rows.filter(r=>{
      if(eventId&&String(r?.eventId||'')!==String(eventId)&&String(r?.providerEventId||'')!==String(eventId))return false;
      if(deepResearchNameKey(r?.player)!==wantedName||String(r?.market||'')!==market)return false;
      if(wantedLine!=null&&Math.abs(Number(r?.line)-wantedLine)>.001)return false;
      if(wantedBook&&propHistoryBookKey(r?.book||r?.bookKey)!==wantedBook)return false;
      return true;
    });
    const candidates=(matches.length?matches:rows.filter(r=>deepResearchNameKey(r?.player)===wantedName&&String(r?.market||'')===market&&(wantedLine==null||Math.abs(Number(r?.line)-wantedLine)<=.001)))
      .map(r=>({book:r.book||r.bookKey||null,price:propHistoryFinite(side==='under'?r.underPrice:r.overPrice),line:propHistoryFinite(r.line),snapshotTime:propHistoryIso(r.snapshotTime,commitDate),commitTime:commitDate}))
      .filter(r=>r.price!=null);
    return propHistoryPick(candidates,book);
  }
  if(sport==='nhl'){
    const quotes=Array.isArray(doc?.quotes)?doc.quotes:[];
    const matches=quotes.filter(q=>{
      if(eventId&&String(q?.gameId||'')!==String(eventId))return false;
      if(deepResearchNameKey(q?.player)!==wantedName||String(q?.market||'')!==market)return false;
      const qLine=propHistoryFinite(q?.line);
      if(wantedLine!=null&&qLine!=null&&Math.abs(qLine-wantedLine)>.001)return false;
      if(wantedBook&&propHistoryBookKey(q?.book)!==wantedBook)return false;
      return true;
    });
    const candidates=(matches.length?matches:quotes.filter(q=>deepResearchNameKey(q?.player)===wantedName&&String(q?.market||'')===market))
      .map(q=>({book:q.book||null,price:propHistoryFinite(side==='under'?q.under:q.over),line:propHistoryFinite(q.line)??wantedLine,snapshotTime:propHistoryIso(q.ts,commitDate),commitTime:commitDate}))
      .filter(r=>r.price!=null&&(wantedLine==null||r.line==null||Math.abs(Number(r.line)-wantedLine)<=.001));
    return propHistoryPick(candidates,book);
  }
  return null;
}
async function buildPropHistory(u){
  const sport=String(u.searchParams.get('sport')||'').toLowerCase();
  const path=propHistoryPath(sport);
  if(!path)return {available:false,sport,reason:'Unsupported prop-history sport'};
  const query={
    sport,eventId:String(u.searchParams.get('eventId')||''),player:String(u.searchParams.get('player')||''),
    market:String(u.searchParams.get('market')||''),line:u.searchParams.get('line'),side:String(u.searchParams.get('side')||'over').toLowerCase(),
    book:String(u.searchParams.get('book')||'')
  };
  if(!query.player||!query.market)return {available:false,sport,reason:'Player and market are required'};
  const commits=await propHistoryCommits(path,180);
  const selected=commits.slice(0,18);
  const docs=await Promise.all(selected.map(async c=>({c,doc:await propHistorySnapshot(path,c.sha,300)})));
  const points=[];
  for(const {c,doc} of docs){
    if(!doc)continue;
    const point=propHistoryExtract(doc,{...query,commitDate:c.date});
    if(point?.price==null)continue;
    points.push({...point,sha:c.sha.slice(0,10)});
  }
  points.sort((a,b)=>(Date.parse(a.snapshotTime||a.commitTime||'')||0)-(Date.parse(b.snapshotTime||b.commitTime||'')||0));
  const dedup=[];
  for(const p of points){
    const prev=dedup[dedup.length-1];
    const same=prev&&Number(prev.price)===Number(p.price)&&String(prev.book||'')===String(p.book||'')&&Number(prev.line??0)===Number(p.line??0);
    if(same){prev.snapshotTime=p.snapshotTime||prev.snapshotTime;prev.commitTime=p.commitTime||prev.commitTime;prev.sha=p.sha;continue;}
    dedup.push(p);
  }
  const first=dedup[0]||null,current=dedup[dedup.length-1]||null;
  return {
    available:Boolean(current),sport,path,query,historyScope:'recent committed TSO snapshots',
    historyNote:'TSO OPEN is the earliest exact quote found in the recent committed snapshot window, not a claim about the sportsbook official market-open timestamp.',
    commitsChecked:selected.length,points:dedup,open:first,current
  };
}

// TSO2_DEEP_RESEARCH_RUNTIME_END
