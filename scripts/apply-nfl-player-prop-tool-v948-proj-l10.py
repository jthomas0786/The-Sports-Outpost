from pathlib import Path


def read(path): return Path(path).read_text()
def write(path,text): Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text: return text
    if old not in text: raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

p='sports/nfl/player-prop-tool-v947.js'
s=read(p)

# L10 AVG is a real historical last-10 average. PROJ remains the model projection,
# but must be presented as a projection with distance to the selected line rather
# than exposed as an internal SIM MEAN/SIM MEDIAN implementation detail.
s=replace_once(
    s,
    "['proj','PROJ'],['median','L10 AVG']",
    "['proj','PROJ'],['l10Avg','L10 AVG']",
    'L10 AVG header sort key',
)

helpers="""\nconst MARKET_STAT={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'};\nfunction buildResearchIndex(research){\n  const byEspn=new Map(),byGsis=new Map(),byTeamName=new Map();\n  for(const p of research?.players||[]){\n    if(p?.espnId)byEspn.set(String(p.espnId),p);\n    if(p?.gsisId)byGsis.set(String(p.gsisId),p);\n    byTeamName.set(`${team(p?.team)}|${norm(p?.name)}`,p);\n  }\n  return{byEspn,byGsis,byTeamName};\n}\nfunction findResearch(index,p){\n  if(!p)return null;\n  return index.byEspn.get(String(p.espnId||''))||index.byGsis.get(String(p.gsisId||''))||index.byTeamName.get(`${team(p.team)}|${norm(p.name)}`)||null;\n}\nfunction researchLogs(r){return Array.isArray(r?.gameLog)&&r.gameLog.length?r.gameLog:(r?.last5?.gamesLog||[]);}\nfunction statValue(log,key){\n  if(!log)return null;\n  if(key==='tds')return num(log.tds??((num(log.rushTds)||0)+(num(log.recTds)||0)));\n  return num(log[key]);\n}\nfunction recentAverage(logs,key,n=10){\n  const vals=(logs||[]).slice(0,n).map(x=>statValue(x,key)).filter(v=>v!=null);\n  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;\n}\nfunction fallbackProjection(r,key){return num(r?.currentSeason?.perGame?.[key]??r?.last5?.avg?.[key]??r?.previousSeason?.perGame?.[key]);}\nfunction projectionMeta(row){\n  if(row.proj==null||row.line==null)return 'PROJECTED';\n  const delta=row.proj-row.line;\n  return `${delta>=0?'+':''}${fmt(delta)} vs line`;\n}\n"""
s=replace_once(
    s,
    "function payoutBonus(price){",
    helpers+"\nfunction payoutBonus(price){",
    'research projection helpers',
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
    "      const mean=num(dist.mean),median=num(dist.median)??mean,p25=num(dist.p25),p75=num(dist.p75),p90=num(dist.p90),p10=num(dist.p10);\n      const statKey=MARKET_STAT[String(c.market||'')],proj=mean??fallbackProjection(research,statKey),l10Avg=statKey?recentAverage(logs,statKey,10):null;\n      const simStop=clamp(1-prob),matchScore=clamp(prob+(full&&edge!=null?edge*.20:0));",
    'projection and real L10 average values',
)

s=replace_once(
    s,
    "        prob,edge,mean,median,p10,p25,p75,p90,iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',",
    "        prob,edge,proj,l10Avg,mean,median,p10,p25,p75,p90,iterations,simStop,matchScore,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',",
    'store projection and L10 average',
)

s=replace_once(s,"if(key==='proj')return row.mean??-1;","if(key==='proj')return row.proj??-1;",'projection sort')
s=replace_once(s,"if(key==='median')return row.median??-1;","if(key==='l10Avg')return row.l10Avg??-1;",'L10 average sort')

