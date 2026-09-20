from pathlib import Path
import re


def read(path): return Path(path).read_text()
def write(path,text):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text: return text
    if old not in text: raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

# Finalize the single-owner Player Prop Tool and apply the v94.8 readability/layout pass.
p='sports/nfl/player-prop-tool-v947.js'; s=read(p)
s=replace_once(s,"const VERSION='94.7';","const VERSION='94.8';",'version')
s=replace_once(s,"['player','PLAYER'],['consensus','CONSENSUS'],['pick','PICK']","['player','PLAYER'],['propLine','PROP LINE'],['pick','PICK']",'prop line header')
s=replace_once(s,"if(key==='consensus')return row.line??-1;","if(key==='propLine')return row.line??-1;",'prop line sort key')
s=replace_once(
    s,
    "const kickoff=iso=>{const d=new Date(iso||0);return Number.isFinite(d.getTime())?d.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'}):'TBD';};\nconst gradeFor",
    "const kickoff=iso=>{const d=new Date(iso||0);return Number.isFinite(d.getTime())?d.toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'}):'TBD';};\nfunction gameOptionLabel(g){\n  const away=team(g?.away?.abbr||g?.away),home=team(g?.home?.abbr||g?.home),d=new Date(g?.startTimeUTC||g?.startTime||g?.date||0);\n  if(!Number.isFinite(d.getTime()))return `${away||'AWY'} @ ${home||'HME'} · TBD`;\n  const now=new Date(),sameDay=d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();\n  const time=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase();\n  return `${away||'AWY'} @ ${home||'HME'} · ${sameDay?time:`${d.getMonth()+1}/${d.getDate()} ${time}`}`;\n}\nconst gradeFor",
    'game option formatter',
)
s=replace_once(
    s,
    "name:c.name||player?.name||'Player',team:playerTeam,opp,position:String(c.position||player?.position||'').toUpperCase(),headshot:player?.headshot||c.headshot||'',",
    "name:c.name||player?.name||'Player',team:playerTeam,opp,position:String(c.position||player?.position||'').toUpperCase(),headshot:player?.headshot||c.headshot||'',watchId:String(player?.espnId||c.espnId||c.playerId||player?.playerId||''),",
    'watch id',
)
s=replace_once(
    s,
    "function reconcileFilters(rows){\n  if(state.game!=='ALL'&&!rows.some(r=>r.gameId===state.game&&passes(r,'game')))state.game='ALL';",
    "function reconcileFilters(rows){\n  const slateIds=new Set((snapshot?.slate?.games||[]).map(g=>String(g.gameId||g.id||'')).filter(Boolean));\n  if(state.game!=='ALL'&&!slateIds.has(state.game))state.game='ALL';",
    'game filter persistence',
)
s=replace_once(
    s,
    "function matchupHtml(row){\n  const tone=gradeTone(row.matchScore),label=tone==='great'?'GREAT':tone==='good'?'GOOD':tone==='mid'?'FAIR':'TOUGH';\n  const corr=state.style==='correlated'&&row.correlationLift>0?` · +${(row.correlationLift*100).toFixed(1)}% co-hit`:'';\n  return `<div class=\"nfl-ppt-match-v947 ${tone}\"><b>${label}</b><span>${esc(row.position||'OFF')} vs ${esc(row.opp||'DEF')}${esc(corr)}</span></div>`;\n}",
    "function matchupHtml(row){\n  const tone=gradeTone(row.matchScore),label=tone==='great'?'GREAT':tone==='good'?'GOOD':tone==='mid'?'FAIR':'TOUGH',src=teamLogo(row.opp);\n  const corr=state.style==='correlated'&&row.correlationLift>0?` · +${(row.correlationLift*100).toFixed(1)}% co-hit`:'';\n  return `<div class=\"nfl-ppt-match-v947 ${tone}\"><div class=\"nfl-ppt-match-line-v947\"><b>${esc(row.position||'OFF')}</b><span>vs</span>${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}</div><small>${label}${esc(corr)}</small></div>`;\n}",
    'matchup position vs logo',
)
s=replace_once(
    s,
    "  const book=bookHtml(row),side=row.side==='under'?'U':'O';\n  return `<tr",
    "  const book=bookHtml(row),side=row.side==='under'?'U':'O',watchId=String(row.watchId||row.espnId||row.playerId||'');\n  const watch=watchId?`<button type=\"button\" class=\"nfl-watch-star nfl-ppt-watch-v947\" data-nfl-ppt-watch=\"1\" data-nfl-watch-id=\"${esc(watchId)}\" data-row-id=\"${esc(row.id)}\" aria-label=\"Add to NFL watchlist\" title=\"Add to NFL watchlist\">☆</button>`:'';\n  return `<tr",
    'watch star markup setup',
)
s=replace_once(
    s,
    "    <td class=\"nfl-ppt-player-sticky\"><button type=\"button\" class=\"nfl-ppt-player-v947\" data-nfl-tool-player=\"${esc(row.playerId||row.espnId||row.gsisId||row.name)}\" data-row-id=\"${esc(row.id)}\"><span class=\"nfl-ppt-avatar-v947\">${row.headshot?`<img src=\"${esc(row.headshot)}\" alt=\"\" loading=\"lazy\">`:`<i>${esc(row.name.split(/\\s+/).map(x=>x[0]).slice(0,2).join(''))}</i>`}</span><span><b>${esc(row.name)} ↗</b><small>${esc(row.team)} vs ${esc(row.opp)} · ${esc(kickoff(row.kickoff))}</small></span></button></td>",
    "    <td class=\"nfl-ppt-player-sticky\"><div class=\"nfl-ppt-player-cell-v947\">${watch}<button type=\"button\" class=\"nfl-ppt-player-v947\" data-nfl-tool-player=\"${esc(row.playerId||row.espnId||row.gsisId||row.name)}\" data-row-id=\"${esc(row.id)}\"><span class=\"nfl-ppt-avatar-v947\">${row.headshot?`<img src=\"${esc(row.headshot)}\" alt=\"\" loading=\"lazy\">`:`<i>${esc(row.name.split(/\\s+/).map(x=>x[0]).slice(0,2).join(''))}</i>`}</span><span><b>${esc(row.name)} ↗</b><small>${esc(row.team)} vs ${esc(row.opp)} · ${esc(kickoff(row.kickoff))}</small></span></button></div></td>",
    'watch star before headshot',
)
s=s.replace('<div><b>Consensus / Pick</b><p>Consensus is the selected line. Pick is the exact side, sportsbook logo and American price for Full-game props.</p></div>','<div><b>Prop Line / Pick</b><p>Prop Line is the selected sportsbook line. Pick is the exact side, sportsbook logo and American price for Full-game props.</p></div>')
s=replace_once(
    s,
    "  const games=[...new Map(allRows.filter(r=>passes(r,'game')).map(r=>[r.gameId,r.game])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));",
    "  const games=[...new Map((snapshot?.slate?.games||[]).map(g=>{const id=String(g.gameId||g.id||'');return id?[id,gameOptionLabel(g)]:null;}).filter(Boolean)).entries()];",
    'all slate games in game filter',
)
s=replace_once(
    s,
    "function clearFilters(){",
    "async function toggleWatch(row,btn){\n  const id=String(row?.watchId||row?.espnId||row?.playerId||'');if(!id)return;\n  const player={id,espnId:row?.espnId||id,name:row?.name||'Player',team:row?.team||''};\n  btn.disabled=true;\n  try{\n    let result;const api=window.DW_NFL_WATCHLIST;\n    if(api?.toggle)result=await api.toggle(player);\n    else{const mod=await import('./watchlist-v910.js?v=91.0');result=await mod.toggleNflWatchPlayer(player);}\n    if(result?.error==='not signed in'){document.querySelector('[data-open-auth],#profileBtn,#userBtn,.profile-btn')?.click();}\n  }catch(e){console.warn('[NFL Player Prop Tool v94.8] watchlist toggle failed:',e);}\n  finally{btn.disabled=false;}\n}\nfunction clearFilters(){",
    'watch toggle helper',
)
s=replace_once(
    s,
    "    if(t.closest?.('#nflPptRefresh')){refreshTool();return;}\n    const player=t.closest?.('[data-nfl-tool-player]');",
    "    if(t.closest?.('#nflPptRefresh')){refreshTool();return;}\n    const watch=t.closest?.('[data-nfl-ppt-watch]');if(watch){e.preventDefault();e.stopPropagation();const row=currentRows.get(watch.dataset.rowId);if(row)toggleWatch(row,watch);return;}\n    const player=t.closest?.('[data-nfl-tool-player]');",
    'watch click ownership',
)
s=s.replace("console.warn('[NFL Player Prop Tool v94.7]", "console.warn('[NFL Player Prop Tool v94.8]")

