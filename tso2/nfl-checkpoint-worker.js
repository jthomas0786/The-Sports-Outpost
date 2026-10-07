addEventListener('fetch',event=>event.respondWith(handle(event.request)));

const RAW='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/';
const SOURCE_TTL=20;

async function getJson(file,ttl=SOURCE_TTL){
  const r=await fetch(RAW+file,{headers:{Accept:'application/json','User-Agent':'TheSportsOutpost/2.0'},cf:{cacheTtl:ttl,cacheEverything:true}});
  if(!r.ok)throw new Error(file+' HTTP '+r.status);
  return r.json();
}
function currentWeekKey(slate){
  if(slate?.slateId)return String(slate.slateId);
  const season=slate?.season,week=slate?.week;
  const type=String(slate?.seasonType||'reg').toLowerCase();
  if(season!=null&&week!=null)return String(season)+'-'+type+'-w'+String(week).padStart(2,'0');
  return '';
}
function finite(v){const n=Number(v);return v===null||v===undefined||v===''||!Number.isFinite(n)?null:n}
function compactCandidate(c,gameId,matchup,period,kind){
  const probability=finite(c?.simProbability??c?.probability);
  if(probability==null)return null;
  return {
    id:String(c?.id||[gameId,c?.name,c?.market,c?.side,c?.line].join('|')),
    gameId:String(gameId||''),
    matchup:String(matchup||''),
    period:String(period||''),
    kind,
    playerId:String(c?.espnId||c?.playerId||''),
    name:c?.name||c?.player||'Player',
    team:c?.team||'',
    opponent:c?.opponent||'',
    position:c?.position||'',
    market:c?.market||'',
    side:String(c?.side||'over').toLowerCase(),
    line:finite(c?.line),
    projection:c?.projectedPeriod||c?.projectedQuarter||c?.projection||null,
    simProbability:probability,
    modelEdge:finite(c?.modelEdge??c?.edge),
    correlationLift:finite(c?.correlationLift),
    correlationPartner:c?.correlationPartner||null,
    grade:c?.grade||null,
    iterations:Number(c?.iterations||c?.worldMaskIterations||0)||null,
    book:kind==='halftime'?(c?.book||null):null,
    price:kind==='halftime'?finite(c?.price):null,
    link:kind==='halftime'?(c?.link||null):null,
    bookFairProbability:kind==='halftime'?finite(c?.bookFairProbability):null,
    edge:kind==='halftime'?finite(c?.edge):finite(c?.modelEdge??c?.edge)
  };
}
function compactPeriod(board,gameId,matchup,period){
  if(!board||board.ready!==true||!Array.isArray(board.candidates)||!board.candidates.length){
    return {ready:false,iterations:Number(board?.iterations||0)||null,candidates:[],rankings:{}};
  }
  const candidates=board.candidates.map(c=>compactCandidate(c,gameId,matchup,period,'quarter')).filter(Boolean);
  const ids=new Set(candidates.map(c=>c.id));
  const rankings={};
  for(const [name,list] of Object.entries(board.rankings||{})){
    rankings[name]=(Array.isArray(list)?list:[]).map(String).filter(id=>ids.has(id));
  }
  return {ready:candidates.length>0,iterations:Number(board.iterations||candidates[0]?.iterations||0)||null,candidates,rankings};
}
function compactQuarter(sim){
  const games=[];
  for(const row of sim?.games||[]){
    const gameId=String(row?.game?.gameId||row?.gameId||'');
    if(!gameId)continue;
    const away=row?.game?.away?.abbr||row?.game?.away||'AWY';
    const home=row?.game?.home?.abbr||row?.game?.home||'HME';
    const matchup=String(away)+' @ '+String(home);
    const periods={};
    for(const key of ['q1','q2','q3','q4','1h','2h']){
      periods[key]=compactPeriod(row?.propPeriods?.[key]||row?.quarters?.periods?.[key],gameId,matchup,key);
    }
    if(Object.values(periods).some(p=>p.ready))games.push({gameId,matchup,startTime:row?.game?.startTimeUTC||null,periods});
  }
  return games;
}
function isHalftimeState(g){
  const detail=String(g?.state?.statusDetail||'').toLowerCase();
  const period=Number(g?.state?.period),clock=Number(g?.state?.clockMin);
  return /half\s*time|halftime|end of (?:the )?2nd|end of second/.test(detail)||(period===2&&Number.isFinite(clock)&&clock<=.05);
}
function compactHalftime(doc){
  const games=[];
  for(const b of doc?.games||[]){
    if(!isHalftimeState(b)||b?.ready!==true||!Array.isArray(b?.candidates)||b.candidates.length<2)continue;
    const candidates=b.candidates.map(c=>compactCandidate(c,b.gameId,b.matchup,'halftime','halftime')).filter(Boolean);
    const ids=new Set(candidates.map(c=>c.id));
    const rankings={};
    for(const [name,list] of Object.entries(b.rankings||{})){
      rankings[name]=(Array.isArray(list)?list:[]).map(String).filter(id=>ids.has(id));
    }
    games.push({
      gameId:String(b.gameId||''),matchup:b.matchup||'',generatedAt:b.generatedAt||null,
      state:b.state||null,iterations:Number(b.iterations||0)||null,
      candidates,rankings,
      correlations:{
        positive:Array.isArray(b?.correlations?.positive)?b.correlations.positive.slice(0,40):[],
        conflicts:Array.isArray(b?.correlations?.conflicts)?b.correlations.conflicts.slice(0,40):[]
      }
    });
  }
  return games;
}
async function handle(req){
  if(req.method==='OPTIONS')return new Response('',{headers:cors()});
  if(req.method!=='GET')return json({error:'method not allowed'},405);
  try{
    const [slateR,simR,halfR]=await Promise.allSettled([
      getJson('nfl.json',20),getJson('nfl-sim.json',20),getJson('nfl-halftime.json',10)
    ]);
    if(slateR.status!=='fulfilled')throw slateR.reason;
    const slate=slateR.value;
    const weekKey=currentWeekKey(slate);
    const sim=simR.status==='fulfilled'?simR.value:null;
    const halftime=halfR.status==='fulfilled'?halfR.value:null;
    const simWeek=String(sim?.meta?.weekKey||sim?.weekKey||'');
    const halfWeek=String(halftime?.weekKey||'');
    const simCurrent=Boolean(weekKey&&simWeek&&weekKey===simWeek);
    const halfCurrent=Boolean(weekKey&&halfWeek&&weekKey===halfWeek);
    const quarterGames=simCurrent?compactQuarter(sim):[];
    const halftimeGames=halfCurrent?compactHalftime(halftime):[];
    const quarterReady=quarterGames.some(g=>Object.values(g.periods||{}).some(p=>p.ready));
    const halftimeReady=halftimeGames.length>0;
    return json({
      source:'tso-nfl-checkpoints',
      generatedAt:new Date().toISOString(),
      weekKey,
      slate:{season:slate?.season??null,seasonType:slate?.seasonType??null,week:slate?.week??null,generatedAt:slate?.generatedAt||null},
      quarter:{
        available:simCurrent,
        ready:quarterReady,
        sourceWeekKey:simWeek||null,
        reason:!simCurrent?'Current-week NFL simulation board has not published yet':quarterReady?null:'Current-week simulation has no ready period boards yet',
        generatedAt:sim?.generatedAt||null,
        games:quarterGames
      },
      halftime:{
        available:halfCurrent,
        ready:halftimeReady,
        sourceWeekKey:halfWeek||null,
        reason:!halfCurrent?'Waiting for a current-week halftime checkpoint':halftimeReady?null:'No NFL game is currently at a ready halftime checkpoint',
        generatedAt:halftime?.generatedAt||null,
        games:halftimeGames
      }
    });
  }catch(e){return json({error:String(e?.message||e)},502)}
}
function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function json(v,status=200){return new Response(JSON.stringify(v),{status,headers:{...cors(),'content-type':'application/json; charset=UTF-8'}})}
