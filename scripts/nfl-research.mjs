#!/usr/bin/env node
/**
 * Build slates/nfl-research.json for The Sports Outpost.
 *
 * Current-season identity / roster / depth / injury data comes from ESPN's
 * credential-free public NFL endpoints. Historical production comes from
 * nflverse release assets (CC BY 4.0). Existing slates/nfl.json is used as the
 * bridge back to the TSO model so the research file can enrich the exact
 * players currently shown on Slate/Props without changing the ATD model.
 *
 * This script is intentionally dependency-free so it can run in GitHub Actions
 * with stock Node 20.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'slates', 'nfl-research.json');
const SLATE = path.join(ROOT, 'slates', 'nfl.json');
const now = new Date();
const SEASON = Number(process.env.NFL_SEASON || now.getUTCFullYear());
const PREV = SEASON - 1;
const UA = 'TheSportsOutpost/1.0 (+https://thesportsoutpost.com)';

const URLS = {
  teams: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=50',
  injuries: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries',
  players: 'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv',
  roster: season => `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${season}.csv`,
  playerWeek: season => `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}.csv`,
  playerReg: season => `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_${season}.csv`,
  snaps: season => `https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_${season}.csv`,
  schedule: 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
};

const health = {};
const normTeam = t => ({ LAR:'LA', JAC:'JAX', WAS:'WSH', OAK:'LV', SD:'LAC', STL:'LA' }[String(t||'').toUpperCase()] || String(t||'').toUpperCase());
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const nullableN = v => { const x = Number(v); return Number.isFinite(x) ? x : null; };
const clean = s => String(s ?? '').trim();
const nameKey = s => clean(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const round = (v,d=1) => Number.isFinite(Number(v)) ? +Number(v).toFixed(d) : null;

async function fetchText(url, key, required=false){
  try{
    const res = await fetch(url,{headers:{'user-agent':UA,'accept':'text/csv,text/plain,*/*'}});
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const txt = await res.text();
    health[key] = {ok:true, rows:null};
    return txt;
  }catch(err){
    health[key] = {ok:false,error:String(err?.message||err)};
    if(required) throw err;
    return '';
  }
}
function espnCandidates(url){
  const out=[url];
  if(url.includes('://site.api.espn.com/')) out.push(url.replace('://site.api.espn.com/', '://site.web.api.espn.com/'));
  else if(url.includes('://site.web.api.espn.com/')) out.push(url.replace('://site.web.api.espn.com/', '://site.api.espn.com/'));
  return [...new Set(out)];
}
async function fetchJson(url, key, required=false){
  const attempts=[];
  for(const candidate of espnCandidates(url)){
    try{
      const res = await fetch(candidate,{headers:{
        'user-agent':UA,
        'accept':'application/json,text/plain,*/*',
        'accept-language':'en-US,en;q=0.9',
        'referer':'https://www.espn.com/',
        'origin':'https://www.espn.com',
      }});
      if(!res.ok){ attempts.push(`${new URL(candidate).host}: ${res.status} ${res.statusText}`); continue; }
      const j = await res.json();
      health[key] = {ok:true,host:new URL(candidate).host,attempts};
      return j;
    }catch(err){
      attempts.push(`${new URL(candidate).host}: ${String(err?.message||err)}`);
    }
  }
  const message=attempts.join(' | ') || 'No ESPN endpoint candidates succeeded';
  health[key] = {ok:false,error:message};
  if(required) throw new Error(`${key}: ${message}`);
  return null;
}

