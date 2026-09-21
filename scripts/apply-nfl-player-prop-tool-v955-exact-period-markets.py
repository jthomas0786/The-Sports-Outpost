from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(); count=s.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    p.write_text(s.replace(old,new,1))


def replace_between(path, start, end, new, label):
    p=Path(path); s=p.read_text(); a=s.find(start); b=s.find(end,a+len(start))
    if a<0 or b<0: raise SystemExit(f'{label}: markers missing in {path}')
    p.write_text(s[:a]+new+s[b:])

# --- Preserve period-history enrichment across the normal research rebuild. ---
replace_once('scripts/nfl-research.mjs',
"  const slate=await readLocalJson(SLATE);\n\n  const [teamsJson,injJson,playersCsv,rosterCsv,prevWeekCsv,prevRegCsv,currentWeekCsv,currentRegCsv,prevSnapsCsv,currentSnapsCsv,scheduleCsv] = await Promise.all([",
"  const slate=await readLocalJson(SLATE);\n  const previousResearch=await readLocalJson(OUT);\n\n  const [teamsJson,injJson,playersCsv,rosterCsv,prevWeekCsv,prevRegCsv,currentWeekCsv,currentRegCsv,prevSnapsCsv,currentSnapsCsv,scheduleCsv] = await Promise.all([",
'research previous snapshot')
carry="""  const oldPlayers=previousResearch?.players||[];\n  const oldByEspn=new Map(oldPlayers.filter(p=>p?.espnId).map(p=>[String(p.espnId),p]));\n  const oldByGsis=new Map(oldPlayers.filter(p=>p?.gsisId).map(p=>[String(p.gsisId),p]));\n  const oldByNameTeam=new Map(oldPlayers.map(p=>[`${normTeam(p?.team)}|${nameKey(p?.name)}`,p]));\n  for(const p of resultPlayers){\n    const old=oldByEspn.get(String(p.espnId||''))||oldByGsis.get(String(p.gsisId||''))||oldByNameTeam.get(`${normTeam(p.team)}|${nameKey(p.name)}`);\n    if(Array.isArray(old?.periodGameLog))p.periodGameLog=old.periodGameLog;\n    if(old?.periodHistoryMeta)p.periodHistoryMeta=old.periodHistoryMeta;\n  }\n\n"""
p=Path('scripts/nfl-research.mjs'); s=p.read_text(); marker='  resultPlayers.sort((a,b)=>a.team.localeCompare(b.team)'
if carry.strip() not in s:
    if marker not in s: raise SystemExit('research carry-over marker missing')
    p.write_text(s.replace(marker,carry+marker,1))

# Scheduled research now refreshes exact historical period splits too.
p=Path('.github/workflows/nfl-research.yml'); s=p.read_text()
s=s.replace("      - 'scripts/nfl-research.mjs'\n", "      - 'scripts/nfl-research.mjs'\n      - 'scripts/nfl-period-history.mjs'\n      - 'scripts/nfl-period-history-selftest.mjs'\n",1)
s=s.replace('    timeout-minutes: 12','    timeout-minutes: 20',1)
s=s.replace("      - name: Build current NFL research file\n        run: node scripts/nfl-research.mjs\n", "      - name: Build current NFL research file with exact period history\n        run: |\n          node scripts/nfl-period-history-selftest.mjs\n          node scripts/nfl-research.mjs\n          node scripts/nfl-period-history.mjs\n",1)
p.write_text(s)

