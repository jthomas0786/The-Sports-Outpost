from pathlib import Path
import re

JS = Path('sports/nfl/player-prop-tool-v947.js')
CSS = Path('sports/nfl/player-prop-tool-v947.css')
PREVIEW = Path('sports/nfl-preview-v893.js')
ROUTER = Path('sports/router.js')
SELFTEST = Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
BROWSER = Path('tests/nfl-player-prop-tool-v947.spec.js')


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match in {path}, found {count}')
    path.write_text(text.replace(old, new, 1))


def replace_regex_once(path, pattern, replacement, label, flags=0):
    text = path.read_text()
    new, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 regex match in {path}, found {count}')
    path.write_text(new)


# Cache-bust the complete NFL Prop Tool import chain.
replace_once(JS, "const VERSION='95.0';", "const VERSION='95.1';", 'tool version')
replace_once(PREVIEW, "./nfl/player-prop-tool-v947.js?v=95.0", "./nfl/player-prop-tool-v947.js?v=95.1", 'preview cache bust')
replace_once(ROUTER, "import('./nfl-preview-v893.js?v=95.0')", "import('./nfl-preview-v893.js?v=95.1')", 'router cache bust')

# Replace the v94.9 historical-only MATCHUP grader with reusable four-grade scoring.
old_grade = """function historicalGrade(rate){
  if(rate==null||!Number.isFinite(Number(rate)))return '—';
  const r=Number(rate);
  return r>=.70?'Great':r>=.60?'Good':r>=.45?'Fair':'Poor';
}
function gradeToneHistorical(label){return label==='Great'?'great':label==='Good'?'good':label==='Fair'?'mid':label==='Poor'?'bad':'neutral';}
"""
new_grade = """function fourGrade(score){
  if(score==null||!Number.isFinite(Number(score)))return '—';
  const s=Number(score);
  return s>=.70?'Great':s>=.58?'Good':s>=.42?'Fair':'Poor';
}
function gradeToneHistorical(label){return label==='Great'?'great':label==='Good'?'good':label==='Fair'?'mid':label==='Poor'?'bad':'neutral';}
function weightedScore(parts){
  let sum=0,weight=0;
  for(const [value,w] of parts){
    if(value==null||!Number.isFinite(Number(value))||!Number.isFinite(Number(w))||Number(w)<=0)continue;
    sum+=clamp(Number(value))*Number(w);weight+=Number(w);
  }
  return weight?clamp(sum/weight):null;
}
"""
replace_once(JS, old_grade, new_grade, 'four-grade scoring helpers')

# DEF VS PROP is the defensive view: grade how strong the opponent defense is against
# this position/market. MATCHUP is the player view: blend actual recent player form
# with how favorable that defense is for the displayed Over/Under side.
old_attach = """function attachDefenseHistory(rows){
  const groups=new Map();
  for(const row of rows){
    if(row.defAllowed==null)continue;
    const key=`${row.position}|${row.market}`;
    if(!groups.has(key))groups.set(key,new Map());
    groups.get(key).set(row.opp,row.defAllowed);
  }
  for(const row of rows){
    const vals=[...(groups.get(`${row.position}|${row.market}`)?.values()||[])].filter(Number.isFinite).sort((a,b)=>a-b);
    if(row.defAllowed==null||!vals.length){row.defHistoryScore=null;row.defHistoryGrade='—';continue;}
    const lower=vals.filter(v=>v<row.defAllowed).length,equal=vals.filter(v=>v===row.defAllowed).length;
    const pct=(lower+equal*.5)/vals.length;
    const support=row.side==='under'?1-pct:pct;
    row.defHistoryScore=support;
    row.defHistoryGrade=support>=.75?'Great':support>=.58?'Good':support>=.42?'Fair':'Poor';
  }
}
"""
new_attach = """function attachMatchupProfiles(rows){
  const groups=new Map();
  for(const row of rows){
    if(row.defAllowed==null)continue;
    const key=`${row.position}|${row.market}`;
    if(!groups.has(key))groups.set(key,new Map());
    groups.get(key).set(row.opp,row.defAllowed);
  }
  for(const row of rows){
    const vals=[...(groups.get(`${row.position}|${row.market}`)?.values()||[])].filter(Number.isFinite).sort((a,b)=>a-b);
    if(row.defAllowed==null||!vals.length){
      row.defWeaknessScore=null;row.defStrengthScore=null;row.defHistoryScore=null;row.defHistoryGrade='—';
    }else{
      const lower=vals.filter(v=>v<row.defAllowed).length,equal=vals.filter(v=>v===row.defAllowed).length;
      const allowancePct=clamp((lower+equal*.5)/vals.length);
      row.defWeaknessScore=allowancePct;
      row.defStrengthScore=clamp(1-allowancePct);
      row.defHistoryScore=row.defStrengthScore;
      row.defHistoryGrade=fourGrade(row.defStrengthScore);
    }

    const recentRate=row.l10Actual?.rate??row.l5Actual?.rate??null;
    const h2hRate=row.h2hActual?.total>=2?row.h2hActual.rate:null;
    const marginScore=row.histPct==null?null:clamp(.5+Number(row.histPct)*1.35);
    row.playerMatchupScore=weightedScore([[recentRate,.70],[marginScore,.20],[h2hRate,.10]]);
    const defenseFit=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
    row.matchupDefenseScore=defenseFit;
    if(row.playerMatchupScore==null&&defenseFit!=null)row.matchupScore=weightedScore([[.5,.62],[defenseFit,.38]]);
    else if(defenseFit==null)row.matchupScore=row.playerMatchupScore;
    else row.matchupScore=weightedScore([[row.playerMatchupScore,.62],[defenseFit,.38]]);
    row.matchupGrade=fourGrade(row.matchupScore);
  }
}
"""
replace_once(JS, old_attach, new_attach, 'player-v-defense matchup profile calculation')
replace_once(JS, '  attachDefenseHistory(out);', '  attachMatchupProfiles(out);', 'matchup profile attach call')