function parseCsv(text){
  if(!text) return [];
  const rows=[]; let row=[], field='', quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){
      if(c==='"' && text[i+1]==='"'){ field+='"'; i++; }
      else if(c==='"') quote=false;
      else field+=c;
    }else{
      if(c==='"') quote=true;
      else if(c===','){ row.push(field); field=''; }
      else if(c==='\n'){ row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const headers=(rows.shift()||[]).map(clean);
  return rows.filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}

function stat(row, ...keys){
  for(const k of keys) if(row && row[k]!==undefined && row[k]!=='' && row[k]!==null) return n(row[k]);
  return 0;
}
function pick(row, ...keys){
  for(const k of keys) if(row && row[k]!==undefined && clean(row[k])) return row[k];
  return null;
}
function totalTds(row){ return stat(row,'rushing_tds')+stat(row,'receiving_tds')+stat(row,'passing_tds')+stat(row,'special_teams_tds'); }
function gameYards(row){ return stat(row,'rushing_yards')+stat(row,'receiving_yards'); }

function summarizeSeason(row){
  if(!row) return null;
  const games = stat(row,'games','games_played');
  const carries=stat(row,'carries','rushing_attempts');
  const targets=stat(row,'targets');
  const receptions=stat(row,'receptions');
  const rushYds=stat(row,'rushing_yards');
  const recYds=stat(row,'receiving_yards');
  const passYds=stat(row,'passing_yards');
  const passTds=stat(row,'passing_tds');
  const rushTds=stat(row,'rushing_tds');
  const recTds=stat(row,'receiving_tds');
  return {
    games,carries,targets,receptions,rushYds,recYds,passYds,passTds,rushTds,recTds,
    totalTds:passTds+rushTds+recTds+stat(row,'special_teams_tds'),
    touches:carries+receptions,
    scrimmageYds:rushYds+recYds,
    perGame: games ? {
      carries:round(carries/games), targets:round(targets/games), receptions:round(receptions/games),
      rushYds:round(rushYds/games), recYds:round(recYds/games), scrimmageYds:round((rushYds+recYds)/games),
      tds:round((rushTds+recTds)/games,2)
    } : null,
    targetShare: round(stat(row,'target_share')*100),
    airYardsShare: round(stat(row,'air_yards_share')*100),
    fantasyPpr: round(stat(row,'fantasy_points_ppr')),
  };
}
function seasonOfRow(r){ return n(r?.season||r?._season); }
function sortGameRows(rows){
  return [...rows].filter(r=>String(r.season_type||'REG').toUpperCase()==='REG')
    .sort((a,b)=>(seasonOfRow(b)-seasonOfRow(a))||(n(b.week)-n(a.week)));
}
function buildScheduleIndex(rows){
  const out=new Map();
  for(const r of rows||[]){
    const season=n(r.season), week=n(r.week), home=normTeam(pick(r,'home_team','home')||''), away=normTeam(pick(r,'away_team','away')||'');
    if(!season||!week||!home||!away) continue;
    const date=clean(pick(r,'gameday','game_date','date'))||null;
    const gameId=clean(pick(r,'game_id','gameId'))||null;
    const gameType=clean(pick(r,'game_type','season_type'))||'REG';
    const base={season,week,date,gameId,gameType};
    out.set(`${season}|${week}|${home}|${away}`,{...base,team:home,opponent:away,homeAway:'home'});
    out.set(`${season}|${week}|${away}|${home}`,{...base,team:away,opponent:home,homeAway:'away'});
  }
  return out;
}
function gameLogRows(rows,scheduleIndex,count=40){
  return sortGameRows(rows).slice(0,count).map(r=>{
    const season=seasonOfRow(r), week=n(r.week), team=normTeam(pick(r,'recent_team','team')||''), opponent=normTeam(pick(r,'opponent_team','opponent')||'');
    const meta=scheduleIndex?.get(`${season}|${week}|${team}|${opponent}`)||null;
    return {
      season,week,team,opponent,date:meta?.date||null,homeAway:meta?.homeAway||null,gameId:meta?.gameId||null,
      carries:stat(r,'carries','rushing_attempts'),targets:stat(r,'targets'),receptions:stat(r,'receptions'),
      completions:stat(r,'completions'),attempts:stat(r,'attempts','passing_attempts'),
      rushYds:stat(r,'rushing_yards'),recYds:stat(r,'receiving_yards'),passYds:stat(r,'passing_yards'),
      passTds:stat(r,'passing_tds'),rushTds:stat(r,'rushing_tds'),recTds:stat(r,'receiving_tds'),
      tds:totalTds(r),scrimmageYds:gameYards(r)
    };
  });
}
function summarizeLast(rows, count=5, scheduleIndex=null){
  const usable=sortGameRows(rows).slice(0,count);
  if(!usable.length) return null;
  const sums=usable.reduce((a,r)=>{
    a.carries+=stat(r,'carries','rushing_attempts'); a.targets+=stat(r,'targets'); a.receptions+=stat(r,'receptions');
    a.rushYds+=stat(r,'rushing_yards'); a.recYds+=stat(r,'receiving_yards'); a.passYds+=stat(r,'passing_yards');
    a.tds+=totalTds(r); return a;
  },{carries:0,targets:0,receptions:0,rushYds:0,recYds:0,passYds:0,tds:0});
  const games=usable.length;
  return {
    games,
    avg:{ carries:round(sums.carries/games), targets:round(sums.targets/games), receptions:round(sums.receptions/games), rushYds:round(sums.rushYds/games), recYds:round(sums.recYds/games), scrimmageYds:round((sums.rushYds+sums.recYds)/games), passYds:round(sums.passYds/games), tds:round(sums.tds/games,2)},
    tdGames:usable.filter(r=>totalTds(r)>0).length,
    gamesLog:gameLogRows(usable,scheduleIndex,count)
  };
}

async function readLocalJson(file){
  try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}
}