# --- Quarter/half boards: every modeled player-market survives; style ranks lines, not admission. ---
replace_once('sports/nfl/sim/quarter-board.js',
"  completions:[2.5,3.5,4.5,5.5,6.5],\n  rushYds:[4.5,9.5,14.5,19.5,24.5,29.5],",
"  completions:[2.5,3.5,4.5,5.5,6.5],\n  passTds:[0.5,1.5],\n  rushYds:[4.5,9.5,14.5,19.5,24.5,29.5],",'quarter pass TD thresholds')
replace_once('sports/nfl/sim/quarter-board.js',
"  completions:[4.5,6.5,8.5,10.5,12.5,14.5],\n  rushYds:[9.5,19.5,29.5,39.5,49.5,59.5],",
"  completions:[4.5,6.5,8.5,10.5,12.5,14.5],\n  passTds:[0.5,1.5,2.5],\n  rushYds:[9.5,19.5,29.5,39.5,49.5,59.5],",'half pass TD thresholds')
replace_once('sports/nfl/sim/quarter-board.js',
"const ALLOWED={QB:['passYds','completions','rushYds'],RB:['rushYds','recYds','receptions'],WR:['recYds','receptions'],TE:['recYds','receptions']};",
"const ALLOWED={QB:['passYds','passTds','completions','rushYds'],RB:['rushYds','recYds','receptions'],WR:['recYds','receptions'],TE:['recYds','receptions']};",
'quarter allowed markets')
replace_once('sports/nfl/sim/quarter-board.js',
"const STAT_LABEL={passYds:'Passing Yards',completions:'Completions',rushYds:'Rushing Yards',recYds:'Receiving Yards',receptions:'Receptions'};",
"const STAT_LABEL={passYds:'Passing Yards',passTds:'Passing TDs',completions:'Completions',rushYds:'Rushing Yards',recYds:'Receiving Yards',receptions:'Receptions'};",
'quarter labels')
new_build_period="""function buildPeriod({gameId,period,players,getStat,iterations,thresholds,config,projectedKey='projectedPeriod'}){\n  const styleKeys=['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot'];\n  const selectedByStyle=Object.fromEntries(styleKeys.map(k=>[k,[]])),union=new Map();\n  for(const p of players||[]){\n    for(const market of ALLOWED[p.position]||[]){\n      const rec=getStat(p,market);\n      const stat=rec?.stat,dist=rec?.dist;\n      if(!stat||!dist)continue;\n      const options=[];\n      for(const line of thresholds[market]||[]){\n        const sim=probability(stat,v=>v>line,iterations),mean=Number(dist.mean)||0;\n        const spread=Math.max(1,(Number(dist.p75)||mean)-(Number(dist.p25)||mean),Math.sqrt(Math.max(1,mean)));\n        const modelEdge=(mean-line)/spread,mask=hitMask(stat,line,iterations);\n        options.push({\n          id:candidateId(gameId,period,p,market,line),gameId,quarter:period.startsWith('q')?period:null,period,\n          playerId:String(p.playerId||''),espnId:p.espnId||null,gsisId:p.gsisId||null,name:p.name,team:p.team,position:p.position,\n          market,marketLabel:STAT_LABEL[market]||market,side:'over',line,\n          simProbability:round(sim,4),modelEdge:round(modelEdge,3),lineRatio:round(mean>0?line/mean:0,3),\n          [projectedKey]:dist,projectedPeriod:dist,worldMaskB64:packMask(mask,iterations),worldMaskIterations:iterations,\n        });\n      }\n      if(!options.length)continue;\n      for(const style of styleKeys){\n        const pick=modeRank(options,style)[0];\n        if(!pick)continue;\n        selectedByStyle[style].push(pick);union.set(pick.id,pick);\n      }\n    }\n  }\n  const candidates=[...union.values()];\n  const rankings=Object.fromEntries(styleKeys.map(style=>[style,modeRank(selectedByStyle[style],style).map(c=>c.id)]));\n  return {ready:candidates.length>=2,iterations,candidates,rankings};\n}\n\n"""
replace_between('sports/nfl/sim/quarter-board.js','function buildPeriod({','export function buildPregameQuarterBoard',new_build_period,'quarter buildPeriod')

