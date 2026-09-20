from pathlib import Path
import json
import subprocess

AUTO=Path('sports/nfl/sim/auto.js')
SIM_AUTO=Path('scripts/nfl-sim-auto.mjs')
SELFTEST=Path('scripts/nfl-sim-auto-selftest.mjs')
SIM=Path('slates/nfl-sim.json')
LIVE=Path('slates/nfl-live.json')
SLATE=Path('slates/nfl.json')


def replace_once(path, old, new, label):
    text=path.read_text()
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match in {path}, found {count}')
    path.write_text(text.replace(old,new,1))

# Permanent cache ownership: halftime/live simulation runs must not erase the
# frozen pregame Player Prop Tool boards that users need for in-game research.
marker='export function nextAutomationState({previousState=null,decision,result,game,now=new Date()}){\n'
insert="""export function preservePregamePropCache({previousResult=null,nextResult=null,phase='pregame'}={}){\n  if(!nextResult||typeof nextResult!=='object'||!previousResult||phase==='pregame') return nextResult;\n  const out={...nextResult};\n  for(const key of ['propStyles','propStyleVersion','propPeriods','propPeriodVersion']){\n    if(out[key]==null&&previousResult[key]!=null) out[key]=previousResult[key];\n  }\n  return out;\n}\n\n"""
auto=AUTO.read_text()
if 'export function preservePregamePropCache' not in auto:
    if marker not in auto:
        raise SystemExit('auto cache helper insertion marker missing')
    AUTO.write_text(auto.replace(marker,insert+marker,1))

replace_once(
    SIM_AUTO,
    "import { decideAutomaticRun, nextAutomationState } from '../sports/nfl/sim/auto.js';",
    "import { decideAutomaticRun, nextAutomationState, preservePregamePropCache } from '../sports/nfl/sim/auto.js';",
    'sim auto import'
)
replace_once(
    SIM_AUTO,
    '  const result=stripPrivateSamples(raw);',
    "  const result=preservePregamePropCache({previousResult:old,nextResult:stripPrivateSamples(raw),phase:decision.phase});",
    'sim result cache preservation'
)

replace_once(
    SELFTEST,
    "import { decideAutomaticRun, nextAutomationState, activePregameCheckpoint, isHalftimeState } from '../sports/nfl/sim/auto.js';",
    "import { decideAutomaticRun, nextAutomationState, activePregameCheckpoint, isHalftimeState, preservePregamePropCache } from '../sports/nfl/sim/auto.js';",
    'selftest import'
)
cache_test="""\n// Live/halftime updates must retain the exact frozen pregame Prop Tool cache.\nconst frozenPropStyles={ready:true,candidates:[{id:'frozen-prop'}],rankings:{tsoPick:['frozen-prop']}};\nconst frozenPropPeriods={full:{ready:true,candidates:[{id:'frozen-period'}]}};\nconst cachedPregame={propStyleVersion:'v94.2',propStyles:frozenPropStyles,propPeriodVersion:'v94.0',propPeriods:frozenPropPeriods};\nfor(const phase of ['live','halftime']){\n  const retained=preservePregamePropCache({previousResult:cachedPregame,nextResult:{iterations:15000,game:{gameId:'AUTO-NE-SEA'}},phase});\n  assert.deepEqual(retained.propStyles,frozenPropStyles,`${phase} update erased frozen propStyles`);\n  assert.deepEqual(retained.propPeriods,frozenPropPeriods,`${phase} update erased frozen propPeriods`);\n  assert.equal(retained.propStyleVersion,'v94.2');\n  assert.equal(retained.propPeriodVersion,'v94.0');\n}\nconst refreshed={ready:true,candidates:[{id:'new-prop'}],rankings:{tsoPick:['new-prop']}};\nconst liveWithOwnBoard=preservePregamePropCache({previousResult:cachedPregame,nextResult:{propStyles:refreshed},phase:'live'});\nassert.equal(liveWithOwnBoard.propStyles,refreshed,'newly supplied board must not be overwritten by older cache');\nconst pregameNoCarry=preservePregamePropCache({previousResult:cachedPregame,nextResult:{iterations:50000},phase:'pregame'});\nassert.equal(pregameNoCarry.propStyles,undefined,'pregame rebuilds must own their newly generated board');\n\n"""
selftext=SELFTEST.read_text()
if 'Live/halftime updates must retain the exact frozen pregame Prop Tool cache.' not in selftext:
    hook="const post={...halftime,status:'post',period:4,clockMin:0,statusDetail:'Final'};\n"
    if hook not in selftext:
        raise SystemExit('selftest insertion marker missing')
    SELFTEST.write_text(selftext.replace(hook,cache_test+hook,1))

# One-time repair for games that are already live and lost their pregame board
# before the permanent preservation logic existed. Restore the newest verified
# prop board for each live game from nfl-sim.json history.
live=json.loads(LIVE.read_text()) if LIVE.exists() else {'games':{}}
sim=json.loads(SIM.read_text())
slate=json.loads(SLATE.read_text()) if SLATE.exists() else {'games':[]}

def live_now(rec):
    status=str((rec or {}).get('status') or '').lower()
    detail=str((rec or {}).get('statusDetail') or (rec or {}).get('detail') or '').lower()
    if status in {'post','final','completed','closed'} or 'final' in detail:
        return False
    return status in {'in','live','halftime','half'} or 'halftime' in detail

live_ids={str(gid) for gid,rec in (live.get('games') or {}).items() if live_now(rec)}
by_id={str((g.get('game') or {}).get('gameId') or g.get('gameId') or ''):g for g in sim.get('games') or []}
missing={gid for gid in live_ids if gid in by_id and not ((by_id[gid].get('propStyles') or {}).get('ready') and (by_id[gid].get('propStyles') or {}).get('candidates'))}
restored={}

if missing:
    shas=subprocess.check_output(['git','log','-n','80','--format=%H','--','slates/nfl-sim.json'],text=True).splitlines()
    for sha in shas:
        if not missing:
            break
        try:
            raw=subprocess.check_output(['git','show',f'{sha}:slates/nfl-sim.json'],text=True,stderr=subprocess.DEVNULL)
            old=json.loads(raw)
        except Exception:
            continue
        old_by={str((g.get('game') or {}).get('gameId') or g.get('gameId') or ''):g for g in old.get('games') or []}
        for gid in list(missing):
            prior=old_by.get(gid)
            board=(prior or {}).get('propStyles') or {}
            if not (board.get('ready') and board.get('candidates')):
                continue
            current=by_id[gid]
            for key in ['propStyles','propStyleVersion','propPeriods','propPeriodVersion']:
                if prior.get(key) is not None and current.get(key) is None:
                    current[key]=prior[key]
            # propStyles is the required live-reference payload; ensure it is copied
            # even if a broken empty object survived the overwrite.
            current['propStyles']=prior['propStyles']
            if prior.get('propStyleVersion') is not None:
                current['propStyleVersion']=prior['propStyleVersion']
            restored[gid]=sha
            missing.remove(gid)

if missing:
    raise SystemExit('Unable to restore frozen pregame prop cache for live game(s): '+', '.join(sorted(missing)))

if restored:
    SIM.write_text(json.dumps(sim,indent=2)+'\n')
    for gid,sha in restored.items():
        print(f'restored live Prop Tool cache for {gid} from {sha[:12]}')
else:
    print('no already-live Prop Tool cache repair was needed')

print('v95.4 live Player Prop Tool cache preservation applied')
