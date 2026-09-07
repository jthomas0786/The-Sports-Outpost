import { startLivePolling } from './nfl/live.js';

/**
 * sports/nfl-preview.js — NFL product mock built from the MLB information
 * architecture. It uses the already-connected slates/nfl.json wherever data
 * exists (schedule, teams, headshots, ATD model inputs), and fills not-yet-wired
 * prop markets/route charts with deterministic preview values so the UI can be
 * reviewed before those pipelines are connected.
 */

const state = {
  tab: 'props',
  prop: 'atd',
  propView: 'board',
  player: null,
  game: null,
  mapFilter: 'ALL',
  loaded: false,
  data: null,
  allSort: 'edge',
  gamecastTab: 'game',
};

const PROPS = {
  atd: 'Anytime TD',
  firstTd: 'First TD',
  rushYds: 'Rushing Yards',
  recYds: 'Receiving Yards',
  receptions: 'Receptions',
  passYds: 'Passing Yards',
  passTds: 'Passing TDs',
  completions: 'Completions',
  allPlayers: 'All Players',
};

const FALLBACK_GAMES = [
  {id:'ne-sea', away:{abbr:'NE',name:'Patriots'}, home:{abbr:'SEA',name:'Seahawks'}, time:'8:20 PM', venue:'Lumen Field', detail:'Week 1', score:null},
  {id:'sf-la', away:{abbr:'SF',name:'49ers'}, home:{abbr:'LA',name:'Rams'}, time:'8:35 PM', venue:'SoFi Stadium', detail:'Week 1', score:null},
  {id:'buf-mia', away:{abbr:'BUF',name:'Bills'}, home:{abbr:'MIA',name:'Dolphins'}, time:'1:00 PM', venue:'Hard Rock Stadium', detail:'Week 1', score:null},
  {id:'det-gb', away:{abbr:'DET',name:'Lions'}, home:{abbr:'GB',name:'Packers'}, time:'4:25 PM', venue:'Lambeau Field', detail:'Week 1', score:null},
];

const FALLBACK_PLAYERS = [
  {id:'jsn',name:'Jaxon Smith-Njigba',team:'SEA',pos:'WR',opp:'NE',edge:71,prob:.53,grade:'A',usage:77,rz:17,explosive:19,headshot:null},
  {id:'cmc',name:'Christian McCaffrey',team:'SF',pos:'RB',opp:'LA',edge:69,prob:.49,grade:'A',usage:82,rz:24,explosive:17,headshot:null},
  {id:'puka',name:'Puka Nacua',team:'LA',pos:'WR',opp:'SF',edge:66,prob:.44,grade:'A-',usage:84,rz:18,explosive:20,headshot:null},
  {id:'kyren',name:'Kyren Williams',team:'LA',pos:'RB',opp:'SF',edge:63,prob:.40,grade:'B+',usage:77,rz:25,explosive:12,headshot:null},
  {id:'kittle',name:'George Kittle',team:'SF',pos:'TE',opp:'LA',edge:61,prob:.37,grade:'B+',usage:68,rz:20,explosive:17,headshot:null},
  {id:'walker',name:'Kenneth Walker III',team:'SEA',pos:'RB',opp:'NE',edge:59,prob:.34,grade:'B',usage:70,rz:20,explosive:14,headshot:null},
];

