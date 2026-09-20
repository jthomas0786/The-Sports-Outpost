from pathlib import Path

JS=Path('sports/nfl/player-prop-tool-v947.js')
PREVIEW=Path('sports/nfl-preview-v893.js')
ROUTER=Path('sports/router.js')
SELFTEST=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
BROWSER=Path('tests/nfl-player-prop-tool-v947.spec.js')


def replace_once(path,old,new,label):
    text=path.read_text()
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    path.write_text(text.replace(old,new,1))


def replace_all(path,old,new,label,min_count=1):
    text=path.read_text()
    count=text.count(old)
    if count<min_count:
        raise SystemExit(f'{label}: expected at least {min_count} matches in {path}, found {count}')
    path.write_text(text.replace(old,new))
    return count

# Hard cache bust for the behavior change.
replace_once(JS,"const VERSION='95.1';","const VERSION='95.2';",'tool version')
replace_once(PREVIEW,"./nfl/player-prop-tool-v947.js?v=95.1","./nfl/player-prop-tool-v947.js?v=95.2",'preview cache bust')
replace_once(ROUTER,"import('./nfl-preview-v893.js?v=95.1')","import('./nfl-preview-v893.js?v=95.2')",'router cache bust')

# DEF VS PROP must grade from the displayed prop side, not grade the defense itself.
old_score="""      row.defWeaknessScore=allowancePct;
      row.defStrengthScore=clamp(1-allowancePct);
      row.defHistoryScore=row.defStrengthScore;
      row.defHistoryGrade=fourGrade(row.defStrengthScore);
"""
new_score="""      row.defWeaknessScore=allowancePct;
      row.defStrengthScore=clamp(1-allowancePct);
      const propFavorability=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
      row.defHistoryScore=propFavorability;
      row.defHistoryGrade=fourGrade(propFavorability);
"""
replace_once(JS,old_score,new_score,'DEF VS PROP player-side favorability')
replace_once(JS,"    const defenseFit=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;","    const defenseFit=row.defHistoryScore;",'MATCHUP consumes same defense fit')
replace_once(JS,"  if(key==='def')return row.defStrengthScore??-1;","  if(key==='def')return row.defHistoryScore??-1;",'DEF sort uses prop favorability')

old_title="""  const title=`${row.opp} defense vs ${row.position||'this position'} ${marketLabel(row.market)}. ${grade==='—'?'Defensive allowance data is unavailable.':`${grade} grades the defense itself: stronger defenses allow less than peer defenses for this position/prop; weaker defenses allow more.`} ${value==='—'?'':`Previous-season actual allowance: ${value}. `}No simulation data is used.`;
"""
new_title="""  const side=row.side==='under'?'Under':'Over';
  const title=`${row.opp} defense vs ${row.position||'this position'} ${marketLabel(row.market)} ${side}. ${grade==='—'?'Defensive allowance data is unavailable.':`${grade} is graded from the displayed player prop side: Great/green means this defense is favorable for the ${side}; Poor/red means it is unfavorable.`} ${side==='Over'?'Higher opponent allowance helps the Over; lower allowance hurts it.':'Lower opponent allowance helps the Under; higher allowance hurts it.'} ${value==='—'?'':`Previous-season actual allowance: ${value}. `}No simulation data is used.`;
"""
replace_once(JS,old_title,new_title,'DEF tooltip semantics')

old_guide='    <div><b>DEF VS PROP</b><p>Opponent defense vs this player position and prop. Great means a stronger defense with lower actual allowance than peers; Poor means a weaker defense with higher allowance.</p></div>'
new_guide='    <div><b>DEF VS PROP</b><p>Opponent defense vs this player position and prop, graded for the displayed pick. Great/green helps the pick; Poor/red hurts it. Overs favor defenses allowing more; Unders favor defenses allowing less.</p></div>'
replace_once(JS,old_guide,new_guide,'Quick Guide DEF semantics')

