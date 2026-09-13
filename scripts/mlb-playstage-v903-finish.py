from pathlib import Path
import re

p=Path('sports/mlb/playstage-v901.js')
s=p.read_text()

def one(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'{label} marker missing')
    s=s.replace(old,new,1)

one(
"function playId(p){return String(first(p?.playEndTime,p?.atBatIndex,p?.about?.atBatIndex,p?.about?.endTime,p?.result?.description,''));}",
"""function latestEvent(play){const ev=play?.playEvents;return Array.isArray(ev)&&ev.length?ev[ev.length-1]:null;}
function playId(p){const ev=latestEvent(p),idx=ev?.index??ev?.eventIndex,ab=p?.atBatIndex??p?.about?.atBatIndex;return String(first(p?.playEndTime,ev?.endTime,ev?.startTime,idx!=null?`${ab??'ab'}:${idx}`:null,ab,p?.about?.endTime,p?.result?.description,''));}
function pitchInfo(play){const ev=latestEvent(play)||{},d=ev?.details||{},pd=ev?.pitchData||{};return{description:d.description||d.call?.description||'',code:d.code||'',isPitch:!!ev.isPitch,isInPlay:!!d.isInPlay,isBall:!!d.isBall,isStrike:!!d.isStrike,speed:pd.startSpeed,pitchType:d.type?.description||d.type?.code||'',zone:pd.zone};}""",
'playId')

old="const play=lastPlay(feed)||{};const off=offenseSide(feed),def=defenseSide(feed);const matchup=play.matchup||{};const batter=playerFromFeed(feed,off,matchup.batter||feed?.liveData?.linescore?.offense?.batter);const pitcher=playerFromFeed(feed,def,matchup.pitcher||feed?.liveData?.linescore?.defense?.pitcher);const od=onDeckPerson(feed,off,batter.id);const onDeck=playerFromFeed(feed,off,od);const away=teamInfo(feed,'away'),home=teamInfo(feed,'home');const ls=feed?.liveData?.linescore||{};const gd=feed?.gameData||{};const kind=playKind(play);return{feed,slate,play,kind,batter,pitcher,onDeck,away,home,off,def,defenders:fielders(feed,def),runners:currentRunners(feed,off,batter.id),ls,venue:gd.venue?.name||slate?.venue?.name||'Ballpark',weather:gd.weather||slate?.weather||{},status:gd.status?.detailedState||slate?.detailedStatus||'',metrics:{ev:play?.hitData?.launchSpeed,la:play?.hitData?.launchAngle,dist:play?.hitData?.totalDistance},description:play?.result?.description||play?.result?.event||'Live play data updating'};"
new="const play=lastPlay(feed)||{};const off=offenseSide(feed),def=defenseSide(feed);const matchup=play.matchup||{};const batter=playerFromFeed(feed,off,matchup.batter||feed?.liveData?.linescore?.offense?.batter);const pitcher=playerFromFeed(feed,def,matchup.pitcher||feed?.liveData?.linescore?.defense?.pitcher);const od=onDeckPerson(feed,off,batter.id);const onDeck=playerFromFeed(feed,off,od);const away=teamInfo(feed,'away'),home=teamInfo(feed,'home');const ls=feed?.liveData?.linescore||{};const gd=feed?.gameData||{};const kind=playKind(play),pitch=pitchInfo(play);return{feed,slate,play,kind,pitch,batter,pitcher,onDeck,away,home,off,def,defenders:fielders(feed,def),runners:currentRunners(feed,off,batter.id),ls,venue:gd.venue?.name||slate?.venue?.name||'Ballpark',weather:gd.weather||slate?.weather||{},status:gd.status?.detailedState||slate?.detailedStatus||'',metrics:{ev:play?.hitData?.launchSpeed,la:play?.hitData?.launchAngle,dist:play?.hitData?.totalDistance},description:play?.result?.description||play?.result?.event||(kind==='pitch'?pitch.description:'')||'Live play data updating'};"
one(old,new,'currentState pitch')