function esc(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function hash(str){ let x=2166136261; for(const c of String(str)){ x^=c.charCodeAt(0); x=Math.imul(x,16777619); } return Math.abs(x>>>0); }
function num(seed,min,max,dec=0){ const v=min+(hash(seed)%10000)/9999*(max-min); return dec?+v.toFixed(dec):Math.round(v); }
function initials(name){ return String(name).split(/\s+/).map(x=>x[0]).slice(0,2).join(''); }
function gradeFor(p){ return p>=.48?'A+':p>=.41?'A':p>=.35?'A-':p>=.29?'B+':p>=.23?'B':'C+'; }
function record(team){ return team?.records?.find?.(r=>r.type==='total')?.summary || '0-0'; }
function signalBadge(edge){ return edge>=60 ? `<span class="ms-nfl-badge signal"><img src="glossy_blue_tso_wireless_badge.png" alt="TSO Signal" title="TSO Signal · Edge ${edge}"></span>` : ''; }
function teamLogo(team,cls=''){ return team?.logo ? `<img class="ms-nfl-team-logo ${cls}" src="${esc(team.logo)}" alt="">` : `<span class="ms-team-token">${esc(team?.abbr||'?')}</span>`; }

async function loadData(){
  if(state.loaded) return;
  state.loaded = true;
  try{
    const r = await fetch('./slates/nfl.json',{cache:'no-cache'});
    if(!r.ok) throw new Error('NFL slate unavailable');
    const d = await r.json();
    const games=(d.games||[]).map(g=>({
      id:String(g.gameId),
      away:{...g.away,abbr:g.away?.abbr||'AWY',name:g.away?.shortName||g.away?.name||'Away'},
      home:{...g.home,abbr:g.home?.abbr||'HME',name:g.home?.shortName||g.home?.name||'Home'},
      time:g.startTimeUTC?new Date(g.startTimeUTC).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'TBD',
      venue:g.venue?.name||'NFL Stadium', city:g.venue?.city||'', detail:g.statusDetail||`Week ${d.week||1}`, status:g.status||'pre',
      broadcast:(g.broadcast||[]).flatMap(x=>x?.names||[]).filter(Boolean).join(', ') || 'NFL',
      startTimeUTC:g.startTimeUTC||null,
      liveScore:g.liveScore?{...g.liveScore}:null,
      score:g.status==='pre'?null:`${g.away?.score||0} – ${g.home?.score||0}`,
    }));
    const players=[];
    for(const g of d.games||[]){
      for(const p of g.players||[]){
        const atd=Number(p.props?.atd?.probability);
        if(!Number.isFinite(atd)) continue;
        const inp=p.props?.atd?.inputs||{};
        const rzAllowed=Number(inp.oppRzTdRateAllowed);
        const oppFactor=Number(inp.oppRzDefFactor)||1;
        const snap=Number(p.stats?.snapShare);
        const rzOpp=(Number(p.stats?.rzTargets)||0)+(Number(p.stats?.rzCarries)||0);
        const edge=clamp(Math.round(50+(atd-.25)*35+(oppFactor-1)*42+(Number.isFinite(snap)?(snap-.65)*12:0)),30,78);
        players.push({
          id:p.gsisId||p.espnId||p.name, name:p.name, team:p.team, pos:p.position||'SKILL', opp:p.opponent||'',
          edge, prob:atd, grade:p.props?.atd?.grade||gradeFor(atd), headshot:p.headshot||null,
          usage:Number.isFinite(snap)?Math.round(snap*100):num(p.name+'snap',58,88),
          rz:rzOpp||num(p.name+'rz',6,25), explosive:num(p.name+'exp',9,24),
          gamesPlayed:Number(p.stats?.gamesPlayed)||17, tds:Number(p.stats?.tds)||0,
          oppRzAllowed:Number.isFinite(rzAllowed)?rzAllowed:null, gameId:String(g.gameId), depthRank:p.depthRank||null,
        });
      }
    }
    players.sort((a,b)=>b.prob-a.prob);
    state.data={games:games.length?games:FALLBACK_GAMES,players:players.length?players:FALLBACK_PLAYERS,week:d.week||1,generatedAt:d.generatedAt||null};
    startLivePolling(d,()=>{
      syncPreviewGamesFromRaw(d);
      const root=document.getElementById('nflView');
      if(root && !root.hidden && state.tab==='slate') render();
    });
  }catch(e){
    state.data={games:FALLBACK_GAMES,players:FALLBACK_PLAYERS,week:1,generatedAt:null};
  }
  const dd=state.data;
  const firstTdRank=[...dd.players].map(p=>({p,prob:firstTdProbability(p)})).filter(x=>x.prob!=null).sort((a,b)=>b.prob-a.prob);
  window.DW_NFL_PREVIEW_SUMMARY={
    week:dd.week,
    gameCount:dd.games.length,
    playerCount:dd.players.length,
    topAtdPct:dd.players.length?Math.round((dd.players[0].prob||0)*100):null,
    topFirstTdPct:firstTdRank.length?Math.round(firstTdRank[0].prob*100):null,
    signals:dd.players.filter(p=>p.edge>=60).slice(0,6).map(p=>({name:p.name,team:p.team,edge:p.edge,prob:p.prob,firstTd:firstTdProbability(p),headshot:p.headshot||null})),
  };
}


function syncPreviewGamesFromRaw(raw){
  if(!state.data?.games || !raw?.games) return;
  const byId=new Map(state.data.games.map(g=>[String(g.id),g]));
  for(const rg of raw.games){
    const g=byId.get(String(rg.gameId)); if(!g) continue;
    g.status=rg.status||g.status;
    g.detail=rg.statusDetail||g.detail;
    g.liveScore=rg.liveScore?{...rg.liveScore}:g.liveScore;
    if(rg.away?.score!=null) g.away={...g.away,score:rg.away.score};
    if(rg.home?.score!=null) g.home={...g.home,score:rg.home.score};
    g.score=g.status==='pre'?null:`${g.away?.score||0} – ${g.home?.score||0}`;
  }
}

function scoreNum(team){ const n=Number(team?.score); return Number.isFinite(n)?n:0; }
function quarterLabel(period){ return period===1?'1ST':period===2?'2ND':period===3?'3RD':period===4?'4TH':period>=5?'OT':''; }
function clockLabel(clockMin){
  if(!Number.isFinite(Number(clockMin))) return '';
  const total=Math.max(0,Math.round(Number(clockMin)*60));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
}
function liveState(g){
  const live=g?.liveScore||{};
  const period=Number(live.period)||0;
  const q=quarterLabel(period);
  const clock=clockLabel(live.clockMin);
  const label=g?.status==='in' ? [q,clock].filter(Boolean).join(' ') : g?.status==='post' ? 'FINAL' : (g?.time||'TBD');
  return {live,period,q,clock,label};
}
function possessionAbbr(g){
  const poss=g?.liveScore?.possession;
  return poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:null;
}
function ballFieldPct(g){
  const live=g?.liveScore||{};
  const y=Number(live.yardFromOwn);
  if(Number.isFinite(y) && live.possession){
    return clamp(live.possession==='home'?100-y:y,5,95);
  }
  return num(g.id+'ball',34,68);
}
function firstDownPct(g,ball){
  const live=g?.liveScore||{};
  const dist=Number(live.distance);
  const d=Number.isFinite(dist)?clamp(dist,1,20):10;
  return clamp(ball+(live.possession==='home'?-d:d),7,93);
}
function fieldPositionLabel(g){
  const live=g?.liveScore||{};
  const y=Math.round(Number(live.yardFromOwn));
  if(!Number.isFinite(y)||!live.possession) return `${g.home.abbr} 50`;
  const own=live.possession==='home'?g.home.abbr:g.away.abbr;
  const opp=live.possession==='home'?g.away.abbr:g.home.abbr;
  return y<=50?`${own} ${y}`:`${opp} ${100-y}`;
}
function downDistanceLabel(g){
  const live=g?.liveScore||{};
  if(live.downDistanceText) return live.downDistanceText;
  const down=Number(live.down), dist=Number(live.distance);
  if(Number.isFinite(down)&&Number.isFinite(dist)) return `${down}${down===1?'st':down===2?'nd':down===3?'rd':'th'} & ${dist}`;
  return g?.status==='in'?'1st & 10':'Pregame';
}
function lastPlayLabel(g){ return g?.liveScore?.lastPlayText || (g?.status==='in'?'Live play data updating':'Awaiting kickoff'); }

function data(){ return state.data || {games:FALLBACK_GAMES,players:FALLBACK_PLAYERS,week:1}; }

/**
 * First-touchdown preview probability. ATD remains the connected scoring model;
 * until a dedicated drive-order model is wired, First TD is derived from ATD
 * plus the player's red-zone role and snap share so it behaves like a distinct
 * market instead of a flat percentage of ATD.
 */
function firstTdProbability(p){
  const atd=Number(p?.prob);
  if(!Number.isFinite(atd)) return null;
  const usage=clamp((Number(p?.usage)||65)/100,.35,.95);
  const rz=clamp((Number(p?.rz)||8)/24,0,1.35);
  const roleShare=clamp(.17 + usage*.10 + rz*.12, .20, .43);
  return clamp(atd*roleShare,.015,.22);
}

function propValue(p,prop){
  const seed=p.name+prop;
  const atd=Number(p.prob)||.25;
  const qb=p.pos==='QB', rb=p.pos==='RB', receiver=p.pos==='WR'||p.pos==='TE';
  const vals={
    atd:{main:`${Math.round(atd*100)}%`,sub:'TD probability',prob:atd},
    firstTd:{main:`${Math.round((firstTdProbability(p)||.025)*100)}%`,sub:'First TD probability',prob:firstTdProbability(p)||.025},
    rushYds:{main:`${qb||rb?num(seed,qb?18:38,qb?62:101,1):num(seed,2,18,1)}`,sub:'projected rush yds',prob:(qb||rb?num(seed+'p',46,69):num(seed+'p',23,44))/100},
    recYds:{main:`${receiver||rb?num(seed,receiver?38:16,receiver?112:54,1):'—'}`,sub:'projected rec yds',prob:(receiver||rb?num(seed+'p',45,69):8)/100},
    receptions:{main:`${receiver||rb?num(seed,receiver?3.1:2.0,receiver?8.7:5.4,1):'—'}`,sub:'projected catches',prob:(receiver||rb?num(seed+'p',45,68):8)/100},
    passYds:{main:`${qb?num(seed,215,326,1):'—'}`,sub:'projected pass yds',prob:qb?num(seed+'p',45,67)/100:.05},
    passTds:{main:`${qb?num(seed,1.2,2.8,1):'—'}`,sub:'projected pass TD',prob:qb?num(seed+'p',43,66)/100:.05},
    completions:{main:`${qb?num(seed,19.5,29.0,1):'—'}`,sub:'projected completions',prob:qb?num(seed+'p',44,66)/100:.05},
  };
  return vals[prop]||vals.atd;
}

function nflBadges(p){
  const out=[];
  if(p.edge>=60) out.push(signalBadge(p.edge));
  if(p.rz>=20) out.push('<span class="ms-nfl-badge">RZ THREAT</span>');
  if(p.usage>=80) out.push('<span class="ms-nfl-badge">HIGH USAGE</span>');
  if(p.explosive>=18) out.push('<span class="ms-nfl-badge">BIG PLAY</span>');
  return `<div class="ms-nfl-badges">${out.join('')}</div>`;
}


function headerHTML(){
  if(state.game) return '';
  const propTitle=state.prop==='allPlayers'?'All Players':`${PROPS[state.prop]} Props`;
  const titles={radar:'Game Radar',slate:'NFL Slate',feed:'TD Feed',props:propTitle,players:'All Players',foryou:'For You'};
  const subs={
    radar:'Every Week 1 matchup plotted by competitiveness and scoring pressure.',
    slate:'Football-first gamecards with field position, matchup context and one-tap Gamecast.',
    feed:'A touchdown stream built like the MLB Home Run Feed, using football scoring context.',
    props:state.prop==='allPlayers'?'Every modeled skill player in one searchable board, inside the same Props dropdown as the markets.':'Ranked NFL props with one market dropdown, Board/Radar views, grades and TSO Edge.',
    players:'Every modeled skill player in one searchable board, with TSO Edge sorting.',
    foryou:'The same shared community feed, now inside the NFL experience.',
  };
  return `<header class="ms-head"><div><div class="ms-kicker"><span>🏈</span>NFL · WEEK ${data().week} PREVIEW</div><h2>${esc(titles[state.tab])}</h2><p>${esc(subs[state.tab])}</p></div><div class="ms-head-actions">${signalBadge(67)}<span>TSO Edge enabled</span></div></header>`;
}

function footballField(g,{gamecast=false}={}){
  const markers=[10,20,30,40,50,60,70,80,90].map((x,i)=>`<span class="ms-field-marker" style="left:${x}%"><b>${i<5?(i+1)*10:(9-i)*10}</b></span>`).join('');
  const ball=ballFieldPct(g);
  const first=firstDownPct(g,ball);
  return `<div class="ms-field"><div class="ms-endzone">${esc(g.away.abbr)}</div><div class="ms-yard-lines">${markers}${gamecast?`<span class="ms-los" style="left:${ball}%"></span><span class="ms-firstdown" style="left:${first}%"></span>`:''}<span class="ms-ball" style="left:${ball}%"></span></div><div class="ms-endzone">${esc(g.home.abbr)}</div></div>`;
}

function slateGamecastCard(g){
  const p=featuredPlayerForGame(g);
  const st=liveState(g);
  const live=g.status==='in', final=g.status==='post';
  const poss=possessionAbbr(g);
  const homeWp=num(g.id+'wp',43,64);
  const statusText=live?'Live':final?'Final':'Game Preview';
  const centerMain=live?st.label:(final?'FINAL':g.time);
  const centerSub=live?`${downDistanceLabel(g)} · ${fieldPositionLabel(g)}`:esc(g.detail);
  const featuredAtd=Math.round((p.prob||0)*100), featuredFirst=Math.round((firstTdProbability(p)||0)*100);
  const defAbbr=p.opp||g.home.abbr;
  const last=lastPlayLabel(g);
  const edge=num(g.id+'rze',57,73);
  const scoring=live?num(g.id+'liveScoreChance',48,79):num(g.id+'preScoreChance',45,68);
  const sideTeam=p.team||g.away.abbr;
  const teamCopy=t=>`<div class="ms-slate-team-copy"><small>${esc(t.abbr)}</small><b>${esc(t.name)}</b><span>${esc(record(t))}</span></div>`;
  return `<article class="ms-slate-cast ${live?'is-live':final?'is-final':'is-pre'}" data-nfl-game="${esc(g.id)}" tabindex="0" role="button" aria-label="Open ${esc(g.away.name)} at ${esc(g.home.name)} Gamecast">
    <div class="ms-slate-statusbar"><span class="ms-slate-status">${esc(statusText)}</span><span class="ms-slate-network">${esc(g.broadcast||'NFL')} · ${esc(g.detail)}</span></div>
    <div class="ms-slate-scorebar">
      <div class="ms-slate-team">${teamLogo(g.away)}${teamCopy(g.away)}<strong class="ms-slate-score">${scoreNum(g.away)}</strong></div>
      <div class="ms-slate-center"><strong>${esc(centerMain)}</strong><b>${esc(centerSub)}</b><small>${poss?`${esc(poss)} has the ball`:(live?'Possession updating':'Kickoff preview')}</small></div>
      <div class="ms-slate-team home"><strong class="ms-slate-score">${scoreNum(g.home)}</strong>${teamCopy(g.home)}${teamLogo(g.home)}</div>
    </div>
    <div class="ms-slate-body">
      <div class="ms-slate-side"><div class="ms-slate-side-head">Player to Watch · ${esc(sideTeam)}</div><div class="ms-slate-person"><div class="ms-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><b>${esc(p.name)}</b><span>${esc(p.pos)} · vs ${esc(p.opp||'DEF')}</span></div></div><div class="ms-slate-person-stats"><div><b>${featuredAtd}%</b><span>ATD</span></div><div><b>${featuredFirst}%</b><span>1ST TD</span></div><div><b>${p.edge}</b><span>TSO EDGE</span></div></div></div>
      <div class="ms-slate-field-wrap">${footballField(g,{gamecast:true})}<div class="ms-slate-field-tag">${esc(downDistanceLabel(g))} · ${esc(fieldPositionLabel(g))}</div><div class="ms-slate-field-legend"><span><i class="los"></i>Line of scrimmage</span><span><i class="fd"></i>First down</span></div></div>
      <div class="ms-slate-side"><div class="ms-slate-side-head">Defensive Look · ${esc(defAbbr)}</div><div class="ms-slate-defense"><div><span>MAN</span><b>${num(defAbbr+'man',31,48)}%</b></div><div><span>BLITZ</span><b>${num(defAbbr+'blitz',18,34)}%</b></div><div><span>RZ TD ALLOW</span><b>${p.oppRzAllowed!=null?(p.oppRzAllowed*100).toFixed(1):num(defAbbr+'rz',18,29)}%</b></div><div><span>TSO EDGE</span><b>${edge}</b></div></div><div class="ms-slate-defense-note">Coverage, pressure and red-zone context update the football matchup read.</div></div>
    </div>
    <div class="ms-slate-lower"><div><span>Last Play</span><b>${esc(last)}</b><small>${live?'Live feed · refreshes automatically':'Full play-by-play appears once the game starts'}</small></div><div><span>Scoring Chance</span><b>${scoring}%</b><small>${live?'Current drive':'Pregame scoring environment'}</small></div><div><span>Possession</span><b>${esc(poss||'—')}</b><small>${esc(fieldPositionLabel(g))}</small></div><div><span>TSO Game Edge</span><b>${edge}</b><small>${live?'Live context':'Pregame matchup'}</small></div></div>
    <div class="ms-slate-footer"><span>${esc(g.venue)}${g.city?` · ${esc(g.city)}`:''} · ${homeWp}% home win prob</span><button type="button" class="ms-slate-open" data-nfl-game="${esc(g.id)}">${live?'Watch Live Gamecast':'Open Gamecast'}</button></div>
  </article>`;
}

function gameCard(g){ return slateGamecastCard(g); }
function slateHTML(){
  return `<div class="ms-game-grid has-full-gamecasts">${data().games.map(g=>gamecastDashboardHTML(g,featuredPlayerForGame(g),{embedded:true,tab:'game'})).join('')}</div>`;
}


function gameRadarHTML(){
  const games=data().games.slice(0,12);
  const pts=games.map((g,i)=>{
    const a=(i/games.length)*Math.PI*2-.5, r=18+(hash(g.id)%28); const x=50+Math.cos(a)*r,y=50+Math.sin(a)*r;
    return `<button class="ms-radar-dot" data-nfl-game="${esc(g.id)}" style="left:${x}%;top:${y}%;--i:${i}"><b>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</b><span>${esc(g.detail)}</span></button>`;
  }).join('');
  return `<section class="ms-radar-wrap"><div class="ms-radar"><i></i><i></i><i></i><div class="ms-radar-cross x"></div><div class="ms-radar-cross y"></div><div class="ms-radar-core">TSO<br><small>NFL</small></div>${pts}</div><div class="ms-radar-side"><h3>Closest games</h3>${games.slice(0,6).map((g,i)=>`<button data-nfl-game="${esc(g.id)}"><b>${i+1}</b><span>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</span><em>${num(g.id+'close',52,78)} GAME EDGE</em></button>`).join('')}</div></section>`;
}

function feedHTML(){
  const top=data().players.slice(0,6);
  const feed=top.map((p,i)=>({time:['Q4 08:12','Q3 02:44','Q3 10:31','Q2 11:03','Q2 04:58','Q1 07:40'][i],team:p.team,player:p.name,detail:i%2?'7-yard rushing TD':'18-yard receiving TD',meta:i%3===0?'Red zone · 3rd & Goal':'Scoring drive · play action'}));
  return `<div class="ms-feed">${feed.map((e,i)=>`<article><div class="ms-feed-time">${esc(e.time)}</div><span class="ms-team-token">${esc(e.team)}</span><div class="ms-feed-copy"><b>${esc(e.player)}</b><span>${esc(e.detail)}</span><small>${esc(e.meta)}</small></div><div class="ms-feed-num">TD<strong>${i+1}</strong></div></article>`).join('')}</div><div class="ms-preview-foot"><b>Preview feed.</b> Layout is ready for live scoring events; these scoring rows are illustrative until the live NFL event feed is connected.</div>`;
}

function propToolbar(){
  const all=state.prop==='allPlayers';
  return `<div class="ms-propbar"><label>Prop Market<select id="nflPropSelect">${Object.entries(PROPS).map(([id,l])=>`<option value="${id}" ${state.prop===id?'selected':''}>${esc(l)}</option>`).join('')}</select></label><div class="ms-prop-actions">${all?'':`<div class="ms-view-toggle"><button class="${state.propView==='board'?'active':''}" data-nfl-prop-view="board">Board</button><button class="${state.propView==='radar'?'active':''}" data-nfl-prop-view="radar">Radar</button></div>`}<div class="ms-prop-note">Props opens to <b>Anytime TD</b> · includes <b>First TD probability</b> · TSO Edge + football matchup data</div></div></div>`;
}

function playerCard(p,prop,rank){
  const v=propValue(p,prop), grade=gradeFor(v.prob);
  return `<button class="ms-player-card" data-nfl-player="${esc(p.id)}"><div class="ms-rank">${rank}</div><div class="ms-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div class="ms-player-main"><div class="ms-player-name"><b>${esc(p.name)}</b></div><span>${esc(p.team)} · ${esc(p.pos)} · vs ${esc(p.opp)}</span>${nflBadges(p)}<div class="ms-mini-bars"><i style="--v:${clamp(p.edge,0,100)}%"></i><small>TSO Edge ${p.edge}</small></div></div><div class="ms-player-metrics"><span>SNAP <b>${p.usage}%</b></span><span>RZ <b>${p.rz}</b></span></div><div class="ms-score"><span class="ms-grade">${grade}</span><strong>${v.main}</strong><small>${esc(v.sub)}</small></div></button>`;
}

function propRadar(players){
  const shown=players.slice(0,16);
  const nodes=shown.map((x,i)=>{
    const rank=i+1, ring=rank<=4?0:rank<=9?1:2, radius=[17,30,42][ring], a=(i/(shown.length))*Math.PI*2-.8;
    const xPos=50+Math.cos(a)*radius, yPos=50+Math.sin(a)*radius;
    return `<button class="ms-prop-radar-player" data-nfl-player="${esc(x.p.id)}" style="left:${xPos}%;top:${yPos}%"><b>#${rank} ${esc(x.p.name)}</b><span>${esc(x.v.main)}</span></button>`;
  }).join('');
  return `<div class="ms-prop-radar"><div class="ms-prop-radar-ring r1"></div><div class="ms-prop-radar-ring r2"></div><div class="ms-prop-radar-ring r3"></div><div class="ms-prop-radar-core">TSO<br><small>${esc(PROPS[state.prop])}</small></div>${nodes}</div>`;
}

function propsHTML(){
  if(state.prop==='allPlayers') return propToolbar()+allPlayersHTML();
  const scored=data().players.map(p=>({p,v:propValue(p,state.prop)})).filter(x=>x.v.main!=='—').sort((a,b)=>b.v.prob-a.v.prob);
  const body=state.propView==='radar'?propRadar(scored):`<div class="ms-list-head"><span>Top 20</span><small>Tap a player for NFL Player Modal</small></div><div class="ms-player-list">${scored.slice(0,20).map((x,i)=>playerCard(x.p,state.prop,i+1)).join('')}</div>`;
  return propToolbar()+body;
}

function allPlayersHTML(){
  let players=[...data().players];
  if(state.allSort==='primary') players.sort((a,b)=>b.prob-a.prob);
  else if(state.allSort==='firstTd') players.sort((a,b)=>(firstTdProbability(b)||0)-(firstTdProbability(a)||0));
  else if(state.allSort==='usage') players.sort((a,b)=>b.usage-a.usage);
  else if(state.allSort==='rz') players.sort((a,b)=>b.rz-a.rz);
  else players.sort((a,b)=>b.edge-a.edge);
  const cardProp=state.allSort==='firstTd'?'firstTd':'atd';
  return `<div class="ms-all-toolbar"><div class="ms-all-left"><label>Sort<select id="nflAllSort"><option value="edge" ${state.allSort==='edge'?'selected':''}>TSO Edge · high to low</option><option value="primary" ${state.allSort==='primary'?'selected':''}>Anytime TD probability</option><option value="firstTd" ${state.allSort==='firstTd'?'selected':''}>First TD probability</option><option value="usage" ${state.allSort==='usage'?'selected':''}>Snap share</option><option value="rz" ${state.allSort==='rz'?'selected':''}>Red-zone opportunities</option></select></label><label>Search<input id="nflSearch" placeholder="Player or team"></label></div><div class="ms-prop-note"><b>${players.length}</b> modeled skill players</div></div><div class="ms-player-list" id="nflAllList">${players.map((p,i)=>playerCard(p,cardProp,i+1)).join('')}</div>`;
}


function featuredPlayerForGame(g){
  const list=data().players.filter(p=>String(p.gameId)===String(g.id));
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:(g.away.abbr);
  return list.find(p=>p.team===offense) || list[0] || data().players[0] || FALLBACK_PLAYERS[0];
}

const TEAM_GUIDE = {
  ARI:{qb:'Kyler Murray',qbNo:'1',def:'Budda Baker',defPos:'S',defNo:'3'}, ATL:{qb:'Michael Penix Jr.',qbNo:'9',def:'Jessie Bates III',defPos:'S',defNo:'3'},
  BAL:{qb:'Lamar Jackson',qbNo:'8',def:'Kyle Hamilton',defPos:'S',defNo:'14'}, BUF:{qb:'Josh Allen',qbNo:'17',def:'Terrel Bernard',defPos:'LB',defNo:'43'},
  CAR:{qb:'Bryce Young',qbNo:'9',def:'Derrick Brown',defPos:'DT',defNo:'95'}, CHI:{qb:'Caleb Williams',qbNo:'18',def:'Montez Sweat',defPos:'EDGE',defNo:'98'},
  CIN:{qb:'Joe Burrow',qbNo:'9',def:'Trey Hendrickson',defPos:'EDGE',defNo:'91'}, CLE:{qb:'Deshaun Watson',qbNo:'4',def:'Myles Garrett',defPos:'EDGE',defNo:'95'},
  DAL:{qb:'Dak Prescott',qbNo:'4',def:'Micah Parsons',defPos:'LB',defNo:'11'}, DEN:{qb:'Bo Nix',qbNo:'10',def:'Pat Surtain II',defPos:'CB',defNo:'2'},
  DET:{qb:'Jared Goff',qbNo:'16',def:'Aidan Hutchinson',defPos:'EDGE',defNo:'97'}, GB:{qb:'Jordan Love',qbNo:'10',def:'Xavier McKinney',defPos:'S',defNo:'29'},
  HOU:{qb:'C.J. Stroud',qbNo:'7',def:'Will Anderson Jr.',defPos:'EDGE',defNo:'51'}, IND:{qb:'Anthony Richardson',qbNo:'5',def:'DeForest Buckner',defPos:'DT',defNo:'99'},
  JAX:{qb:'Trevor Lawrence',qbNo:'16',def:'Josh Hines-Allen',defPos:'EDGE',defNo:'41'}, KC:{qb:'Patrick Mahomes',qbNo:'15',def:'Chris Jones',defPos:'DT',defNo:'95'},
  LA:{qb:'Matthew Stafford',qbNo:'9',def:'Jared Verse',defPos:'EDGE',defNo:'8'}, LAC:{qb:'Justin Herbert',qbNo:'10',def:'Derwin James Jr.',defPos:'S',defNo:'3'},
  LV:{qb:'Gardner Minshew',qbNo:'15',def:'Maxx Crosby',defPos:'EDGE',defNo:'98'}, MIA:{qb:'Tua Tagovailoa',qbNo:'1',def:'Jalen Ramsey',defPos:'CB',defNo:'5'},
  MIN:{qb:'J.J. McCarthy',qbNo:'9',def:'Jonathan Greenard',defPos:'EDGE',defNo:'58'}, NE:{qb:'Drake Maye',qbNo:'10',def:'Kyle Dugger',defPos:'S',defNo:'23'},
  NO:{qb:'Derek Carr',qbNo:'4',def:'Demario Davis',defPos:'LB',defNo:'56'}, NYG:{qb:'Daniel Jones',qbNo:'8',def:'Dexter Lawrence',defPos:'DT',defNo:'97'},
  NYJ:{qb:'Aaron Rodgers',qbNo:'8',def:'Sauce Gardner',defPos:'CB',defNo:'1'}, PHI:{qb:'Jalen Hurts',qbNo:'1',def:'Jalen Carter',defPos:'DT',defNo:'98'},
  PIT:{qb:'Russell Wilson',qbNo:'3',def:'T.J. Watt',defPos:'EDGE',defNo:'90'}, SEA:{qb:'Geno Smith',qbNo:'7',def:'Devon Witherspoon',defPos:'CB',defNo:'21'},
  SF:{qb:'Brock Purdy',qbNo:'13',def:'Fred Warner',defPos:'LB',defNo:'54'}, TB:{qb:'Baker Mayfield',qbNo:'6',def:'Antoine Winfield Jr.',defPos:'S',defNo:'31'},
  TEN:{qb:'Will Levis',qbNo:'8',def:'Jeffery Simmons',defPos:'DT',defNo:'98'}, WAS:{qb:'Jayden Daniels',qbNo:'5',def:'Bobby Wagner',defPos:'LB',defNo:'54'}
};

function teamGuide(abbr){ return TEAM_GUIDE[abbr] || {qb:`${abbr} QB`,qbNo:'—',def:`${abbr} DEF`,defPos:'DEF',defNo:'—'}; }
function weatherForGame(g){
  const temp=num(g.id+'temp',61,78), code=num(g.id+'wx',0,3);
  const cond=['Clear Skies','Partly Cloudy','Breezy','Light Clouds'][code]||'Clear Skies';
  const ico=cond==='Breezy'?'💨':cond.includes('Cloud')?'⛅':'☀️';
  return {temp,cond,ico};
}
function driveSummary(g){
  return {plays:num(g.id+'plays',4,8), yards:num(g.id+'yards',34,76), time:`${num(g.id+'dm',1,3)}:${String(num(g.id+'ds',5,58)).padStart(2,'0')}`};
}
function scoringChance(g){
  const live=g.liveScore||{}; const dist=Number(live.distance); const y=Number(live.yardFromOwn);
  let base=48;
  if(Number.isFinite(y)) base += (y-50)*0.52;
  if(Number.isFinite(dist)) base += (10-Math.min(dist,18))*1.4;
  if(live.isRedZone) base += 14;
  const pct=clamp(Math.round(base),18,84);
  const label=pct>=68?'Good Chance':pct>=52?'Fair Chance':'Long Shot';
  return {pct,label};
}
function playersForGame(g){
  return data().players.filter(p=>String(p.gameId)===String(g.id));
}
function keyTargetsForGame(g){
  const list=playersForGame(g);
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home.abbr:poss==='away'?g.away.abbr:g.away.abbr;
  const filtered=list.filter(p=>p.team===offense);
  return (filtered.length?filtered:list).slice(0,3);
}
function playerLine(p,i=0){
  if(!p) return {a:'REC',b:'YDS',c:'TD',v1:6+i,v2:num((p?.name||'p')+'yd',42,112),v3:num((p?.name||'p')+'td',0,2)};
  if(['RB','HB'].includes(p.pos)) return {a:'CAR',b:'YDS',c:'TD',v1:num(p.name+'car',9,18),v2:num(p.name+'ry',44,108),v3:num(p.name+'rtd',0,2)};
  if(['QB'].includes(p.pos)) return {a:'COMP',b:'YDS',c:'TD',v1:`${num(p.name+'cmp',12,24)}/${num(p.name+'att',18,34)}`,v2:num(p.name+'py',148,322),v3:num(p.name+'ptd',0,3)};
  return {a:'REC',b:'YDS',c:'TD',v1:num(p.name+'rec',4,9),v2:num(p.name+'yd',38,119),v3:num(p.name+'td',0,2)};
}
function offenseContext(g){
  const poss=possessionAbbr(g);
  const offense=poss==='home'?g.home:g.away;
  const defense=poss==='home'?g.away:g.home;
  return { offense, defense, offenseGuide:teamGuide(offense.abbr), defenseGuide:teamGuide(defense.abbr), poss };
}
function playLogForGame(g){
  const {offense}=offenseContext(g); const p=featuredPlayerForGame(g); const targets=keyTargetsForGame(g); const ds=driveSummary(g);
  const last=lastPlayLabel(g); const fp=fieldPositionLabel(g); const dd=downDistanceLabel(g);
  const t1=targets[0]?.name||p.name, t2=targets[1]?.name||p.name, t3=targets[2]?.name||p.name;
  return [
    {state:'1st & 10', text:`${num(g.id+'p1',7,14)} yd pass to ${t1}`, sub:`at ${fp}`},
    {state:'1st & 10', text:`${num(g.id+'p2',4,9)} yd run by ${t2.split(' ')[0]}`, sub:`Tempo pushing current drive`},
    {state:'2nd & 2', text:`${num(g.id+'p3',11,22)} yd pass to ${t3}`, sub:`Move the chains`},
    {state:'1st & 10', text:`${num(g.id+'p4',3,8)} yd rush by ${t2.split(' ')[0]}`, sub:`${ds.plays} plays · ${ds.yards} yards`},
    {state:dd, text:last, sub:'Current play', current:true},
  ];
}
function splitScore(total, played, seed){
  if(!played) return [null,null,null,null];
  const weights=Array.from({length:played},(_,i)=>1+((hash(seed+i)%90)/100));
  const sum=weights.reduce((a,b)=>a+b,0);
  const vals=weights.map(w=>Math.floor(total*w/sum));
  vals[played-1]+= total - vals.reduce((a,b)=>a+b,0);
  return [0,1,2,3].map(i=>i<played?vals[i]:null);
}
function boxScoreData(g){
  const st=liveState(g); const played=g.status==='post'?4:Math.max(1,Math.min(4,st.period||1));
  return {
    away:splitScore(scoreNum(g.away), played, g.id+'aq'),
    home:splitScore(scoreNum(g.home), played, g.id+'hq'),
    played
  };
}
function teamStatsData(g){
  const aY=num(g.id+'ay',218,386), hY=num(g.id+'hy',192,368);
  const aPass=Math.min(aY-40,num(g.id+'ap',118,268)), hPass=Math.min(hY-40,num(g.id+'hp',112,254));
  const aRush=Math.max(28,aY-aPass), hRush=Math.max(28,hY-hPass);
  const aTo=num(g.id+'ato',0,2), hTo=num(g.id+'hto',0,2);
  const aTop=`${num(g.id+'atm',12,19)}:${String(num(g.id+'ats',0,59)).padStart(2,'0')}`;
  const hTop=`${num(g.id+'htm',10,18)}:${String(num(g.id+'hts',0,59)).padStart(2,'0')}`;
  return {aY,hY,aPass,hPass,aRush,hRush,aTo,hTo,aTop,hTop};
}
function ballLeftPct(g){ return ballFieldPct(g); }
function firstLeftPct(g){ return firstDownPct(g, ballLeftPct(g)); }
function routeTargetPct(g){ const ball=ballLeftPct(g), first=firstLeftPct(g); return clamp(first + (first>ball?10:-10), 12, 88); }
function fieldOverlayHTML(g,p){
  const ball=ballLeftPct(g), first=firstLeftPct(g), target=routeTargetPct(g); const dir=target>ball?1:-1;
  const chipTop=39, chipLeft=target;
  const offDots=[[-6,70],[-2,62],[2,68],[6,60],[10,70],[-10,77],[0,79],[8,81],[-14,84],[14,84]];
  const defDots=[[-7,58],[-1,54],[5,58],[11,54],[-13,60],[15,61],[-4,67],[4,67],[12,69],[-12,69],[-20,72]];
  const dotHTML=(arr,cls)=>arr.map(([dx,top],i)=>`<span class="nxg-dot ${cls} ${i===1&&cls==='off'?'qb':''}" style="left:${clamp(ball+dx,18,82)}%;top:${top}%"></span>`).join('');
  const startX=ball, endX=target, midX=ball + dir*11;
  const startY=71, endY=34, midY=44;
  const path=`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  const label=p?.headshot?`<i><img src="${esc(p.headshot)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></i>`:`<i>#${esc(String(p?.team||'14').slice(0,2))}</i>`;
  const yardNums=[20,30,40,50,60,70,80].map(v=>{const x=v; const n=v<50?v:v===50?50:100-v; return `<span class="nxg-yardnum" style="left:${x}%">${n}</span><span class="nxg-yardnum top" style="left:${x}%">${n}</span>`;}).join('');
  return `<div class="nxg-fieldshell"><div class="nxg-stadiumband"></div><div class="nxg-brandmark">TSD</div><div class="nxg-nfllive"><span style="font-size:18px;line-height:1">🏈</span><span>NFL LIVE</span></div><div class="nxg-fieldtag">${esc(downDistanceLabel(g))}</div><div class="nxg-field"><div class="nxg-endzone left"><span>${esc(g.away.name)}</span></div><div class="nxg-endzone right"><span>${esc(g.home.name)}</span></div>${yardNums}<span class="nxg-losline" style="left:${ball}%"></span><span class="nxg-firstline" style="left:${first}%"></span><span class="nxg-markerball" style="left:${ball}% ; top:69%"></span>${dotHTML(defDots,'def')}${dotHTML(offDots,'off')}<svg class="nxg-route" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}"/><path class="alt" d="M ${ball} ${71} Q ${ball+dir*6} ${54} ${ball+dir*13} ${43}"/></svg><div class="nxg-targetchip" style="left:${chipLeft}%;top:${chipTop}%">${label}<span>${esc(p?.team||g.away.abbr)} #${esc(p?.id?String(p.id).slice(-2):'14')}</span></div></div><div class="nxg-fieldlegend"><span><i class="off"></i>Offense (${esc(offenseContext(g).offense.abbr)})</span><span><i class="def"></i>Defense (${esc(offenseContext(g).defense.abbr)})</span><span><i class="los"></i>Line of Scrimmage</span><span><i class="fd"></i>First Down</span><span><i class="path"></i>Play Path</span></div></div>`;
}
function offenseSideHTML(g){
  const {offense, offenseGuide}=offenseContext(g); const ds=driveSummary(g); const log=playLogForGame(g);
  const guide=offenseGuide; const cmp=num(g.id+'cmp',12,24), att=Math.max(cmp+1,num(g.id+'att',18,31));
  const passY=num(g.id+'py',142,286), td=num(g.id+'ptd',0,3), inter=num(g.id+'int',0,2);
  return `<aside class="nxg-card"><div class="nxg-card-head"><span>${teamLogo(offense,'')} Offense – ${esc(offense.abbr)}</span></div><div class="nxg-side-body"><div class="nxg-profile"><div class="nxg-avatar"><span>${esc(initials(guide.qb))}</span></div><div><b>${esc(guide.qb)}</b><span>QB #${esc(guide.qbNo)}</span></div></div><div class="nxg-mini4"><div><b>${cmp}/${att}</b><span>Comp/Att</span></div><div><b>${passY}</b><span>Pass Yds</span></div><div><b>${td}</b><span>TD</span></div><div><b>${inter}</b><span>INT</span></div></div><div class="nxg-drivebox"><div class="nxg-subtle-head">Current Drive</div><div class="nxg-drive-meta">${ds.plays} plays &nbsp; ${ds.yards} yards &nbsp; ${ds.time}</div><div class="nxg-playlist">${log.map(r=>`<div class="nxg-playrow ${r.current?'current':''}"><i></i><span><small>${esc(r.state)} ${r.sub?`· ${esc(r.sub)}`:''}</small>${esc(r.text)}</span></div>`).join('')}</div></div></div></aside>`;
}
function defenseSideHTML(g){
  const {defense, defenseGuide}=offenseContext(g); const look=['Nickel 3–3–5','Base 4–3','Big Nickel','Dime 4–1–6'][hash(g.id+'look')%4];
  return `<aside class="nxg-card"><div class="nxg-card-head"><span>${teamLogo(defense,'')} Defense – ${esc(defense.abbr)}</span><img src="${defense.logo||''}" alt=""></div><div class="nxg-side-body"><div class="nxg-profile"><div class="nxg-avatar"><span>${esc(initials(defenseGuide.def))}</span></div><div><b>${esc(defenseGuide.def)}</b><span>${esc(defenseGuide.defPos)} #${esc(defenseGuide.defNo)}</span></div></div><div class="nxg-mini4"><div><b>${num(g.id+'tkl',2,7)}</b><span>TKL</span></div><div><b>${num(g.id+'tfl',0,2)}</b><span>TFL</span></div><div><b>${num(g.id+'sk',0,2)}</b><span>SACK</span></div><div><b>${num(g.id+'hit',1,5)}</b><span>QB Hits</span></div></div></div><div class="nxg-deflookcopy"><div class="nxg-subtle-head">Defensive Look</div><b>${look}</b><div>${num(defense.abbr+'man',31,48)}% man &nbsp;•&nbsp; ${num(defense.abbr+'blitz',18,34)}% blitz &nbsp;•&nbsp; ${num(defense.abbr+'rz',18,32)}% red-zone TD allowed</div></div><div class="nxg-defense-grid"><span class="l1">S</span><span class="l2">S</span><span class="m1">CB</span><span class="m2">LB</span><span class="m3">LB</span><span class="m4">LB</span><span class="m5">CB</span><span class="b1">DE</span><span class="b2">DT</span><span class="b3">DT</span><span class="b4">DE</span></div></aside>`;
}
function lastPlayPanelHTML(g){
  return `<section class="nxg-card"><div class="nxg-card-head"><span>⟳ Last Play</span></div><div class="nxg-card-pad"><div class="nxg-lastmeta">${teamLogo(offenseContext(g).offense,'')}<span>${esc(downDistanceLabel(g))} at ${esc(fieldPositionLabel(g))}</span><small style="margin-left:auto">${num(g.id+'ago',8,24)} sec ago</small></div><div class="nxg-bodytext">${esc(lastPlayLabel(g))}</div></div></section>`;
}
function scoringChancePanelHTML(g){
  const sc=scoringChance(g);
  return `<section class="nxg-card"><div class="nxg-card-head"><span>◔ Scoring Chance</span></div><div class="nxg-card-pad"><div class="nxg-gaugewrap"><div class="nxg-gauge" style="--p:${sc.pct}"><b>${sc.pct}%</b></div><div class="nxg-chancecopy"><strong>${esc(sc.label)}</strong><span>Based on field position, down and distance, possession, and live game state.</span></div></div></div></section>`;
}
function playerWatchPanelHTML(g,p){
  const line=playerLine(p); const head=p?.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p?.name||'TSO'))}</span>`;
  return `<section class="nxg-card"><div class="nxg-card-head"><span>✦ Player to Watch</span></div><div class="nxg-card-pad"><div class="nxg-watch"><div class="nxg-avatar">${head}</div><div><b>${esc(p?.name||'Featured Player')}</b><small>${esc(p?.pos||'WR')} #${esc(String((p?.id||'14')).slice(-2))}</small></div><div class="nxg-watchstats"><div><b>${line.v1}</b><span>${line.a}</span></div><div><b>${line.v2}</b><span>${line.b}</span></div><div><b>${line.v3}</b><span>${line.c}</span></div></div></div><div class="nxg-watch-note">Big-play threat · ${num((p?.name||g.id)+'yac',11,19)}.${num((p?.name||g.id)+'ypc',0,9)} YPC tonight · ${Math.round((p?.prob||0)*100)}% ATD · ${Math.round((firstTdProbability(p)||0)*100)}% First TD.</div></div></section>`;
}
function driveMetricsPanelHTML(g){
  const ds=driveSummary(g); const yfo=Number(g?.liveScore?.yardFromOwn); const start=fieldPositionLabel(g); const left=Number.isFinite(yfo)?Math.max(0,100-Math.round(yfo)):num(g.id+'left',18,73);
  return `<section class="nxg-card"><div class="nxg-card-head"><span>▣ Drive Metrics</span></div><div class="nxg-card-pad"><div class="nxg-drive-metrics"><div class="nxg-metric3"><div><b>${ds.yards}</b><span>Yards</span></div><div><b>${ds.time}</b><span>Time</span></div><div><b>${ds.plays}</b><span>Plays</span></div></div><div class="nxg-drivebar"><i style="width:${clamp(100-left,12,94)}%"></i></div><div class="nxg-drivebarcopy"><span>${esc(start)}</span><span>${left} yds to go</span><span>${esc(offenseContext(g).defense.abbr)} 0</span></div></div></div></section>`;
}
function bottomPanelsHTML(g){
  const box=boxScoreData(g), stats=teamStatsData(g), keys=keyTargetsForGame(g), awayRows=box.away.map(v=>v==null?'–':v), homeRows=box.home.map(v=>v==null?'–':v);
  return `<div class="nxg-bottom"><section class="nxg-card"><div class="nxg-card-head"><span>☷ Box Score</span></div><div class="nxg-card-pad"><table class="nxg-table"><thead><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>T</th></tr></thead><tbody><tr><td><div class="nxg-rowteam">${teamLogo(g.away)}<span>${esc(g.away.name)}</span></div></td>${awayRows.map(v=>`<td>${v}</td>`).join('')}<td><strong>${scoreNum(g.away)}</strong></td></tr><tr><td><div class="nxg-rowteam">${teamLogo(g.home)}<span>${esc(g.home.name)}</span></div></td>${homeRows.map(v=>`<td>${v}</td>`).join('')}<td><strong>${scoreNum(g.home)}</strong></td></tr></tbody></table></div></section><section class="nxg-card"><div class="nxg-card-head"><span>≣ Team Stats</span></div><div class="nxg-card-pad"><div class="nxg-teamstats"><img class="logo" src="${esc(g.away.logo||'')}" alt=""><div class="nxg-teamstats-grid"><b>${stats.aY}</b><span>Total Yards</span><em>${stats.hY}</em><b>${stats.aPass}</b><span>Passing Yards</span><em>${stats.hPass}</em><b>${stats.aRush}</b><span>Rushing Yards</span><em>${stats.hRush}</em><b>${stats.aTo}</b><span>Turnovers</span><em>${stats.hTo}</em><b>${stats.aTop}</b><span>Time of Possession</span><em>${stats.hTop}</em></div><img class="logo" src="${esc(g.home.logo||'')}" alt=""></div></div></section><section class="nxg-card"><div class="nxg-card-head"><span>➤ Due Up – Key Targets</span><small style="color:#fff">${esc(offenseContext(g).offense.abbr)}</small></div><div class="nxg-card-pad"><div class="nxg-targets">${keys.map((p,i)=>{const line=playerLine(p,i); return `<div class="nxg-targetrow"><strong>${i+1}</strong><div class="nxg-avatar">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><b>${esc(p.name)}</b><small>${esc(p.pos)} #${esc(String(p.id||'14').slice(-2))}</small></div><span>${line.v1} ${line.a}</span><span>${line.v2} ${line.b}</span><span>${line.v3} ${line.c}</span></div>`;}).join('')}</div></div></section></div>`;
}
function playByPlayHTML(g){
  const log=playLogForGame(g); const offense=offenseContext(g).offense;
  const stamps=['Q3 12:14','Q3 10:58','Q3 09:41','Q3 08:57',`${liveState(g).q||'Q1'} ${liveState(g).clock||'15:00'}`];
  return `<div class="nxg-pbp-list">${log.map((r,i)=>`<article class="nxg-pbp-item"><b>${stamps[i]||'Q1 15:00'}</b><div><span>${esc(r.text)}</span><small>${esc(r.state)} · ${esc(offense.abbr)} offense</small></div><div class="nxg-pbp-tag">${r.current?'Current Play':'Drive'}</div></article>`).join('')}</div>`;
}

