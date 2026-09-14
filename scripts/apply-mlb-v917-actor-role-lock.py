from pathlib import Path
import re

CORE=Path('sports/mlb/playstage-v901.js')
s=CORE.read_text()

def sub(pattern,repl,label,flags=re.S):
    global s
    s2,n=re.subn(pattern,lambda m:repl,s,count=1,flags=flags)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 replacement, got {n}')
    s=s2

# Placeholder actors should not generate invalid MLB headshot requests.
s=s.replace(
"const playerImg=id=>id?`https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_auto:best/v1/people/${encodeURIComponent(id)}/headshot/67/current`:'./images/player-placeholder.png';",
"const playerImg=id=>/^\\d+$/.test(String(id||''))?`https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_auto:best/v1/people/${encodeURIComponent(id)}/headshot/67/current`:'./images/player-placeholder.png';",
1)

sub(r"function onDeckPerson\(feed,side,batterId\)\{[\s\S]*?\n\}","""function onDeckPerson(feed,side,batterId,preferLive=true){
 const offense=preferLive?(feed?.liveData?.linescore?.offense||{}):{};if(offense.onDeck?.id)return offense.onDeck;
 const order=lineupIds(feed,side);const i=order.findIndex(x=>String(x)===String(batterId));const id=order.length?order[(i>=0?i+1:0)%order.length]:null;return id?getPlayer(feed?.liveData?.boxscore,side,id)?.person:null;
}""",'onDeckPerson')

sub(r"function fielders\(feed,side\)\{[\s\S]*?\n\}","""function fielders(feed,side,preferLive=true){
 const slots=[['P','pitcher'],['C','catcher'],['1B','first'],['2B','second'],['SS','shortstop'],['3B','third'],['LF','left'],['CF','center'],['RF','right']];
 const live=preferLive?(feed?.liveData?.linescore?.defense||{}):{},out=[],seen=new Set();
 for(const [pos,key] of slots){const person=live?.[key];if(!person?.id)continue;const p=playerFromFeed(feed,side,person);out.push({...p,id:p.id||person.id,name:p.name||person.fullName||pos,pos,num:p.num||''});seen.add(pos);}
 const team=feed?.liveData?.boxscore?.teams?.[side];
 if(team?.players)for(const raw of Object.values(team.players)){const pos=raw?.position?.abbreviation;if(!DEF_POS[pos]||seen.has(pos)||!raw?.person?.id)continue;const p=playerFromFeed(feed,side,raw.person);out.push({...p,id:p.id||raw.person.id,name:p.name||raw.person.fullName||pos,pos,num:p.num||raw.jerseyNumber||''});seen.add(pos);}
 for(const [pos] of slots)if(!seen.has(pos)){out.push({id:`slot-${side}-${pos}`,name:pos,num:'',pos,placeholder:true});seen.add(pos);}
 return out.sort((a,b)=>slots.findIndex(([pos])=>pos===a.pos)-slots.findIndex(([pos])=>pos===b.pos));
}""",'fielders')

sub(r"function currentState\(feed,slate\)\{[\s\S]*?\n\}","""function playSides(feed,play){
 const liveOff=offenseSide(feed),top=play?.about?.isTopInning,playInning=Number(play?.about?.inning),liveInning=Number(feed?.liveData?.linescore?.currentInning);
 const off=typeof top==='boolean'?(top?'away':'home'):liveOff,def=off==='away'?'home':'away';
 const sameHalf=off===liveOff&&(!Number.isFinite(playInning)||!Number.isFinite(liveInning)||playInning===liveInning);
 return{off,def,sameHalf};
}
function currentState(feed,slate){
 const play=lastPlay(feed)||{};const {off,def,sameHalf}=playSides(feed,play);const matchup=play.matchup||{};const batter=playerFromFeed(feed,off,matchup.batter||(sameHalf?feed?.liveData?.linescore?.offense?.batter:null));const pitcher=playerFromFeed(feed,def,matchup.pitcher||(sameHalf?feed?.liveData?.linescore?.defense?.pitcher:null));const od=onDeckPerson(feed,off,batter.id,sameHalf);const onDeck=playerFromFeed(feed,off,od);const away=teamInfo(feed,'away'),home=teamInfo(feed,'home');const ls=feed?.liveData?.linescore||{};const gd=feed?.gameData||{};const kind=playKind(play),pitch=pitchInfo(play);return{feed,slate,play,kind,pitch,batter,pitcher,onDeck,away,home,off,def,sameHalf,defenders:fielders(feed,def,sameHalf),runners:sameHalf?currentRunners(feed,off,batter.id):[],ls,venue:gd.venue?.name||slate?.venue?.name||'Ballpark',weather:gd.weather||slate?.weather||{},status:gd.status?.detailedState||slate?.detailedStatus||'',metrics:{ev:play?.hitData?.launchSpeed,la:play?.hitData?.launchAngle,dist:play?.hitData?.totalDistance},description:play?.result?.description||play?.result?.event||(kind==='pitch'?pitch.description:'')||'Live play data updating'};
}""",'currentState')