one(
"function playFeedHTML(s){const plays=s.feed?.liveData?.plays?.allPlays||[];return plays.slice(-5).reverse().map(p=>{const k=playKind(p),out=isOutPlay(p);return`<div class=\"ps-play-item ${out?'out':''}\"><i class=\"ps-play-dot\"></i><div><b>${esc(headline(k))}</b><p>${esc(p?.result?.description||p?.result?.event||'Play')}</p><small>${esc(ordinal(p?.about?.inning||s.ls.currentInning||0))} · ${n(p?.count?.outs)} out${n(p?.count?.outs)===1?'':'s'}</small></div></div>`;}).join('');}",
"function playFeedHTML(s,limit=5){const plays=s.feed?.liveData?.plays?.allPlays||[];return plays.slice(-limit).reverse().map(p=>{const k=playKind(p),out=isOutPlay(p);return`<div class=\"ps-play-item ${out?'out':''}\"><i class=\"ps-play-dot\"></i><div><b>${esc(headline(k))}</b><p>${esc(p?.result?.description||p?.result?.event||'Play')}</p><small>${esc(ordinal(p?.about?.inning||s.ls.currentInning||0))} · ${n(p?.count?.outs)} out${n(p?.count?.outs)===1?'':'s'}</small></div></div>`;}).join('');}",
'playFeed limit')

anchor="function inningCells(ls,side){"
if anchor not in s: raise SystemExit('right rail insertion anchor missing')
right="""function boxRailHTML(s){const b=s.batter,p=s.pitcher,bg=b.game?.hitting||{},pg=p.game?.pitching||{};return`<div class=\"ps-rail-summary\"><h4>At Bat</h4><div class=\"ps-rail-person\"><img src=\"${playerImg(b.id)}\" alt=\"\"><div><b>${esc(b.name)}</b><span>${fmtStat(bg.atBats)} AB · ${fmtStat(bg.hits)} H · ${fmtStat(bg.homeRuns)} HR · ${fmtStat(bg.rbi)} RBI</span></div></div><h4>Pitcher</h4><div class=\"ps-rail-person\"><img src=\"${playerImg(p.id)}\" alt=\"\"><div><b>${esc(p.name)}</b><span>${fmtStat(pg.inningsPitched)} IP · ${fmtStat(pg.hits)} H · ${fmtStat(pg.earnedRuns)} ER · ${fmtStat(pg.strikeOuts)} K</span></div></div></div>`;}
function fieldRailHTML(s){const order=['P','C','1B','2B','SS','3B','LF','CF','RF'];return`<div class=\"ps-field-list\">${order.map(pos=>{const p=s.defenders.find(x=>x.pos===pos);return p?`<div class=\"ps-field-row\"><span>${pos}</span><img src=\"${playerImg(p.id)}\" alt=\"\"><b>${esc(p.name)}</b></div>`:'';}).join('')}</div>`;}
function rightRailHTML(s,panel='live'){const tabs=[['live','Live'],['box','Box'],['plays','Plays'],['field','Field']];return`<div class=\"ps-right-tabs\">${tabs.map(([id,label])=>`<button type=\"button\" data-ps-tab=\"${id}\" class=\"${panel===id?'on':''}\">${label}</button>`).join('')}</div><div class=\"ps-panel\" data-ps-panel=\"live\" ${panel==='live'?'':'hidden'}>${playFeedHTML(s,5)}</div><div class=\"ps-panel\" data-ps-panel=\"box\" ${panel==='box'?'':'hidden'}>${boxRailHTML(s)}</div><div class=\"ps-panel\" data-ps-panel=\"plays\" ${panel==='plays'?'':'hidden'}>${playFeedHTML(s,12)}</div><div class=\"ps-panel\" data-ps-panel=\"field\" ${panel==='field'?'':'hidden'}>${fieldRailHTML(s)}</div>`;}
function wireStageTabs(root,state){if(!root)return;root.querySelectorAll('[data-ps-tab]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.psTab||'live';state.panel=id;root.querySelectorAll('[data-ps-tab]').forEach(x=>x.classList.toggle('on',x===btn));root.querySelectorAll('[data-ps-panel]').forEach(x=>x.hidden=x.dataset.psPanel!==id);}));}
"""
s=s.replace(anchor,right+anchor,1)

old='<aside class="ps-right"><div class="ps-right-tabs"><button class="on">Live</button><button>Box</button><button>Plays</button><button>Field</button></div>${playFeedHTML(s)}</aside>'
new='<aside class="ps-right">${rightRailHTML(s,opts.panel||\'live\')}</aside>'
one(old,new,'right rail markup')