# Sorting must follow the two distinct views rather than the old historical hit-rate cell.
replace_once(JS, "  if(key==='def')return row.defHistoryScore??-1;\n  if(key==='matchup')return row.histPct??-999;", "  if(key==='def')return row.defStrengthScore??-1;\n  if(key==='matchup')return row.matchupScore??-1;", 'DEF and MATCHUP sort ownership')

# Restore the intended visuals and semantics.
old_def = """function defHtml(row){
  const src=teamLogo(row.opp),grade=row.defHistoryGrade||'—',tone=gradeToneHistorical(grade);
  const value=row.defAllowed==null?'—':`${fmt(row.defAllowed)} ${defenseUnit(row.market)}`;
  return `<div class=\"nfl-ppt-def-v947 ${tone}\" title=\"${esc(row.opp)} previous-season actual allowance to ${esc(row.position||'this')} position group for ${esc(marketLabel(row.market))}. Grade is relative to the other defenses in this frozen slate and the displayed ${row.side==='under'?'Under':'Over'} side. No simulation data is used.\">${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)}\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}<div class=\"nfl-ppt-def-copy-v949\"><b>${esc(grade)}</b><span>${esc(value)} · PREV YR</span></div></div>`;
}
function historicalHtml(row){
  if(state.period!=='full'||row.histDelta==null){
    return `<div class=\"nfl-ppt-history-v949 neutral\" title=\"Historical comparison is shown for full-game sportsbook props because the research feed contains full-game actual results.\"><b>—</b><span>FULL GAME</span></div>`;
  }
  const rate=row.l10Actual?.rate??row.l5Actual?.rate??row.h2hActual?.rate??null;
  const grade=historicalGrade(rate),tone=gradeToneHistorical(grade),sign=row.histDelta>0?'+':'';
  const record=row.l10Actual?.total?`${row.l10Actual.hits}/${row.l10Actual.total} HIT`:'ACTUAL LOGS';
  const side=row.side==='under'?'Under':'Over';
  return `<div class=\"nfl-ppt-history-v949 ${tone}\" title=\"${grade} is based on actual recent hit rate for the displayed ${side} side. ${sign}${fmt(row.histDelta)} is the actual L10 average margin versus this sportsbook line. No simulation data is used.\"><b>${esc(grade)} · ${sign}${fmt(row.histDelta)}</b><span>${record} · VS LINE</span></div>`;
}
"""
new_def = """function defHtml(row){
  const src=teamLogo(row.opp),grade=row.defHistoryGrade||'—',tone=gradeToneHistorical(grade);
  const value=row.defAllowed==null?'—':`${fmt(row.defAllowed)} ${defenseUnit(row.market)}`;
  const title=`${row.opp} defense vs ${row.position||'this position'} ${marketLabel(row.market)}. ${grade==='—'?'Defensive allowance data is unavailable.':`${grade} grades the defense itself: stronger defenses allow less than peer defenses for this position/prop; weaker defenses allow more.`} ${value==='—'?'':`Previous-season actual allowance: ${value}. `}No simulation data is used.`;
  return `<div class=\"nfl-ppt-def-v947 ${tone}\" title=\"${esc(title)}\">${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}<div class=\"nfl-ppt-def-copy-v949\"><b>${esc(grade)}</b><span>${esc(value)} · PREV YR</span></div></div>`;
}
function matchupHtml(row){
  const grade=row.matchupGrade||'—',tone=gradeToneHistorical(grade),src=teamLogo(row.opp),side=row.side==='under'?'Under':'Over';
  const player=row.playerMatchupScore==null?'player form pending':`${Math.round(row.playerMatchupScore*100)}% player-form score`;
  const defense=row.matchupDefenseScore==null?'defense profile pending':`${Math.round(row.matchupDefenseScore*100)}% defense-fit score`;
  const title=`${row.position||'OFF'} vs ${row.opp} defense for ${marketLabel(row.market)} ${side}. ${grade} blends actual recent player results with the opponent's actual previous-season defensive allowance to this position/prop (${player}; ${defense}). No simulation data is used.`;
  return `<div class=\"nfl-ppt-match-v947 ${tone}\" title=\"${esc(title)}\"><div class=\"nfl-ppt-match-line-v947\"><b>${esc(row.position||'OFF')}</b><span>vs</span>${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}</div><small>${esc(grade)}</small></div>`;
}
"""
replace_once(JS, old_def, new_def, 'DEF VS PROP and MATCHUP rendering')
replace_once(JS, '    <td>${historicalHtml(row)}</td>', '    <td>${matchupHtml(row)}</td>', 'MATCHUP row cell ownership')