# Sportsbook image resolver/fallback and explicit table colgroup.
s=replace_once(
    s,
    "function bookLogo(book){\n  const domain=bookDomain(book);\n  return domain?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`:'';\n}",
    "function bookLogo(book,link=''){\n  let domain=bookDomain(book);\n  if(!domain&&link){try{domain=new URL(link,location.href).hostname.replace(/^www\\./,'');}catch{}}\n  return domain?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`:'';\n}",
    'sportsbook logo resolver',
)
s=replace_once(
    s,
    "book:full?String(c.book||'Sportsbook'):'TSO 50K',\n        prob,edge",
    "book:full?String(c.book||'Sportsbook'):'TSO 50K',link:full?String(c.link||''):'',\n        prob,edge",
    'candidate link',
)
s=replace_once(s,"const src=bookLogo(row.book);","const src=bookLogo(row.book,row.link);",'book link usage')
s=replace_once(
    s,
    "<img src=\"${esc(src)}\" alt=\"${esc(row.book)}\" loading=\"lazy\" referrerpolicy=\"no-referrer\"><i>",
    "<img src=\"${esc(src)}\" alt=\"${esc(row.book)}\" loading=\"lazy\" referrerpolicy=\"no-referrer\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='grid'\"><i>",
    'sportsbook image fallback',
)
s=replace_once(
    s,
    "<table class=\"nfl-ppt-table\">${'<col>'.repeat(13)}${headerHtml()}",
    "<table class=\"nfl-ppt-table\"><colgroup>${'<col>'.repeat(13)}</colgroup>${headerHtml()}",
    'explicit colgroup',
)
write(p,s)

