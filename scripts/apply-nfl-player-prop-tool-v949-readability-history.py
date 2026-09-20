from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: source marker missing')
    return text.replace(old, new, 1)


# Production JS
p = 'sports/nfl/player-prop-tool-v947.js'
s = read(p)
s = replace_once(s, "const VERSION='94.8';", "const VERSION='94.9';", 'version')
s = replace_once(
    s,
    "['prob','COV PROB'],['edge','EDGE'],['def','DEF VS PROP'],['matchup','MATCHUP'],['simDef','SIM DEF'],",
    "['prob','COV PROB'],['edge','EDGE'],['def','DEF VS PROP'],['historical','HISTORICAL'],['simDef','SIM DEF'],",
    'historical header',
)
s = replace_once(
    s,
    "      const simStop=clamp(1-prob),matchScore=clamp(prob+(full&&edge!=null?edge*.20:0));",
    "      const simStop=clamp(1-prob);\n      const selectedSide=String(c.side||'over').toLowerCase();\n      const histDelta=full&&l10Avg!=null&&num(c.line)!=null?(selectedSide==='under'?num(c.line)-l10Avg:l10Avg-num(c.line)):null;\n      const histPct=histDelta==null?null:histDelta/Math.max(Math.abs(num(c.line)||0),1);",
    'historical calculation',
)
s = replace_once(
    s,
    "iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift)",
    "iterations,simStop,histDelta,histPct,rank,correlationLift:num(c.correlationLift)",
    'historical row fields',
)
s = replace_once(
    s,
    "  if(key==='matchup')return row.matchScore??-1;",
    "  if(key==='historical')return row.histPct??-999;",
    'historical sort',
)

old_match = """function matchupHtml(row){
  const tone=gradeTone(row.matchScore),label=tone==='great'?'GREAT':tone==='good'?'GOOD':tone==='mid'?'FAIR':'TOUGH',src=teamLogo(row.opp);
  const corr=state.style==='correlated'&&row.correlationLift>0?` · +${(row.correlationLift*100).toFixed(1)}% co-hit`:'';
  return `<div class=\"nfl-ppt-match-v947 ${tone}\"><div class=\"nfl-ppt-match-line-v947\"><b>${esc(row.position||'OFF')}</b><span>vs</span>${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}</div><small>${label}${esc(corr)}</small></div>`;
}"""
new_hist = """function historicalHtml(row){
  if(state.period!=='full'||row.histDelta==null){
    return `<div class=\"nfl-ppt-history-v949 neutral\" title=\"Historical comparison is shown for full-game sportsbook props because the research feed contains full-game actual results.\"><b>—</b><span>FULL GAME</span></div>`;
  }
  const tone=row.histDelta>0?'good':row.histDelta<0?'bad':'mid';
  const sign=row.histDelta>0?'+':'';
  const record=row.l10Actual?.total?`${row.l10Actual.hits}/${row.l10Actual.total} HIT`:'L10 ACTUAL';
  const side=row.side==='under'?'Under':'Over';
  return `<div class=\"nfl-ppt-history-v949 ${tone}\" title=\"Actual L10 average versus this selected sportsbook line. Positive supports the displayed ${side} pick. No simulation data is used.\"><b>${sign}${fmt(row.histDelta)}</b><span>${record} · VS LINE</span></div>`;
}"""
s = replace_once(s, old_match, new_hist, 'historical cell renderer')
s = replace_once(s, '${matchupHtml(row)}', '${historicalHtml(row)}', 'historical row render')