function flattenTeams(payload){
  const arr=payload?.sports?.flatMap(s=>s?.leagues||[]).flatMap(l=>l?.teams||[]) || payload?.teams || [];
  return arr.map(x=>x.team||x).filter(Boolean).map(t=>({id:String(t.id),abbr:normTeam(t.abbreviation),name:t.displayName||t.name||t.nickname,shortName:t.shortDisplayName||t.nickname||t.name,logo:t.logos?.[0]?.href||t.logo||null}));
}
function flattenRoster(payload, team){
  const out=[];
  for(const group of payload?.athletes||[]){
    for(const raw of group?.items||[]){
      const a=raw?.athlete||raw;
      if(!a?.id) continue;
      out.push({
        espnId:String(a.id), team:team.abbr, teamId:team.id, name:a.fullName||a.displayName||a.shortName,
        position:a.position?.abbreviation||group?.position?.abbreviation||group?.position||'', jersey:a.jersey||null,
        headshot:a.headshot?.href||a.headshot||null, active:a.active!==false,
        status:a.status?.name||a.status?.type||a.status||null, experience:nullableN(a.experience?.years), age:nullableN(a.age),
      });
    }
  }
  return out;
}
function flattenDepth(payload){
  const out=new Map();
  const charts=payload?.depthCharts||payload?.depthcharts||[];
  for(const chart of charts){
    const posObj=chart?.positions||{};
    for(const [slot,pdata] of Object.entries(posObj)){
      const pos=pdata?.position?.abbreviation||pdata?.position?.name||slot;
      for(const entry of pdata?.athletes||[]){
        const a=entry?.athlete||entry;
        if(!a?.id) continue;
        out.set(String(a.id),{rank:nullableN(entry.rank)??nullableN(a.rank),position:pos,slot});
      }
    }
  }
  return out;
}
function flattenInjuries(payload){
  const out=new Map();
  for(const teamBlock of payload?.injuries||[]){
    const team=normTeam(teamBlock?.team?.abbreviation||'');
    for(const item of teamBlock?.injuries||[]){
      const a=item?.athlete||{}; if(!a?.id && !a?.fullName) continue;
      const key=a?.id?`id:${a.id}`:`name:${team}:${nameKey(a.fullName)}`;
      out.set(key,{status:item?.status||item?.type?.description||item?.type?.name||null,detail:item?.details?.detail||item?.details?.type||item?.description||null,date:item?.date||null});
    }
  }
  return out;
}