# Readability/layout: enlarge all text/controls while reducing the Player column footprint.
p='sports/nfl/player-prop-tool-v947.css'; c=read(p)
repls={
'padding:10px 10px 28px':'padding:14px 12px 30px',
'font:800 9px/1.2 "JetBrains Mono",monospace':'font:800 10.5px/1.2 "JetBrains Mono",monospace',
'font:800 23px/1 "Oswald",sans-serif':'font:800 28px/1 "Oswald",sans-serif',
'font:600 10px/1.35 "JetBrains Mono",monospace':'font:600 12px/1.4 "JetBrains Mono",monospace',
'font:800 24px/1 "Oswald",sans-serif':'font:800 28px/1 "Oswald",sans-serif',
'font:700 8px/1.2 "JetBrains Mono",monospace':'font:700 9.5px/1.2 "JetBrains Mono",monospace',
'gap:8px;flex-wrap:wrap;padding:8px 10px':'gap:10px;flex-wrap:wrap;padding:10px 12px',
'font:700 7px/1 "JetBrains Mono",monospace;text-transform:uppercase':'font:700 8.5px/1 "JetBrains Mono",monospace;text-transform:uppercase',
'height:30px;min-width:124px;padding:0 9px':'height:36px;min-width:132px;padding:0 10px',
'font:700 10px "JetBrains Mono",monospace':'font:700 11.5px "JetBrains Mono",monospace',
'height:30px;padding:0 9px':'height:36px;padding:0 11px',
'font:800 8px "JetBrains Mono",monospace;cursor:pointer':'font:800 9.5px "JetBrains Mono",monospace;cursor:pointer',
'min-height:36px;padding:5px 10px':'min-height:44px;padding:7px 12px',
'font:800 7px "JetBrains Mono",monospace;text-transform:uppercase':'font:800 8.5px "JetBrains Mono",monospace;text-transform:uppercase',
'height:24px;min-width:35px;padding:0 7px':'height:30px;min-width:39px;padding:0 9px',
'font:800 8px "JetBrains Mono",monospace;cursor:pointer':'font:800 9.5px "JetBrains Mono",monospace;cursor:pointer',
'font:700 7px "JetBrains Mono",monospace':'font:700 8.5px "JetBrains Mono",monospace',
'min-width:1180px':'min-width:1280px',
'col:nth-child(1){width:205px':'col:nth-child(1){width:174px',
'col:nth-child(2){width:84px':'col:nth-child(2){width:96px',
'col:nth-child(3){width:106px':'col:nth-child(3){width:112px',
'col:nth-child(4),#nflView .nfl-ppt-table col:nth-child(5){width:76px':'col:nth-child(4),#nflView .nfl-ppt-table col:nth-child(5){width:86px',
'col:nth-child(6){width:78px':'col:nth-child(6){width:92px',
'col:nth-child(7){width:82px':'col:nth-child(7){width:90px',
'col:nth-child(8){width:90px':'col:nth-child(8){width:100px',
'col:nth-child(9){width:105px':'col:nth-child(9){width:110px',
'col:nth-child(10){width:75px':'col:nth-child(10){width:86px',
'col:nth-child(n+11){width:72px':'col:nth-child(n+11){width:80px',
'height:22px;padding:0 5px':'height:26px;padding:0 6px',
'font:800 7px "JetBrains Mono",monospace;letter-spacing:.08em':'font:800 8.5px "JetBrains Mono",monospace;letter-spacing:.07em',
'height:37px;padding:0':'height:44px;padding:0',
'font:800 7.6px/1.1 "JetBrains Mono",monospace':'font:800 9.2px/1.1 "JetBrains Mono",monospace',
'justify-content:flex-start;padding-left:9px':'justify-content:center;padding-left:4px',
'height:58px;background:#091522':'height:68px;background:#091522',
'height:58px;padding:5px 6px':'height:68px;padding:7px 7px',
'font:800 11px/1.2 "Oswald",sans-serif':'font:800 13px/1.2 "Oswald",sans-serif',
'font:600 7px/1 "JetBrains Mono",monospace':'font:600 8px/1.15 "JetBrains Mono",monospace',
'flex:0 0 34px;width:34px;height:34px':'flex:0 0 38px;width:38px;height:38px',
'font:800 9px "JetBrains Mono",monospace;color:#8bcdf8':'font:800 10px "JetBrains Mono",monospace;color:#8bcdf8',
'font:800 11px/1 "JetBrains Mono",monospace':'font:800 12.5px/1 "JetBrains Mono",monospace',
'font:700 6.5px/1 "JetBrains Mono",monospace':'font:700 7.5px/1.1 "JetBrains Mono",monospace',
'font:800 10px "JetBrains Mono",monospace;color:#e9f5ff':'font:800 11.5px "JetBrains Mono",monospace;color:#e9f5ff',
'font:800 7px "JetBrains Mono",monospace':'font:800 8px "JetBrains Mono",monospace',
'flex:0 0 25px;width:25px;height:25px':'flex:0 0 29px;width:29px;height:29px',
'width:19px;height:19px':'width:23px;height:23px',
'width:43px;height:43px':'width:46px;height:46px',
'width:43px;height:43px}':'width:46px;height:46px}',
'stroke-width:2.6':'stroke-width:2.2',
'font:900 8px "JetBrains Mono",monospace;color:#fff':'font:900 9.5px "JetBrains Mono",monospace;color:#fff',
'font:800 6px "JetBrains Mono",monospace;color:#8ca9c2':'font:800 7px "JetBrains Mono",monospace;color:#8ca9c2',
'grid-template-columns:30px 1fr':'grid-template-columns:34px auto',
'width:28px;height:28px':'width:32px;height:32px',
'font:900 8px "JetBrains Mono",monospace':'font:900 9.5px "JetBrains Mono",monospace',
'font:800 7px/1.1 "JetBrains Mono",monospace':'font:800 8px/1.1 "JetBrains Mono",monospace',
'}\n@media(max-width:520px){\n  #nflView .nfl-ppt-head-v947 p{font-size:7.5px}':'}\n@media(max-width:520px){\n  #nflView .nfl-ppt-head-v947 p{font-size:10px}',
'  #nflView .nfl-ppt-actions-v947 button{padding:0 7px;font-size:7px}':'  #nflView .nfl-ppt-actions-v947 button{padding:0 8px;font-size:9px}',
}
for old,new in repls.items():
    if old in c: c=c.replace(old,new)
