from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text()
    if new in s:
        print(f'{label}: already applied')
        return
    if old not in s:
        raise SystemExit(f'{label}: marker missing in {path}')
    p.write_text(s.replace(old,new,1))
    print(f'{label}: applied')

# Base NFL Live page: a stale slate status must not make a previous-day game live forever.
replace_once(
    'sports/nfl-preview.js',
    "function liveHTML(){\n  const realLive=data().games.filter(g=>g.status==='in');",
    """const NFL_LIVE_STALE_MS=8*60*60*1000;
function nflLiveKickoffMs(g){
  return Date.parse(g?.startTimeUTC||g?.startDateUTC||g?.date||g?.start||'');
}
function isFreshNflLiveGame(g,now=Date.now()){
  if(g?.status!=='in') return false;
  const kickoff=nflLiveKickoffMs(g);
  return !Number.isFinite(kickoff)||now-kickoff<=NFL_LIVE_STALE_MS;
}
function liveHTML(){
  const realLive=data().games.filter(g=>isFreshNflLiveGame(g));""",
    'base live-page freshness guard'
)

# Live selector: retain a live game only when it is recent, unless a fresh live snapshot explicitly says it is live.
p=Path('sports/nfl/live-game-switcher-v894.js')
s=p.read_text()
if 'const LIVE_STALE_MS=8*60*60*1000;' not in s:
    marker="""const normStatus=v=>{
 const s=String(v||'').trim().toLowerCase().replace(/[\\s_-]+/g,'');
 if(['post','final','closed','complete','completed','gameover'].includes(s))return 'post';
 if(['in','live','inprogress','inprogressgame','halftime'].includes(s))return 'in';
 if(['pre','scheduled','created','preview'].includes(s))return 'pre';
 return s;
};
"""
    insert=marker+"""
const LIVE_STALE_MS=8*60*60*1000;
function isFreshLiveCandidate(g,now=Date.now()){
 const kickoff=Date.parse(g?.start||g?.startTimeUTC||g?.startDateUTC||g?.date||'');
 return !Number.isFinite(kickoff)||now-kickoff<=LIVE_STALE_MS;
}
"""
    if marker not in s: raise SystemExit('switcher freshness helper marker missing')
    s=s.replace(marker,insert,1)

old=""" return all.map(g=>{
  const status=authoritativeStatus.get(g.id)||normStatus(g.status);
  if(status==='in')return {...g,...(liveOverrides.get(g.id)||{}),status:'in'};
  return {...g,status};
 });
"""
new=""" return all.map(g=>{
  const auth=authoritativeStatus.get(g.id);
  const status=auth||normStatus(g.status);
  if(status==='in'&&(auth==='in'||isFreshLiveCandidate(g)))return {...g,...(liveOverrides.get(g.id)||{}),status:'in'};
  if(status==='in'){
   liveOverrides.delete(g.id);
   return {...g,status:'post'};
  }
  return {...g,status};
 });
"""
if new not in s:
    if old not in s: raise SystemExit('switcher collect status marker missing')
    s=s.replace(old,new,1)

old_export="export const __NFL_LIVE_SWITCHER_V894_TEST__={gameLabel,itemFromSlate,openGame,collect,preferredGame,liveGames,nextGame,idleLabel,normStatus,ingestLiveSnapshot};"
new_export="export const __NFL_LIVE_SWITCHER_V894_TEST__={gameLabel,itemFromSlate,openGame,collect,preferredGame,liveGames,nextGame,idleLabel,normStatus,ingestLiveSnapshot,isFreshLiveCandidate,LIVE_STALE_MS};"
if new_export not in s:
    if old_export not in s: raise SystemExit('switcher test export marker missing')
    s=s.replace(old_export,new_export,1)
p.write_text(s)
print('live selector freshness guard: applied')

replace_once('sports/nfl-preview-v890.js', "import('./nfl-preview.js?v=89.36')", "import('./nfl-preview.js?v=89.37')", 'base preview cache bust')
replace_once('sports/nfl-preview-v893.js', "import * as basePreview from './nfl-preview-v890.js?v=89.36';", "import * as basePreview from './nfl-preview-v890.js?v=89.37';", 'wrapper base cache bust')
replace_once('sports/nfl-preview-v893.js', "./nfl/live-game-switcher-v894.js?v=89.32", "./nfl/live-game-switcher-v894.js?v=89.37", 'switcher cache bust')
replace_once('sports/router.js', "./nfl-preview-v893.js?v=89.36", "./nfl-preview-v893.js?v=89.37", 'router NFL cache bust')

# Current MLB v921 owns router v90.47. Only bump the outer module URL; MLB code itself is untouched.
p=Path('index.html'); s=p.read_text()
if './sports/router.js?v=90.48' not in s:
    s2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.48',s,count=1)
    if n!=1: raise SystemExit('index router cache-bust marker missing')
    p.write_text(s2)
print('index router cache bust: applied')

# Keep the shared current selector regression aligned with the production module graph.
p=Path('scripts/live-game-switcher-selftest.mjs'); s=p.read_text()
s=s.replace("./nfl/live-game-switcher-v894.js?v=89.32","./nfl/live-game-switcher-v894.js?v=89.37")
s=s.replace("./nfl-preview-v893.js?v=89.36","./nfl-preview-v893.js?v=89.37")
p.write_text(s)
print('shared selector regression: aligned')