# Replace the guide with one short description per visible column.
guide_pat = re.compile(r"function guideHtml\(\)\{[\s\S]*?\n\}\nfunction syncControlOptions")
guide_new = """function guideHtml(){
  return `<div class=\"nfl-ppt-guide-backdrop-v947\" id=\"${GUIDE_ID}\"><section><button type=\"button\" data-nfl-ppt-guide-close>×</button><span>QUICK GUIDE</span><h2>How to read each column</h2><div class=\"nfl-ppt-guide-grid-v947\">
    <div><b>PLAYER</b><p>Player, team and opponent. Tap the name to open full player research.</p></div>
    <div><b>PROP LINE</b><p>The sportsbook line being evaluated for this prop.</p></div>
    <div><b>PICK</b><p>The selected Over/Under side, sportsbook and American odds.</p></div>
    <div><b>PROJ</b><p>The TSO 50K projected average. Compare it with the prop line.</p></div>
    <div><b>L10 AVG</b><p>The player’s actual average for this stat over the last 10 available games.</p></div>
    <div><b>COV PROB</b><p>The 50K simulated chance that the displayed side covers the line.</p></div>
    <div><b>EDGE</b><p>Model cover probability compared with the sportsbook’s implied probability.</p></div>
    <div><b>DEF VS PROP</b><p>The opponent defense attached to the selected player prop.</p></div>
    <div><b>HISTORICAL</b><p>Actual L10 average margin versus the line. Positive supports the displayed side.</p></div>
    <div><b>SIM DEF</b><p>The simulated stop rate against the displayed side. Higher means a tougher simulated cover.</p></div>
    <div><b>L5</b><p>Actual hits in the player’s last 5 games versus this exact line and side.</p></div>
    <div><b>L10</b><p>Actual hits in the player’s last 10 available games versus this line and side.</p></div>
    <div><b>H2H</b><p>Actual prior hits versus the current opponent when matching game logs are available.</p></div>
  </div></section></div>`;
}
function syncControlOptions"""
s2, n = guide_pat.subn(guide_new, s, count=1)
if n != 1:
    raise SystemExit('quick guide block: source marker missing')
s = s2
write(p, s)