# Make the structured Player/Matchup cells compact, centered and readable.
insert='''\n#nflView .nfl-ppt-selects-v947 label:nth-child(2) select{min-width:255px}\n#nflView .nfl-ppt-selects-v947 label:nth-child(3) select{min-width:165px}\n#nflView .nfl-ppt-player-cell-v947{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;min-width:0}\n#nflView #nflPlayerPropTool .nfl-ppt-watch-v947{flex:0 0 18px;width:18px;height:18px;min-width:18px;margin:0;padding:0;border-width:1px;font-size:12px;line-height:1}\n#nflView .nfl-ppt-player-v947{width:auto;max-width:145px;justify-content:center;gap:7px}\n#nflView .nfl-ppt-player-v947>span:last-child{text-align:left}\n#nflView .nfl-ppt-def-v947{justify-content:center;text-align:center}\n#nflView .nfl-ppt-match-v947{display:grid;place-items:center;gap:4px;text-align:center}\n#nflView .nfl-ppt-match-line-v947{display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}\n#nflView .nfl-ppt-match-line-v947 b{display:inline;font:900 11px \"JetBrains Mono\",monospace}\n#nflView .nfl-ppt-match-line-v947 span{display:inline;margin:0;color:#8fa9c2;font:800 8px \"JetBrains Mono\",monospace}\n#nflView .nfl-ppt-match-line-v947 img{width:30px;height:30px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}\n#nflView .nfl-ppt-match-line-v947 strong{font:900 9px \"JetBrains Mono\",monospace}\n#nflView .nfl-ppt-match-v947>small{display:block;color:#718da7;font:800 7.5px/1.1 \"JetBrains Mono\",monospace}\n#nflView .nfl-ppt-table th,#nflView .nfl-ppt-table td{text-align:center}\n'''
if '.nfl-ppt-player-cell-v947' not in c:c += insert
write(p,c)

