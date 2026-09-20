from pathlib import Path
import re

TEST = Path('tests/nfl-player-prop-tool-v947.spec.js')
text = TEST.read_text()
pattern = r"test\('v95\.1 larger text Historical actuals and column-by-column Quick Guide',async\(\{page\}\)=>\{.*?\n\}\);"
replacement = r'''test('v95.1 larger text restored Matchup Defense and column-by-column Quick Guide',async({page})=>{
  await open(page);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'MATCHUP'})).toHaveCount(1);
  await expect(page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').filter({hasText:'HISTORICAL'})).toHaveCount(0);

  const matchup=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-match-v947');
  await expect(matchup.first()).toBeVisible();
  const matchupData=await matchup.first().evaluate(el=>({
    grade:el.querySelector(':scope>small')?.textContent?.trim()||'',
    position:el.querySelector('.nfl-ppt-match-line-v947 b')?.textContent?.trim()||'',
    vs:el.querySelector('.nfl-ppt-match-line-v947 span')?.textContent?.trim()||'',
    logo:el.querySelector('.nfl-ppt-match-line-v947 img')?.getAttribute('src')||'',
    title:el.getAttribute('title')||'',
  }));
  expect(matchupData.position).toMatch(/QB|RB|WR|TE/);
  expect(matchupData.vs.toLowerCase()).toBe('vs');
  expect(matchupData.logo).toContain('teamlogos/nfl');
  expect(matchupData.grade).toMatch(/Great|Good|Fair|Poor/);
  expect(matchupData.title).toContain('actual recent player results');
  expect(matchupData.title).toContain('defensive allowance');
  expect(matchupData.title).toContain('No simulation data');

  const defense=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-def-v947');
  await expect(defense.first()).toBeVisible();
  const defenseData=await defense.first().evaluate(el=>({
    grade:el.querySelector('.nfl-ppt-def-copy-v949 b')?.textContent?.trim()||'',
    logo:el.querySelector('img')?.getAttribute('src')||'',
    copy:el.textContent||'',
    title:el.getAttribute('title')||'',
  }));
  expect(defenseData.logo).toContain('teamlogos/nfl');
  expect(defenseData.grade).toMatch(/Great|Good|Fair|Poor/);
  expect(defenseData.copy).toContain('PREV YR');
  expect(defenseData.title).toContain('grades the defense itself');
  expect(defenseData.title).toContain('No simulation data');

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
  expect(guideLabels).toEqual(['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']);
  const guideText=await cards.allTextContents();
  expect(guideText[7]).toContain('Opponent defense vs this player position and prop');
  expect(guideText[8]).toContain('Player position vs the opponent defense');
  const guideFont=await cards.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(guideFont).toBeGreaterThanOrEqual(11);
  await page.locator('[data-nfl-ppt-guide-close]').click();

  const matchupCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-match-v947.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-match-v947.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-match-v947.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-match-v947.bad)').first();
  await expect(matchupCell).toBeVisible();
  const matchupStyle=await matchupCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-match-v947>small')).color}));
  expect(matchupStyle.bg).not.toBe('rgba(0, 0, 0, 0)');

  const defCell=page.locator('#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.great),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.good),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.mid),#nflPlayerPropTool tbody td:has(.nfl-ppt-def-v947.bad)').first();
  await expect(defCell).toBeVisible();
  const defStyle=await defCell.evaluate(td=>({bg:getComputedStyle(td).backgroundColor,text:getComputedStyle(td.querySelector('.nfl-ppt-def-copy-v949 b')).color}));
  expect(defStyle.bg).not.toBe('rgba(0, 0, 0, 0)');
});'''
new, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'stale historical browser regression: expected 1 match, found {count}')
if 'nfl-ppt-history-v949' in new:
    # Historical styling may remain in CSS, but no browser QA should require the removed MATCHUP widget.
    matches=[line for line in new.splitlines() if 'nfl-ppt-history-v949' in line]
    if matches:
        raise SystemExit('stale historical MATCHUP browser selectors remain: '+str(matches[:4]))
TEST.write_text(new)
print('Updated stale v95.1 historical MATCHUP browser regression.')
