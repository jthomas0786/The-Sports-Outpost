from pathlib import Path


def must(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(f'{label}: marker missing')
    return s.replace(old, new, 1)

# Keep visible MATCHUP name, but retain the historical actual-data implementation.
p=Path('sports/nfl/player-prop-tool-v947.js')
s=p.read_text()
s=must(s,"['historical','HISTORICAL']","['matchup','MATCHUP']",'matchup header')
s=must(s,"if(key==='historical')return row.histPct??-999;","if(key==='matchup')return row.histPct??-999;",'matchup sort')
s=must(s,"<div><b>HISTORICAL</b><p>Great/Good/Fair/Poor comes from actual recent hit rate; the number is the actual L10 average margin versus the line.</p></div>","<div><b>MATCHUP</b><p>Great/Good/Fair/Poor comes from actual recent hit rate versus this line; the number is the actual L10 average margin.</p></div>",'matchup guide')
p.write_text(s)

# Conditional formatting: grade text + the grade cell background/border.
p=Path('sports/nfl/player-prop-tool-v947.css')
c=p.read_text()
marker='/* v94.9 conditional grade cell formatting */'
if marker not in c:
    c += '''\n\n/* v94.9 conditional grade cell formatting */\n#nflView .nfl-ppt-history-v949,#nflView .nfl-ppt-def-v947{border:1px solid transparent;border-radius:10px;padding:8px 7px;box-sizing:border-box}\n#nflView .nfl-ppt-history-v949.great,#nflView .nfl-ppt-def-v947.great{background:rgba(34,197,94,.20);border-color:rgba(74,222,128,.58)}\n#nflView .nfl-ppt-history-v949.good,#nflView .nfl-ppt-def-v947.good{background:rgba(45,127,255,.19);border-color:rgba(96,165,250,.56)}\n#nflView .nfl-ppt-history-v949.mid,#nflView .nfl-ppt-def-v947.mid{background:rgba(234,179,8,.19);border-color:rgba(250,204,21,.56)}\n#nflView .nfl-ppt-history-v949.bad,#nflView .nfl-ppt-def-v947.bad{background:rgba(239,68,68,.19);border-color:rgba(248,113,113,.58)}\n#nflView .nfl-ppt-history-v949.great b,#nflView .nfl-ppt-def-v947.great b{color:#6cf0a7}\n#nflView .nfl-ppt-history-v949.good b,#nflView .nfl-ppt-def-v947.good b{color:#78bdff}\n#nflView .nfl-ppt-history-v949.mid b,#nflView .nfl-ppt-def-v947.mid b{color:#f6d35d}\n#nflView .nfl-ppt-history-v949.bad b,#nflView .nfl-ppt-def-v947.bad b{color:#ff8797}\n'''
p.write_text(c)

# Static release assertions.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=p.read_text()
t=t.replace("'HISTORICAL'", "'MATCHUP'")
t=t.replace("assert.ok(tool.includes(\"if(key==='historical')return row.histPct\"),'Historical column sort must use actual normalized margin');","assert.ok(tool.includes(\"if(key==='matchup')return row.histPct\"),'MATCHUP sort must use actual normalized historical margin');")
t=t.replace("assert.ok(!tool.includes(\"['matchup','MATCHUP']\"),'old simulated Matchup column must be removed');","assert.ok(tool.includes(\"['matchup','MATCHUP']\"),'MATCHUP column label must be preserved');")
extra="""
assert.ok(css.includes('v94.9 conditional grade cell formatting'),'conditional grade cell formatting missing');
for(const tone of ['great','good','mid','bad']) assert.ok(css.includes(`.nfl-ppt-history-v949.${tone}`)&&css.includes(`.nfl-ppt-def-v947.${tone}`),`conditional text/background format missing for ${tone}`);
"""
anchor="assert.ok(css.includes('v94.9 larger text + actual Historical column'),'v94.9 readability CSS missing');"
if extra.strip() not in t:
    if anchor not in t: raise SystemExit('selftest css anchor missing')
    t=t.replace(anchor,anchor+extra,1)
p.write_text(t)

# Browser QA: expect MATCHUP name and prove grade cells have non-transparent backgrounds + colored text.
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
b=p.read_text()
b=b.replace("const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','HISTORICAL','SIM DEF','L5','L10','H2H'];","const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];")
b=b.replace("filter({hasText:'HISTORICAL'})).toHaveCount(1)","filter({hasText:'MATCHUP'})).toHaveCount(1)")
b=b.replace("filter({hasText:'MATCHUP'})).toHaveCount(0)","filter({hasText:'HISTORICAL'})).toHaveCount(0)")
b=b.replace("'DEF VS PROP','HISTORICAL','SIM DEF'","'DEF VS PROP','MATCHUP','SIM DEF'")
needle="""  const defenseTitle=await defense.first().getAttribute('title');
  expect(defenseTitle||'').toContain('previous-season actual allowance');
  expect(defenseTitle||'').toContain('No simulation data');"""
add="""  const gradeStyle=await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-history-v949:not(.neutral)').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor,text:getComputedStyle(el.querySelector('b')).color}));
  expect(gradeStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(gradeStyle.border).not.toBe('rgba(0, 0, 0, 0)');
  expect(gradeStyle.text).not.toBe('rgb(243, 248, 252)');"""
if add not in b:
    if needle not in b: raise SystemExit('browser defense assertion anchor missing')
    b=b.replace(needle,needle+'\n\n'+add,1)
p.write_text(b)

print('Preserved MATCHUP label and applied conditional text/background grade formatting')