# --- Full-game board: every sportsbook player-market survives style qualification + First TD model. ---
replace_once('sports/nfl/sim/full-prop-board-v942.js',
"  atd:{stat:'tds',label:'Anytime TD',binary:true},\n};",
"  atd:{stat:'tds',label:'Anytime TD',binary:true},\n  firstTd:{stat:'tds',label:'First Touchdown',binary:true},\n};",'first TD full market')
replace_once('sports/nfl/sim/full-prop-board-v942.js',
"  const eligible=candidates.filter(c=>qualifies(c,style));\n  if(!eligible.length)return null;\n  return [...eligible].sort((a,b)=>styleScore(b,style)-styleScore(a,style)||b.edge-a.edge||b.simProbability-a.simProbability)[0];",
"  const eligible=candidates.filter(c=>qualifies(c,style));\n  const source=eligible.length?eligible:candidates;\n  if(!source.length)return null;\n  return [...source].sort((a,b)=>styleScore(b,style)-styleScore(a,style)||b.edge-a.edge||b.simProbability-a.simProbability)[0];",
'full style fallback')
fullp=Path('sports/nfl/sim/full-prop-board-v942.js'); s=fullp.read_text()
insert_marker='function findSample(index,p){\n'
first_helpers="""function buildFirstTdIndex(samples,iterations){\n  const rows=[];\n  for(const [key,rec] of samples?.players||[]){\n    const stat=rec?.stats?.tds;if(!stat)continue;\n    const p=Math.max(0,Math.min(.999999,probability(stat,v=>Number(v)>=1,iterations)));\n    const lambda=-Math.log(Math.max(1e-9,1-p));\n    rows.push({key,rec,p,lambda});\n  }\n  const total=rows.reduce((a,r)=>a+r.lambda,0),gameTd=total>0?1-Math.exp(-total):0,byId=new Map(),byName=new Map();\n  for(const row of rows){\n    const first=total>0?(row.lambda/total)*gameTd:0,p=row.rec?.player||{};\n    for(const id of [row.key,p.key,p.playerId,p.espnId,p.gsisId])if(id!=null&&String(id))byId.set(String(id),first);\n    byName.set(`${normTeam(p.team)}|${normName(p.name)}`,first);\n  }\n  return {byId,byName};\n}\nfunction firstTdProbability(index,p){\n  for(const id of [p?.playerId,p?.espnId,p?.gsisId])if(id!=null&&index.byId.has(String(id)))return index.byId.get(String(id));\n  return index.byName.get(`${normTeam(p?.team)}|${normName(p?.name)}`)??null;\n}\n\n"""
if 'function buildFirstTdIndex' not in s:
    if insert_marker not in s: raise SystemExit('first TD helper insertion marker missing')
    fullp.write_text(s.replace(insert_marker,first_helpers+insert_marker,1)); s=fullp.read_text()
replace_once('sports/nfl/sim/full-prop-board-v942.js',
"  const sampleIndex=buildSampleIndex(samples),publicIndex=buildPublicIndex(result),groups=new Map();",
"  const sampleIndex=buildSampleIndex(samples),publicIndex=buildPublicIndex(result),firstTdIndex=buildFirstTdIndex(samples,iterations),groups=new Map();",
'first TD index wire')
replace_once('sports/nfl/sim/full-prop-board-v942.js',
"      const dist=pub?.distributions?.[meta.stat]||null;\n      for(const choice of marketChoices(slot,market)){\n        const price=finite(choice.offer?.price),implied=americanImplied(price),sim=exactProbability(rec,market,choice.line,choice.side,iterations);\n        if(price==null||implied==null||sim==null)continue;",
"      for(const choice of marketChoices(slot,market)){\n        const price=finite(choice.offer?.price),implied=americanImplied(price),sim=market==='firstTd'?firstTdProbability(firstTdIndex,identity):exactProbability(rec,market,choice.line,choice.side,iterations);\n        if(price==null||implied==null||sim==null)continue;\n        const dist=market==='firstTd'?{mean:round(sim,4),median:sim>=.5?1:0,p10:0,p25:0,p75:sim>=.25?1:0,p90:sim>=.1?1:0}:(pub?.distributions?.[meta.stat]||null);",
'first TD candidate probability')
replace_once('sports/nfl/sim/full-prop-board-v942.js',
"export const __NFL_FULL_PROP_BOARD_V942_TEST__={STYLE_KEYS,MARKET_META,americanImplied,marketChoices,styleScore,qualifies,choose};",
"export const __NFL_FULL_PROP_BOARD_V942_TEST__={STYLE_KEYS,MARKET_META,americanImplied,marketChoices,styleScore,qualifies,choose,buildFirstTdIndex,firstTdProbability};",
'full board test exports')

