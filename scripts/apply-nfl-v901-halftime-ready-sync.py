from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text()
    if new in s:
        return
    if old not in s:
        raise SystemExit(f'{label} marker missing in {path}')
    p.write_text(s.replace(old,new,1))

# The Lab must not depend on a browser live-event arriving before it can trust
# an already-published READY halftime board. Pull the authoritative published
# live snapshot alongside the board on every Lab poll and sync it first.
p=Path('sports/nfl/halftime-ui-v884.js')
s=p.read_text()
helper="""function publishedLiveGames(doc){
  const rows=doc?.games&&typeof doc.games==='object'?Object.entries(doc.games):[];
  return rows.map(([id,g])=>({
    id:String(id),gameId:String(id),
    status:g?.status||'',statusDetail:g?.statusDetail||'',detail:g?.detail||'',
    period:g?.period,clockMin:g?.clockMin,clock:g?.clock||'',lastFetchedAt:g?.lastFetchedAt??doc?.lastFetchedAt??null,
    away:{abbr:g?.awayAbbr||'AWY',score:g?.awayScore},home:{abbr:g?.homeAbbr||'HOME',score:g?.homeScore},
    liveScore:{...g,lastFetchedAt:g?.lastFetchedAt??doc?.lastFetchedAt??null}
  }));
}
async function fetchPublishedLiveGames(){
  try{
    const r=await fetch(`./slates/nfl-live.json?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)return [];
    return publishedLiveGames(await r.json());
  }catch{return [];}
}

"""
marker='export function startHalftimeBoardPolling(onUpdate,{intervalMs=5000}={}){'
if helper.strip() not in s:
    if marker not in s: raise SystemExit('halftime polling marker missing')
    s=s.replace(marker,helper+marker,1)

old_tick="""    try{
      const r=await fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();if(!Array.isArray(d?.games))return;
      currentDoc=d;onUpdate?.(d);refreshOpenDrawer();
    }catch{}
"""
new_tick="""    try{
      const [r,published]=await Promise.all([
        fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'}),
        fetchPublishedLiveGames()
      ]);
      if(published.length)syncLiveGames(published);
      if(!r.ok)return;
      const d=await r.json();if(!Array.isArray(d?.games))return;
      currentDoc=d;onUpdate?.(d);refreshOpenDrawer();
    }catch{}
"""
if new_tick not in s:
    if old_tick not in s: raise SystemExit('halftime tick block missing')
    s=s.replace(old_tick,new_tick,1)

old_latest="""async function latestDoc(fallback){
  try{
    const r=await fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'});
    if(r.ok){const d=await r.json();if(Array.isArray(d?.games)){currentDoc=d;return d;}}
  }catch{}
  return currentDoc||fallback||{games:[]};
}
"""
new_latest="""async function latestDoc(fallback){
  try{
    const [r,published]=await Promise.all([
      fetch(`./slates/nfl-halftime.json?t=${Date.now()}`,{cache:'no-store'}),
      fetchPublishedLiveGames()
    ]);
    if(published.length)syncLiveGames(published);
    if(r.ok){const d=await r.json();if(Array.isArray(d?.games)){currentDoc=d;return d;}}
  }catch{}
  return currentDoc||fallback||{games:[]};
}
"""
if new_latest not in s:
    if old_latest not in s: raise SystemExit('latestDoc block missing')
    s=s.replace(old_latest,new_latest,1)

s=s.replace("./halftime-validity.js?v=89.36","./halftime-validity.js?v=89.38",1)
p.write_text(s)

replace_once('sports/nfl-preview.js',"./nfl/halftime-ui-v884.js?v=89.36","./nfl/halftime-ui-v884.js?v=89.38",'halftime UI cache bust')
replace_once('sports/nfl-preview-v890.js',"import('./nfl-preview.js?v=89.37')","import('./nfl-preview.js?v=89.38')",'base preview cache bust')
replace_once('sports/nfl-preview-v893.js',"./nfl-preview-v890.js?v=89.37","./nfl-preview-v890.js?v=89.38",'wrapper cache bust')
replace_once('sports/router.js',"./nfl-preview-v893.js?v=89.37","./nfl-preview-v893.js?v=89.38",'router NFL cache bust')

# Outer router cache: preserve all current MLB code and only advance the URL.
idx=Path('index.html'); text=idx.read_text()
text2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.54',text,count=1)
if n!=1: raise SystemExit('index router cache marker missing')
idx.write_text(text2)

# Keep older NFL regressions future-safe instead of pinning the now-stale 89.37 wrapper.
for test_path in ['scripts/nfl-v900-stale-live-selftest.mjs','scripts/live-game-switcher-selftest.mjs']:
    q=Path(test_path)
    if not q.exists(): continue
    t=q.read_text()
    t=t.replace("./nfl-preview-v893.js?v=89.37","./nfl-preview-v893.js?v=89.38")
    t=t.replace("import('./nfl-preview.js?v=89.37')","import('./nfl-preview.js?v=89.38')")
    t=t.replace("./nfl-preview-v890.js?v=89.37","./nfl-preview-v890.js?v=89.38")
    q.write_text(t)

print('Applied NFL v901 halftime READY authoritative snapshot sync')
