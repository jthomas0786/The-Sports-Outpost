from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if new in s:
        print(label, 'already applied')
        return
    if old not in s:
        raise SystemExit(f'missing anchor: {label}')
    p.write_text(s.replace(old, new, 1))
    print('applied', label)


# Keep the Halftime Lab synchronized from the authoritative 2s NFL live snapshot
# stream. This decouples generator readiness from full-page renders, which are
# intentionally suppressed when a five-second halftime-board poll is unchanged.
replace_once(
    'sports/nfl/halftime-ui-v884.js',
    'let pollTimer=null;\n',
    'let pollTimer=null,liveSnapshotSyncArmed=false;\n',
    'halftime snapshot sync state')

old_sync = """function syncOneLiveGame(g){
  const id=gid(g);if(!id)return;
  if(isHalftimeWarmupGameState(g))currentLiveGames.set(id,g);else currentLiveGames.delete(id);
  refreshOpenDrawer();
}"""
new_sync = """function liveWindowKey(g){
  if(!g)return '';
  const live=g.liveScore||g,away=live.awayScore??g.away?.score??'',home=live.homeScore??g.home?.score??'';
  return `${gid(g)}|${isHalftimeWarmupGameState(g)?1:0}|${isHalftimeGameState(g)?1:0}|${statusOf(g)}|${periodOf(g)}|${away}-${home}`;
}
function syncOneLiveGame(g){
  const id=gid(g);if(!id)return;
  const before=liveWindowKey(currentLiveGames.get(id));
  if(isHalftimeWarmupGameState(g))currentLiveGames.set(id,g);else currentLiveGames.delete(id);
  const after=liveWindowKey(currentLiveGames.get(id));
  if(before!==after)refreshOpenDrawer(true);
}
function armLiveSnapshotSync(){
  if(liveSnapshotSyncArmed||typeof window==='undefined')return;
  liveSnapshotSyncArmed=true;
  window.addEventListener('tso:nfl-live-snapshot',e=>syncOneLiveGame(e?.detail),true);
  if(window.__TSO_NFL_LIVE_LATEST__)syncOneLiveGame(window.__TSO_NFL_LIVE_LATEST__);
}"""
replace_once('sports/nfl/halftime-ui-v884.js', old_sync, new_sync, 'direct live snapshot synchronization')
replace_once(
    'sports/nfl/halftime-ui-v884.js',
    "export function startHalftimeBoardPolling(onUpdate,{intervalMs=5000}={}){\n  if(pollTimer)return;",
    "export function startHalftimeBoardPolling(onUpdate,{intervalMs=5000}={}){\n  armLiveSnapshotSync();\n  if(pollTimer)return;",
    'arm snapshot sync with board poller')
replace_once(
    'sports/nfl/halftime-ui-v884.js',
    "export async function openHalftimeParlayLab({halftimeDoc=null}={}){\n  ensureHalftimeLabStyles();const doc=await latestDoc(halftimeDoc);currentDoc=doc;",
    "export async function openHalftimeParlayLab({halftimeDoc=null}={}){\n  ensureHalftimeLabStyles();armLiveSnapshotSync();const doc=await latestDoc(halftimeDoc);currentDoc=doc;",
    'arm snapshot sync when lab opens')

# Include the current live sportsbook quote cache in the halftime automation
# fingerprint. Previously a READY board could not be rebuilt when only the live
# quotes refreshed; it then aged past the ten-minute validity gate and disabled
# Generate even though newer quotes were already available.
replace_once(
    'sports/nfl/sim/auto.js',
    "export function gameInputFingerprint({game,research,odds,liveGame=null,phase='pregame'}){",
    "export function gameInputFingerprint({game,research,odds,liveGame=null,liveOdds=null,phase='pregame'}){",
    'halftime fingerprint live-odds input')

old_live = """  if(phase==='live'||phase==='halftime'){
    payload.live={
      status:liveGame?.status||null,statusDetail:liveGame?.statusDetail||null,period:liveGame?.period??null,clockMin:liveGame?.clockMin??null,
      awayScore:liveGame?.awayScore??null,homeScore:liveGame?.homeScore??null,possession:liveGame?.possession??null,yardFromOwn:liveGame?.yardFromOwn??null,
      down:liveGame?.down??null,distance:liveGame?.distance??null,lastPlayText:liveGame?.lastPlayText||null,
      playerStats:liveGame?.playerStats||null,teamStats:liveGame?.teamStats||null,
    };
  }
  return hash32(stableStringify(payload)).toString(16).padStart(8,'0');"""
new_live = """  if(phase==='live'||phase==='halftime'){
    payload.live={
      status:liveGame?.status||null,statusDetail:liveGame?.statusDetail||null,period:liveGame?.period??null,clockMin:liveGame?.clockMin??null,
      awayScore:liveGame?.awayScore??null,homeScore:liveGame?.homeScore??null,possession:liveGame?.possession??null,yardFromOwn:liveGame?.yardFromOwn??null,
      down:liveGame?.down??null,distance:liveGame?.distance??null,lastPlayText:liveGame?.lastPlayText||null,
      playerStats:liveGame?.playerStats||null,teamStats:liveGame?.teamStats||null,
    };
  }
  if(phase==='halftime'){
    const gameId=String(game?.gameId||game?.id||'');
    const liveOddsGame=(liveOdds?.games||[]).find(g=>String(g?.gameId||'')===gameId)||null;
    payload.liveOdds=liveOddsGame?{
      fetchedAt:liveOdds?.meta?.fetchedAt||null,
      gameId,
      players:(liveOddsGame.players||[]).map(p=>({name:normName(p?.name),team:normTeam(p?.team),odds:p?.odds||null}))
        .sort((a,b)=>`${a.team}|${a.name}`.localeCompare(`${b.team}|${b.name}`)),
    }:null;
  }
  return hash32(stableStringify(payload)).toString(16).padStart(8,'0');"""