function indexRows(rows, key='player_id'){
  const m=new Map(); for(const r of rows){const k=clean(r[key]); if(k) m.set(k,r);} return m;
}
function groupRows(rows,key='player_id'){
  const m=new Map(); for(const r of rows){const k=clean(r[key]); if(!k) continue; if(!m.has(k))m.set(k,[]);m.get(k).push(r);} return m;
}
function posGroup(v){
  const p=String(v||'').toUpperCase();
  if(p==='HB'||p==='FB') return 'RB';
  if(['QB','RB','WR','TE'].includes(p)) return p;
  return p;
}
function pctValue(v){
  const x=Number(String(v??'').replace('%','')); if(!Number.isFinite(x)) return null;
  return round(x<=1.01?x*100:x,1);
}
function summarizeSnaps(rows,count=5){
  const usable=[...rows].sort((a,b)=>n(b.week)-n(a.week)).slice(0,count);
  if(!usable.length) return null;
  const vals=usable.map(r=>pctValue(pick(r,'offense_pct','offense_percent','offense_percentage'))).filter(v=>v!=null);
  const snaps=usable.map(r=>stat(r,'offense_snaps')).filter(v=>Number.isFinite(v));
  return {games:usable.length,avgOffensePct:vals.length?round(vals.reduce((a,b)=>a+b,0)/vals.length,1):null,lastOffensePct:vals[0]??null,avgOffenseSnaps:snaps.length?round(snaps.reduce((a,b)=>a+b,0)/snaps.length,1):null};
}
function buildDefenseAllowed(rows){
  const groups=new Map();
  for(const r of rows){
    const defense=normTeam(pick(r,'opponent_team','opponent')||'');
    const pos=posGroup(pick(r,'position_group','position')||'');
    const week=n(r.week);
    if(!defense||!['QB','RB','WR','TE'].includes(pos)||!week) continue;
    const key=`${defense}|${pos}`;
    if(!groups.has(key)) groups.set(key,{defense,pos,weeks:new Set(),passYds:0,rushYds:0,recYds:0,targets:0,receptions:0,carries:0,passTds:0,rushTds:0,recTds:0,turnovers:0});
    const g=groups.get(key); g.weeks.add(week);
    g.passYds+=stat(r,'passing_yards');g.rushYds+=stat(r,'rushing_yards');g.recYds+=stat(r,'receiving_yards');
    g.targets+=stat(r,'targets');g.receptions+=stat(r,'receptions');g.carries+=stat(r,'carries','rushing_attempts');
    g.passTds+=stat(r,'passing_tds');g.rushTds+=stat(r,'rushing_tds');g.recTds+=stat(r,'receiving_tds');g.turnovers+=stat(r,'interceptions')+stat(r,'fumbles_lost');
  }
  const out=new Map();
  for(const [key,g] of groups){
    const games=Math.max(1,g.weeks.size),tds=g.passTds+g.rushTds+g.recTds;
    out.set(key,{games,position:g.pos,totalYards:g.passYds+g.rushYds+g.recYds,passYds:g.passYds,rushYds:g.rushYds,recYds:g.recYds,totalTds:tds,perGame:{yards:round((g.passYds+g.rushYds+g.recYds)/games),passYds:round(g.passYds/games),rushYds:round(g.rushYds/games),recYds:round(g.recYds/games),tds:round(tds/games,2),targets:round(g.targets/games),receptions:round(g.receptions/games),carries:round(g.carries/games)}});
  }
  return out;
}