# Readability CSS: make the entire Prop Tool materially larger while preserving horizontal scrolling.
p = 'sports/nfl/player-prop-tool-v947.css'
c = read(p)
marker = '/* v94.9 larger text + actual Historical column */'
extra = r'''

/* v94.9 larger text + actual Historical column */
#nflView #nflPlayerPropTool{font-size:14px;padding:16px 14px 34px}
#nflView .nfl-ppt-head-v947>div>span{font-size:12px}
#nflView .nfl-ppt-head-v947 h1{font-size:32px}
#nflView .nfl-ppt-head-v947 p{font-size:14px;line-height:1.5}
#nflView .nfl-ppt-head-stat b{font-size:32px}
#nflView .nfl-ppt-head-stat span{font-size:11px}
#nflView .nfl-ppt-selects-v947 label,#nflView .nfl-ppt-filter-panel-v947 label{font-size:10.5px}
#nflView .nfl-ppt-selects-v947 select,#nflView .nfl-ppt-filter-panel-v947 select,#nflView .nfl-ppt-filter-panel-v947 input{height:40px;font-size:13px}
#nflView .nfl-ppt-positions-v947 button,#nflView .nfl-ppt-actions-v947 button,#nflView .nfl-ppt-filter-panel-v947>button{height:40px;font-size:11.5px}
#nflView .nfl-ppt-periodbar-v947>span{font-size:10.5px}
#nflView .nfl-ppt-periodbar-v947 button{height:34px;font-size:11px}
#nflView .nfl-ppt-periodbar-v947 small{font-size:10px}
#nflView .nfl-ppt-side-v948>span{font-size:10.5px}
#nflView .nfl-ppt-side-switch-v948 button{height:36px;min-width:68px;font-size:12px}
#nflView .nfl-ppt-table{min-width:1410px}
#nflView .nfl-ppt-table col:nth-child(1){width:190px}
#nflView .nfl-ppt-table col:nth-child(2){width:104px}
#nflView .nfl-ppt-table col:nth-child(3){width:122px}
#nflView .nfl-ppt-table col:nth-child(4),#nflView .nfl-ppt-table col:nth-child(5){width:96px}
#nflView .nfl-ppt-table col:nth-child(6){width:100px}
#nflView .nfl-ppt-table col:nth-child(7){width:100px}
#nflView .nfl-ppt-table col:nth-child(8){width:110px}
#nflView .nfl-ppt-table col:nth-child(9){width:120px}
#nflView .nfl-ppt-table col:nth-child(10){width:96px}
#nflView .nfl-ppt-table col:nth-child(n+11){width:92px}
#nflView .nfl-ppt-table .nfl-ppt-groups th{height:30px;font-size:10.5px}
#nflView .nfl-ppt-table thead tr:nth-child(2) th{height:48px}
#nflView .nfl-ppt-table thead tr:nth-child(2) th button{font-size:10.8px}
#nflView .nfl-ppt-table thead th button i{font-size:10.5px}
#nflView .nfl-ppt-table tbody tr,#nflView .nfl-ppt-table tbody td{height:76px}
#nflView .nfl-ppt-table tbody td{padding:8px}
#nflView .nfl-ppt-player-v947{max-width:160px}
#nflView .nfl-ppt-player-v947 b{font-size:15px}
#nflView .nfl-ppt-player-v947 small{font-size:9.5px;line-height:1.25}
#nflView .nfl-ppt-avatar-v947 i{font-size:11.5px}
#nflView .nfl-ppt-consensus-v947 b,#nflView .nfl-ppt-metric-v947 b,#nflView .nfl-ppt-edge-v947 b,#nflView .nfl-ppt-simdef-v947 b,#nflView .nfl-ppt-hit-v947 b{font-size:14px}
#nflView .nfl-ppt-consensus-v947 span,#nflView .nfl-ppt-metric-v947 span,#nflView .nfl-ppt-edge-v947 span,#nflView .nfl-ppt-simdef-v947 span,#nflView .nfl-ppt-hit-v947 span{font-size:9px;line-height:1.2}
#nflView .nfl-ppt-pick-number b{font-size:13px}
#nflView .nfl-ppt-pick-number small{font-size:9.5px}
#nflView .nfl-ppt-bookmark i,#nflView .nfl-ppt-bookmark.fallback,#nflView .nfl-ppt-bookmark.tso{font-size:8.5px}
#nflView .nfl-ppt-ring-v947 b{font-size:11px}
#nflView .nfl-ppt-ring-v947 small{font-size:8.5px}
#nflView .nfl-ppt-def-v947 b{font-size:11px}
#nflView .nfl-ppt-def-v947 span{font-size:9.5px}
#nflView .nfl-ppt-history-v949{display:grid;place-items:center;gap:5px;text-align:center}
#nflView .nfl-ppt-history-v949 b{display:block;font:900 14px/1 "JetBrains Mono",monospace;color:#f3f8fc}
#nflView .nfl-ppt-history-v949 span{display:block;color:#8fa9c2;font:800 9px/1.2 "JetBrains Mono",monospace;text-transform:uppercase;white-space:normal}
#nflView .nfl-ppt-history-v949.good b{color:#4ee49a}
#nflView .nfl-ppt-history-v949.bad b{color:#ff7a8e}
#nflView .nfl-ppt-history-v949.mid b{color:#f0c95b}
#nflView .nfl-ppt-history-v949.neutral b{color:#9bb2c8}
#nflView .nfl-ppt-empty{font-size:13px}
#nflView .nfl-ppt-loading-v947 span,#nflView .nfl-ppt-error-v947 span{font-size:11px}
.nfl-ppt-guide-backdrop-v947>section{width:min(980px,96vw);padding:24px}
.nfl-ppt-guide-backdrop-v947>section>button{font-size:28px}
.nfl-ppt-guide-backdrop-v947>section>span{font-size:10px}
.nfl-ppt-guide-backdrop-v947 h2{font-size:24px;margin:7px 0 16px}
.nfl-ppt-guide-grid-v947{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.nfl-ppt-guide-grid-v947>div{padding:13px}
.nfl-ppt-guide-grid-v947 b{font-size:13px}
.nfl-ppt-guide-grid-v947 p{font-size:11px;line-height:1.5}
@media(max-width:900px){
  #nflView .nfl-ppt-head-v947 h1{font-size:24px}
  #nflView .nfl-ppt-head-v947 p{font-size:12px}
  #nflView .nfl-ppt-selects-v947 select,#nflView .nfl-ppt-filter-panel-v947 select,#nflView .nfl-ppt-filter-panel-v947 input{font-size:12.5px}
  #nflView .nfl-ppt-table{min-width:1410px}
  .nfl-ppt-guide-grid-v947{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:520px){
  #nflView .nfl-ppt-head-v947 h1{font-size:22px}
  #nflView .nfl-ppt-head-v947 p{font-size:11.5px}
  #nflView .nfl-ppt-actions-v947 button,#nflView .nfl-ppt-positions-v947 button{font-size:10.5px}
  .nfl-ppt-guide-grid-v947{grid-template-columns:1fr}
  .nfl-ppt-guide-grid-v947 p{font-size:11px}
}
'''
if marker not in c:
    c += extra
write(p, c)


# Cache-bust the module chain.
p = 'sports/nfl-preview-v893.js'
v = read(p)
v = replace_once(v, "./nfl/player-prop-tool-v947.js?v=94.8", "./nfl/player-prop-tool-v947.js?v=94.9", 'prop tool import cache')
write(p, v)

p = 'sports/router.js'
r = read(p)
r = replace_once(r, "./nfl-preview-v893.js?v=94.8", "./nfl-preview-v893.js?v=94.9", 'NFL preview cache')
write(p, r)

p = 'index.html'
i = read(p)
pat = re.compile(r'\./sports/router\.js\?v=(\d+)\.(\d+)')
m = pat.search(i)
if not m:
    raise SystemExit('outer router cache marker missing')
