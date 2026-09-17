from pathlib import Path
import re


def bump_query(path, pattern, label):
    p = Path(path)
    s = p.read_text()
    m = re.search(pattern, s)
    if not m:
        raise SystemExit(f'{label}: version marker missing')
    prefix, major, minor = m.group(1), int(m.group(2)), int(m.group(3))
    new = f'{prefix}{major}.{minor + 1}'
    s2 = s[:m.start()] + new + s[m.end():]
    p.write_text(s2)
    print(f'{label}: {m.group(0)} -> {new}')

# 1) The browser was rejecting the current v89 simulation cache because this
# loader was frozen to engineVersion v86. Compatibility is schema-based now so
# future engine revisions do not silently disable the simulation layer.
preview = Path('sports/nfl-preview.js')
s = preview.read_text()
old_gate = "if(Array.isArray(candidate?.games)&&String(candidate?.engineVersion||'').startsWith('v86'))sim=candidate;"
new_gate = "if(Array.isArray(candidate?.games)&&Number(candidate?.schemaVersion)>=2&&candidate.games.some(g=>Array.isArray(g?.players)))sim=candidate;"
if old_gate not in s:
    if new_gate not in s:
        raise SystemExit('NFL sim loader compatibility gate marker missing')
else:
    s = s.replace(old_gate, new_gate, 1)
preview.write_text(s)

# 2) Number(null) === 0. Missing 2+ TD data must stay missing instead of
# masquerading as an actual 0.0% probability in the player modal.
research = Path('sports/nfl-research-ui.js')
r = research.read_text()
old_null = "const twoPlusRaw=Number(canonicalAtd?.twoPlusTd);"
new_null = "const twoPlusRaw=canonicalAtd?.twoPlusTd==null?NaN:Number(canonicalAtd.twoPlusTd);"
if old_null not in r:
    if new_null not in r:
        raise SystemExit('NFL modal 2+ TD null-conversion marker missing')
else:
    r = r.replace(old_null, new_null, 1)
research.write_text(r)

# Keep the prior native 2+ TD regression useful after routine cache bumps.
test = Path('scripts/nfl-v8919-native-two-plus-selftest.mjs')
t = test.read_text()
replacements = {
    "assert.ok(v890.includes('./nfl-preview.js?v=89.40'));": "assert.ok(/\\.\\/nfl-preview\\.js\\?v=89\\.\\d+/.test(v890));",
    "assert.ok(v893.includes('./nfl-preview-v890.js?v=89.40'));": "assert.ok(/\\.\\/nfl-preview-v890\\.js\\?v=89\\.\\d+/.test(v893));",
    "assert.ok(router.includes('./nfl-preview-v893.js?v=89.42'));": "assert.ok(/\\.\\/nfl-preview-v893\\.js\\?v=89\\.\\d+/.test(router));",
    "assert.ok(router.includes('./nfl-research-ui.js?v=86.9'));": "assert.ok(/\\.\\/nfl-research-ui\\.js\\?v=86\\.\\d+/.test(router));",
}
for old, new in replacements.items():
    if old in t:
        t = t.replace(old, new, 1)
test.write_text(t)

# Cache-bust the entire NFL import chain and the outer router so deployed
# browsers cannot keep the old v86-only loader or null-to-zero modal code.
bump_query('sports/nfl-preview-v890.js', r"(\./nfl-preview\.js\?v=)(\d+)\.(\d+)", 'NFL base preview')
bump_query('sports/nfl-preview-v893.js', r"(\./nfl-preview-v890\.js\?v=)(\d+)\.(\d+)", 'NFL wrapper preview')
bump_query('sports/router.js', r"(\./nfl-preview-v893\.js\?v=)(\d+)\.(\d+)", 'NFL router preview import')
bump_query('sports/router.js', r"(\./nfl-research-ui\.js\?v=)(\d+)\.(\d+)", 'NFL router research import')
bump_query('index.html', r"(\./sports/router\.js\?v=)(\d+)\.(\d+)", 'outer router')

print('Applied NFL v89.20 simulation loader + 2+ TD null-safety fix')