# --- Player Prop Tool exact-period history + complete market selector. ---
replace_once('sports/nfl/player-prop-tool-v947.js',"const VERSION='95.3';","const VERSION='95.5';",'tool version')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  atd:{label:'ATD',long:'Anytime TD'},\n};",
"  atd:{label:'ATD',long:'Anytime Touchdown'},\n  firstTd:{label:'1st TD',long:'First Touchdown'},\n};",'tool touchdown markets')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  search:'',minProb:.40,side:null,sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,",
"  search:'',minProb:0,side:null,sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,",
'default show all players')
replace_once('sports/nfl/player-prop-tool-v947.js',
"const MARKET_STAT={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'};",
"const MARKET_STAT={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds',firstTd:'firstTd'};",
'period stat map')
pt=Path('sports/nfl/player-prop-tool-v947.js'); s=pt.read_text(); marker="function statValue(log,key){\n"
period_helpers="""function researchLogsForPeriod(r,period='full'){\n  const full=researchLogs(r),periodRows=Array.isArray(r?.periodGameLog)?r.periodGameLog:[],byGame=new Map(periodRows.map(x=>[String(x?.gameId||''),x]));\n  if(period==='full'){\n    return full.map(log=>{const extra=byGame.get(String(log?.gameId||''));return extra?{...log,firstTd:extra.firstTd}:log;});\n  }\n  return periodRows.map(row=>{\n    const stats=row?.periods?.[period];if(!stats)return null;\n    return {season:row.season,week:row.week,date:row.date,team:row.team,opponent:row.opponent,homeAway:row.homeAway,gameId:row.gameId,...stats};\n  }).filter(Boolean);\n}\n"""
if 'function researchLogsForPeriod' not in s:
    if marker not in s: raise SystemExit('period log helper marker missing')
    pt.write_text(s.replace(marker,period_helpers+marker,1)); s=pt.read_text()