function gamecastDashboardHTML(g,p,{embedded=false,tab=null}={}){
  const wx=weatherForGame(g), st=liveState(g), ctx=offenseContext(g);
  const activeTab=tab || state.gamecastTab || 'game';
  const live=g.status==='in';
  const dateLabel=g.startTimeUTC?new Date(g.startTimeUTC).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric', year:'numeric'}):`Week ${data().week}`;
  const topLabel=live?(st.q||'LIVE'):g.status==='post'?'FINAL':'PREGAME';
  const displayClock=live?(st.clock||''):g.status==='post'?'':(g.time||'TBD');
  const statusText=live?'Live':g.status==='post'?'Final':'Game Preview';
  const scoreDots='<i></i><i></i><i></i>';
  const gameView = `<div><div class="nxg-main">${offenseSideHTML(g)}<section class="nxg-card nxg-fieldcard">${fieldOverlayHTML(g,p)}</section>${defenseSideHTML(g)}</div><div class="nxg-lower">${lastPlayPanelHTML(g)}${scoringChancePanelHTML(g)}${playerWatchPanelHTML(g,p)}${driveMetricsPanelHTML(g)}</div>${bottomPanelsHTML(g)}<div class="nxg-footerline"><span>NFL Gamecast</span><span>${live?'Live Data':'Game Preview'}</span><span>The Sports Outpost</span></div></div>`;
  const boxView = `<div><div class="nxg-lower">${scoringChancePanelHTML(g)}${driveMetricsPanelHTML(g)}${playerWatchPanelHTML(g,p)}${lastPlayPanelHTML(g)}</div>${bottomPanelsHTML(g)}<div class="nxg-footerline"><span>NFL Gamecast</span><span>Stat Summary</span><span>The Sports Outpost</span></div></div>`;
  const pbpView = `<div class="nxg-card" style="padding:14px">${playByPlayHTML(g)}</div><div class="nxg-footerline"><span>NFL Gamecast</span><span>Play by Play</span><span>The Sports Outpost</span></div>`;
  const tabButton=(id,label)=> embedded
    ? `<button type="button" class="nxg-tab ${activeTab===id?'active':''}" data-nfl-open-game="${esc(g.id)}" data-nfl-open-tab="${id}">${label}</button>`
    : `<button type="button" class="nxg-tab ${activeTab===id?'active':''}" data-nfl-gamecast-tab="${id}">${label}</button>`;
  const backTool=embedded
    ? `<button type="button" class="nxg-ghostbtn nxg-openfull" data-nfl-open-game="${esc(g.id)}" data-nfl-open-tab="game">Open Full Gamecast ›</button>`
    : `<button type="button" class="nxg-ghostbtn" data-nfl-close-game>← Back to Slate</button>`;
  const liveTool=live
    ? `<span class="nxg-livepill"><span class="dot"></span>Live <span class="nxg-livebars"><i></i><i></i><i></i></span></span>`
    : `<span class="nxg-livepill nxg-previewpill"><span class="dot"></span>${statusText}</span>`;
  const body=activeTab==='box'?boxView:activeTab==='pbp'?pbpView:gameView;
  return `<article class="nxg-wrap ${embedded?'nxg-embedded':''}" data-nfl-inline-game="${esc(g.id)}"><div class="nxg-crumb"><span>🏈 NFL › ${live?'Live Gamecast':'Gamecast Preview'}</span><span class="nxg-crumb-right">Week ${data().week} &nbsp;•&nbsp; ${esc(dateLabel)} &nbsp;•&nbsp; ${esc(g.broadcast||'NFL')}</span></div><div class="nxg-topbar"><div class="nxg-tabs">${tabButton('game','Game View')}${tabButton('box','Box Score')}${tabButton('pbp','Play by Play')}</div><div class="nxg-tools">${liveTool}<span class="nxg-feedpill">Gamecast Feed ▾</span><button type="button" class="nxg-dotbtn" title="Share">⤴</button><button type="button" class="nxg-dotbtn" title="More">•••</button>${backTool}</div></div><section class="nxg-scorebar"><div class="nxg-teamblock">${teamLogo(g.away,'nxg-teamlogo')}<div class="nxg-teamcopy"><small>${esc(g.away.abbr)}</small><b>${esc(g.away.name)}</b><span>${esc(record(g.away))}</span></div><div><div class="nxg-score">${scoreNum(g.away)}</div><div class="nxg-score-dots">${scoreDots}</div></div></div><div class="nxg-centerblock"><div class="nxg-clockline"><div class="nxg-period">${esc(topLabel)}</div><div class="nxg-clock">${esc(displayClock)}</div></div><div class="nxg-downchip"><span>${esc(downDistanceLabel(g))}</span><i></i><span>${esc(fieldPositionLabel(g))}</span><span class="arr">▲</span></div><div class="nxg-posstext">${ctx.poss?`${esc(ctx.offense.abbr)} has the ball`:(g.status==='post'?'Game complete':'Kickoff preview')}</div></div><div class="nxg-teamblock home"><div><div class="nxg-score">${scoreNum(g.home)}</div><div class="nxg-score-dots">${scoreDots}</div></div><div class="nxg-teamcopy"><small>${esc(g.home.abbr)}</small><b>${esc(g.home.name)}</b><span>${esc(record(g.home))}</span></div>${teamLogo(g.home,'nxg-teamlogo')}</div><div class="nxg-weather"><div class="nxg-weather-top"><span class="nxg-weather-ico">${wx.ico}</span><strong>${wx.temp}°</strong></div><small>${esc(wx.cond)}</small><span>${esc(g.venue)}</span><span>${esc(g.city||'')}</span></div></section>${body}</article>`;
}
function gamecastHTML(g){
  if(!g) return '';
  const p=featuredPlayerForGame(g);
  return gamecastDashboardHTML(g,p);
}

