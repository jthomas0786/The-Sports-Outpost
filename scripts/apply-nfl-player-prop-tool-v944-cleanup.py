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


# 1) Make v94.4 the single authority for Bet Style + period columns.
p = 'sports/nfl/player-prop-tool-build-period-v940.js'
s = read(p)
s = replace_once(s, "const VERSION='94.2';", "const VERSION='94.4';", 'v940 version')
s = replace_once(s, "player-prop-tool-build-period-v940.css?v=94.2", "player-prop-tool-build-period-v940.css?v=94.4", 'v940 css cache')
s = replace_once(s, "let patchTimers=[];\nconst tableSnapshots=new WeakMap();", "let patchTimers=[];\nlet applyGeneration=0;\nconst tableSnapshots=new WeakMap();", 'apply generation state')
s = replace_once(s, "const market=String(row?.dataset?.nflPptSimMarket||row?.dataset?.snapshotMarket||'');", "const market=String(row?.dataset?.snapshotMarket||row?.dataset?.nflPptSimMarket||'');", 'stable market identity')
s = replace_once(s, "for(const item of snap.rows){item.row.innerHTML=item.html;restoreRowDataset(item.row,item.data);item.row.hidden=false;tbody?.appendChild(item.row);}", "for(const item of snap.rows){item.row.innerHTML=item.html;restoreRowDataset(item.row,item.data);tbody?.appendChild(item.row);}", 'preserve row visibility during restore')
s = replace_once(s, "if(filterState.positions?.size&&d.snapshotPosition&&!filterState.positions.has(d.snapshotPosition))return false;", "if(filterState.positions&&d.snapshotPosition&&!filterState.positions.has(d.snapshotPosition))return false;", 'position filter authority')

period_header_fn = "function patchPeriodHeaders(table,label){\n  const heads=[...table.querySelectorAll('thead tr:nth-child(2) th')],labels=['PLAYER','TSO LINE','SIM LEAN','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];heads.forEach((th,i)=>{if(labels[i])th.textContent=labels[i];if(i!==0)th.removeAttribute('data-sort');});\n  const groups=[...table.querySelectorAll('.nfl-ppt-groups th')];if(groups[1])groups[1].textContent=`${label} · 50K SIM PROJECTION + VALUE`;if(groups[2])groups[2].textContent='SIM DISTRIBUTION';if(groups[3])groups[3].textContent='SIM RANGE + SAMPLE';\n}"
full_and_period = "function patchFullHeaders(table){\n  const heads=[...table.querySelectorAll('thead tr:nth-child(2) th')],labels=['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS'];\n  heads.forEach((th,i)=>{if(labels[i])th.textContent=labels[i];});\n  const groups=[...table.querySelectorAll('.nfl-ppt-groups th')];if(groups[1])groups[1].textContent='50K SPORTSBOOK PICK + VALUE';if(groups[2])groups[2].textContent='SIM DISTRIBUTION';if(groups[3])groups[3].textContent='SIM RANGE + SAMPLE';\n  table.dataset.nflPptBuildVersion=VERSION;\n}\n" + period_header_fn
s = replace_once(s, period_header_fn, full_and_period, 'authoritative full headers')

s = replace_once(s,
"async function applyFullBuild(table){\n  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected)return false;",
"async function applyFullBuild(table,generation){\n  const sim=await readSim();if(!table.isConnected||generation!==applyGeneration)return false;\n  const snap=restoreFull(table);patchFullHeaders(table);",
'full async race guard')
s = replace_once(s,
"async function applyPeriodBuild(table){\n  const snap=restoreFull(table),sim=await readSim();if(!table.isConnected||period==='full')return applyFullBuild(table);",
"async function applyPeriodBuild(table,generation){\n  const sim=await readSim();if(!table.isConnected||generation!==applyGeneration)return false;if(period==='full')return applyFullBuild(table,generation);\n  const snap=restoreFull(table);",
'period async race guard')
s = replace_once(s,
"function updateCount(tool){if(!tool)return;const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')],count=tool.querySelector('.nfl-ppt-head-stat b');if(count)count.textContent=String(rows.filter(r=>!r.hidden).length);}",
"function updateCount(tool){if(!tool)return;const rows=[...tool.querySelectorAll('tbody tr[data-nfl-ppt-row]')],visible=rows.filter(r=>!r.hidden).length,count=tool.querySelector('.nfl-ppt-head-stat b');if(count)count.textContent=String(visible);const empty=tool.querySelector('.nfl-ppt-snapshot-empty');if(empty)empty.hidden=visible!==0;}",
'count + empty state sync')