replace_once('sports/nfl/player-prop-tool-v947.js',
"  if(key==='tds')return num(log.tds??((num(log.rushTds)||0)+(num(log.recTds)||0)));",
"  if(key==='firstTd')return log.firstTd==null?null:num(log.firstTd);\n  if(key==='tds')return num(log.tds??((num(log.rushTds)||0)+(num(log.recTds)||0)));",
'first TD history stat')
replace_once('sports/nfl/player-prop-tool-v947.js',
"      const research=findResearch(researchIndex,player||c),logs=researchLogs(research);",
"      const research=findResearch(researchIndex,player||c),logs=researchLogsForPeriod(research,state.period);",
'period-aware row logs')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  else if(market==='atd')v=pos==='QB'?(pg.rushTds??pg.tds):(pg.tds??((num(pg.rushTds)||0)+(num(pg.recTds)||0)));",
"  else if(market==='atd'||market==='firstTd')v=pos==='QB'?(pg.rushTds??pg.tds):(pg.tds??((num(pg.rushTds)||0)+(num(pg.recTds)||0)));",
'first TD defense context')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  if(market==='passTds'||market==='atd')return 'TD/G';",
"  if(market==='passTds'||market==='atd'||market==='firstTd')return 'TD/G';",
'first TD defense unit')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    <label>Min Cov Prob<select id=\"nflPptMin\"><option value=\"0.40\">40%</option><option value=\"0.45\">45%</option><option value=\"0.50\">50%</option><option value=\"0.55\">55%</option><option value=\"0.60\">60%</option><option value=\"0.65\">65%</option></select></label>",
"    <label>Min Cov Prob<select id=\"nflPptMin\"><option value=\"0.00\">All</option><option value=\"0.40\">40%</option><option value=\"0.45\">45%</option><option value=\"0.50\">50%</option><option value=\"0.55\">55%</option><option value=\"0.60\">60%</option><option value=\"0.65\">65%</option></select></label>",
'min probability all option')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  const markets=[...new Set(allRows.filter(r=>passes(r,'market')).map(r=>r.market))].sort((a,b)=>marketLabel(a).localeCompare(marketLabel(b)));",
"  const markets=Object.keys(MARKET_META).sort((a,b)=>marketLabel(a).localeCompare(marketLabel(b)));",
'complete market selector')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  if(state.market!=='ALL'&&!rows.some(r=>r.market===state.market&&passes(r,'market')))state.market='ALL';\n",
"",
'preserve explicit market filter')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    <div><b>L10 AVG</b><p>The player’s actual average for this stat over the last 10 available games.</p></div>",
"    <div><b>L10 AVG</b><p>The player’s actual average for this exact selected period/stat over the last 10 verified games.</p></div>",
'guide period L10 average')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    <div><b>L5</b><p>Actual hits in the player’s last 5 games versus this exact line and side.</p></div>\n    <div><b>L10</b><p>Actual hits in the player’s last 10 available games versus this line and side.</p></div>\n    <div><b>H2H</b><p>Actual prior hits versus the current opponent when matching game logs are available.</p></div>",
"    <div><b>L5</b><p>Actual hits in the last 5 verified games for this exact period, prop line and side.</p></div>\n    <div><b>L10</b><p>Actual hits in the last 10 verified games for this exact period, prop line and side.</p></div>\n    <div><b>H2H</b><p>Actual hits versus this opponent for this exact period, prop line and side.</p></div>",
'guide exact period hit rates')
replace_once('sports/nfl/player-prop-tool-v947.js',
"title=\"Actual average from the player's most recent 10 available game logs\"",
"title=\"Actual average from the player's most recent 10 verified game splits for the selected period\"",
'row exact period average tooltip')
replace_once('sports/nfl/player-prop-tool-v947.js',
"title=\"Actual game-log result versus this selected line\"",
"title=\"Actual selected-period game result versus this exact selected line\"",
'exact period hit tooltip')
replace_once('sports/nfl/player-prop-tool-v947.js',
"  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,side:null,sortKey:'style',sortDir:'desc',filtersOpen:true});",
"  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:0,side:null,sortKey:'style',sortDir:'desc',filtersOpen:true});",
'clear all players')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    const periodBtn=t.closest?.('.nfl-ppt-periodbar-v947 [data-nfl-ppt-period]');if(periodBtn){state.period=periodBtn.dataset.nflPptPeriod||'full';state.sortKey='style';state.sortDir='desc';renderRows();return;}",
"    const periodBtn=t.closest?.('.nfl-ppt-periodbar-v947 [data-nfl-ppt-period]');if(periodBtn){state.period=periodBtn.dataset.nflPptPeriod||'full';if(state.period!=='full'&&['atd','firstTd'].includes(state.market))state.market='ALL';state.sortKey='style';state.sortDir='desc';renderRows();return;}",
'period binary market compatibility')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    if(t.id==='nflPptMarket'){state.market=t.value;renderRows();return;}",
"    if(t.id==='nflPptMarket'){state.market=t.value;if(['atd','firstTd'].includes(state.market)){state.period='full';state.side='over';}renderRows();return;}",
'binary market switches full')
replace_once('sports/nfl/player-prop-tool-v947.js',
"    if(t.id==='nflPptMin'){state.minProb=Number(t.value)||.40;renderRows();}",
"    if(t.id==='nflPptMin'){state.minProb=Math.max(0,Number(t.value)||0);renderRows();}",
'min probability zero')
replace_once('sports/nfl/player-prop-tool-v947.js',
"export const __NFL_PLAYER_PROP_TOOL_V947_TEST__={VERSION,HEADERS,BUILD_STYLES,PERIODS,MARKET_META,bookDomain,teamLogo,styleScore,valueFor};",
"export const __NFL_PLAYER_PROP_TOOL_V947_TEST__={VERSION,HEADERS,BUILD_STYLES,PERIODS,MARKET_META,bookDomain,teamLogo,styleScore,valueFor,researchLogsForPeriod,actualHitRate,actualH2HRate};",
'tool test exports')