# Quick Guide must describe the restored two-way relationship.
replace_once(JS, "    <div><b>DEF VS PROP</b><p>Previous-season actual allowance to this position group. Great/Good/Fair/Poor reflects how favorable it is for the displayed side.</p></div>\n    <div><b>MATCHUP</b><p>Great/Good/Fair/Poor comes from actual recent hit rate versus this line; the number is the actual L10 average margin.</p></div>", "    <div><b>DEF VS PROP</b><p>Opponent defense vs this player position and prop. Great means a stronger defense with lower actual allowance than peers; Poor means a weaker defense with higher allowance.</p></div>\n    <div><b>MATCHUP</b><p>Player position vs the opponent defense. The grade blends actual recent player results with the opponent’s actual defensive allowance for this position/prop.</p></div>", 'Quick Guide matchup definitions')

# Preserve existing full-cell formatting and add it to the restored MATCHUP visual.
css = CSS.read_text()
marker = '/* v95.1 player-v-defense matchup restore */'
if marker in css:
    raise SystemExit('v95.1 matchup CSS already present unexpectedly')
css += r'''

/* v95.1 player-v-defense matchup restore */
#nflView .nfl-ppt-match-v947.great>small{color:#7dffad!important}
#nflView .nfl-ppt-match-v947.good>small{color:#68e6b0!important}
#nflView .nfl-ppt-match-v947.mid>small{color:#ffd166!important}
#nflView .nfl-ppt-match-v947.bad>small{color:#ff8d9a!important}
#nflView .nfl-ppt-match-v947.neutral>small{color:#a7b8ca!important}
#nflView .nfl-ppt-table td:has(.nfl-ppt-match-v947.great){background-color:rgba(34,197,94,.24)!important;box-shadow:inset 0 0 0 1px rgba(74,222,128,.34)}
#nflView .nfl-ppt-table td:has(.nfl-ppt-match-v947.good){background-color:rgba(16,185,129,.15)!important;box-shadow:inset 0 0 0 1px rgba(52,211,153,.25)}
#nflView .nfl-ppt-table td:has(.nfl-ppt-match-v947.mid){background-color:rgba(245,158,11,.18)!important;box-shadow:inset 0 0 0 1px rgba(251,191,36,.28)}
#nflView .nfl-ppt-table td:has(.nfl-ppt-match-v947.bad){background-color:rgba(239,68,68,.19)!important;box-shadow:inset 0 0 0 1px rgba(248,113,113,.30)}
'''
CSS.write_text(css)