old_select = "function patchBetStyleSelect(tool){\n  const select=tool.querySelector('#nflPptMode');if(!select)return false;\n  const current=[...select.options].map(o=>o.value).join('|'),wanted=BUILD_STYLES.map(x=>x[0]).join('|');\n  if(select.dataset.nflPptBuildStyle!==VERSION||current!==wanted){select.innerHTML=BUILD_STYLES.map(([value,label])=>`<option value=\"${value}\">${label}</option>`).join('');select.dataset.nflPptBuildStyle=VERSION;}\n  select.value=buildStyle;select.setAttribute('aria-label','Bet Style');select.title=STYLE_COPY[buildStyle]||'';\n  const label=select.closest('label'),span=label?.querySelector(':scope > span');if(span)span.textContent='Bet Style';\n  if(label)label.title=STYLE_COPY[buildStyle]||'';\n  return true;\n}"
new_select = "function patchBetStyleSelect(tool){\n  let select=tool.querySelector('#nflPptMode');if(!select)return false;\n  const current=[...select.options].map(o=>o.value).join('|'),wanted=BUILD_STYLES.map(x=>x[0]).join('|');\n  if(select.dataset.nflPptBuildStyle!==VERSION||current!==wanted){\n    const replacement=select.cloneNode(false);\n    replacement.innerHTML=BUILD_STYLES.map(([value,label])=>`<option value=\"${value}\">${label}</option>`).join('');\n    replacement.dataset.nflPptBuildStyle=VERSION;replacement.removeAttribute('data-nfl-ppt-mode');select.replaceWith(replacement);select=replacement;\n  }\n  select.value=buildStyle;select.setAttribute('aria-label','Bet Style');select.title=STYLE_COPY[buildStyle]||'';\n  const label=select.closest('label'),span=label?.querySelector(':scope > span');if(span)span.textContent='Bet Style';\n  if(label)label.title=STYLE_COPY[buildStyle]||'';\n  return true;\n}"
s = replace_once(s, old_select, new_select, 'replace legacy View select node')

s = replace_once(s,
"async function applyCurrent(){\n  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table||table.dataset.nflPptSimV939!=='93.9')return false;saveSnapshot(table);tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;return period==='full'?applyFullBuild(table):applyPeriodBuild(table);\n}",
"async function applyCurrent(){\n  const tool=document.getElementById(TOOL_ID),table=tool?.querySelector('.nfl-ppt-table');if(!tool||!table||table.dataset.nflPptSimV939!=='93.9')return false;const generation=++applyGeneration;saveSnapshot(table);tool.dataset.nflPptBuildStyle=buildStyle;tool.dataset.nflPptPeriod=period;return period==='full'?applyFullBuild(table,generation):applyPeriodBuild(table,generation);\n}",
'applyCurrent generation')
s = s.replace('[NFL Player Prop Tool v94.2]', '[NFL Player Prop Tool v94.4]')

old_click = "function onClickCapture(event){\n  const periodButton=event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-period]`);if(periodButton){period=PERIODS.some(x=>x[0]===periodButton.dataset.nflPptPeriod)?periodButton.dataset.nflPptPeriod:'full';const tool=document.getElementById(TOOL_ID);patchPeriodBar(tool);applyCurrent();return;}\n  if(event.target.closest?.(`#${TOOL_ID} #nflPptRefresh`)){simCache=null;simPromise=null;tableSnapshots.delete(document.querySelector(`#${TOOL_ID} .nfl-ppt-table`));schedulePatch();return;}\n  if(event.target.closest?.(`#${TOOL_ID}`))setTimeout(schedulePatch,0);\n}\nfunction onInputCapture(event){if(event.target.closest?.(`#${TOOL_ID}`))setTimeout(schedulePatch,0);}"
new_click = "function onClickCapture(event){\n  const periodButton=event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-period]`);if(periodButton){period=PERIODS.some(x=>x[0]===periodButton.dataset.nflPptPeriod)?periodButton.dataset.nflPptPeriod:'full';const tool=document.getElementById(TOOL_ID);patchPeriodBar(tool);applyCurrent();return;}\n  if(event.target.closest?.(`#${TOOL_ID} #nflPptRefresh`)){simCache=null;simPromise=null;tableSnapshots.delete(document.querySelector(`#${TOOL_ID} .nfl-ppt-table`));schedulePatch();return;}\n  if(event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-pos], #${TOOL_ID} [data-nfl-ppt-reset], #${TOOL_ID} #nflPptRetry`))setTimeout(schedulePatch,0);\n}\nfunction onInputCapture(event){if(event.target.closest?.(`#${TOOL_ID} #nflPptSearch`))setTimeout(schedulePatch,0);}"
s = replace_once(s, old_click, new_click, 'remove generic click rerender')
write(p, s)


