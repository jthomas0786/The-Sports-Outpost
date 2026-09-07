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
function slateHTML(){ return `<div class="ms-game-grid">${data().games.map(slateGamecastCard).join('')}</div>`; }


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
  return data().players.find(p=>String(p.gameId)===String(g.id)) || data().players[0] || FALLBACK_PLAYERS[0];
}

function gamecastHTML(g){
  if(!g) return '';
  const p=featuredPlayerForGame(g);
  return `<div class="ms-gamecast"><button class="ms-back" data-nfl-close-game>← Back to slate</button><div class="ms-gc-score"><div>${teamLogo(g.away)}<span><b>${esc(g.away.name)}</b><small>${esc(record(g.away))}</small></span></div><section><strong>${esc(g.score||g.time)}</strong><span>${esc(g.detail)}</span></section><div class="home"><span><b>${esc(g.home.name)}</b><small>${esc(record(g.home))}</small></span>${teamLogo(g.home)}</div></div><div class="ms-gc-art">${footballField(g,{gamecast:true})}<div class="ms-gc-player-card left"><span>PLAYER TO WATCH</span><b>${esc(p.name)}</b><small>${Math.round((p.prob||0)*100)}% ATD · ${Math.round((firstTdProbability(p)||0)*100)}% 1st TD · Edge ${p.edge}</small></div><div class="ms-gc-player-card right"><span>DEFENSIVE LOOK</span><b>${esc(p.opp||g.home.abbr)}</b><small>${num((p.opp||g.home.abbr)+'man',31,48)}% man · ${num((p.opp||g.home.abbr)+'blitz',18,34)}% blitz</small></div></div><div class="ms-gc-grid"><div><span>DOWN & DISTANCE</span><b>2nd & 6</b><small>Ball on ${esc(g.home.abbr)} 38</small></div><div><span>POSSESSION</span><b>${esc(g.away.abbr)}</b><small>Drive: 7 plays · 46 yds</small></div><div><span>RED ZONE EDGE</span><b>${num(g.id+'rze',57,73)}</b><small>TSO football matchup signal</small></div><div><span>LAST PLAY</span><b>12 yd gain</b><small>Crossing route · 6 YAC</small></div></div><div class="ms-gc-footer"><b>NFL Gamecast preview</b><span>Same hierarchy as MLB Gamecast, rebuilt around field position, down/distance, possession, route concepts and red-zone context.</span></div></div>`;
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
  root.querySelectorAll('[data-nfl-game]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.game=b.dataset.nflGame;state.tab='slate';render();}));
  root.querySelectorAll('.ms-slate-cast[tabindex]').forEach(card=>card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state.game=card.dataset.nflGame;state.tab='slate';render();}}));
  root.querySelectorAll('[data-nfl-close-game]').forEach(b=>b.addEventListener('click',()=>{state.game=null;render();}));
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
