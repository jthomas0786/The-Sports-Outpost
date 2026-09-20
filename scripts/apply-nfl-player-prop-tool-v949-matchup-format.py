from pathlib import Path

# Keep HISTORICAL as requested. Add full-cell conditional formatting for actual-data grades.
p=Path('sports/nfl/player-prop-tool-v947.css')
c=p.read_text()
marker='/* v94.9 full-cell conditional grade formatting */'
if marker not in c:
    c += '''\n\n/* v94.9 full-cell conditional grade formatting */\n#nflView .nfl-ppt-table td:has(.nfl-ppt-history-v949.great),#nflView .nfl-ppt-table td:has(.nfl-ppt-def-v947.great){background-color:rgba(34,197,94,.24)!important;box-shadow:inset 0 0 0 1px rgba(74,222,128,.34)}\n#nflView .nfl-ppt-table td:has(.nfl-ppt-history-v949.good),#nflView .nfl-ppt-table td:has(.nfl-ppt-def-v947.good){background-color:rgba(16,185,129,.15)!important;box-shadow:inset 0 0 0 1px rgba(52,211,153,.25)}\n#nflView .nfl-ppt-table td:has(.nfl-ppt-history-v949.mid),#nflView .nfl-ppt-table td:has(.nfl-ppt-def-v947.mid){background-color:rgba(245,158,11,.18)!important;box-shadow:inset 0 0 0 1px rgba(251,191,36,.28)}\n#nflView .nfl-ppt-table td:has(.nfl-ppt-history-v949.bad),#nflView .nfl-ppt-table td:has(.nfl-ppt-def-v947.bad){background-color:rgba(239,68,68,.19)!important;box-shadow:inset 0 0 0 1px rgba(248,113,113,.30)}\n#nflView .nfl-ppt-history-v949.great b,#nflView .nfl-ppt-def-v947.great .nfl-ppt-def-copy-v949 b{color:#7dffad!important}\n#nflView .nfl-ppt-history-v949.good b,#nflView .nfl-ppt-def-v947.good .nfl-ppt-def-copy-v949 b{color:#68e6b0!important}\n#nflView .nfl-ppt-history-v949.mid b,#nflView .nfl-ppt-def-v947.mid .nfl-ppt-def-copy-v949 b{color:#ffd166!important}\n#nflView .nfl-ppt-history-v949.bad b,#nflView .nfl-ppt-def-v947.bad .nfl-ppt-def-copy-v949 b{color:#ff8d9a!important}\n#nflView .nfl-ppt-history-v949.great span,#nflView .nfl-ppt-def-v947.great .nfl-ppt-def-copy-v949 span{color:#b6f7cf!important}\n#nflView .nfl-ppt-history-v949.good span,#nflView .nfl-ppt-def-v947.good .nfl-ppt-def-copy-v949 span{color:#aeead5!important}\n#nflView .nfl-ppt-history-v949.mid span,#nflView .nfl-ppt-def-v947.mid .nfl-ppt-def-copy-v949 span{color:#ffe0a0!important}\n#nflView .nfl-ppt-history-v949.bad span,#nflView .nfl-ppt-def-v947.bad .nfl-ppt-def-copy-v949 span{color:#ffc0c8!important}\n'''
p.write_text(c)

# Static release assertions: verify full TD background plus text formatting for all four data grades.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=p.read_text()
anchor="assert.ok(css.includes('v94.9 larger text + actual Historical column'),'v94.9 readability CSS missing');"
extra="""
assert.ok(css.includes('v94.9 full-cell conditional grade formatting'),'full-cell grade formatting missing');
for(const tone of ['great','good','mid','bad']){
  assert.ok(css.includes(`td:has(.nfl-ppt-history-v949.${tone})`),`Historical full-cell background missing for ${tone}`);
  assert.ok(css.includes(`td:has(.nfl-ppt-def-v947.${tone})`),`DEF VS PROP full-cell background missing for ${tone}`);
}
"""
if extra.strip() not in t:
    if anchor not in t: raise SystemExit('selftest CSS anchor missing')
    t=t.replace(anchor,anchor+extra,1)
p.write_text(t)

# Browser QA: prove both the cell background and grade text color are conditionally formatted.
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
b=p.read_text()
anchor="""  const guideFont=await cards.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(guideFont).toBeGreaterThanOrEqual(11);
});"""
new="""  const guideFont=await cards.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(guideFont).toBeGreaterThanOrEqual(11);
  await page.locator('[data-nfl-ppt-guide-close]').click();

  const histCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-history-v949.bad)').first();
  await expect(histCell).toBeVisible();
  const histStyle=await histCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-history-v949 b')).color}));
  expect(histStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(histStyle.text).not.toBe('rgb(243, 248, 252)');

  const defCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.bad)').first();
  await expect(defCell).toBeVisible();
  const defStyle=await defCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-def-copy-v949 b')).color}));
  expect(defStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(defStyle.text).not.toBe('rgb(243, 248, 252)');
});"""
if new not in b:
    if anchor not in b: raise SystemExit('browser formatting anchor missing')
    b=b.replace(anchor,new,1)
p.write_text(b)

print('Applied v94.9 conditional formatting to Great/Good/Fair/Poor text and entire HISTORICAL/DEF VS PROP cells')