s=replace_once(
    s,
    "    <td><div class=\"nfl-ppt-metric-v947\"><b>${fmt(row.mean)}</b><span>SIM MEAN</span></div></td>\n    <td><div class=\"nfl-ppt-metric-v947\"><b>${fmt(row.median)}</b><span>SIM MED</span></div></td>",
    "    <td><div class=\"nfl-ppt-metric-v947 nfl-ppt-proj-v948\"><b>${fmt(row.proj)}</b><span>${esc(projectionMeta(row))}</span></div></td>\n    <td><div class=\"nfl-ppt-metric-v947 nfl-ppt-l10avg-v948\" title=\"Historical average from the player's most recent 10 available game logs\"><b>${fmt(row.l10Avg)}</b><span>${esc(marketLabel(row.market))}</span></div></td>",
    'PROJ and L10 AVG cell semantics',
)

s=s.replace(
    '<div><b>PROJ / L10 AVG</b><p>Simulation mean and simulation median from the same 50,000 worlds. L10 AVG is a display category here, not a historical last-10 claim.</p></div>',
    '<div><b>PROJ / L10 AVG</b><p>PROJ is the current TSO model projection and shows its distance from the selected prop line. L10 AVG is the player’s real average for that stat across the most recent 10 available game logs.</p></div>'
)

write(p,s)

# Make the projection delta visually useful without reducing readability.
p='sports/nfl/player-prop-tool-v947.css'
c=read(p)
extra='''\n#nflView .nfl-ppt-proj-v948 span{color:#6ee7a6!important;font-weight:800!important}\n#nflView .nfl-ppt-l10avg-v948 span{color:#8fa9c2!important;font-weight:800!important}\n'''
if '.nfl-ppt-proj-v948 span' not in c:c+=extra
write(p,c)

# Static checks must guard against the regression that prompted this fix.
p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(tool.includes('nfl-ppt-match-line-v947'),'Matchup position-vs-defense-logo layout missing');"
add="""\nassert.ok(tool.includes('recentAverage(logs,statKey,10)'),'L10 AVG must use real historical game logs');\nassert.ok(tool.includes('projectionMeta(row)'),'PROJ must display projection-vs-line context');\nassert.ok(tool.includes('nfl-ppt-l10avg-v948'),'real L10 AVG cell missing');\nassert.ok(!tool.includes('<span>SIM MEAN</span>'),'PROJ must not display SIM MEAN');\nassert.ok(!tool.includes('<span>SIM MED</span>'),'L10 AVG must not display SIM MED');"""
if add.strip() not in t:
    if anchor not in t: raise SystemExit('selftest insertion anchor missing')
    t=t.replace(anchor,anchor+add)
write(p,t)

# Browser QA: verify the two columns have the intended visible semantics.
p='tests/nfl-player-prop-tool-v947.spec.js'
t=read(p)
qa="""\n\ntest('PROJ and L10 AVG use projection and real historical-average semantics',async({page})=>{\n  await open(page);\n  const rows=page.locator('#nflPlayerPropTool tbody tr:visible');\n  await expect(rows.first()).toBeVisible();\n  const labels=await rows.first().evaluate(r=>({proj:r.children[3]?.textContent||'',l10:r.children[4]?.textContent||''}));\n  expect(labels.proj).toContain('vs line');\n  expect(labels.proj).not.toContain('SIM MEAN');\n  expect(labels.l10).not.toContain('SIM MED');\n  const historical=await page.evaluate(()=>window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.().find(r=>Number.isFinite(Number(r.l10Avg)))||null);\n  expect(historical).toBeTruthy();\n  const target=page.locator(`#nflPlayerPropTool tbody tr[data-nfl-ppt-row=\"${historical.id.replace(/([\\\"\\\\])/g,'\\\\$1')}\"]`);\n  if(await target.count()){\n    const displayed=await target.locator('td').nth(4).locator('b').textContent();\n    expect(Number(displayed)).toBeCloseTo(Number(historical.l10Avg),1);\n  }\n});\n"""
if 'PROJ and L10 AVG use projection and real historical-average semantics' not in t:t+=qa
write(p,t)

print('NFL Player Prop Tool v94.8 PROJ + real L10 AVG semantics applied')
