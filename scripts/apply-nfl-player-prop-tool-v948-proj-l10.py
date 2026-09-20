from pathlib import Path


def read(path): return Path(path).read_text()
def write(path,text): Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text: return text
    if old not in text: raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

p='sports/nfl/player-prop-tool-v947.js'
s=read(p)

# Data ownership for the final table:
# 50K simulation -> PROJ, COV PROB, EDGE, DEF VS PROP, MATCHUP, SIM DEF
# Actual game logs -> L10 AVG, L5, L10, H2H
s=replace_once(
    s,
    "['proj','PROJ'],['median','L10 AVG']",
    "['proj','PROJ'],['l10Avg','L10 AVG']",
    'L10 AVG header sort key',
)

helpers="""\nconst MARKET_STAT={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'};\nfunction buildResearchIndex(research){\n  const byEspn=new Map(),byGsis=new Map(),byTeamName=new Map();\n  for(const p of research?.players||[]){\n    if(p?.espnId)byEspn.set(String(p.espnId),p);\n    if(p?.gsisId)byGsis.set(String(p.gsisId),p);\n    byTeamName.set(`${team(p?.team)}|${norm(p?.name)}`,p);\n  }\n  return{byEspn,byGsis,byTeamName};\n}\nfunction findResearch(index,p){\n  if(!p)return null;\n  return index.byEspn.get(String(p.espnId||''))||index.byGsis.get(String(p.gsisId||''))||index.byTeamName.get(`${team(p.team)}|${norm(p.name)}`)||null;\n}\nfunction researchLogs(r){return Array.isArray(r?.gameLog)&&r.gameLog.length?r.gameLog:(r?.last5?.gamesLog||[]);}\nfunction statValue(log,key){\n  if(!log)return null;\n  if(key==='tds')return num(log.tds??((num(log.rushTds)||0)+(num(log.recTds)||0)));\n  return num(log[key]);\n}\nfunction recentAverage(logs,key,n=10){\n  const vals=(logs||[]).slice(0,n).map(x=>statValue(x,key)).filter(v=>v!=null);\n  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;\n}\nfunction actualHitRate(logs,key,line,side,n){\n  if(line==null)return null;\n  const vals=(logs||[]).slice(0,n).map(x=>statValue(x,key)).filter(v=>v!=null);\n  if(!vals.length)return null;\n  const hits=vals.filter(v=>side==='under'?v<line:v>line).length;\n  return{hits,total:vals.length,rate:hits/vals.length};\n}\nfunction actualH2HRate(logs,key,line,side,opp){\n  if(line==null)return null;\n  const vals=(logs||[]).filter(x=>team(x?.opponent||x?.opp)===team(opp)).map(x=>statValue(x,key)).filter(v=>v!=null).slice(0,10);\n  if(!vals.length)return null;\n  const hits=vals.filter(v=>side==='under'?v<line:v>line).length;\n  return{hits,total:vals.length,rate:hits/vals.length};\n}\nfunction projectionMeta(row){\n  if(row.proj==null||row.line==null)return '50K PROJ';\n  const delta=row.proj-row.line;\n  return `${delta>=0?'+':''}${fmt(delta)} vs line`;\n}\nfunction actualRateValue(rate){return rate?.total?rate.hits/rate.total:-1;}\nfunction historicalRateCell(rate,side,label){\n  if(!rate||!rate.total)return `<div class=\"nfl-ppt-hit-v947 neutral\"><b>—</b><span>${label}</span></div>`;\n  const tone=rate.rate>=.70?'good':rate.rate<=.30?'bad':'mid';\n  return `<div class=\"nfl-ppt-hit-v947 ${tone}\" title=\"Actual game-log result versus this selected line\"><b>${rate.hits}/${rate.total}</b><span>${side==='under'?'Under':'Over'} · ${label}</span></div>`;\n}\n"""
s=replace_once(
    s,
    "function payoutBonus(price){",
    helpers+"\nfunction payoutBonus(price){",
    'research/history helpers',
)

s=replace_once(
    s,
    "  const slateById=gameMaps(docs),out=[];",
    "  const slateById=gameMaps(docs),researchIndex=buildResearchIndex(docs.research),out=[];",
    'research index in row builder',
)

s=replace_once(
    s,
    "      const player=findSlatePlayer(g,c);\n      const away=team(g?.away?.abbr||g?.away||simGame?.game?.away?.abbr),home=team(g?.home?.abbr||g?.home||simGame?.game?.home?.abbr);",
    "      const player=findSlatePlayer(g,c);\n      const research=findResearch(researchIndex,player||c),logs=researchLogs(research);\n      const away=team(g?.away?.abbr||g?.away||simGame?.game?.away?.abbr),home=team(g?.home?.abbr||g?.home||simGame?.game?.home?.abbr);",
    'research match per candidate',
)

