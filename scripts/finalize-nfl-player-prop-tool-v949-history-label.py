from pathlib import Path

# Final release lock: the user requested HISTORICAL, not MATCHUP.
p=Path('sports/nfl/player-prop-tool-v947.js')
s=p.read_text()
s=s.replace("['matchup','MATCHUP']","['historical','HISTORICAL']")
s=s.replace("if(key==='matchup')return row.histPct??-999;","if(key==='historical')return row.histPct??-999;")
s=s.replace("<div><b>MATCHUP</b><p>Great/Good/Fair/Poor comes from actual recent hit rate versus this line; the number is the actual L10 average margin.</p></div>","<div><b>HISTORICAL</b><p>Great/Good/Fair/Poor comes from actual recent hit rate; the number is the actual L10 average margin versus the line.</p></div>")
p.write_text(s)

# Final static assertions should reflect the visible HISTORICAL label.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=p.read_text()
t=t.replace("'MATCHUP'", "'HISTORICAL'")
t=t.replace("assert.ok(tool.includes(\"if(key==='matchup')return row.histPct\"),'MATCHUP column sort must use actual normalized historical margin');","assert.ok(tool.includes(\"if(key==='historical')return row.histPct\"),'Historical column sort must use actual normalized margin');")
t=t.replace("assert.ok(tool.includes(\"['matchup','MATCHUP']\"),'MATCHUP column label must be preserved');","assert.ok(!tool.includes(\"['matchup','MATCHUP']\"),'old Matchup label must be removed from the actual-data column');")
t=t.replace('`MATCHUP full-cell background missing for ${tone}`','`Historical full-cell background missing for ${tone}`')
p.write_text(t)

# Final browser assertions should reflect the visible HISTORICAL label while retaining the same rendered cell class.
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
b=p.read_text()
b=b.replace("const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];","const HEADERS=['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','HISTORICAL','SIM DEF','L5','L10','H2H'];")
b=b.replace("filter({hasText:'MATCHUP'})).toHaveCount(1)","filter({hasText:'HISTORICAL'})).toHaveCount(1)")
b=b.replace("filter({hasText:'HISTORICAL'})).toHaveCount(0)","filter({hasText:'MATCHUP'})).toHaveCount(0)")
b=b.replace("'DEF VS PROP','MATCHUP','SIM DEF'","'DEF VS PROP','HISTORICAL','SIM DEF'")
b=b.replace('const matchupCell=', 'const historyCell=')
b=b.replace('await expect(matchupCell).toBeVisible();', 'await expect(historyCell).toBeVisible();')
b=b.replace('const matchupStyle=await matchupCell.evaluate', 'const historyStyle=await historyCell.evaluate')
b=b.replace('expect(matchupStyle.bg)', 'expect(historyStyle.bg)')
b=b.replace('expect(matchupStyle.text)', 'expect(historyStyle.text)')
p.write_text(b)

print('Finalized v94.9 visible HISTORICAL label with actual-data grading and full-cell formatting')