# 2) Install v94.4 before the snapshot legacy handler and remove the v94.1
# reference layer from fresh production entirely.
p = 'sports/nfl-preview-v893.js'
s = read(p)
s = replace_once(s, "player-prop-tool-build-period-v940.js?v=94.2", "player-prop-tool-build-period-v940.js?v=94.4", 'wrapper v940 cache')
s = s.replace("import { installNflPlayerPropToolReferenceV941 } from './nfl/player-prop-tool-reference-v941.js?v=94.1';\n", '')
old = "    installNflPlayerPropToolUxV930();\n    installNflPlayerPropToolSnapshotV928();\n    installNflPlayerPropToolSimV939();\n    installNflPlayerPropToolControlsV933();\n    installNflPlayerPropToolThemeV936();\n    installNflPlayerPropToolPolishV938();\n    installNflPlayerPropToolBuildPeriodV940();\n    installNflPlayerPropToolReferenceV941();"
new = "    installNflPlayerPropToolUxV930();\n    // v94.4 is the only owner of Bet Style/period columns. Install its capture\n    // handler before snapshot so the retired View behavior never sees #nflPptMode.\n    installNflPlayerPropToolBuildPeriodV940();\n    installNflPlayerPropToolSnapshotV928();\n    installNflPlayerPropToolSimV939();\n    installNflPlayerPropToolControlsV933();\n    installNflPlayerPropToolThemeV936();\n    installNflPlayerPropToolPolishV938();"
s = replace_once(s, old, new, 'wrapper install order and reference removal')
s = s.replace('[NFL Player Prop Tool v94.2]', '[NFL Player Prop Tool v94.4]')
write(p, s)


# 3) Replace the retired reference implementation with a compatibility-only
# stub so an already-cached old preview import cannot 404 and break NFL.
compat = """// v94.1 compatibility shim only.\n// The old reference-column implementation was deleted in v94.4 because it\n// rewrote the Player Prop Tool after every click. Keep this export temporarily\n// so an already-cached preview module cannot fail its import with a 404.\nexport function installNflPlayerPropToolReferenceV941(){ return false; }\nexport const __NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__={compatibilityOnly:true};\n"""
write('sports/nfl/player-prop-tool-reference-v941.js', compat)


# 4) Hard cache-bust the NFL wrapper and outer router.
p = 'sports/router.js'
s = read(p)
s = regex_once(s, r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)", "import('./nfl-preview-v893.js?v=94.4')", 'router NFL wrapper cache')
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


# 5) Update persistent static/browser regressions to the single-authority design.
p = 'scripts/nfl-player-prop-tool-v940-selftest.mjs'
s = read(p)
s = replace_once(s, "player-prop-tool-build-period-v940.js?v=94.2", "player-prop-tool-build-period-v940.js?v=94.4", 'selftest wrapper version')
needle = "assert.ok(preview.includes('installNflPlayerPropToolBuildPeriodV940();'),'NFL wrapper must install Bet Style controls');"
addition = needle + "\nassert.ok(preview.indexOf('installNflPlayerPropToolBuildPeriodV940();')<preview.indexOf('installNflPlayerPropToolSnapshotV928();'),'v94.4 Bet Style capture listener must install before snapshot legacy View listener');\nassert.ok(ui.includes('let applyGeneration=0'),'v94.4 must guard overlapping async style/filter applications');\nassert.ok(ui.includes('generation!==applyGeneration'),'v94.4 stale async applications must be discarded');\nassert.ok(ui.includes('function patchFullHeaders(table)'),'v94.4 must explicitly own the Full header set');\nassert.ok(ui.includes(\"['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS']\"),'v94.4 modern Full headers missing');"
s = replace_once(s, needle, addition, 'selftest authority assertions')
s = s.replace('NFL Player Prop Tool v94.2 Bet Style regression passed', 'NFL Player Prop Tool v94.4 Bet Style regression passed')
write(p, s)

p = 'tests/nfl-player-prop-tool-build-period-v940.spec.js'
s = read(p).replace('data-nfl-ppt-build-style="94.2"', 'data-nfl-ppt-build-style="94.4"')
write(p, s)