# The Player Prop Tool owns its compact watch star; prevent the global decorator from adding a second star.
p='sports/nfl/watchlist-v910.js'; w=read(p)
w=replace_once(w,"  for(const el of nodes){\n    if(!eligibleNameNode(el))continue;","  for(const el of nodes){\n    if(el.closest('#nflPlayerPropTool'))continue;\n    if(!eligibleNameNode(el))continue;",'watchlist prop-tool ownership')
write(p,w)

# Retire the global Player Prop background-freeze wrapper and hard cache-bust v94.8.
p='sports/router.js'; s=read(p)
s=re.sub(r"^import \{ installNflBackgroundFreezeV930 \} from './nfl/player-prop-tool-background-freeze-v930\.js\?v=[^']+';\n",'',s,count=1,flags=re.M)
s=re.sub(r'^installNflBackgroundFreezeV930\(\);\n','',s,count=1,flags=re.M)
s,n=re.subn(r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)","import('./nfl-preview-v893.js?v=94.8')",s,count=1)
if n!=1 and "import('./nfl-preview-v893.js?v=94.8')" not in s: raise SystemExit('NFL preview router cache marker missing')
write(p,s)

# Preview cache-bust for the single owner.
p='sports/nfl-preview-v893.js'; s=read(p)
s=re.sub(r"player-prop-tool-v947\.js\?v=[^']+","player-prop-tool-v947.js?v=94.8",s,count=1)
write(p,s)

# Bump outer router cache marker without disturbing unrelated MLB/NHL versions.
p='index.html'; s=read(p)
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,s)
if not m: raise SystemExit('index router cache marker missing')
major,minor=int(m.group(1)),int(m.group(2))
s=re.sub(pat,f'./sports/router.js?v={major}.{minor+1}',s,count=1)
write(p,s)