s=replace_once(
    s,
    "      const mean=num(dist.mean),median=num(dist.median)??mean,p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90),p10=num(dist.p10);\n      const simStop=clamp(1-prob),matchScore=clamp(prob+(full&&edge!=null?edge*.20:0));",
    "      const mean=num(dist.mean),median=num(dist.median)??mean,p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90),p10=num(dist.p10);\n      const statKey=MARKET_STAT[String(c.market||'')],proj=mean,l10Avg=statKey?recentAverage(logs,statKey,10):null;\n      const l5Actual=statKey?actualHitRate(logs,statKey,num(c.line),String(c.side||'over').toLowerCase(),5):null;\n      const l10Actual=statKey?actualHitRate(logs,statKey,num(c.line),String(c.side||'over').toLowerCase(),10):null;\n      const h2hActual=statKey?actualH2HRate(logs,statKey,num(c.line),String(c.side||'over').toLowerCase(),opp):null;\n      const simStop=clamp(1-prob),matchScore=clamp(prob+(full&&edge!=null?edge*.20:0));",
    'simulation projection plus actual game-log metrics',
)

s=replace_once(
    s,
    "        prob,edge,mean,median,p10,p25,p75,p90,iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',",
    "        prob,edge,proj,l10Avg,l5Actual,l10Actual,h2hActual,mean,median,p10,p25,p75,p90,iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',",
    'store simulation and historical values',
)

s=replace_once(s,"if(key==='proj')return row.mean??-1;","if(key==='proj')return row.proj??-1;",'projection sort')
s=replace_once(s,"if(key==='median')return row.median??-1;","if(key==='l10Avg')return row.l10Avg??-1;",'L10 average sort')
s=replace_once(s,"if(key==='l5')return row.prob??-1;","if(key==='l5')return actualRateValue(row.l5Actual);",'L5 actual sort')
s=replace_once(s,"if(key==='l10')return row.prob??-1;","if(key==='l10')return actualRateValue(row.l10Actual);",'L10 actual sort')
s=replace_once(s,"if(key==='h2h')return row.prob??-1;","if(key==='h2h')return actualRateValue(row.h2hActual);",'H2H actual sort')

s=replace_once(
    s,
    "    <td><div class=\"nfl-ppt-metric-v947\"><b>${fmt(row.mean)}</b><span>SIM MEAN</span></div></td>\n    <td><div class=\"nfl-ppt-metric-v947\"><b>${fmt(row.median)}</b><span>SIM MED</span></div></td>",
    "    <td><div class=\"nfl-ppt-metric-v947 nfl-ppt-proj-v948\" title=\"Projection from the 50,000-simulation distribution\"><b>${fmt(row.proj)}</b><span>${esc(projectionMeta(row))}</span></div></td>\n    <td><div class=\"nfl-ppt-metric-v947 nfl-ppt-l10avg-v948\" title=\"Actual average from the player's most recent 10 available game logs\"><b>${fmt(row.l10Avg)}</b><span>${esc(marketLabel(row.market))}</span></div></td>",
    'PROJ and L10 AVG cell semantics',
)

s=replace_once(
    s,
    "    <td>${hitCell(row.prob,5,row.side==='under'?'Under':'Over')}</td>\n    <td>${hitCell(row.prob,10,row.side==='under'?'Under':'Over')}</td>\n    <td><div class=\"nfl-ppt-hit-v947 sim\"><b>${Math.round(row.prob*100)}%</b><span>50K SIM</span></div></td>",
    "    <td>${historicalRateCell(row.l5Actual,row.side,'L5')}</td>\n    <td>${historicalRateCell(row.l10Actual,row.side,'L10')}</td>\n    <td>${historicalRateCell(row.h2hActual,row.side,'H2H')}</td>",
    'actual L5 L10 H2H cells',
)

# Delete the old simulation-equivalent hit-cell helper so it cannot accidentally be reused.
old_hit="""function hitCell(prob,total,label){\n  const hits=Math.max(0,Math.min(total,Math.round(clamp(prob)*total))),tone=prob>=.67?'good':prob<.48?'bad':'mid';\n  return `<div class=\"nfl-ppt-hit-v947 ${tone}\"><b>${hits}/${total}</b><span>${label}</span></div>`;\n}\n"""
s=s.replace(old_hit,'')

s=s.replace(
    '<div><b>PROJ / L10 AVG</b><p>Simulation mean and simulation median from the same 50,000 worlds. L10 AVG is a display category here, not a historical last-10 claim.</p></div>',
    '<div><b>PROJ / L10 AVG</b><p>PROJ comes from the 50,000-simulation distribution. L10 AVG is the player’s actual average for that stat across the most recent 10 available game logs.</p></div>'
)
s=s.replace(
    '<div><b>L5 / L10 / H2H</b><p>Compact 50K simulation equivalents so every displayed stat stays simulation-backed.</p></div>',
    '<div><b>L5 / L10 / H2H</b><p>Actual game-log hit rates versus the selected prop line. L5 uses the last 5 games, L10 uses the last 10 available games, and H2H uses prior available games against the current opponent.</p></div>'
)