css_anchor='html[data-sport="mlb"] .ps-bottom{display:grid;'
if css_anchor not in s: raise SystemExit('right rail CSS anchor missing')
css="""html[data-sport=\"mlb\"] .ps-panel[hidden]{display:none!important}.ps-right-tabs button{cursor:pointer}.ps-rail-summary h4{margin:12px 0 7px;color:#69dcff;font:900 9px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em}.ps-rail-person{display:grid;grid-template-columns:52px 1fr;gap:9px;align-items:center;padding:9px;border:1px solid #173a5f;border-radius:9px;background:#07182e}.ps-rail-person img{width:52px;height:58px;object-fit:cover;object-position:center top;border-radius:7px;background:#27384c}.ps-rail-person b{display:block;font:900 15px/1.05 'Barlow Condensed',Impact,sans-serif}.ps-rail-person span{display:block;margin-top:5px;color:#99adc4;font:700 8px/1.45 'JetBrains Mono',monospace}.ps-field-list{display:grid;gap:6px}.ps-field-row{display:grid;grid-template-columns:28px 38px 1fr;gap:8px;align-items:center;padding:6px 8px;border:1px solid #153654;border-radius:8px;background:#06162a}.ps-field-row>span{color:#5bddff;font:900 9px 'JetBrains Mono',monospace}.ps-field-row img{width:38px;height:42px;object-fit:cover;object-position:center top;border-radius:50%;background:#25364b}.ps-field-row b{font:800 10px/1.1 'JetBrains Mono',monospace;color:#dceaff}
"""
s=s.replace(css_anchor,css+css_anchor,1)

old=" if(kind==='steal'){await animateRunnerMoves(root,s,{excludeBatter:false});return;}\n if(['walk','hbp'].includes(kind)){await animateRunnerMoves(root,s,{excludeBatter:false});const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateMove(batter,BASE_POS.first,650);return;}\n if(['strikeout','pitch'].includes(kind))return;"
new=""" if(kind==='steal'){await animateRunnerMoves(root,s,{excludeBatter:false});return;}
 if(['walk','hbp'].includes(kind)){await animateRunnerMoves(root,s,{excludeBatter:false});const bm=runnerMoves(play).find(m=>String(m.id)===String(s.batter.id));if(!bm&&batter)await animateMove(batter,BASE_POS.first,650);return;}
 if(kind==='pitch'){const desc=String(s.pitch?.description||'').toLowerCase(),catcher=s.defenders.find(x=>x.pos==='C'),cEl=catcher?actor(root,catcher.id):null;if(s.pitch?.isInPlay||/swing|foul/.test(desc)){setClass(batter,'ps-swing');await pause(380);setClass(batter,'ps-swing',false);}if(cEl&&!s.pitch?.isInPlay){setClass(cEl,'ps-catching');await pause(280);setClass(cEl,'ps-catching',false);}return;}
 if(kind==='strikeout')return;"""
one(old,new,'pitch animation')

old="shell.innerHTML=rootHTML(snap,{prePlay:shouldAnimate});root=shell.querySelector(`.${ROOT_CLASS}`);state.lastPlayId=id;if(shouldAnimate)setTimeout(()=>animatePlay(root,snap),120);"
new="shell.innerHTML=rootHTML(snap,{prePlay:shouldAnimate,panel:state.panel||'live'});root=shell.querySelector(`.${ROOT_CLASS}`);wireStageTabs(root,state);state.lastPlayId=id;if(shouldAnimate)setTimeout(()=>animatePlay(root,snap),120);"
one(old,new,'update wire tabs')

old="const state={gamePk:id,lastPlayId:'',timer:0,abort:null};"
new="const state={gamePk:id,lastPlayId:'',panel:'live',timer:0,abort:null};"
one(old,new,'state panel')

p.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
if "./mlb/playstage-v901.js?v=90.3" not in r: raise SystemExit('router v90.3 marker missing')
router.write_text(r.replace("./mlb/playstage-v901.js?v=90.3","./mlb/playstage-v901.js?v=90.4",1))

selftest=Path('scripts/mlb-playstage-selftest.mjs')
t=selftest.read_text()
if "./mlb/playstage-v901.js?v=90.3" not in t: raise SystemExit('selftest v90.3 marker missing')
t=t.replace("./mlb/playstage-v901.js?v=90.3","./mlb/playstage-v901.js?v=90.4",1)
insert="""\nfor(const marker of ['latestEvent','pitchInfo','wireStageTabs','data-ps-tab','data-ps-panel','boxRailHTML','fieldRailHTML']) assert.ok(src.includes(marker),`PlayStage finish missing ${marker}`);\n"""
if 'PlayStage finish missing' not in t:
    t=t.replace("const router=fs.readFileSync",insert+"\nconst router=fs.readFileSync",1)
selftest.write_text(t)

index=Path('index.html')
i=index.read_text()
i,n=re.subn(r'(\./sports/router\.js\?v=)[A-Za-z0-9._-]+',r'\g<1>90.10',i,count=1)
if n!=1: raise SystemExit('outer router marker missing')
index.write_text(i)
print('MLB PlayStage v903 finish applied')