# Permanent static regression: remove the v94.9 historical-MATCHUP assumptions and lock
# the restored player-v-defense / defense-v-prop ownership.
selftest = SELFTEST.read_text()
old_static = """assert.ok(tool.includes('nfl-ppt-history-v949'),'Historical actual-data cell missing');
assert.ok(tool.includes('const statKey=MARKET_STAT'),'historical market-stat mapping missing');
assert.ok(tool.includes(\"const histDelta=full&&l10Avg!=null\"),'Historical column must derive from actual L10 average');
assert.ok(tool.includes(\"if(key==='matchup')return row.histPct\"),'MATCHUP column sort must use actual normalized historical margin');
assert.ok(tool.includes('No simulation data is used'),'Historical tooltip must explicitly identify actual-only data');
assert.ok(tool.includes('previousSeasonAllowed?.perGame'),'DEF VS PROP must use historical opponent allowance data');
assert.ok(tool.includes(\"if(key==='def')return row.defHistoryScore\"),'DEF VS PROP sort must use historical defense score');
assert.ok(tool.includes(\"row.defHistoryGrade=support>=.75?'Great'\"),'historical defense four-grade scale missing');
assert.ok(tool.includes(\"return r>=.70?'Great':r>=.60?'Good':r>=.45?'Fair':'Poor'\"),'Historical four-grade scale missing');
assert.ok(!tool.includes('50K simulation matchup read'),'DEF VS PROP must not use simulated matchup copy');
"""
new_static = """assert.ok(tool.includes('nfl-ppt-match-v947'),'MATCHUP player-v-defense cell missing');
assert.ok(tool.includes('nfl-ppt-match-line-v947'),'MATCHUP position-vs-opponent-logo line missing');
assert.ok(tool.includes('const statKey=MARKET_STAT'),'historical market-stat mapping missing');
assert.ok(tool.includes(\"const histDelta=full&&l10Avg!=null\"),'actual player-form margin must derive from L10 average');
assert.ok(tool.includes('previousSeasonAllowed?.perGame'),'DEF VS PROP must use historical opponent allowance data');
assert.ok(tool.includes('row.defStrengthScore=clamp(1-allowancePct)'),'DEF VS PROP must grade defensive strength from opponent allowance');
assert.ok(tool.includes(\"const defenseFit=row.side==='under'?row.defStrengthScore:row.defWeaknessScore\"),'MATCHUP must convert defense strength/weakness to the selected prop side');
assert.ok(tool.includes('row.matchupScore=weightedScore'),'MATCHUP must blend player form and opponent defense');
assert.ok(tool.includes(\"if(key==='def')return row.defStrengthScore\"),'DEF VS PROP sort must use defense-strength score');
assert.ok(tool.includes(\"if(key==='matchup')return row.matchupScore\"),'MATCHUP sort must use player-v-defense score');
assert.ok(tool.includes(\"return s>=.70?'Great':s>=.58?'Good':s>=.42?'Fair':'Poor'\"),'Great/Good/Fair/Poor scale missing');
assert.ok(tool.includes('No simulation data is used'),'MATCHUP and defense tooltips must identify actual-only data');
assert.ok(!tool.includes('function historicalHtml(row)'),'historical hit-rate box must not own MATCHUP');
assert.ok(!tool.includes('50K simulation matchup read'),'DEF VS PROP must not use simulated matchup copy');
"""
if old_static not in selftest:
    raise SystemExit('static matchup assertion block not found')
selftest = selftest.replace(old_static, new_static, 1)
selftest = selftest.replace("assert.ok(css.includes(`td:has(.nfl-ppt-history-v949.${tone})`),`MATCHUP full-cell background missing for ${tone}`);", "assert.ok(css.includes(`td:has(.nfl-ppt-match-v947.${tone})`),`MATCHUP full-cell background missing for ${tone}`);", 1)
selftest = selftest.replace("./nfl/player-prop-tool-v947.js?v=95.0", "./nfl/player-prop-tool-v947.js?v=95.1", 1)
selftest = selftest.replace("import('./nfl-preview-v893.js?v=95.0')", "import('./nfl-preview-v893.js?v=95.1')", 1)
selftest = selftest.replace("console.log('✓ NFL Player Prop Tool v94.9 readability/history static regression passed');", "console.log('✓ NFL Player Prop Tool v95.1 player-v-defense matchup static regression passed');", 1)
selftest += "\nassert.ok(tool.includes(\"const VERSION='95.1'\"),'Player Prop Tool v95.1 version missing');\nassert.ok(css.includes('/* v95.1 player-v-defense matchup restore */'),'v95.1 matchup CSS missing');\n"
SELFTEST.write_text(selftest)