write(p,s)

# Keep projection/history text readable.
p='sports/nfl/player-prop-tool-v947.css'
c=read(p)
extra='''\n#nflView .nfl-ppt-proj-v948 span{color:#6ee7a6!important;font-weight:800!important}\n#nflView .nfl-ppt-l10avg-v948 span{color:#8fa9c2!important;font-weight:800!important}\n'''
if '.nfl-ppt-proj-v948 span' not in c:c+=extra
write(p,c)

# Static regressions must enforce the source split.
p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(tool.includes('nfl-ppt-match-line-v947'),'Matchup position-vs-defense-logo layout missing');"
add="""\nassert.ok(tool.includes('const statKey=MARKET_STAT'),'historical market-stat mapping missing');\nassert.ok(tool.includes('recentAverage(logs,statKey,10)'),'L10 AVG must use actual game logs');\nassert.ok(tool.includes('actualHitRate(logs,statKey'),'L5/L10 must use actual game logs');\nassert.ok(tool.includes('actualH2HRate(logs,statKey'),'H2H must use actual opponent game logs');\nassert.ok(tool.includes('proj=mean'),'PROJ must come from the 50K simulation distribution');\nassert.ok(tool.includes('historicalRateCell(row.l5Actual'),'L5 historical cell missing');\nassert.ok(tool.includes('historicalRateCell(row.l10Actual'),'L10 historical cell missing');\nassert.ok(tool.includes('historicalRateCell(row.h2hActual'),'H2H historical cell missing');\nassert.ok(!tool.includes('hitCell(row.prob,5'),'L5 must never use simulation-equivalent hits');\nassert.ok(!tool.includes('hitCell(row.prob,10'),'L10 must never use simulation-equivalent hits');\nassert.ok(!tool.includes('<span>50K SIM</span>'),'H2H must never display a simulation percentage');\nassert.ok(!tool.includes('<span>SIM MEAN</span>'),'PROJ must not display SIM MEAN');\nassert.ok(!tool.includes('<span>SIM MED</span>'),'L10 AVG must not display SIM MED');"""
if add.strip() not in t:
    if anchor not in t: raise SystemExit('selftest insertion anchor missing')
    t=t.replace(anchor,anchor+add)
write(p,t)

# Browser QA verifies the visible data ownership and actual game-log values.
p='tests/nfl-player-prop-tool-v947.spec.js'
t=read(p)
qa="""\n\ntest('simulation columns and actual game-log columns keep strict data ownership',async({page})=>{\n  await open(page);\n  const all=await page.evaluate(()=>window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]);\n  const historical=all.find(r=>Number.isFinite(Number(r.l10Avg))&&r.l5Actual?.total&&r.l10Actual?.total);\n  expect(historical).toBeTruthy();\n  const row=page.locator('#nflPlayerPropTool tbody tr').filter({has:page.locator(`[data-row-id=\"${historical.id.replace(/([\\\"\\\\])/g,'\\\\$1')}\"]`)}).first();\n  if(await row.count()){\n    const cells=await row.locator('td').allTextContents();\n    expect(cells[3]).toContain('vs line');\n    expect(cells[3]).not.toContain('SIM MEAN');\n    expect(cells[4]).not.toContain('SIM MED');\n    expect(Number((await row.locator('td').nth(4).locator('b').textContent())||NaN)).toBeCloseTo(Number(historical.l10Avg),1);\n    expect(cells[10]).toContain(`${historical.l5Actual.hits}/${historical.l5Actual.total}`);\n    expect(cells[11]).toContain(`${historical.l10Actual.hits}/${historical.l10Actual.total}`);\n    if(historical.h2hActual?.total)expect(cells[12]).toContain(`${historical.h2hActual.hits}/${historical.h2hActual.total}`);\n    expect(cells[10]).not.toContain('50K SIM');\n    expect(cells[11]).not.toContain('50K SIM');\n    expect(cells[12]).not.toContain('50K SIM');\n  }\n});\n"""
# Remove the previous narrower test if it was appended in an earlier runner attempt.
marker="test('PROJ and L10 AVG use projection and real historical-average semantics'"
if marker in t:
    t=t[:t.index(marker)].rstrip()+"\n"
if 'simulation columns and actual game-log columns keep strict data ownership' not in t:t+=qa
write(p,t)

print('NFL Player Prop Tool v94.8 strict simulation/history data ownership applied')