sub(r"function chibiHTML\(p,team,pos,extra=''\)\{[\s\S]*?\nfunction baseMini", """function chibiHTML(p,team,pos,extra=''){const [c1,c2]=colors(team.abbr);const xy=pos||DEF_POS[p.pos]||[50,50];const actorKind=extra.includes('ps-batter')?'batter':extra.includes('ps-runner')?'runner':'defender';const role=actorKind==='batter'?'BAT':actorKind==='runner'?'RUN':(p.pos||'DEF');const actorKey=actorKind==='defender'?`def:${p.pos||'UNK'}:${p.id||''}`:actorKind==='batter'?`bat:${p.id||''}`:`run:${p.id||''}:${p.base||''}`;const shortName=String(p.name||'Player').trim().split(/\\s+/).filter(Boolean).at(-1)||'Player';return`<div class=\"ps-chibi ${extra}\" data-player-id=\"${esc(p.id)}\" data-player-name=\"${esc(p.name||'')}\" data-actor-kind=\"${actorKind}\" data-actor-key=\"${esc(actorKey)}\" data-actor-role=\"${esc(role)}\" data-team=\"${esc(team.abbr||'')}\" data-base=\"${esc(p.base||'')}\" data-pos=\"${esc(p.pos)}\" style=\"left:${xy[0]}%;top:${xy[1]}%;--c1:${c1};--c2:${c2}\"><div class=\"ps-chibi-shadow\"></div><div class=\"ps-chibi-cap\"></div><div class=\"ps-chibi-head\"><img src=\"${playerImg(p.id)}\" alt=\"\" draggable=\"false\"></div><span class=\"ps-chibi-arm l\"></span><span class=\"ps-chibi-arm r\"></span><div class=\"ps-chibi-body\" data-num=\"${esc(p.num||'')}\"></div><span class=\"ps-chibi-leg l\"></span><span class=\"ps-chibi-leg r\"></span><span class=\"ps-chibi-glove\"></span>${actorKind==='batter'?'<span class=\"ps-chibi-bat\"></span>':''}<span class=\"ps-actor-label\"><b>${esc(role)}</b><span>${esc(shortName)}</span></span></div>`;}
function baseMini""",'chibiHTML')

sub(r"function actor\(root,id\)\{[\s\S]*?\nfunction setClass", """function actor(root,id){return root.querySelector(`.ps-chibi[data-player-id=\"${CSS.escape(String(id||''))}\"]`);}
function defenderActor(root,pos,id=''){const p=CSS.escape(String(pos||'')),key=CSS.escape(String(id||''));return(id?root.querySelector(`.ps-chibi[data-actor-kind=\"defender\"][data-pos=\"${p}\"][data-player-id=\"${key}\"]`):null)||root.querySelector(`.ps-chibi[data-actor-kind=\"defender\"][data-pos=\"${p}\"]`);}
function batterActor(root,id){const key=CSS.escape(String(id||''));return root.querySelector(`.ps-chibi[data-actor-kind=\"batter\"][data-player-id=\"${key}\"]`);}
function runnerActor(root,id){const key=CSS.escape(String(id||''));return root.querySelector(`.ps-chibi[data-actor-kind=\"runner\"][data-player-id=\"${key}\"]`);}
function offenseActor(root,id,{allowBatter=true}={}){return runnerActor(root,id)||(allowBatter?batterActor(root,id):null);}
function setClass""",'actor lookups')

