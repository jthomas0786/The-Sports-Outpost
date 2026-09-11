/**
 * v89.16 hidden NFL Gamecast Replay Lab.
 * Enable with ?nflReplayLab=1#nfl.
 *
 * The lab never runs for normal users. In QA mode it stops NFL live polling,
 * loads an ESPN scoreboard/summary directly, preserves exact per-play start/end
 * field coordinates, and pushes reconstructed snapshots through the production
 * Gamecast event pipeline.
 */
import { stopLivePolling, __LIVE_TEST__ } from './live.js?v=89.14';
import { renderNflPlaystageV886EHTML } from './playstage-v886e.js?v=88.6e';

const ROOT_ID='tso-nfl-replay-lab-v8916';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const norm=v=>({LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'}[String(v||'').toUpperCase()]||String(v||'').toUpperCase());
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enabled=()=>new URLSearchParams(location.search).get('nflReplayLab')==='1';
const sideForTeam=(game,team)=>{const t=norm(team);if(t&&t===norm(game?.away?.abbr))return'away';if(t&&t===norm(game?.home?.abbr))return'home';return null;};
const ownFromEndzone=v=>finite(v)==null?null:clamp(100-Number(v),0,100);
const ordinal=d=>Number(d)===1?'1st':Number(d)===2?'2nd':Number(d)===3?'3rd':`${Number(d)||''}th`;

let mounted=false,doc=null,index=0,autoTimer=null;

async function fetchEspn(url){
  const candidates=[url,url.replace('://site.api.espn.com/', '://site.web.api.espn.com/')];
  let last=null;
  for(const candidate of candidates){
    try{
      const r=await fetch(candidate,{cache:'no-store',headers:{accept:'application/json'}});
      if(r.ok)return await r.json();
      last=new Error(`ESPN ${r.status}`);
    }catch(e){last=e;}
  }
  throw last||new Error('ESPN request failed');
}
function compFrom(value){return value?.competitions?.[0]||value?.header?.competitions?.[0]||null;}
function teamMeta(c,side){
  const row=(c?.competitors||[]).find(x=>x.homeAway===side),t=row?.team||{};
  return {
    id:t.id?String(t.id):null,
    abbr:norm(t.abbreviation||''),
    name:t.displayName||t.shortDisplayName||t.name||norm(t.abbreviation||side),
    logo:t.logo||t.logos?.[0]?.href||null,
    score:finite(row?.score)
  };
}
function gameMeta(value,fallbackId=''){
  const c=compFrom(value);if(!c)return null;
  const s=c.status||value?.status||{},type=s.type||{};
  return {
    gameId:String(c.id||value?.id||fallbackId||''),
    date:c.date||value?.date||null,
    status:type.state||null,
    statusDetail:type.shortDetail||type.detail||null,
    period:finite(s.period)||0,
    clock:s.displayClock||s.shortClock||null,
    away:teamMeta(c,'away'),
    home:teamMeta(c,'home')
  };
}
function participant(x){
  const a=x?.athlete||x?.player||{};
  return {
    type:String(x?.type||x?.role||x?.participantType||''),
    id:a?.id!=null?String(a.id):x?.athleteId!=null?String(x.athleteId):null,
    name:a?.displayName||a?.fullName||a?.shortName||null,
    position:a?.position?.abbreviation||null
  };
}
function serializePlay(p,drive=null){
  const s=p?.start||{},e=p?.end||{};
  return {
    id:String(p?.id??p?.sequenceNumber??''),
    sequence:finite(p?.sequenceNumber),
    text:p?.text||p?.shortText||'',
    shortText:p?.shortText||null,
    period:finite(p?.period?.number??p?.period),
    clock:p?.clock?.displayValue||p?.displayClock||null,
    type:p?.type?.text||p?.type?.abbreviation||null,
    scoring:!!p?.scoringPlay,
    homeScore:finite(p?.homeScore),
    awayScore:finite(p?.awayScore),
    team:norm(p?.team?.abbreviation||s.team?.abbreviation||drive?.team?.abbreviation||''),
    startTeam:norm(s.team?.abbreviation||p?.team?.abbreviation||drive?.team?.abbreviation||''),
    startDown:finite(s.down),
    startDistance:finite(s.distance),
    startYardLine:finite(s.yardLine),
    startYardsToEndzone:finite(s.yardsToEndzone),
    startPossessionText:s.possessionText||s.shortDownDistanceText||null,
    endTeam:norm(e.team?.abbreviation||''),
    endDown:finite(e.down),
    endDistance:finite(e.distance),
    endYardLine:finite(e.yardLine),
    endYardsToEndzone:finite(e.yardsToEndzone),
    endPossessionText:e.possessionText||e.shortDownDistanceText||null,
    driveId:drive?.id!=null?String(drive.id):null,
    driveTeam:norm(drive?.team?.abbreviation||''),
    participants:(p?.participants||[]).map(participant).filter(x=>x.id||x.name||x.type)
  };
}
function allPlays(summary){
  const out=[],seen=new Set(),drives=summary?.drives||{};
  const list=[...(drives.previous||[]),...(drives.current?[drives.current]:[])];
  for(const dr of list)for(const raw of dr?.plays||[]){
    const p=serializePlay(raw,dr),key=p.id||`${p.period}|${p.clock}|${p.text}`;
    if(!p.text||seen.has(key))continue;seen.add(key);out.push(p);
  }
  if(!out.length&&Array.isArray(summary?.plays))for(const raw of summary.plays){
    const p=serializePlay(raw),key=p.id||`${p.period}|${p.clock}|${p.text}`;
    if(!p.text||seen.has(key))continue;seen.add(key);out.push(p);
  }
  return out;
}
function playerStats(summary){
  const out={byId:{},byName:{}};
  for(const tb of summary?.boxscore?.players||[]){
    const team=norm(tb?.team?.abbreviation||'');
    for(const cat of tb.statistics||[])for(const row of cat.athletes||[]){
      const a=row.athlete||{},id=a.id!=null?String(a.id):'',name=a.displayName||a.fullName||a.shortName||'';
      if(!name)continue;
      const obj=out.byId[id]||{id:id||null,name,team,position:a.position?.abbreviation||'',jersey:a.jersey||null,headshot:a.headshot?.href||null,categories:{}};
      obj.team=team||obj.team;
      obj.categories[cat.name||cat.type||'stats']={labels:(cat.labels||cat.descriptions||cat.keys||[]).map(String),values:Array.isArray(row.stats)?row.stats:Array.isArray(row.statistics)?row.statistics:[]};
      if(id)out.byId[id]=obj;
      out.byName[`${team}|${name.toLowerCase()}`]=obj;
    }
  }
  return out;
}
function boxScore(summary){
  const teams={};
  for(const tb of summary?.boxscore?.players||[]){
    const t=tb?.team||{},abbr=norm(t.abbreviation||'');if(!abbr)continue;
    teams[abbr]={
      team:{id:t.id!=null?String(t.id):null,abbr,name:t.displayName||t.shortDisplayName||t.name||abbr,logo:t.logo||null},
      sections:(tb.statistics||[]).map(cat=>({
        name:cat.name||cat.type||'statistics',
        displayName:cat.displayName||cat.label||cat.name||cat.type||'Statistics',
        labels:(cat.labels||cat.descriptions||cat.keys||[]).map(String),
        rows:(cat.athletes||[]).map(row=>{
          const a=row.athlete||{};
          return {id:a.id!=null?String(a.id):null,name:a.displayName||a.fullName||a.shortName||'Player',jersey:a.jersey||null,position:a.position?.abbreviation||null,headshot:a.headshot?.href||null,stats:Array.isArray(row.stats)?row.stats:Array.isArray(row.statistics)?row.statistics:[]};
        })
      }))
    };
  }
  return {teams};
}
async function loadReplayDocument(eventId){
  const summary=await fetchEspn(`${ESPN}/summary?event=${encodeURIComponent(eventId)}`);
  const game=gameMeta(summary?.header||summary,eventId),plays=allPlays(summary);
  if(!game)throw new Error('ESPN summary did not include game metadata');
  if(!plays.length)throw new Error('ESPN summary did not include replayable plays');
  return {schemaVersion:1,eventId:String(eventId),game,plays,playerStats:playerStats(summary),boxScore:boxScore(summary)};
}
async function loadGameIndex(date){
  const board=await fetchEspn(`${ESPN}/scoreboard?limit=100&dates=${encodeURIComponent(date)}`);
  return (board?.events||[]).map(gameMeta).filter(Boolean);
}
function todayInput(){
  const d=new Date(Date.now()-86400000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function playerByParticipant(play,typeRe){
  const rows=play?.participants||[],hit=rows.find(p=>typeRe.test(String(p?.type||'')));
  if(!hit)return null;
  const stored=doc?.playerStats?.byId?.[String(hit.id||'')];
  return stored||{id:hit.id||null,name:hit.name||'',team:play?.team||'',position:hit.position||'',jersey:'',headshot:''};
}
function ref(p){
  return p?{id:p.id?String(p.id):null,name:String(p.name||''),team:norm(p.team||''),position:String(p.position||''),jersey:p.jersey==null?'':String(p.jersey),headshot:String(p.headshot||'')}:null;
}
function currentFor(play,game,gl){
  const playSide=sideForTeam(game,play?.team||play?.startTeam);
  const parsed=__LIVE_TEST__.currentPlayFrom(gl,playSide,game)||{};
  const passer=playerByParticipant(play,/passer|pass/i);
  const target=playerByParticipant(play,/receiver|target/i);
  const runner=playerByParticipant(play,/rusher|rush/i);
  if(passer)parsed.passer=ref(passer);
  if(target)parsed.target=ref(target);
  if(runner)parsed.runner=ref(runner);
  return parsed;
}
function replayContext(i){
  const game=doc?.game,plays=doc?.plays||[],play=plays[i];
  if(!game||!play)return null;
  const startSide=sideForTeam(game,play.startTeam||play.team)||'away';
  const changed=!!(play.endTeam&&norm(play.endTeam)!==norm(play.startTeam||play.team));
  const currentTeam=changed?play.endTeam:(play.endTeam||play.team||play.startTeam);
  const possession=sideForTeam(game,currentTeam)||startSide;
  const currentOwn=ownFromEndzone(play.endYardsToEndzone)??ownFromEndzone(play.startYardsToEndzone)??50;
  const gl={
    status:'post',
    period:finite(play.period)||0,
    clockMin:null,
    possession,
    yardFromOwn:currentOwn,
    down:finite(play.endDown),
    distance:finite(play.endDistance),
    downDistanceText:play.endDown!=null&&play.endDistance!=null?`${ordinal(play.endDown)} & ${play.endDistance}`:'',
    lastPlayText:play.text||'',
    plays:plays.slice(0,i+1),
    playerStats:doc.playerStats||{byId:{},byName:{}},
    boxScore:doc.boxScore||{teams:{}},
    currentDrive:null
  };
  const currentPlay=currentFor(play,game,gl);
  const state=__LIVE_TEST__.buildGamecastState(gl,possession,game,currentPlay);
  const exactStart=ownFromEndzone(play.startYardsToEndzone);
  if(exactStart!=null){state.startYardFromOwn=exactStart;state.exactStart=true;}
  if(finite(play.endYardsToEndzone)!=null){
    // If possession flips, ESPN's endYardsToEndzone is from the new offense's
    // perspective. Convert it back to the original offense's 0–100 axis so the
    // production renderer reaches the true turnover return spot.
    state.endYardFromOwn=changed?clamp(Number(play.endYardsToEndzone),0,100):ownFromEndzone(play.endYardsToEndzone);
    state.exactEnd=true;
  }
  state.currentYardFromOwn=currentOwn;
  state.possession=possession;
  state.playOffenseSide=startSide;
  state.turnover=state.turnover||changed;
  const currentDistance=finite(play.endDistance);
  state.currentFirstDownYardFromOwn=currentDistance==null?null:clamp(currentOwn+Math.max(0,currentDistance),0,100);
  state.replayLab=true;
  const liveScore={
    period:finite(play.period)||0,clockMin:null,possession,yardFromOwn:currentOwn,
    down:finite(play.endDown),distance:finite(play.endDistance),downDistanceText:gl.downDistanceText,
    lastPlayText:play.text||'',currentPlay,gamecastState:state,playerStats:gl.playerStats,
    boxScore:gl.boxScore,plays:gl.plays,source:'replay'
  };
  const snap={
    gameId:String(game.gameId),
    away:{...game.away,score:finite(play.awayScore)??game.away?.score??0},
    home:{...game.home,score:finite(play.homeScore)??game.home?.score??0},
    possession,currentPlay,gamecastState:state,liveScore,updatedAt:Date.now(),source:'replay',replayLab:true
  };
  return {play,game,currentPlay,state,snap,changed};
}
function host(){return document.getElementById(ROOT_ID);}
function stageHost(){return host()?.querySelector('[data-replay-stage-host]');}
function setStatus(text,bad=false){
  const el=host()?.querySelector('[data-replay-status]');if(!el)return;
  el.textContent=text;el.classList.toggle('bad',!!bad);
}
function setGameOptions(games){
  const sel=host()?.querySelector('[data-replay-game]');if(!sel)return;
  sel.innerHTML=(games||[]).map(g=>`<option value="${esc(g.gameId)}">${esc(g.away?.abbr)} ${g.away?.score??''} @ ${esc(g.home?.abbr)} ${g.home?.score??''} · ${esc(g.statusDetail||g.status||'')}</option>`).join('');
}
function updateRange(){
  const range=host()?.querySelector('[data-replay-range]');
  if(range){range.max=String(Math.max(0,(doc?.plays?.length||1)-1));range.value=String(index);}
}
function diagnostics(ctx){
  const el=host()?.querySelector('[data-replay-diagnostics]');if(!el||!ctx)return;
  const p=ctx.play,s=ctx.state,c=ctx.currentPlay;
  const participantName=re=>playerByParticipant(p,re)?.name||'—';
  el.innerHTML=`
    <div><small>Play</small><b>${index+1}/${doc.plays.length}</b></div>
    <div><small>Kind</small><b>${esc(s.kind||'other')}${s.turnover?' · TURNOVER':''}</b></div>
    <div><small>Offense</small><b>${esc(s.offenseAbbr||p.team||'—')}</b></div>
    <div><small>QB</small><b>${esc(c?.passer?.name||participantName(/passer|pass/i))}</b></div>
    <div><small>Runner</small><b>${esc(c?.runner?.name||participantName(/rusher|rush/i))}</b></div>
    <div><small>Target</small><b>${esc(c?.target?.name||participantName(/receiver|target/i))}</b></div>
    <div><small>LOS</small><b>${s.startYardFromOwn==null?'—':`${Math.round(s.startYardFromOwn)} own`}</b></div>
    <div><small>Finish</small><b>${s.endYardFromOwn==null?'—':`${Math.round(s.endYardFromOwn)} own`}</b></div>
    <div class="wide"><small>ESPN</small><b>${esc(p.period?`Q${p.period} ${p.clock||''}`:'')} · ${esc(p.text||'')}</b></div>
  `;
}
function baseGame(){
  const game=doc?.game,ctx=replayContext(index);
  return {
    gameId:String(game.gameId),
    away:{...game.away,score:ctx?.snap?.away?.score??game.away?.score??0},
    home:{...game.home,score:ctx?.snap?.home?.score??game.home?.score??0},
    currentPlay:ctx?.currentPlay,
    liveScore:ctx?.snap?.liveScore
  };
}
function rebuildStage(){
  const h=stageHost();if(!h||!doc)return;
  h.innerHTML=renderNflPlaystageV886EHTML(baseGame(),{});
  const stage=h.querySelector('[data-tso-v886e-gamecast]');
  if(stage){stage.dataset.gameId=String(doc.game.gameId);stage.dataset.tsoReplayStage='v89.16';}
}
function replay({rebuild=false}={}){
  if(!doc?.plays?.length)return;
  index=clamp(index,0,doc.plays.length-1);updateRange();
  if(rebuild||!stageHost()?.querySelector('[data-tso-v886e-gamecast]'))rebuildStage();
  const ctx=replayContext(index);if(!ctx)return;
  diagnostics(ctx);
  window.__TSO_NFL_LIVE_LATEST__=ctx.snap;
  window.dispatchEvent(new CustomEvent('tso:nfl-live-snapshot',{detail:ctx.snap}));
  setStatus(`Replaying play ${index+1} of ${doc.plays.length}`);
}
function setIndex(next,{play=true}={}){
  index=clamp(next,0,Math.max(0,(doc?.plays?.length||1)-1));
  if(play)replay();else{updateRange();diagnostics(replayContext(index));}
}
function stopAuto(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}host()?.querySelector('[data-replay-auto]')?.classList.remove('on');}
function toggleAuto(){
  if(autoTimer){stopAuto();return;}
  host()?.querySelector('[data-replay-auto]')?.classList.add('on');replay();
  autoTimer=setInterval(()=>{if(index>=doc.plays.length-1){stopAuto();return;}setIndex(index+1);},3800);
}
async function loadEvent(id){
  stopAuto();setStatus(`Loading ESPN event ${id}…`);
  doc=await loadReplayDocument(id);index=Math.max(0,doc.plays.length-1);
  rebuildStage();replay();
  setStatus(`${doc.game.away?.abbr} @ ${doc.game.home?.abbr} · ${doc.plays.length} plays loaded`);
}
async function loadDate(){
  const input=host()?.querySelector('[data-replay-date]'),date=String(input?.value||'').replace(/-/g,'');
  if(!date)return;
  setStatus(`Loading games for ${input.value}…`);
  const games=await loadGameIndex(date);setGameOptions(games);
  if(games[0])await loadEvent(games[0].gameId);else setStatus('No NFL games returned for that date',true);
}
function layout(){
  const root=document.createElement('section');root.id=ROOT_ID;
  root.innerHTML=`
    <header>
      <div><span class="eyebrow">TSO INTERNAL · v89.16</span><h2>Gamecast Replay Lab</h2><p>Completed ESPN plays through the production Gamecast renderer.</p></div>
      <div class="status" data-replay-status>Choose a date or ESPN event ID.</div>
    </header>
    <div class="toolbar">
      <label>Date<input type="date" value="${todayInput()}" data-replay-date></label>
      <button type="button" data-replay-load-date>Load Date</button>
      <label>Game<select data-replay-game><option value="">—</option></select></label>
      <label>Event ID<input type="text" inputmode="numeric" placeholder="ESPN event ID" data-replay-event></label>
      <button type="button" data-replay-load-event>Load Event</button>
    </div>
    <div class="transport">
      <button type="button" data-replay-prev>◀ Prev</button>
      <button type="button" class="primary" data-replay-play>↻ Replay Play</button>
      <button type="button" data-replay-next>Next ▶</button>
      <button type="button" data-replay-auto>Auto</button>
      <input type="range" min="0" max="0" value="0" data-replay-range>
    </div>
    <div class="diag" data-replay-diagnostics></div>
    <div class="stage" data-replay-stage-host><div class="empty">Load a completed game to start replaying snaps.</div></div>
  `;
  document.getElementById('nflView')?.prepend(root);return root;
}
function styles(){
  if(document.getElementById('tso-replay-lab-v8916-style'))return;
  const s=document.createElement('style');s.id='tso-replay-lab-v8916-style';s.textContent=`
    #${ROOT_ID}{position:relative;z-index:40;margin:14px;border:1px solid rgba(75,184,255,.35);border-radius:18px;background:linear-gradient(180deg,#071624,#07111b);box-shadow:0 24px 80px rgba(0,0,0,.42);overflow:hidden;color:#eef8ff}
    #${ROOT_ID} header{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;padding:18px 20px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
    #${ROOT_ID} h2{margin:3px 0 2px;font-size:22px}#${ROOT_ID} p{margin:0;color:#9ab5c9;font-size:13px}
    #${ROOT_ID} .eyebrow{font-size:10px;letter-spacing:.16em;color:#57c7ff;font-weight:900}
    #${ROOT_ID} .status{font-size:12px;color:#a8dfff;text-align:right}#${ROOT_ID} .status.bad{color:#ff8e8e}
    #${ROOT_ID} .toolbar,#${ROOT_ID} .transport{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:12px 16px;background:rgba(255,255,255,.025)}
    #${ROOT_ID} .transport{padding-top:0}
    #${ROOT_ID} label{display:grid;gap:4px;font-size:10px;color:#82a3b9;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
    #${ROOT_ID} input,#${ROOT_ID} select,#${ROOT_ID} button{height:36px;border-radius:9px;border:1px solid rgba(120,200,255,.24);background:#0b2233;color:#eaf8ff;padding:0 11px;font:inherit}
    #${ROOT_ID} button{cursor:pointer;font-weight:800}#${ROOT_ID} button:hover,#${ROOT_ID} button.on{border-color:#43c4ff;background:#10344d}
    #${ROOT_ID} button.primary{background:#0d7fc1;border-color:#30bfff}
    #${ROOT_ID} [data-replay-range]{min-width:240px;flex:1;padding:0;background:transparent}
    #${ROOT_ID} .diag{display:grid;grid-template-columns:repeat(8,minmax(90px,1fr));gap:1px;background:rgba(255,255,255,.08);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
    #${ROOT_ID} .diag>div{background:#081824;padding:9px 11px;display:grid;gap:3px}#${ROOT_ID} .diag .wide{grid-column:1/-1}
    #${ROOT_ID} .diag small{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#6e97b2}#${ROOT_ID} .diag b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #${ROOT_ID} .stage{padding:14px;background:#030b11}#${ROOT_ID} .empty{padding:60px;text-align:center;color:#6f899b}
    #${ROOT_ID} .tso-ps886e{margin:0!important}
    @media(max-width:900px){#${ROOT_ID}{margin:6px}#${ROOT_ID} header{align-items:flex-start;flex-direction:column}#${ROOT_ID} .status{text-align:left}#${ROOT_ID} .diag{grid-template-columns:repeat(2,1fr)}#${ROOT_ID} [data-replay-range]{min-width:100%;}}
  `;document.head.append(s);
}
function wire(root){
  root.querySelector('[data-replay-load-date]')?.addEventListener('click',()=>loadDate().catch(e=>setStatus(e.message,true)));
  root.querySelector('[data-replay-load-event]')?.addEventListener('click',()=>{
    const id=root.querySelector('[data-replay-event]')?.value?.trim();if(id)loadEvent(id).catch(e=>setStatus(e.message,true));
  });
  root.querySelector('[data-replay-game]')?.addEventListener('change',e=>{if(e.target.value)loadEvent(e.target.value).catch(err=>setStatus(err.message,true));});
  root.querySelector('[data-replay-prev]')?.addEventListener('click',()=>setIndex(index-1));
  root.querySelector('[data-replay-next]')?.addEventListener('click',()=>setIndex(index+1));
  root.querySelector('[data-replay-play]')?.addEventListener('click',()=>replay());
  root.querySelector('[data-replay-auto]')?.addEventListener('click',()=>toggleAuto());
  root.querySelector('[data-replay-range]')?.addEventListener('input',e=>setIndex(Number(e.target.value),{play:false}));
  root.querySelector('[data-replay-range]')?.addEventListener('change',e=>setIndex(Number(e.target.value)));
}
export function installNflGamecastReplayLabV8916(){
  if(typeof document==='undefined'||!enabled()||mounted)return null;
  mounted=true;stopLivePolling();styles();
  document.querySelectorAll('[data-tso-v886e-gamecast]').forEach(stage=>{stage.dataset.gameId='__replay-disabled__';});
  const root=layout();wire(root);
  const eventId=new URLSearchParams(location.search).get('replayEvent');
  if(eventId)loadEvent(eventId).catch(e=>setStatus(e.message,true));
  else loadDate().catch(e=>setStatus(e.message,true));
  return root;
}
export const __V8916_TEST__={norm,sideForTeam,ownFromEndzone,serializePlay,allPlays,gameMeta};