# Browser regression moves from the wrong historical box to the intended position-vs-logo matchup.
browser = BROWSER.read_text().replace('95.0','95.1')
pattern = r"test\('v95\.1 readability keeps all columns centered with larger Player and historical Matchup cells',async\(\{page\}\)=>\{.*?\n\}\);"
replacement = r'''test('v95.1 Matchup is player position vs opponent defense and DEF is the defensive view',async({page})=>{
  await open(page);
  const row=page.locator('#nflPlayerPropTool tbody tr:visible').first();
  const metrics=await row.evaluate(r=>{
    const match=r.querySelector('.nfl-ppt-match-v947'),line=match?.querySelector('.nfl-ppt-match-line-v947'),def=r.querySelector('.nfl-ppt-def-v947');
    return {
      centers:[...r.children].every(td=>getComputedStyle(td).textAlign==='center'),
      playerWidth:r.children[0].getBoundingClientRect().width,
      star:r.querySelector('.nfl-ppt-watch-v947')?.getBoundingClientRect().width||0,
      avatar:r.querySelector('.nfl-ppt-avatar-v947')?.getBoundingClientRect().width||0,
      matchPos:line?.querySelector('b')?.textContent?.trim()||'',
      matchVs:line?.querySelector('span')?.textContent?.trim()||'',
      matchLogo:line?.querySelector('img')?.getAttribute('src')||'',
      matchGrade:match?.querySelector(':scope>small')?.textContent?.trim()||'',
      matchTitle:match?.getAttribute('title')||'',
      matchBg:getComputedStyle(r.children[8]).backgroundColor,
      defLogo:def?.querySelector('img')?.getAttribute('src')||'',
      defGrade:def?.querySelector('b')?.textContent?.trim()||'',
      defTitle:def?.getAttribute('title')||'',
      defBg:getComputedStyle(r.children[7]).backgroundColor,
    };
  });
  expect(metrics.centers).toBe(true);
  expect(metrics.playerWidth).toBeGreaterThanOrEqual(189);
  expect(metrics.playerWidth).toBeLessThanOrEqual(200);
  expect(metrics.star).toBeLessThan(metrics.avatar);
  expect(metrics.matchPos).toMatch(/QB|RB|WR|TE/);
  expect(metrics.matchVs.toLowerCase()).toBe('vs');
  expect(metrics.matchLogo).toContain('teamlogos/nfl');
  expect(metrics.matchGrade).toMatch(/Great|Good|Fair|Poor/);
  expect(metrics.matchTitle).toContain('actual recent player results');
  expect(metrics.matchTitle).toContain('defensive allowance');
  expect(metrics.matchTitle).toContain('No simulation data is used');
  expect(metrics.defLogo).toContain('teamlogos/nfl');
  expect(metrics.defGrade).toMatch(/Great|Good|Fair|Poor/);
  expect(metrics.defTitle).toContain('grades the defense itself');
  expect(metrics.defTitle).toContain('No simulation data is used');
  expect(metrics.matchBg).not.toBe('rgba(0, 0, 0, 0)');
  expect(metrics.defBg).not.toBe('rgba(0, 0, 0, 0)');

  const ownership=await page.evaluate(()=>{
    const rows=window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[];
    const r=rows.find(x=>Number.isFinite(Number(x.matchupScore))&&Number.isFinite(Number(x.defStrengthScore)));
    return r?{matchupScore:r.matchupScore,defStrengthScore:r.defStrengthScore,defWeaknessScore:r.defWeaknessScore,playerScore:r.playerMatchupScore,side:r.side}:null;
  });
  expect(ownership).toBeTruthy();
  expect(ownership.matchupScore).toBeGreaterThanOrEqual(0);
  expect(ownership.matchupScore).toBeLessThanOrEqual(1);
  expect(ownership.defStrengthScore+ownership.defWeaknessScore).toBeCloseTo(1,5);
});'''
new_browser, count = re.subn(pattern, replacement, browser, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'browser historical matchup test replacement expected 1 match, found {count}')
BROWSER.write_text(new_browser)

print('Applied NFL Player Prop Tool v95.1 player-v-defense matchup restore.')