sub(r"async function animateRunnerMoves\(root,s,\{excludeBatter=true\}=\{\}\)\{[\s\S]*?\nfunction outBaseSequence", """const BASE_CIRCUIT=['home','first','second','third','home'];
function baseRoute(start,end){const si=BASE_CIRCUIT.indexOf(start||'home'),ei=end==='home'?BASE_CIRCUIT.length-1:BASE_CIRCUIT.indexOf(end);if(si<0||ei<0||ei<=si)return end&&BASE_POS[end]?[end]:[];return BASE_CIRCUIT.slice(si+1,ei+1);}
async function animateOffensiveRoute(el,start,end,duration=650){const route=baseRoute(start,end);if(!route.length&&end&&BASE_POS[end])route.push(end);const step=Math.max(220,Math.round(duration/Math.max(1,route.length)));for(const base of route){const dest=BASE_POS[base];if(dest)await animateMove(el,dest,step);}}
async function restoreDefense(root,s,duration=260){const jobs=[];for(const p of s.defenders||[]){const el=defenderActor(root,p.pos,p.id),dest=DEF_POS[p.pos];if(!el||!dest)continue;el.style.opacity='';setClass(el,'ps-out',false);jobs.push(animateMove(el,dest,duration));}await Promise.all(jobs);}
async function animateRunnerMoves(root,s,{excludeBatter=true}={}){const moves=runnerMoves(s.play).filter(m=>m.end),defensiveIds=new Set((s.defenders||[]).map(p=>String(p?.id||'')).filter(Boolean));const jobs=[];for(const m of moves){const id=String(m.id||'');if(!id||defensiveIds.has(id))continue;if(excludeBatter&&id===String(s.batter.id))continue;const el=offenseActor(root,id,{allowBatter:!excludeBatter});if(!el||el.dataset.actorKind==='defender')continue;const start=m.start||el.dataset.base||'home';jobs.push(animateOffensiveRoute(el,start,m.end,720).then(async()=>{if(m.isOut){setClass(el,'ps-out');await pause(220);}else if(m.end==='home'){const a=el.animate([{opacity:1},{opacity:.15}],{duration:260,fill:'forwards'});await a.finished.catch(()=>{});}}));}await Promise.all(jobs);}
function outBaseSequence""",'runner movement')

