from pathlib import Path
import re


def bump_query(path, pattern, label):
    p=Path(path)
    s=p.read_text()
    m=re.search(pattern,s)
    if not m:
        raise SystemExit(f'{label}: version marker missing')
    prefix,major,minor=m.group(1),int(m.group(2)),int(m.group(3))
    new=f'{prefix}{major}.{minor+1}'
    p.write_text(s[:m.start()]+new+s[m.end():])
    print(f'{label}: {m.group(0)} -> {new}')

controller=Path('sports/nfl/all-players-controls-v8921.js')
wrapper=Path('sports/nfl-preview-v893.js')
if not controller.exists():
    raise SystemExit('All Players controller missing')
c=controller.read_text()
w=wrapper.read_text()
for needle in [
    "card.style.display=visible?'':'none'",
    "#nflAllList .nfl-mlb-prop-card[hidden]{display:none!important}",
    "id=\"nflAllTeam\"",
    "id=\"nflAllPosition\"",
    "#nflAllClear",
    "FILTER_STATE.search=e.target.value||''",
    "queueMicrotask(()=>schedule(root))"
]:
    if needle not in c:
        raise SystemExit(f'All Players controller incomplete: {needle}')
if "installNflAllPlayersControlsV8921" not in w or "./nfl/all-players-controls-v8921.js?v=89.21" not in w:
    raise SystemExit('NFL wrapper is not wired to All Players controller')

# Only cache-bust the already-tested wrapper and outer router. The base NFL
# preview remains untouched; the controller is additive and survives its rerenders.
bump_query('sports/router.js', r"(\./nfl-preview-v893\.js\?v=)(\d+)\.(\d+)", 'NFL router preview import')
bump_query('index.html', r"(\./sports/router\.js\?v=)(\d+)\.(\d+)", 'outer router')

print('Applied isolated NFL All Players search/filter controls cache bust')