function recentBars(p){
  const vals=[0,1,2,3,4].map(i=>num(p.name+'g'+i,38,126)); const max=Math.max(...vals,1);
  return `<div class="ms-recent-chart">${vals.map((v,i)=>`<div><span style="height:${Math.round(v/max*100)}%"></span><b>${v}</b><small>G${5-i}</small></div>`).join('')}</div>`;
}

function matchupPanel(p){
  const opp=p.opp||'Opponent';
  const vals=[['Man coverage',num(p.name+'man',48,84)],['Zone coverage',num(p.name+'zone',46,82)],['Red-zone usage',num(p.name+'rzm',54,89)],['Explosive fit',num(p.name+'xp',46,86)]];
  return `<div class="ms-matchup-head"><div><span>PLAYER</span><b>${esc(p.name)}</b><small>${esc(p.pos)} · ${esc(p.team)}</small></div><section><span>TSO EDGE</span><strong>${p.edge}</strong>${signalBadge(p.edge)}</section><div class="right"><span>DEFENSE</span><b>${esc(opp)}</b><small>${p.oppRzAllowed!=null?(p.oppRzAllowed*100).toFixed(1):num(opp+'rz',18,29)}% RZ TD allowed</small></div></div><div class="ms-edge-bars">${vals.map(([l,v])=>`<div><span>${l}</span><i><em style="width:${v}%"></em></i><b>${v}</b></div>`).join('')}</div>`;
}

