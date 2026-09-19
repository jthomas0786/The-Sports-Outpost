from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label, flags=0):
    out, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {n}')
    return out

# 1) Fix the Bet Style/filter event race and async visibility flicker.
p = 'sports/nfl/player-prop-tool-build-period-v940.js'
s = read(p)
s = replace_once(s, "const VERSION='94.2';", "const VERSION='94.3';", 'v940 version')
s = replace_once(s, "player-prop-tool-build-period-v940.css?v=94.2", "player-prop-tool-build-period-v940.css?v=94.3", 'v940 css cache')
s = replace_once(s, "let patchTimers=[];\nconst tableSnapshots=new WeakMap();", "let patchTimers=[];\nlet applyGeneration=0;\nconst tableSnapshots=new WeakMap();", 'apply generation state')
s = replace_once(s, "const market=String(row?.dataset?.nflPptSimMarket||row?.dataset?.snapshotMarket||'');", "const market=String(row?.dataset?.snapshotMarket||row?.dataset?.nflPptSimMarket||'');", 'stable market identity')
s = replace_once(s, "for(const item of snap.rows){item.row.innerHTML=item.html;restoreRowDataset(item.row,item.data);item.row.hidden=false;tbody?.appendChild(item.row);}", "for(const item of snap.rows){item.row.innerHTML=item.html;restoreRowDataset(item.row,item.data);tbody?.appendChild(item.row);}", 'preserve row visibility during restore')
s = replace_once(s, "if(filterState.positions?.size&&d.snapshotPosition&&!filterState.positions.has(d.snapshotPosition))return false;", "if(filterState.positions&&d.snapshotPosition&&!filterState.positions.has(d.snapshotPosition))return false;", 'position filter authority')
s = replace_once(s,
"async function applyFullBuild(table){\n  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected)return false;",
"async function applyFullBuild(table,generation){\n  const sim=await readSim();if(!table.isConnected||generation!==applyGeneration)return false;\n  const snap=restoreFull(table);",
'full async race guard')
s = replace_once(s,
"async function applyPeriodBuild(table){\n  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected||period==='full')return applyFullBuild(table);",
"async function applyPeriodBuild(table,generation){\n  const sim=await readSim();if(!table.isConnected||generation!==applyGeneration)return false;if(period==='full')return applyFullBuild(table,generation);\n  const snap=restoreFull(table);",
'period async race guard')
s = replace_once(s,
"function updateCount(tool){if(!tool)return;const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')],count=tool.querySelector('.nfl-ppt-head-stat b');if(count)count.textContent=String(rows.filter(r=>!r.hidden).length);}",
"function updateCount(tool){if(!tool)return;const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')],visible=rows.filter(r=>!r.hidden).length,count=tool.querySelector('.nfl-ppt-head-stat b');if(count)count.textContent=String(visible);const empty=tool.querySelector('.nfl-ppt-snapshot-empty');if(empty)empty.hidden=visible!==0;}",
'count + empty state sync')
s = replace_once(s,
"async function applyCurrent(){\n  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table||table.dataset.nflPptSimV939!=='93.9')return false;saveSnapshot(table);tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;return period==='full'?applyFullBuild(table):applyPeriodBuild(table);\n}",
"async function applyCurrent(){\n  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table||table.dataset.nflPptSimV939!=='93.9')return false;const generation=++applyGeneration;saveSnapshot(table);tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;return period==='full'?applyFullBuild(table,generation):applyPeriodBuild(table,generation);\n}",
'applyCurrent generation')
s = s.replace('[NFL Player Prop Tool v94.2]', '[NFL Player Prop Tool v94.3]')
write(p, s)