p = '.github/workflows/nfl-player-prop-tool-browser-v923.yml'
s = read(p)
s = replace_once(s, 'name: NFL Player Prop Tool Browser QA v94.2', 'name: NFL Player Prop Tool Browser QA v94.4', 'browser workflow name')
s = s.replace('# v94.2 validates sportsbook-aware Bet Style selection against the frozen 50K\n# simulation authority, reference-image stat categories, compact period controls,', '# v94.4 validates one authoritative sportsbook-aware Bet Style/period table,\n# stable modern SIM columns, compact period controls,')
s = s.replace("      - 'tests/nfl-player-prop-tool-reference-v941.spec.js'\n", "      - 'tests/nfl-player-prop-tool-clean-v944.spec.js'\n")
s = s.replace('          node scripts/nfl-player-prop-tool-v941-selftest.mjs\n', '          node scripts/nfl-player-prop-tool-v944-selftest.mjs\n')
s = s.replace('tests/nfl-player-prop-tool-build-period-v940.spec.js tests/nfl-player-prop-tool-reference-v941.spec.js', 'tests/nfl-player-prop-tool-build-period-v940.spec.js tests/nfl-player-prop-tool-clean-v944.spec.js')
write(p, s)

selftest = """import fs from 'node:fs';\nimport assert from 'node:assert/strict';\n\nconst read=p=>fs.readFileSync(p,'utf8');\nconst preview=read('sports/nfl-preview-v893.js');\nconst ui=read('sports/nfl/player-prop-tool-build-period-v940.js');\nconst compat=read('sports/nfl/player-prop-tool-reference-v941.js');\nconst browser=read('.github/workflows/nfl-player-prop-tool-browser-v923.yml');\n\nassert.ok(!preview.includes('player-prop-tool-reference-v941.js'),'fresh NFL preview must not import retired v94.1 reference columns');\nassert.ok(!preview.includes('installNflPlayerPropToolReferenceV941'),'fresh NFL preview must not install retired reference columns');\nassert.ok(compat.includes('compatibilityOnly:true'),'v94.1 path must be compatibility-only for cached imports');\nfor(const token of ['REFERENCE_HEADERS','L10 AVG','COV PROB','DEF VS PROP','SIM DEF','addEventListener','setTimeout','MutationObserver']) assert.ok(!compat.includes(token),`compatibility shim must not contain retired behavior: ${token}`);\nfor(const token of [\"const VERSION='94.4'\",'let applyGeneration=0','generation!==applyGeneration','function patchFullHeaders(table)',\"['PLAYER','CONSENSUS','PICK','SIM MEAN','SIM MED','SIM PROB','SIM EDGE','P10','P25','P75','P90','RANGE','RUNS']\",\"event.stopImmediatePropagation()\",'replacement=select.cloneNode(false)']) assert.ok(ui.includes(token),`v94.4 single-authority layer missing ${token}`);\nassert.ok(preview.indexOf('installNflPlayerPropToolBuildPeriodV940();')<preview.indexOf('installNflPlayerPropToolSnapshotV928();'),'Bet Style authority must register before snapshot legacy View handler');\nassert.ok(browser.includes('nfl-player-prop-tool-clean-v944.spec.js'),'persistent browser QA must protect against stale columns returning');\nfor(const old of ['scripts/nfl-player-prop-tool-v941-selftest.mjs','tests/nfl-player-prop-tool-reference-v941.spec.js','.github/workflows/one-time-nfl-prop-build-period-v940.yml','.github/workflows/one-time-nfl-player-prop-tool-video-v943.yml','scripts/apply-nfl-player-prop-tool-v943-video-fix.py','tests/nfl-player-prop-tool-video-v943.spec.js']) assert.ok(!fs.existsSync(old),`retired file must be deleted: ${old}`);\nconsole.log('✓ NFL Player Prop Tool v94.4 cleanup regression passed: retired column writer is deleted and modern SIM columns have one authority.');\n"""
write('scripts/nfl-player-prop-tool-v944-selftest.mjs', selftest)


# 6) Delete the obsolete writers/tests/workflows instead of leaving them disabled.
for old in [
    'scripts/nfl-player-prop-tool-v941-selftest.mjs',
    'tests/nfl-player-prop-tool-reference-v941.spec.js',
    '.github/workflows/one-time-nfl-prop-build-period-v940.yml',
    '.github/workflows/one-time-nfl-player-prop-tool-video-v943.yml',
    'scripts/apply-nfl-player-prop-tool-v943-video-fix.py',
    'tests/nfl-player-prop-tool-video-v943.spec.js',
    '.github/workflows/one-time-nfl-player-prop-tool-clean-v944.yml',
    'scripts/apply-nfl-player-prop-tool-v944-cleanup.py',
]:
    Path(old).unlink(missing_ok=True)

print('Applied NFL Player Prop Tool v94.4 single-authority cleanup.')