function routeData(p){
  return [
    {type:'REC',path:'M18 168 Q105 80 190 54',x:190,y:54,yds:num(p.name+'a',12,28),label:'Deep out'},
    {type:'REC',path:'M18 168 Q95 142 170 120',x:170,y:120,yds:num(p.name+'b',7,18),label:'Cross'},
    {type:'RZ',path:'M18 168 Q118 105 218 82',x:218,y:82,yds:num(p.name+'c',5,14),label:'RZ seam'},
    {type:'EXP',path:'M18 168 Q135 72 267 40',x:267,y:40,yds:num(p.name+'d',24,46),label:'Explosive'},
    {type:'RUSH',path:'M18 168 Q90 166 165 150',x:165,y:150,yds:num(p.name+'e',4,13),label:'Inside zone'},
    {type:'RUSH',path:'M18 168 Q98 174 208 162',x:208,y:162,yds:num(p.name+'f',6,18),label:'Outside zone'},
  ];
}

function routeMapHTML(p){
  const filter=state.mapFilter; const all=routeData(p); const shown=all.filter(r=>filter==='ALL'||r.type===filter);
  const avg=shown.length?Math.round(shown.reduce((a,r)=>a+r.yds,0)/shown.length):0;
  const rz=shown.filter(r=>r.type==='RZ').length; const exp=shown.filter(r=>r.type==='EXP').length;
  const lines=shown.map((r,i)=>`<path class="ms-route-line ${i%2?'alt':''}" d="${r.path}"/><circle class="ms-route-dot" cx="${r.x}" cy="${r.y}" r="5" fill="#fff"/>`).join('');
  return `<div class="ms-map-controls">${['ALL','REC','RUSH','RZ','EXP'].map(x=>`<button data-nfl-mapfilter="${x}" class="${x===filter?'active':''}">${x}</button>`).join('')}</div><svg class="ms-nfl-map" viewBox="0 0 300 190" preserveAspectRatio="none"><rect width="300" height="190" fill="#174a2c"/>${[30,60,90,120,150,180,210,240,270].map(x=>`<line x1="${x}" y1="0" x2="${x}" y2="190" stroke="rgba(255,255,255,.17)"/>`).join('')}<rect x="0" width="28" height="190" fill="rgba(0,0,0,.35)"/><rect x="272" width="28" height="190" fill="rgba(0,0,0,.35)"/>${lines}<circle cx="18" cy="168" r="6" fill="#f59e0b"/></svg><div class="ms-route-stats"><div><span>PLAYS</span><b>${shown.length}</b></div><div><span>AVG YDS</span><b>${avg}</b></div><div><span>RZ LOOKS</span><b>${rz}</b></div><div><span>EXPLOSIVE</span><b>${exp}</b></div></div><p class="ms-filtered-note">Filters update both the route/touch trajectories and Recent Opportunities below.</p>`;
}