# 2) Install Bet Style capture handler BEFORE snapshot's legacy View handler.
p = 'sports/nfl-preview-v893.js'
s = read(p)
s = replace_once(s, "player-prop-tool-build-period-v940.js?v=94.2", "player-prop-tool-build-period-v940.js?v=94.3", 'wrapper v940 cache')
old = "    installNflPlayerPropToolUxV930();\n    installNflPlayerPropToolSnapshotV928();\n    installNflPlayerPropToolSimV939();\n    installNflPlayerPropToolControlsV933();\n    installNflPlayerPropToolThemeV936();\n    installNflPlayerPropToolPolishV938();\n    installNflPlayerPropToolBuildPeriodV940();"
new = "    installNflPlayerPropToolUxV930();\n    // Bet Style owns #nflPptMode. Install it before the snapshot layer so its\n    // capture handler can consume Bet Style changes before the legacy View\n    // handler interprets the same select as state.mode. Other filter changes\n    // continue through to snapshot, then v94.3 reapplies from updated state.\n    installNflPlayerPropToolBuildPeriodV940();\n    installNflPlayerPropToolSnapshotV928();\n    installNflPlayerPropToolSimV939();\n    installNflPlayerPropToolControlsV933();\n    installNflPlayerPropToolThemeV936();\n    installNflPlayerPropToolPolishV938();"
s = replace_once(s, old, new, 'wrapper install order')
s = s.replace('[NFL Player Prop Tool v94.2]', '[NFL Player Prop Tool v94.3]')
write(p, s)

# 3) Hard cache-bust the NFL wrapper and outer router so production browsers get the fix.
p = 'sports/router.js'
s = read(p)
s = regex_once(s, r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)", "import('./nfl-preview-v893.js?v=94.3')", 'router NFL wrapper cache')
write(p, s)

p = 'index.html'
s = read(p)
pat = r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m = re.search(pat, s)
if not m:
    raise SystemExit('index outer router cache marker missing')
major, minor = int(m.group(1)), int(m.group(2))
s = regex_once(s, pat, f'./sports/router.js?v={major}.{minor+1}', 'outer router cache bump')
write(p, s)
print(f'outer router cache {major}.{minor} -> {major}.{minor+1}')

# 4) Lock the regression checks to v94.3 and the required capture-listener order.
p = 'scripts/nfl-player-prop-tool-v940-selftest.mjs'
s = read(p)
s = replace_once(s, "player-prop-tool-build-period-v940.js?v=94.2", "player-prop-tool-build-period-v940.js?v=94.3", 'selftest wrapper version')
needle = "assert.ok(preview.includes('installNflPlayerPropToolBuildPeriodV940();'),'NFL wrapper must install Bet Style controls');"
addition = needle + "\nassert.ok(preview.indexOf('installNflPlayerPropToolBuildPeriodV940();')<preview.indexOf('installNflPlayerPropToolSnapshotV928();'),'Bet Style capture listener must install before snapshot legacy View listener');\nassert.ok(ui.includes('let applyGeneration=0'),'v94.3 must guard overlapping async style/filter applications');\nassert.ok(ui.includes('generation!==applyGeneration'),'v94.3 stale async applications must be discarded');"
s = replace_once(s, needle, addition, 'selftest race assertions')
s = s.replace('v94.2 UI missing', 'v94.3 UI missing')
s = s.replace('v94.2 Player Prop controls', 'v94.3 Player Prop controls')
s = s.replace('v94.2 compact/mobile CSS', 'v94.3 compact/mobile CSS')
s = s.replace('NFL Player Prop Tool v94.2 Bet Style regression passed', 'NFL Player Prop Tool v94.3 Bet Style regression passed')
write(p, s)

p = 'tests/nfl-player-prop-tool-build-period-v940.spec.js'
s = read(p)
s = s.replace('data-nfl-ppt-build-style="94.2"', 'data-nfl-ppt-build-style="94.3"')
write(p, s)

# 5) Rename the normal browser QA to the UI hotfix version.
p = '.github/workflows/nfl-player-prop-tool-browser-v923.yml'
s = read(p)
s = replace_once(s, 'name: NFL Player Prop Tool Browser QA v94.2', 'name: NFL Player Prop Tool Browser QA v94.3', 'browser workflow name')
s = s.replace('# v94.2 validates', '# v94.3 validates')
write(p, s)

# 6) Archive the old expensive one-time generator so this hotfix cannot retrigger it.
p = '.github/workflows/one-time-nfl-prop-build-period-v940.yml'
s = read(p)
s = regex_once(s, r"on:\n  workflow_dispatch:\n  push:\n    paths:\n(?:      - .+\n)+", "on:\n  workflow_dispatch:\n", 'archive old one-time push trigger')
write(p, s)

print('Applied NFL Player Prop Tool v94.3 video/event-race hotfix.')