sub(r"async function animatePlay\(root,s\)\{[\s\S]*?\n\}\n\n\nasync function fetchFeed", """async function animatePlay(root,s){if(!root?.isConnected||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const kind=s.kind,play=s.play,batter=batterActor(root,s.batter.id),pitcher=defenderActor(root,'P',s.pitcher.id),target=hitTarget(play,kind),fielder=nearestFielder(s.defenders,target),fEl=fielder?defenderActor(root,fielder.pos,fielder.id):null;root.querySelectorAll('.ps-chibi').forEach(x=>x.getAnimations().forEach(a=>a.cancel()));
 try{
  setClass(pitcher,'ps-windup');await pause(180);setClass(pitcher,'ps-throwing');await animateBall(root,DEF_POS.P,[50,86],520,false);setClass(pitcher,'ps-throwing',false);setClass(pitcher,'ps-windup',false);
  if(kind==='steal'){await animateRunnerMoves(root,s,{excludeBatter:false});return;}
  if(['walk','hbp'].includes(kind)){await animateRunnerMoves(root,s,{excludeBatter:false});const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateOffensiveRoute(batter,'home','first',650);return;}
  if(kind==='pitch'){const desc=String(s.pitch?.description||'').toLowerCase(),catcher=s.defenders.find(x=>x.pos==='C'),cEl=catcher?defenderActor(root,'C',catcher.id):null;if(s.pitch?.isInPlay||/swing|foul/.test(desc)){setClass(batter,'ps-swing');await pause(380);setClass(batter,'ps-swing',false);}if(cEl&&!s.pitch?.isInPlay){setClass(cEl,'ps-catching');await pause(280);setClass(cEl,'ps-catching',false);}return;}
  if(kind==='strikeout')return;
  setClass(batter,'ps-swing');await pause(160);const air=['fly_out','fly_ball','line_out','home_run','double','triple'].includes(kind);const ballP=animateBall(root,[50,86],target,air?1050:720,air);const fieldP=fEl?animateMove(fEl,target,air?900:650):Promise.resolve();await Promise.all([ballP,fieldP]);setClass(batter,'ps-swing',false);
  if(fEl&&['fly_out','line_out'].includes(kind)){setClass(fEl,'ps-catching');await pause(540);setClass(fEl,'ps-catching',false);await animateRunnerMoves(root,s);return;}
  if(kind==='home_run'){const runnerP=animateRunnerMoves(root,s);for(const base of ['first','second','third','home'])await animateMove(batter,BASE_POS[base],480);await runnerP;return;}
  if(['single','double','triple'].includes(kind)){const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));const base=bm?.end||(kind==='single'?'first':kind==='double'?'second':'third');await Promise.all([animateOffensiveRoute(batter,'home',base,780),animateRunnerMoves(root,s)]);return;}
  if(['ground_out','double_play','ground_ball'].includes(kind)&&fEl){const runnerP=animateRunnerMoves(root,s);let from=target,thrower=fEl;for(const base of outBaseSequence(s)){const dest=BASE_POS[base];if(!dest)continue;const receiver=nearestFielderAt(s.defenders,base,thrower?.dataset?.playerId),rEl=receiver?defenderActor(root,receiver.pos,receiver.id):null;if(rEl)await animateMove(rEl,dest,380);setClass(thrower,'ps-throwing');await animateBall(root,from,dest,520,false);setClass(thrower,'ps-throwing',false);thrower=rEl||thrower;from=dest;}const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateOffensiveRoute(batter,'home','first',720);await runnerP;}
 }finally{await restoreDefense(root,s,240);}
}


async function fetchFeed""",'animatePlay')

CORE.write_text(s)

# Wire the new v917 visual layer and cache-bust the core.
router=Path('sports/router.js')
r=router.read_text()
r=r.replace('conceptV914,conceptV915,conceptV916] = await Promise.all([','conceptV914,conceptV915,conceptV916,conceptV917] = await Promise.all([',1)
r=r.replace("        import('./mlb/playstage-v901.js?v=90.42')","        import('./mlb/playstage-v901.js?v=90.43')",1)
r=r.replace("        import('./mlb/playstage-concept-v916.js?v=91.60')","        import('./mlb/playstage-concept-v916.js?v=91.60'),\n        import('./mlb/playstage-concept-v917.js?v=91.70')",1)
r=r.replace('      conceptV916.installMlbPlaystageConceptV916?.();','      conceptV916.installMlbPlaystageConceptV916?.();\n      conceptV917.installMlbPlaystageConceptV917?.();',1)
if "playstage-concept-v917.js?v=91.70" not in r or "playstage-v901.js?v=90.43" not in r:
    raise SystemExit('router v917 wiring failed')
router.write_text(r)

index=Path('index.html')
i=index.read_text()
i,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.43',i,count=1)
if n!=1: raise SystemExit('index router cache marker missing')
index.write_text(i)

# Advance existing assertions without touching NFL/NHL production versions.
for path in ['scripts/mlb-playstage-selftest.mjs','scripts/mlb-playstage-v916-selftest.mjs','scripts/mlb-v916-runner-isolation-selftest.mjs']:
    p=Path(path);t=p.read_text();t=t.replace('playstage-v901.js?v=90.42','playstage-v901.js?v=90.43').replace('./sports/router.js?v=90.42','./sports/router.js?v=90.43');p.write_text(t)

print('Applied MLB v917 strict actor roles, nine-defender lock, base routes and team identity')
