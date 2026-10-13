// TSO 2.0 verified HR inbox. No credentials supplied by browser except a
// signed-in Supabase JWT. The service role never leaves this Edge Function.
// Uses only MLB StatsAPI authoritative play-by-play; skips uncertainty.
const URL_BASE=Deno.env.get('SUPABASE_URL')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ALLOWED=new Set(['https://thesportsoutpost.com','https://www.thesportsoutpost.com',
  'https://staging.thesportsoutpost.com','https://release.thesportsoutpost.com']);
const origins=req=>{
  const origin=req.headers.get('origin')||'';
  return {'access-control-allow-origin':ALLOWED.has(origin)?origin:'https://thesportsoutpost.com',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
    'access-control-allow-methods':'POST,OPTIONS','vary':'Origin'};
};
const response=(req,status,data)=>new Response(JSON.stringify(data),{
  status,headers:{...origins(req),'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const normalize=name=>String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]/g,'');
const isoDay=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
const fetchJson=async (url,headers={})=>{
  const r=await fetch(url,{headers,signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw new Error('Official data request HTTP '+r.status);
  return r.json();
};
async function db(path,method='GET',data=undefined,prefer=''){
  const res=await fetch(URL_BASE+'/rest/v1/'+path,{
    method,headers:{apikey:SERVICE,authorization:'Bearer '+SERVICE,
      'content-type':'application/json',...(prefer?{Prefer:prefer}:{})},
    body:data===undefined?undefined:JSON.stringify(data),
    signal:AbortSignal.timeout(8500)
  });
  if(!res.ok)throw new Error('Account inbox operation HTTP '+res.status);
  if(res.status===204)return null;
  return res.text().then(t=>t?JSON.parse(t):null);
}
function matchingHomeRun(feed,game,pick){
  const status=String(feed?.gameData?.status?.abstractGameState||'');
  if(!['Live','Final'].includes(status))return null;
  const localSide=game.teams.home.team.id===game.teamId?'home':
    game.teams.away.team.id===game.teamId?'away':null;
  if(!localSide)return null;
  const batters=new Set(feed?.liveData?.boxscore?.teams?.[localSide]?.batters||[]);
  if(!batters.size)return null; // Missing official team attribution: abstain.
  const target=normalize(pick.player);
  const savedAt=Date.parse(pick.created_at||'');
  if(!target||!Number.isFinite(savedAt))return null;
  const events=feed?.liveData?.plays?.allPlays||[];
  for(const play of events){
    if(String(play?.result?.eventType||'')!=='home_run')continue;
    const id=Number(play?.matchup?.batter?.id);
    if(!Number.isSafeInteger(id)||!batters.has(id))continue;
    const officialName=String(feed.gameData?.players?.['ID'+id]?.fullName||play.matchup?.batter?.fullName||'');
    if(normalize(officialName)!==target)continue;
    const when=Date.parse(play?.about?.endTime||'');
    // Must prove the saved selection predates this actual HR; no retroactive alerts.
    if(!Number.isFinite(when)||when<=savedAt)continue;
    const atBat=Number(play.about?.atBatIndex??play.atBatIndex);
    if(!Number.isSafeInteger(atBat)||atBat<0)continue;
    return {gameId:String(game.gamePk),atBat,occurredAt:new Date(when).toISOString(),
      officialName};
  }
  return null;
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:origins(req)});
  if(req.method!=='POST')return response(req,405,{error:'POST required'});
  if(!URL_BASE||!ANON||!SERVICE)return response(req,503,{error:'Verifier server configuration unavailable'});
  const token=(req.headers.get('authorization')||'').match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return response(req,401,{error:'Sign in required'});
  try{
    // Get identity from Supabase Auth, not from an untrusted request body.
    const who=await fetch(URL_BASE+'/auth/v1/user',{
      headers:{apikey:ANON,authorization:'Bearer '+token},signal:AbortSignal.timeout(8500)
    });
    if(!who.ok)return response(req,401,{error:'Session verification failed'});
    const user=await who.json();
    const owner=String(user?.id||'');
    if(!/^[a-f0-9-]{36}$/i.test(owner))return response(req,401,{error:'Invalid account'});
    const path='tso2_saved_selections?select=id,user_id,sport,market,selection,player,team,slate_date,date_source,created_at'
      +'&user_id=eq.'+encodeURIComponent(owner)
      +'&sport=eq.mlb&market=eq.hr&selection=eq.yes'
      +'&order=created_at.desc&limit=30';
    const picks=await db(path);
    const active=(Array.isArray(picks)?picks:[]).filter(p=>{
      if(!p.team||!isoDay(p.slate_date))return false;
      const days=(Date.now()-Date.parse(p.slate_date+'T12:00:00Z'))/86400000;
      return Number.isFinite(days)&&days>=-1.2&&days<=4.5;
    });
    if(!active.length)return response(req,200,{checked:0,alerted:0,pending:0,sport:'mlb',
      reason:'No eligible saved MLB home-run picks with team and event date'});
    // Team ID and abbreviation are sourced from the official MLB teams endpoint.
    const catalog=await fetchJson('https://statsapi.mlb.com/api/v1/teams?sportId=1');
    const teamMap=new Map((catalog?.teams||[]).filter(t=>t.abbreviation)
      .map(t=>[String(t.abbreviation).toUpperCase(),Number(t.id)]));
    const dated=[...new Set(active.map(p=>p.slate_date))].slice(0,4);
    const schedules=new Map();
    for(const date of dated){
      const schedule=await fetchJson('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date='+date);
      schedules.set(date,(schedule.dates||[]).flatMap(d=>d.games||[]));
    }
    const feedCache=new Map();
    let checked=0,alerted=0,pending=0;
    for(const pick of active){
      const teamId=teamMap.get(String(pick.team||'').toUpperCase());
      if(!Number.isInteger(teamId)){pending++;continue;}
      const fixtures=(schedules.get(pick.slate_date)||[])
        .filter(g=>Number(g.teams?.home?.team?.id)===teamId||
                   Number(g.teams?.away?.team?.id)===teamId);
      if(fixtures.length!==1){pending++;continue;} // Don't guess doubleheaders.
      const game={...fixtures[0],teamId};
      if(!['Live','Final'].includes(String(game.status?.abstractGameState||''))){pending++;continue;}
      const id=String(game.gamePk);
      if(!feedCache.has(id))feedCache.set(id,
        await fetchJson('https://statsapi.mlb.com/api/v1.1/game/'+encodeURIComponent(id)+'/feed/live'));
      const event=matchingHomeRun(feedCache.get(id),game,pick);
      checked++;
      if(!event)continue;
      const item={user_id:owner,saved_selection_id:pick.id,sport:'mlb',market:'hr',
        player:pick.player,selection:'yes',game_id:event.gameId,
        // At most one saved-pick alert per game. The first eligible HR wins.
        evidence_key:'mlb:'+event.gameId+':hr',
        event_at:event.occurredAt,
        source_url:'https://statsapi.mlb.com/api/v1.1/game/'+event.gameId+'/feed/live',
        message:event.officialName+' hit a verified MLB home run.'};
      await db('tso2_verified_hits?on_conflict=saved_selection_id,evidence_key','POST',
        item,'resolution=ignore-duplicates,return=minimal');
      alerted++; // This can include an idempotent existing alert.
    }
    return response(req,200,{checked,verifiedOrAlreadyAlerted:alerted,pending,
      sport:'mlb',source:'MLB StatsAPI',results:'No tickets automatically graded'});
  }catch(err){
    console.error('[tso2 HR verifier]',String(err?.message||err));
    return response(req,503,{error:'Verified game data or notification service unavailable. No result was assumed.'});
  }
});