function recentOpportunitiesHTML(p){
  const shown=routeData(p).filter(r=>state.mapFilter==='ALL'||r.type===state.mapFilter);
  return shown.map((r,i)=>`<div><b>${i+1}</b><span>${esc(r.type)} · ${esc(r.label)}</span><em>${r.yds} yds${r.type==='RZ'?' · TD look':''}</em></div>`).join('') || '<div><b>—</b><span>No opportunities in this filter</span><em>—</em></div>';
}

function playerModal(p){
  if(!p) return '';
  const quality=[['Snap Share',`${p.usage}%`],['RZ Opps',`${p.rz}`],['Explosive %',`${p.explosive}%`],['Route/Touch Edge',`${num(p.name+'route',56,86)}`]];
  const atd=propValue(p,'atd'), first=propValue(p,'firstTd');
  const scoring=[['Anytime TD',atd.main],['First TD',first.main],['RZ Opportunities',`${p.rz}`],['TSO Edge',`${p.edge}`]];
  return `<div class="ms-modal-backdrop" data-nfl-close-modal><div class="ms-modal" onclick="event.stopPropagation()"><button class="ms-modal-x" data-nfl-close-modal>×</button><header><div class="ms-avatar big">${p.headshot?`<img src="${esc(p.headshot)}" alt="">`:`<span>${esc(initials(p.name))}</span>`}</div><div><div class="ms-modal-name"><h2>${esc(p.name)}</h2>${signalBadge(p.edge)}</div><p>${esc(p.team)} · ${esc(p.pos)} · vs ${esc(p.opp)}</p></div><section><span>TSO EDGE</span><strong>${p.edge}</strong><small>${p.edge>=60?'Strong matchup':'Balanced matchup'}</small></section></header><div class="ms-modal-body"><div class="ms-sec"><div class="ms-sec-title">Scoring Outlook</div><div class="ms-quality">${scoring.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div><div class="ms-sec"><div class="ms-sec-title">Recent Games</div>${recentBars(p)}</div><div class="ms-sec"><div class="ms-sec-title">Usage & Efficiency</div><div class="ms-quality">${quality.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div><div class="ms-sec"><div class="ms-sec-title">Matchup Mix</div>${matchupPanel(p)}</div><div class="ms-sec"><div class="ms-sec-title">Route / Touch Map</div><div id="nflMapHost">${routeMapHTML(p)}</div></div><div class="ms-sec"><div class="ms-sec-title">Recent Opportunities</div><div class="ms-recent-list">${recentOpportunitiesHTML(p)}</div></div><div class="ms-sec"><div class="ms-sec-title">Why</div><p class="ms-why">${esc(p.name)} combines a ${p.edge} TSO Edge with ${p.usage}% snap share, ${p.rz} red-zone opportunities and a favorable coverage/usage profile against ${esc(p.opp)}. Anytime TD is the connected scoring anchor; First TD is a separate preview probability that also accounts for how concentrated the player's snap and red-zone role is. This is the football equivalent of MLB Matchup Mix: pitch/zone overlap becomes coverage fit, red-zone usage, route/touch distribution and explosive-play opportunity.</p></div></div></div></div>`;
}