# Cached old preview URLs must resolve without re-installing retired table writers.
stubs={
  'sports/nfl/player-prop-tool-sim-v939.js':"export function installNflPlayerPropToolSimV939(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_SIM_V939_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-controls-v933.js':"export function installNflPlayerPropToolControlsV933(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_CONTROLS_V933_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-build-period-v940.js':"export function installNflPlayerPropToolBuildPeriodV940(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-reference-v941.js':"export function installNflPlayerPropToolReferenceV941(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__={compatibilityOnly:true};\n",
}
for path,text in stubs.items(): write(path,text)

# Stop obsolete Player Prop workflows/helpers from rewriting the new single-owner build.
for path in [
  '.github/workflows/nfl-player-prop-tool-browser-v923.yml',
  '.github/workflows/one-time-nfl-player-prop-tool-clean-v944.yml',
  '.github/workflows/one-time-nfl-prop-build-period-v940.yml',
  '.github/workflows/one-time-nfl-player-prop-tool-video-v943.yml',
  'scripts/apply-nfl-player-prop-tool-v944-cleanup.py',
  'scripts/fix-nfl-player-prop-tool-v946.py',
  'scripts/apply-nfl-player-prop-tool-v943-video-fix.py',
]:
    Path(path).unlink(missing_ok=True)

# Update static regression expectations for the new label/layout/game filter.
p='scripts/nfl-player-prop-tool-v947-selftest.mjs'; t=read(p)
t=t.replace("'CONSENSUS'","'PROP LINE'")
t=t.replace("./nfl/player-prop-tool-v947.js?v=94.7","./nfl/player-prop-tool-v947.js?v=94.8")
t=t.replace("import('./nfl-preview-v893.js?v=94.7')","import('./nfl-preview-v893.js?v=94.8')")
t=t.replace("assert.ok(css.includes('stroke-width:2.6'),'coverage ring must stay thin');","assert.ok(css.includes('stroke-width:2.2'),'coverage ring must stay thin');")
if "gameOptionLabel" not in t:
    t=t.replace("assert.ok(tool.includes('teamLogo(row.opp)'),'DEF opponent logo path missing');","assert.ok(tool.includes('teamLogo(row.opp)'),'DEF opponent logo path missing');\nassert.ok(tool.includes('gameOptionLabel(g)'),'Game filter must show every slate game with date/time');\nassert.ok(tool.includes('nfl-ppt-watch-v947'),'compact Player-column watch star missing');\nassert.ok(tool.includes('nfl-ppt-match-line-v947'),'Matchup position-vs-defense-logo layout missing');")
write(p,t)

# Browser regression: new Prop Line label, complete Game dropdown, readable/centered layout.
p='tests/nfl-player-prop-tool-v947.spec.js'; t=read(p)
t=t.replace("'CONSENSUS'","'PROP LINE'")
t=t.replace("dataset.nflPptVersion==='94.7'","dataset.nflPptVersion==='94.8'")
t=t.replace("startsWith('94.7-')","startsWith('94.8-')")
t=t.replace("toHaveAttribute('data-nfl-ppt-version','94.7')","toHaveAttribute('data-nfl-ppt-version','94.8')")
t=t.replace("expect(await page.locator('#nflView .ms-modal:not(:has(.tso-nfl-player-card-v72))').filter({visible:true}).count().catch(()=>0)).toBe(0);","expect(await page.locator('#nflView .ms-modal').evaluateAll(ms=>ms.filter(m=>m.getClientRects().length&&!m.querySelector('.tso-nfl-player-card-v72')).length)).toBe(0);")
old="""  const games=await game.locator('option').evaluateAll(o=>o.map(x=>x.value).filter(v=>v!=='ALL'));
  expect(games.length).toBeGreaterThan(0);
  await game.selectOption(games[0]);
  await expect(game).toHaveValue(games[0]);
  let rows=await visibleRows(page);
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.evaluateAll((rs,g)=>rs.every(r=>r.dataset.nflPptGame===g),games[0])).toBe(true);"""
new="""  const options=await game.locator('option').evaluateAll(o=>o.slice(1).map(x=>({value:x.value,label:x.textContent||''})));
  const slateGames=await page.evaluate(async()=>{const d=await fetch('./slates/nfl.json').then(r=>r.json());return(d.games||[]).map(g=>String(g.gameId||g.id||'')).filter(Boolean);});
  expect(options.map(x=>x.value)).toEqual(slateGames);
  expect(options.every(x=>/\d{1,2}:\d{2}\s*(am|pm)/i.test(x.label))).toBe(true);
  const activeGame=await (await visibleRows(page)).first().getAttribute('data-nfl-ppt-game');
  expect(activeGame).toBeTruthy();
  await game.selectOption(activeGame);
  await expect(game).toHaveValue(activeGame);
  let rows=await visibleRows(page);
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.evaluateAll((rs,g)=>rs.every(r=>r.dataset.nflPptGame===g),activeGame)).toBe(true);"""
if old in t:t=t.replace(old,new)
if "all data columns are centered" not in t:
    t += """\n\ntest('v94.8 readability pass keeps all columns centered and Player/Matchup compact',async({page})=>{\n  await open(page);\n  const row=page.locator('#nflPlayerPropTool tbody tr:visible').first();\n  const layout=await row.evaluate(r=>({centers:[...r.children].every(td=>getComputedStyle(td).textAlign==='center'),playerWidth:r.children[0].getBoundingClientRect().width,star:r.querySelector('.nfl-ppt-watch-v947')?.getBoundingClientRect().width||0,avatar:r.querySelector('.nfl-ppt-avatar-v947')?.getBoundingClientRect().width||0,matchLogo:r.querySelector('.nfl-ppt-match-line-v947 img')?.getAttribute('src')||'',matchText:r.querySelector('.nfl-ppt-match-line-v947')?.textContent||''}));\n  expect(layout.centers).toBe(true);\n  expect(layout.playerWidth).toBeLessThan(190);\n  expect(layout.star).toBeLessThan(layout.avatar);\n  expect(layout.matchLogo).toContain('teamlogos/nfl');\n  expect(layout.matchText).toMatch(/QB|RB|WR|TE/);\n});\n"""
write(p,t)

print('NFL Player Prop Tool v94.8 readability + complete Game filter cutover prepared')