replace_once('sports/nfl/sim/auto.js', old_live, new_live, 'live sportsbook quotes in halftime fingerprint')
replace_once(
    'sports/nfl/sim/auto.js',
    "  game,research,odds,liveGame=null,previousState=null,existingResult=null,config,now=new Date(),force=false,",
    "  game,research,odds,liveGame=null,liveOdds=null,previousState=null,existingResult=null,config,now=new Date(),force=false,",
    'automation decision live-odds input')
replace_once(
    'sports/nfl/sim/auto.js',
    '  const fingerprint=gameInputFingerprint({game,research,odds,liveGame,phase});',
    '  const fingerprint=gameInputFingerprint({game,research,odds,liveGame,liveOdds,phase});',
    'automation decision live-odds fingerprint')
replace_once(
    'scripts/nfl-sim-auto.mjs',
    '  let decision=decideAutomaticRun({game,research,odds,liveGame,previousState:prev,existingResult:old,config,now:NOW,force:FORCE});',
    '  let decision=decideAutomaticRun({game,research,odds,liveGame,liveOdds,previousState:prev,existingResult:old,config,now:NOW,force:FORCE});',
    'simulation automation passes live odds')

p = Path('scripts/nfl-v8918-live-sim-selftest.mjs')
s = p.read_text()
anchor = """assert.equal(halfDecision.phase,'halftime');
assert.equal(halfDecision.iterations,50000);

const fp1=gameInputFingerprint({game,research,odds,liveGame,phase:'live'});"""
insert = """assert.equal(halfDecision.phase,'halftime');
assert.equal(halfDecision.iterations,50000);
const halfOddsA={meta:{fetchedAt:'2026-09-12T01:29:00Z'},games:[{gameId:game.gameId,players:[{name:'Puka Nacua',team:'LA',odds:{recYds:{line:90.5,over:{best:{price:-110,ageSeconds:20}}}}}]}]};
const halfOddsB=structuredClone(halfOddsA);halfOddsB.meta.fetchedAt='2026-09-12T01:33:00Z';
const halfFpA=gameInputFingerprint({game,research,odds,liveGame:halftime,liveOdds:halfOddsA,phase:'halftime'});
const halfFpB=gameInputFingerprint({game,research,odds,liveGame:halftime,liveOdds:halfOddsB,phase:'halftime'});
assert.notEqual(halfFpA,halfFpB,'fresh halftime sportsbook quotes must change the candidate-board fingerprint');
const halfRefresh=decideAutomaticRun({game,research,odds,liveGame:halftime,liveOdds:halfOddsB,previousState:{halftimeFingerprint:halfFpA,halftimeCandidateAttempts:1},existingResult:result,config,now:new Date('2026-09-12T01:34:00Z')});
assert.equal(halfRefresh.run,true,'new halftime sportsbook quotes must rebuild the 50K candidate board');
assert.equal(halfRefresh.phase,'halftime');

const fp1=gameInputFingerprint({game,research,odds,liveGame,phase:'live'});"""
if insert not in s:
    if anchor not in s:
        raise SystemExit('missing anchor: halftime refresh regression')
    p.write_text(s.replace(anchor, insert, 1))

# Cache-bust the entire NFL module chain so the generator fix is not stranded
# behind an older ESM URL in the browser cache.
replace_once('sports/nfl-preview.js', "./nfl/halftime-ui-v884.js?v=89.26", "./nfl/halftime-ui-v884.js?v=89.33", 'halftime UI cache')
replace_once('sports/nfl-preview-v890.js', "./nfl-preview.js?v=89.27", "./nfl-preview.js?v=89.33", 'base NFL preview cache')
replace_once('sports/nfl-preview-v893.js', "./nfl-preview-v890.js?v=89.27", "./nfl-preview-v890.js?v=89.33", 'NFL wrapper base cache')
replace_once('sports/router.js', "./nfl-preview-v893.js?v=89.32", "./nfl-preview-v893.js?v=89.33", 'NFL router cache')
replace_once('index.html', './sports/router.js?v=90.29', './sports/router.js?v=90.30', 'index router cache')

p = Path('scripts/live-game-switcher-selftest.mjs')
p.write_text(p.read_text().replace("./nfl-preview-v893.js?v=89.32", "./nfl-preview-v893.js?v=89.33"))
p = Path('.github/workflows/nfl-gamecast-tests.yml')
s = p.read_text()
s = s.replace('./sports/router.js?v=90.29', './sports/router.js?v=90.30')
s = s.replace('./nfl-preview-v893.js?v=89.32', './nfl-preview-v893.js?v=89.33')
s = s.replace('./nfl-preview-v890.js?v=89.27', './nfl-preview-v890.js?v=89.33')
s = s.replace('./nfl-preview.js?v=89.27', './nfl-preview.js?v=89.33')
p.write_text(s)

print('NFL halftime generator v89.33 patch complete')