# Permanent static regression ownership.
replace_all(SELFTEST,'95.1','95.2','selftest version bump')
replace_once(SELFTEST,
"assert.ok(tool.includes('row.defStrengthScore=clamp(1-allowancePct)'),'DEF VS PROP must grade defensive strength from opponent allowance');\nassert.ok(tool.includes(\"const defenseFit=row.side==='under'?row.defStrengthScore:row.defWeaknessScore\"),'MATCHUP must convert defense strength/weakness to the selected prop side');",
"assert.ok(tool.includes('row.defStrengthScore=clamp(1-allowancePct)'),'defense-strength normalization must remain available');\nassert.ok(tool.includes(\"const propFavorability=row.side==='under'?row.defStrengthScore:row.defWeaknessScore\"),'DEF VS PROP must favor high allowance for Overs and low allowance for Unders');\nassert.ok(tool.includes('row.defHistoryScore=propFavorability'),'DEF VS PROP grade must own player-side prop favorability');\nassert.ok(tool.includes('const defenseFit=row.defHistoryScore'),'MATCHUP must consume the same player-favorable defense fit');",
'selftest DEF ownership')
replace_once(SELFTEST,
"assert.ok(tool.includes(\"if(key==='def')return row.defStrengthScore\"),'DEF VS PROP sort must use defense-strength score');",
"assert.ok(tool.includes(\"if(key==='def')return row.defHistoryScore\"),'DEF VS PROP sort must use player-favorable prop score');",
'selftest DEF sorting')
replace_once(SELFTEST,
"assert.ok(tool.includes('No simulation data is used'),'MATCHUP and defense tooltips must identify actual-only data');",
"assert.ok(tool.includes('No simulation data is used'),'MATCHUP and defense tooltips must identify actual-only data');\nassert.ok(tool.includes('graded from the displayed player prop side'),'DEF tooltip must explain player-favorable grading');\nassert.ok(tool.includes('Great/green helps the pick; Poor/red hurts it.'),'Quick Guide must explain player-favorable DEF colors');",
'selftest player-favorable copy')

# Browser QA: version bump plus direct proof that DEF score flips with Over/Under side.
replace_all(BROWSER,'95.1','95.2','browser version bump')
replace_once(BROWSER,"test('v95.2 Matchup is player position vs opponent defense and DEF is the defensive view'","test('v95.2 Matchup is player position vs opponent defense and DEF VS PROP favors the displayed pick'",'focused browser test title')
replace_once(BROWSER,"  expect(metrics.defTitle).toContain('grades the defense itself');","  expect(metrics.defTitle).toContain('graded from the displayed player prop side');",'focused DEF tooltip assertion')
replace_once(BROWSER,"  expect(defenseData.title).toContain('grades the defense itself');","  expect(defenseData.title).toContain('graded from the displayed player prop side');",'readability DEF tooltip assertion')
replace_once(BROWSER,"  expect(guideText[7]).toContain('Opponent defense vs this player position and prop');","  expect(guideText[7]).toContain('graded for the displayed pick');\n  expect(guideText[7]).toContain('Great/green helps the pick');",'Quick Guide browser semantics')

old_owner="""  const ownership=await page.evaluate(()=>{
    const rows=window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[];
    const r=rows.find(x=>Number.isFinite(Number(x.matchupScore))&&Number.isFinite(Number(x.defStrengthScore)));
    return r?{matchupScore:r.matchupScore,defStrengthScore:r.defStrengthScore,defWeaknessScore:r.defWeaknessScore,playerScore:r.playerMatchupScore,side:r.side}:null;
  });
  expect(ownership).toBeTruthy();
  expect(ownership.matchupScore).toBeGreaterThanOrEqual(0);
  expect(ownership.matchupScore).toBeLessThanOrEqual(1);
  expect(ownership.defStrengthScore+ownership.defWeaknessScore).toBeCloseTo(1,5);
"""
new_owner="""  const ownership=await page.evaluate(()=>{
    const rows=window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[];
    return rows.filter(x=>Number.isFinite(Number(x.matchupScore))&&Number.isFinite(Number(x.defStrengthScore))&&Number.isFinite(Number(x.defWeaknessScore))&&Number.isFinite(Number(x.defHistoryScore))).slice(0,100).map(r=>({matchupScore:r.matchupScore,defStrengthScore:r.defStrengthScore,defWeaknessScore:r.defWeaknessScore,defHistoryScore:r.defHistoryScore,side:r.side}));
  });
  expect(ownership.length).toBeGreaterThan(0);
  for(const row of ownership){
    expect(row.matchupScore).toBeGreaterThanOrEqual(0);
    expect(row.matchupScore).toBeLessThanOrEqual(1);
    expect(row.defStrengthScore+row.defWeaknessScore).toBeCloseTo(1,5);
    const expected=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
    expect(row.defHistoryScore).toBeCloseTo(expected,5);
  }
  expect(ownership.some(x=>x.side==='over')).toBe(true);
  expect(ownership.some(x=>x.side==='under')).toBe(true);
"""
replace_once(BROWSER,old_owner,new_owner,'browser player-side DEF ownership')

print('v95.2 DEF VS PROP player-favorability cutover applied')
