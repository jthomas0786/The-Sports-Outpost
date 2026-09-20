from pathlib import Path


def rep(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(f'{label}: marker missing')
    return s.replace(old, new, 1)

p=Path('sports/nfl/player-prop-tool-v947.js')
s=p.read_text()

anchor="""function actualRateValue(rate){return rate?.total?rate.hits/rate.total:-1;}
function historicalRateCell(rate,side,label){"""
insert="""function historicalGrade(rate){
  if(rate==null||!Number.isFinite(Number(rate)))return '—';
  const r=Number(rate);
  return r>=.70?'Great':r>=.60?'Good':r>=.45?'Fair':'Poor';
}
function gradeToneHistorical(label){return label==='Great'?'great':label==='Good'?'good':label==='Fair'?'mid':label==='Poor'?'bad':'neutral';}
function historicalDefenseAllowed(research,market,position){
  const pg=research?.matchup?.previousSeasonAllowed?.perGame||{};
  const pos=String(position||'').toUpperCase();
  let v=null;
  if(market==='rushYds')v=pg.rushYds;
  else if(market==='recYds')v=pg.recYds;
  else if(market==='receptions')v=pg.receptions;
  else if(market==='passYds')v=pg.passYds;
  else if(market==='passTds')v=pg.passTds??pg.tds;
  else if(market==='completions')v=pg.completions;
  else if(market==='atd')v=pos==='QB'?(pg.rushTds??pg.tds):(pg.tds??((num(pg.rushTds)||0)+(num(pg.recTds)||0)));
  return num(v);
}
function defenseUnit(market){
  if(market==='rushYds'||market==='recYds'||market==='passYds')return 'YDS/G';
  if(market==='passTds'||market==='atd')return 'TD/G';
  return '/G';
}
function attachDefenseHistory(rows){
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
function actualRateValue(rate){return rate?.total?rate.hits/rate.total:-1;}
function historicalRateCell(rate,side,label){"""
s=rep(s,anchor,insert,'actual historical helpers')

old="""        prob,edge,proj,l10Avg,l5Actual,l10Actual,h2hActual,mean,median,p10,p25,p75,p90,iterations,simStop,histDelta,histPct,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',"""
new="""        prob,edge,proj,l10Avg,l5Actual,l10Actual,h2hActual,defAllowed:historicalDefenseAllowed(research,String(c.market||''),String(c.position||player?.position||'').toUpperCase()),mean,median,p10,p25,p75,p90,iterations,simStop,histDelta,histPct,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',"""
s=rep(s,old,new,'row defense history')

old="""  rowsCache.set(key,out);
  return out;"""
new="""  attachDefenseHistory(out);
  rowsCache.set(key,out);
  return out;"""
s=rep(s,old,new,'attach defense history')

s=rep(s,"  if(key==='def')return row.simStop??-1;","  if(key==='def')return row.defHistoryScore??-1;",'def sort actual')

old_def="""function defHtml(row){
  const src=teamLogo(row.opp);
  return `<div class=\"nfl-ppt-def-v947\" title=\"${esc(row.opp)} defense · 50K simulation matchup read\">${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)}\">`:`<b>${esc(row.opp||'DEF')}</b>`}<span>vs Prop</span></div>`;
}"""
new_def="""function defHtml(row){
  const src=teamLogo(row.opp),grade=row.defHistoryGrade||'—',tone=gradeToneHistorical(grade);
  const value=row.defAllowed==null?'—':`${fmt(row.defAllowed)} ${defenseUnit(row.market)}`;
  return `<div class=\"nfl-ppt-def-v947 ${tone}\" title=\"${esc(row.opp)} previous-season actual allowance to ${esc(row.position||'this')} position group for ${esc(marketLabel(row.market))}. Grade is relative to the other defenses in this frozen slate and the displayed ${row.side==='under'?'Under':'Over'} side. No simulation data is used.\">${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)}\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}<div class=\"nfl-ppt-def-copy-v949\"><b>${esc(grade)}</b><span>${esc(value)} · PREV YR</span></div></div>`;
}"""
s=rep(s,old_def,new_def,'def actual renderer')

old_hist="""function historicalHtml(row){
  if(state.period!=='full'||row.histDelta==null){
    return `<div class=\"nfl-ppt-history-v949 neutral\" title=\"Historical comparison is shown for full-game sportsbook props because the research feed contains full-game actual results.\"><b>—</b><span>FULL GAME</span></div>`;
  }
  const tone=row.histDelta>0?'good':row.histDelta<0?'bad':'mid';
  const sign=row.histDelta>0?'+':'';
  const record=row.l10Actual?.total?`${row.l10Actual.hits}/${row.l10Actual.total} HIT`:'L10 ACTUAL';
  const side=row.side==='under'?'Under':'Over';
  return `<div class=\"nfl-ppt-history-v949 ${tone}\" title=\"Actual L10 average versus this selected sportsbook line. Positive supports the displayed ${side} pick. No simulation data is used.\"><b>${sign}${fmt(row.histDelta)}</b><span>${record} · VS LINE</span></div>`;
}"""
new_hist="""function historicalHtml(row){
  if(state.period!=='full'||row.histDelta==null){
    return `<div class=\"nfl-ppt-history-v949 neutral\" title=\"Historical comparison is shown for full-game sportsbook props because the research feed contains full-game actual results.\"><b>—</b><span>FULL GAME</span></div>`;
  }
  const rate=row.l10Actual?.rate??row.l5Actual?.rate??row.h2hActual?.rate??null;
  const grade=historicalGrade(rate),tone=gradeToneHistorical(grade),sign=row.histDelta>0?'+':'';
  const record=row.l10Actual?.total?`${row.l10Actual.hits}/${row.l10Actual.total} HIT`:'ACTUAL LOGS';
  const side=row.side==='under'?'Under':'Over';
  return `<div class=\"nfl-ppt-history-v949 ${tone}\" title=\"${grade} is based on actual recent hit rate for the displayed ${side} side. ${sign}${fmt(row.histDelta)} is the actual L10 average margin versus this sportsbook line. No simulation data is used.\"><b>${esc(grade)} · ${sign}${fmt(row.histDelta)}</b><span>${record} · VS LINE</span></div>`;
}"""
s=rep(s,old_hist,new_hist,'historical graded renderer')

s=rep(s,
"<div><b>DEF VS PROP</b><p>The opponent defense attached to the selected player prop.</p></div>",
"<div><b>DEF VS PROP</b><p>Previous-season actual allowance to this position group. Great/Good/Fair/Poor reflects how favorable it is for the displayed side.</p></div>",
'guide defense')
s=rep(s,
"<div><b>HISTORICAL</b><p>Actual L10 average margin versus the line. Positive supports the displayed side.</p></div>",
"<div><b>HISTORICAL</b><p>Great/Good/Fair/Poor comes from actual recent hit rate; the number is the actual L10 average margin versus the line.</p></div>",
'guide historical')
p.write_text(s)

# CSS tones for historical defense grades.
p=Path('sports/nfl/player-prop-tool-v947.css')
c=p.read_text()
marker='/* v94.9 historical defense grading */'
if marker not in c:
    c += '''\n\n/* v94.9 historical defense grading */\n#nflView .nfl-ppt-def-copy-v949{display:grid;gap:4px;min-width:0;text-align:center}\n#nflView .nfl-ppt-def-copy-v949 b{display:block;font:900 12px/1 \"JetBrains Mono\",monospace}\n#nflView .nfl-ppt-def-copy-v949 span{display:block;margin:0;font:800 8.5px/1.15 \"JetBrains Mono\",monospace;white-space:normal}\n#nflView .nfl-ppt-def-v947.great b,#nflView .nfl-ppt-def-v947.good b{color:#4ee49a}\n#nflView .nfl-ppt-def-v947.mid b{color:#f0c95b}\n#nflView .nfl-ppt-def-v947.bad b{color:#ff7a8e}\n'''
p.write_text(c)

# Static regression additions.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=p.read_text()
anchor="assert.ok(tool.includes('No simulation data is used'),'Historical tooltip must explicitly identify actual-only data');"
add="""
assert.ok(tool.includes('previousSeasonAllowed?.perGame'),'DEF VS PROP must use historical opponent allowance data');
assert.ok(tool.includes("if(key==='def')return row.defHistoryScore"),'DEF VS PROP sort must use historical defense score');
assert.ok(tool.includes("row.defHistoryGrade=support>=.75?'Great'"),'historical defense four-grade scale missing');
assert.ok(tool.includes("return r>=.70?'Great':r>=.60?'Good':r>=.45?'Fair':'Poor'"),'Historical four-grade scale missing');
assert.ok(!tool.includes('50K simulation matchup read'),'DEF VS PROP must not use simulated matchup copy');
"""
if add.strip() not in t:
    if anchor not in t: raise SystemExit('selftest history anchor missing')
    t=t.replace(anchor,anchor+add,1)
p.write_text(t)

# Adjust focused browser test to verify four-grade actual History and actual Defense.
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
b=p.read_text()
old="""  expect(historyTexts.some(x=>/\\d+\\/\\d+ HIT/.test(x))).toBe(true);
  expect(historyTexts.every(x=>!/(GOOD|GREAT|FAIR|TOUGH)/.test(x))).toBe(true);
  const historyTitle=await history.first().getAttribute('title');
  expect(historyTitle||'').toContain('Actual L10 average');
  expect(historyTitle||'').toContain('No simulation data');"""
new="""  expect(historyTexts.some(x=>/\\d+\\/\\d+ HIT/.test(x))).toBe(true);
  expect(historyTexts.filter(x=>x!=='—FULL GAME').every(x=>/(Great|Good|Fair|Poor)/.test(x))).toBe(true);
  expect(new Set(historyTexts.map(x=>(x.match(/Great|Good|Fair|Poor/)||[])[0]).filter(Boolean)).size).toBeGreaterThanOrEqual(2);
  const historyTitle=await history.first().getAttribute('title');
  expect(historyTitle||'').toContain('actual recent hit rate');
  expect(historyTitle||'').toContain('No simulation data');

  const defense=page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-def-v947');
  await expect(defense.first()).toBeVisible();
  const defenseTexts=await defense.evaluateAll(nodes=>nodes.slice(0,25).map(n=>(n.textContent||'').trim()));
  expect(defenseTexts.some(x=>/(Great|Good|Fair|Poor)/.test(x))).toBe(true);
  const defenseTitle=await defense.first().getAttribute('title');
  expect(defenseTitle||'').toContain('previous-season actual allowance');
  expect(defenseTitle||'').toContain('No simulation data');"""
b=rep(b,old,new,'browser actual grade assertions')
p.write_text(b)

print('Applied v94.9 actual Great/Good/Fair/Poor history and historical DEF VS PROP')