# Cache-bust the active route.
replace_once('sports/nfl-preview-v893.js',"./nfl/player-prop-tool-v947.js?v=95.3","./nfl/player-prop-tool-v947.js?v=95.5",'preview prop cache bust')
replace_once('sports/router.js',"./nfl-preview-v893.js?v=95.3","./nfl-preview-v893.js?v=95.5",'router prop cache bust')

# Static regression expectations + browser version marker.
p=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs'); s=p.read_text().replace('95.3','95.5')
extra="""\nassert.ok(tool.includes("firstTd:{label:'1st TD',long:'First Touchdown'}"),'First Touchdown market must exist');\nassert.ok(tool.includes("const markets=Object.keys(MARKET_META)"),'Prop dropdown must list the complete supported market registry');\nassert.ok(tool.includes("logs=researchLogsForPeriod(research,state.period)"),'rows must use exact selected-period historical logs');\nassert.ok(tool.includes("periodRows.map(row=>"),'quarter/half historical split reader missing');\nassert.ok(tool.includes("if(['atd','firstTd'].includes(state.market)){state.period='full'"),'game-level touchdown markets must switch to Full');\nassert.ok(tool.includes("minProb:0"),'all eligible players must be visible by default');\n"""
if 'First Touchdown market must exist' not in s:
    s=s.replace("console.log('✓ NFL Player Prop Tool v95.5 player-v-defense matchup static regression passed');",extra+"\nconsole.log('✓ NFL Player Prop Tool v95.5 player-v-defense matchup static regression passed');",1)
p.write_text(s)
p=Path('tests/nfl-player-prop-tool-v947.spec.js'); s=p.read_text().replace('95.3','95.5')
if "complete Prop dropdown includes game-level touchdown markets" not in s:
    s += """\n\ntest('v95.5 complete Prop dropdown includes game-level touchdown markets and exact-period source stays frozen',async({page})=>{\n  await open(page);\n  const options=await page.locator('#nflPptMarket option').evaluateAll(os=>os.map(o=>({value:o.value,text:o.textContent.trim()})));\n  expect(options.map(x=>x.value)).toEqual(expect.arrayContaining(['rushYds','recYds','receptions','passYds','passTds','completions','atd','firstTd']));\n  await page.locator('[data-nfl-ppt-period="q1"]').click();\n  await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-period','q1');\n  await page.locator('#nflPptMarket').selectOption('atd');\n  await expect(page.locator('#nflPlayerPropTool')).toHaveAttribute('data-nfl-ppt-period','full');\n  await expect(page.locator('#nflPptMarket')).toHaveValue('atd');\n});\n"""
p.write_text(s)

# Player Prop QA should follow these source files too.
p=Path('.github/workflows/nfl-player-prop-tool-v947.yml'); s=p.read_text()
needle="      - 'sports/nfl/sim/quarter-board.js'\n"
if "scripts/nfl-period-history.mjs" not in s:
    s=s.replace(needle,needle+"      - 'scripts/nfl-period-history.mjs'\n      - 'scripts/nfl-prop-cache-refresh.mjs'\n",1)
p.write_text(s)

print('v95.5 exact-period hit rates, complete market pool, and full player-market coverage applied')