function contentHTML(){
  if(state.game){ const g=data().games.find(x=>String(x.id)===String(state.game)); return gamecastHTML(g); }
  if(state.tab==='radar') return gameRadarHTML();
  if(state.tab==='slate') return slateHTML();
  if(state.tab==='feed') return feedHTML();
  if(state.tab==='players') return allPlayersHTML();
  if(state.tab==='foryou') return '<div id="nflForYouHost"></div>';
  return propsHTML();
}

function render(){
  const root=document.getElementById('nflView'); if(!root) return;
  window.DW_nflPreviewTab=state.tab;
  root.style.setProperty('--ms-accent','#f59e0b'); root.style.setProperty('--ms-accent2','#fbbf24');
  const p=state.player?data().players.find(x=>String(x.id)===String(state.player)):null;
  root.innerHTML=`${headerHTML()}<div class="ms-content">${contentHTML()}</div>${p?playerModal(p):''}<footer class="ms-preview-foot"><b>NFL product preview.</b> The schedule, teams, headshots and Anytime TD model come from the site’s connected NFL slate. First TD is preview-derived from the connected ATD signal plus snap/red-zone role; the other not-yet-connected prop values, route maps and live-event rows are deterministic presentation data until those NFL pipelines are wired.</footer>`;
  wire(root);
  if(state.tab==='foryou') window.renderForYou?.(root.querySelector('#nflForYouHost'));
  window.renderSidebarSports?.();
}