async function main(){
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  const slate=await readLocalJson(SLATE);

  const [teamsJson,injJson,playersCsv,rosterCsv,prevWeekCsv,prevRegCsv,currentWeekCsv,currentRegCsv,prevSnapsCsv,currentSnapsCsv,scheduleCsv] = await Promise.all([
    fetchJson(URLS.teams,'espnTeams'),
    fetchJson(URLS.injuries,'espnInjuries'),
    fetchText(URLS.players,'nflversePlayers'),
    fetchText(URLS.roster(SEASON),'nflverseRosterCurrent'),
    fetchText(URLS.playerWeek(PREV),'nflversePrevWeekly'),
    fetchText(URLS.playerReg(PREV),'nflversePrevRegular'),
    fetchText(URLS.playerWeek(SEASON),'nflverseCurrentWeekly'),
    fetchText(URLS.playerReg(SEASON),'nflverseCurrentRegular'),
    fetchText(URLS.snaps(PREV),'nflversePrevSnaps'),
    fetchText(URLS.snaps(SEASON),'nflverseCurrentSnaps'),
    fetchText(URLS.schedule,'nflverseSchedule'),
  ]);

  let teams=flattenTeams(teamsJson);
  // Fail-soft fallback: if both ESPN hosts are unavailable, derive teams from
  // the current TSO slate so nflverse-backed player research can still build.
  if(!teams.length && slate?.games?.length){
    const seen=new Map();
    for(const g of slate.games){
      for(const t of [g.away,g.home]){
        if(!t?.abbr) continue;
        const abbr=normTeam(t.abbr);
        if(!seen.has(abbr)) seen.set(abbr,{id:String(t.id||abbr),abbr,name:t.name||abbr,shortName:t.shortName||t.name||abbr,logo:t.logo||null});
      }
    }
    teams=[...seen.values()];
    health.espnTeams = {...(health.espnTeams||{}),fallback:'slates/nfl.json',rows:teams.length};
  }else{
    health.espnTeams = {...(health.espnTeams||{}),rows:teams.length};
  }
  const injuries=flattenInjuries(injJson||{});

  const teamPayloads=await parallelMap(teams,6,async team=>{
    const [roster,depth]=await Promise.all([
      fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`,`espnRoster:${team.abbr}`),
      fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/depthcharts`,`espnDepth:${team.abbr}`),
    ]);
    return {team,roster:flattenRoster(roster||{},team),depth:flattenDepth(depth||{})};
  });

  const xwalk=parseCsv(playersCsv); health.nflversePlayers.rows=xwalk.length;
  const rosterNv=parseCsv(rosterCsv); health.nflverseRosterCurrent.rows=rosterNv.length;
  const prevWeek=parseCsv(prevWeekCsv).map(r=>({...r,_season:PREV})); health.nflversePrevWeekly.rows=prevWeek.length;
  const prevReg=parseCsv(prevRegCsv); health.nflversePrevRegular.rows=prevReg.length;
  const curWeek=parseCsv(currentWeekCsv).map(r=>({...r,_season:SEASON})); health.nflverseCurrentWeekly.rows=curWeek.length;
  const curReg=parseCsv(currentRegCsv); health.nflverseCurrentRegular.rows=curReg.length;
  const prevSnaps=parseCsv(prevSnapsCsv); health.nflversePrevSnaps.rows=prevSnaps.length;
  const curSnaps=parseCsv(currentSnapsCsv); health.nflverseCurrentSnaps.rows=curSnaps.length;
  const scheduleRows=parseCsv(scheduleCsv); health.nflverseSchedule.rows=scheduleRows.length;
  const scheduleIndex=buildScheduleIndex(scheduleRows);
  const defenseAllowedPrev=buildDefenseAllowed(prevWeek);

  const xByEspn=new Map(),xByGsis=new Map(),xByName=new Map();
  for(const r of xwalk){
    const e=clean(r.espn_id), g=clean(r.gsis_id), nm=nameKey(pick(r,'display_name','full_name','football_name','name'));
    if(e)xByEspn.set(e,r); if(g)xByGsis.set(g,r); if(nm)xByName.set(nm,r);
  }
  const nvRosterByEspn=new Map(),nvRosterByGsis=new Map(),nvRosterByNameTeam=new Map();
  for(const r of rosterNv){
    const e=clean(r.espn_id),g=clean(r.gsis_id),team=normTeam(pick(r,'team','club_code')||''),nm=nameKey(pick(r,'full_name','player_name','football_name','name'));
    if(e)nvRosterByEspn.set(e,r); if(g)nvRosterByGsis.set(g,r); if(team&&nm)nvRosterByNameTeam.set(`${team}|${nm}`,r);
  }
  const prevRegBy=indexRows(prevReg); const curRegBy=indexRows(curReg); const prevWeeksBy=groupRows(prevWeek); const curWeeksBy=groupRows(curWeek);
  const prevSnapsByPfr=groupRows(prevSnaps,'pfr_player_id'); const curSnapsByPfr=groupRows(curSnaps,'pfr_player_id');

  const slatePlayers=[]; const slateByEspn=new Map(), slateByGsis=new Map(), slateByNameTeam=new Map();
  for(const g of slate?.games||[]) for(const p of g.players||[]){
    const entry={...p,gameId:String(g.gameId),opponent:p.opponent||'',gameStatus:g.status||'pre'}; slatePlayers.push(entry);
    if(p.espnId)slateByEspn.set(String(p.espnId),entry); if(p.gsisId)slateByGsis.set(String(p.gsisId),entry);
    slateByNameTeam.set(`${normTeam(p.team)}|${nameKey(p.name)}`,entry);
  }

  const resultPlayers=[];
  for(const tp of teamPayloads){
    for(const p of tp.roster){
      const depth=tp.depth.get(p.espnId)||null;
      const x=xByEspn.get(p.espnId)||xByName.get(nameKey(p.name))||null;
      const gsis=clean(x?.gsis_id)||clean(nvRosterByEspn.get(p.espnId)?.gsis_id)||null;
      const nv=nvRosterByEspn.get(p.espnId)||(gsis?nvRosterByGsis.get(gsis):null)||nvRosterByNameTeam.get(`${p.team}|${nameKey(p.name)}`)||null;
      const model=slateByEspn.get(p.espnId)||(gsis?slateByGsis.get(gsis):null)||slateByNameTeam.get(`${p.team}|${nameKey(p.name)}`)||null;
      const inj=injuries.get(`id:${p.espnId}`)||injuries.get(`name:${p.team}:${nameKey(p.name)}`)||null;
      const histId=gsis||clean(x?.gsis_id)||null;
      const prevSeason=histId?summarizeSeason(prevRegBy.get(histId)):null;
      const currentSeason=histId?summarizeSeason(curRegBy.get(histId)):null;
      const historyRows=histId?[...(curWeeksBy.get(histId)||[]),...(prevWeeksBy.get(histId)||[])]:[];
      const last5=histId?summarizeLast(historyRows,5,scheduleIndex):null;
      const gameLog=(histId&&model)?gameLogRows(historyRows,scheduleIndex,40):null;
      const jersey=p.jersey||pick(nv,'jersey_number','jersey')||null;
      const position=p.position||pick(nv,'position','position_group')||pick(x,'position')||'';
      const status=inj?.status||p.status||pick(nv,'status')||'Active';
      const pfr=clean(x?.pfr_id)||null;
      const snapTrend=pfr?summarizeSnaps([...(curSnapsByPfr.get(pfr)||[]),...(prevSnapsByPfr.get(pfr)||[])],5):null;
      const matchup=model?.opponent?defenseAllowedPrev.get(`${normTeam(model.opponent)}|${posGroup(position)}`)||null:null;
      resultPlayers.push({
        espnId:p.espnId,gsisId:gsis,pfrId:pfr,team:p.team,name:p.name,position,jersey,
        headshot:p.headshot||pick(x,'headshot','headshot_url')||pick(nv,'headshot_url')||null,
        rosterStatus:status,active:p.active,experience:p.experience,age:p.age,
        depth:{rank:depth?.rank??nullableN(model?.depthRank),position:depth?.position||position,slot:depth?.slot||null},
        injury:inj,
        opponent:model?.opponent||null,gameId:model?.gameId||null,
        model:model?{
          atdProbability:nullableN(model?.props?.atd?.probability),atdGrade:model?.props?.atd?.grade||null,
          snapShare:nullableN(model?.stats?.snapShare),rzTargets:nullableN(model?.stats?.rzTargets),rzCarries:nullableN(model?.stats?.rzCarries),
          gamesPlayed:nullableN(model?.stats?.gamesPlayed),tds:nullableN(model?.stats?.tds),
        }:null,
        previousSeason:prevSeason,currentSeason,last5,gameLog,snapTrend,
        matchup:matchup?{opponent:normTeam(model?.opponent),positionGroup:posGroup(position),previousSeasonAllowed:matchup}:null,
      });
    }
  }

  // Add any TSO-modeled player that ESPN roster omitted so the current Slate
  // never loses research coverage due to a temporary upstream roster gap.
  const have=new Set(resultPlayers.map(p=>`${p.team}|${nameKey(p.name)}`));
  for(const m of slatePlayers){
    const key=`${normTeam(m.team)}|${nameKey(m.name)}`; if(have.has(key))continue;
    const x=(m.espnId&&xByEspn.get(String(m.espnId)))||(m.gsisId&&xByGsis.get(String(m.gsisId)))||xByName.get(nameKey(m.name))||null;
    const gsis=clean(m.gsisId)||clean(x?.gsis_id)||null;
    resultPlayers.push({espnId:clean(m.espnId)||clean(x?.espn_id)||null,gsisId:gsis,pfrId:clean(x?.pfr_id)||null,team:normTeam(m.team),name:m.name,position:m.position||pick(x,'position')||'',jersey:null,headshot:m.headshot||pick(x,'headshot','headshot_url')||null,rosterStatus:'Slate player',active:true,experience:null,age:null,depth:{rank:nullableN(m.depthRank),position:m.position||'',slot:null},injury:null,opponent:m.opponent||null,gameId:m.gameId||null,model:{atdProbability:nullableN(m?.props?.atd?.probability),atdGrade:m?.props?.atd?.grade||null,snapShare:nullableN(m?.stats?.snapShare),rzTargets:nullableN(m?.stats?.rzTargets),rzCarries:nullableN(m?.stats?.rzCarries),gamesPlayed:nullableN(m?.stats?.gamesPlayed),tds:nullableN(m?.stats?.tds)},previousSeason:gsis?summarizeSeason(prevRegBy.get(gsis)):null,currentSeason:gsis?summarizeSeason(curRegBy.get(gsis)):null,last5:gsis?summarizeLast([...(curWeeksBy.get(gsis)||[]),...(prevWeeksBy.get(gsis)||[])],5,scheduleIndex):null,gameLog:gsis?gameLogRows([...(curWeeksBy.get(gsis)||[]),...(prevWeeksBy.get(gsis)||[])],scheduleIndex,40):null,snapTrend:clean(x?.pfr_id)?summarizeSnaps([...(curSnapsByPfr.get(clean(x?.pfr_id))||[]),...(prevSnapsByPfr.get(clean(x?.pfr_id))||[])],5):null,matchup:m.opponent?{opponent:normTeam(m.opponent),positionGroup:posGroup(m.position),previousSeasonAllowed:defenseAllowedPrev.get(`${normTeam(m.opponent)}|${posGroup(m.position)}`)||null}:null});
  }

  resultPlayers.sort((a,b)=>a.team.localeCompare(b.team)||((a.depth?.rank??99)-(b.depth?.rank??99))||a.position.localeCompare(b.position)||a.name.localeCompare(b.name));
  const output={
    schemaVersion:1,season:SEASON,previousSeason:PREV,generatedAt:new Date().toISOString(),
    sources:{espn:'Current rosters, depth charts, injuries',nflverse:'Player ID crosswalk, historical/current player statistics, snap counts, and schedule metadata (CC BY 4.0)',tso:'Existing slates/nfl.json model fields'},
    sourceHealth:health,
    teamCount:teams.length,playerCount:resultPlayers.length,
    teams:teams.map(t=>({...t,rosterCount:resultPlayers.filter(p=>p.team===t.abbr).length})),
    players:resultPlayers,
  };
  await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n');
  console.log(`NFL research: ${resultPlayers.length} players across ${teams.length} teams -> ${path.relative(ROOT,OUT)}`);
}

async function parallelMap(items,limit,fn){
  const out=new Array(items.length); let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i);}
  });
  await Promise.all(workers); return out;
}

main().catch(err=>{console.error(err);process.exitCode=1;});
