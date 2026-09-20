from pathlib import Path

# Final release lock: visible column must remain MATCHUP, powered by historical actual data.
p=Path('sports/nfl/player-prop-tool-v947.js')
s=p.read_text()
s=s.replace("['historical','HISTORICAL']","['matchup','MATCHUP']")
s=s.replace("if(key==='historical')return row.histPct??-999;","if(key==='matchup')return row.histPct??-999;")
s=s.replace("<div><b>HISTORICAL</b><p>Great/Good/Fair/Poor comes from actual recent hit rate; the number is the actual L10 average margin versus the line.</p></div>","<div><b>MATCHUP</b><p>Great/Good/Fair/Poor comes from actual recent hit rate versus this line; the number is the actual L10 average margin.</p></div>")
p.write_text(s)

# Final static assertions must enforce the visible MATCHUP label and historical data source.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=p.read_text()
t=t.replace("'HISTORICAL'", "'MATCHUP'")
t=t.replace("assert.ok(tool.includes(\"if(key==='historical')return row.histPct\"),'Historical column sort must use actual normalized margin');","assert.ok(tool.includes(\"if(key==='matchup')return row.histPct\"),'MATCHUP column sort must use actual normalized historical margin');")
t=t.replace("assert.ok(!tool.includes(\"['matchup','MATCHUP']\"),'old Matchup label must be removed from the actual-data column');","assert.ok(tool.includes(\"['matchup','MATCHUP']\"),'MATCHUP column label must be preserved');")
t=t.replace('`Historical full-cell background missing for ${tone}`','`MATCHUP full-cell background missing for ${tone}`')
p.write_text(t)

# Final browser assertions must prove MATCHUP is visible and HISTORICAL is not the header.
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
b=p.read_text()
b=b.replace("const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','HISTORICAL','SIM DEF','L5','L10','H2H'];","const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];")
b=b.replace("filter({hasText:'HISTORICAL'})).toHaveCount(1)","filter({hasText:'MATCHUP'})).toHaveCount(1)")
b=b.replace("filter({hasText:'MATCHUP'})).toHaveCount(0)","filter({hasText:'HISTORICAL'})).toHaveCount(0)")
b=b.replace("'DEF VS PROP','HISTORICAL','SIM DEF'","'DEF VS PROP','MATCHUP','SIM DEF'")
b=b.replace('const historyCell=', 'const matchupCell=')
b=b.replace('await expect(historyCell).toBeVisible();', 'await expect(matchupCell).toBeVisible();')
b=b.replace('const historyStyle=await historyCell.evaluate', 'const matchupStyle=await matchupCell.evaluate')
b=b.replace('expect(historyStyle.bg)', 'expect(matchupStyle.bg)')
b=b.replace('expect(historyStyle.text)', 'expect(matchupStyle.text)')
# Retire the old generic DEF copy assertion. DEF VS PROP now intentionally renders an
# actual historical grade and previous-season allowance rather than the text "vs Prop".
b=b.replace("  expect(metrics.defText).toContain('vs Prop');","  expect(metrics.defText).toMatch(/Great|Good|Fair|Poor/);\n  expect(metrics.defText).toContain('PREV YR');")
p.write_text(b)

print('Finalized v94.9 visible MATCHUP label, historical DEF grades and full-cell formatting regression')