function wire(root){
  root.querySelector('#nflPropSelect')?.addEventListener('change',e=>{state.prop=e.target.value;if(state.prop==='allPlayers')state.propView='board';render();});
  root.querySelectorAll('[data-nfl-prop-view]').forEach(b=>b.addEventListener('click',()=>{state.propView=b.dataset.nflPropView;render();}));
  root.querySelectorAll('[data-nfl-player]').forEach(b=>b.addEventListener('click',()=>{state.player=b.dataset.nflPlayer;state.mapFilter='ALL';render();}));
  root.querySelectorAll('[data-nfl-open-game]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.game=b.dataset.nflOpenGame;state.gamecastTab=b.dataset.nflOpenTab||'game';state.tab='slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-game]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.game=b.dataset.nflGame;state.gamecastTab='game';state.tab='slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('.ms-slate-cast[tabindex]').forEach(card=>card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state.game=card.dataset.nflGame;state.gamecastTab='game';state.tab='slate';render();window.scrollTo?.({top:0,behavior:'smooth'});}}));
  root.querySelectorAll('[data-nfl-close-game]').forEach(b=>b.addEventListener('click',()=>{state.game=null;state.gamecastTab='game';render();}));
  root.querySelectorAll('[data-nfl-gamecast-tab]').forEach(b=>b.addEventListener('click',()=>{state.gamecastTab=b.dataset.nflGamecastTab;render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  root.querySelectorAll('[data-nfl-close-modal]').forEach(b=>b.addEventListener('click',()=>{state.player=null;state.mapFilter='ALL';render();}));
  root.querySelectorAll('[data-nfl-mapfilter]').forEach(b=>b.addEventListener('click',()=>{state.mapFilter=b.dataset.nflMapfilter;render();}));
  root.querySelector('#nflAllSort')?.addEventListener('change',e=>{state.allSort=e.target.value;render();});
  const search=root.querySelector('#nflSearch');
  search?.addEventListener('input',()=>{const q=search.value.toLowerCase();root.querySelectorAll('#nflAllList .ms-player-card').forEach(c=>c.hidden=!c.textContent.toLowerCase().includes(q));});
}

export function selectTab(tab){
  if(!['radar','slate','feed','props','players','foryou'].includes(tab)) return;
  state.tab=tab; state.game=null; state.player=null;
  if(tab==='props'){state.prop='atd'; state.propView='board';}
  render(); window.scrollTo({top:0,behavior:'smooth'});
}
window.DW_nflPreviewSelectTab=selectTab;

export async function mount(){ await loadData(); render(); }