major, minor = int(m.group(1)), int(m.group(2))
i = pat.sub(f'./sports/router.js?v={major}.{minor+1}', i, count=1)
write(p, i)


# Static regression expectations.
p = 'scripts/nfl-player-prop-tool-v947-selftest.mjs'
t = read(p)
t = t.replace("'MATCHUP'", "'HISTORICAL'")
t = t.replace(
    "assert.ok(tool.includes('nfl-ppt-match-line-v947'),'Matchup position-vs-defense-logo layout missing');",
    "assert.ok(tool.includes('nfl-ppt-history-v949'),'Historical actual-data cell missing');",
)
anchor = "assert.ok(tool.includes('const statKey=MARKET_STAT'),'historical market-stat mapping missing');"
add = """
assert.ok(tool.includes("const histDelta=full&&l10Avg!=null"),'Historical column must derive from actual L10 average');
assert.ok(tool.includes("if(key==='historical')return row.histPct"),'Historical column sort must use actual normalized margin');
assert.ok(tool.includes('No simulation data is used'),'Historical tooltip must explicitly identify actual-only data');
assert.ok(!tool.includes("['matchup','MATCHUP']"),'old simulated Matchup column must be removed');
for(const label of ['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','HISTORICAL','SIM DEF','L5','L10','H2H']) assert.ok(tool.includes(`<b>${label}</b>`)||tool.includes(`['${label.toLowerCase()}','${label}']`)||tool.includes(`'${label}'`),`guide/header missing ${label}`);
assert.ok(css.includes('v94.9 larger text + actual Historical column'),'v94.9 readability CSS missing');
assert.ok(css.includes('.nfl-ppt-player-v947 b{font-size:15px}'),'player-name font enlargement missing');
assert.ok(css.includes('.nfl-ppt-guide-grid-v947 p{font-size:11px'),'Quick Guide readability enlargement missing');
"""
if add.strip() not in t:
    if anchor not in t:
        raise SystemExit('selftest anchor missing')
    t = t.replace(anchor, anchor + add, 1)
write(p, t)


# Browser regression expectations and focused v94.9 test.
p = 'tests/nfl-player-prop-tool-v947.spec.js'
b = read(p)
b = b.replace("'MATCHUP'", "'HISTORICAL'")
b = b.replace('94.8-', '94.9-')
qa = r'''

test('v94.9 larger text Historical actuals and column-by-column Quick Guide',async({page})=>{
  await open(page);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'HISTORICAL'})).toHaveCount(1);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'MATCHUP'})).toHaveCount(0);

  const history=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-history-v949');
  await expect(history.first()).toBeVisible();
  const historyTexts=await history.evaluateAll(nodes=>nodes.slice(0,25).map(n=>(n.textContent||'').trim()));
  expect(historyTexts.some(x=>/\d+\/\d+ HIT/.test(x))).toBe(true);
  expect(historyTexts.every(x=>!/(GOOD|GREAT|FAIR|TOUGH)/.test(x))).toBe(true);
  const historyTitle=await history.first().getAttribute('title');
  expect(historyTitle||'').toContain('Actual L10 average');
  expect(historyTitle||'').toContain('No simulation data');

  const fontSizes=await page.evaluate(()=>({
    player:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-player-v947 b')).fontSize),
    metric:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-metric-v947 b')).fontSize),
    header:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-table thead tr:nth-child(2) th button')).fontSize),
    control:parseFloat(getComputedStyle(document.querySelector('.nfl-ppt-selects-v947 select')).fontSize),
  }));
  expect(fontSizes.player).toBeGreaterThanOrEqual(15);
  expect(fontSizes.metric).toBeGreaterThanOrEqual(14);
  expect(fontSizes.header).toBeGreaterThanOrEqual(10.8);
  expect(fontSizes.control).toBeGreaterThanOrEqual(13);

  await page.locator('#nflPptGuide').click();
  const cards=page.locator('#nflPlayerPropGuide .nfl-ppt-guide-grid-v947>div');
  await expect(cards).toHaveCount(13);
  const guideLabels=await cards.locator('b').allTextContents();
  expect(guideLabels).toEqual(['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','HISTORICAL','SIM DEF','L5','L10','H2H']);
  const guideFont=await cards.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(guideFont).toBeGreaterThanOrEqual(11);
});
'''
if 'v94.9 larger text Historical actuals and column-by-column Quick Guide' not in b:
    b += qa
write(p, b)

print('Applied NFL Player Prop Tool v94.9 larger text, Historical actual-data column and simplified Quick Guide')
