from pathlib import Path
import re

def read(path): return Path(path).read_text()
def write(path,text):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(text)
def one(text,pattern,repl,label,flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, found {n}')
    return out

# Base: simulation-only row path + native Bet Style/Prop controls.
p='sports/nfl/player-prop-tool-v926.js'; s=read(p)
s=one(s,r"const state=\{mode:'picks',game:'ALL',market:'ALL',team:'ALL',search:'',sort:'edge',sortDir:'desc',positions:new Set\(POSITIONS\),color:true,minProb:0\.52,filtersOpen:false\};",
      "const state={mode:'tsoPick',game:'ALL',market:'ALL',team:'ALL',search:'',sort:'edge',sortDir:'desc',positions:new Set(POSITIONS),color:true,minProb:0.52,filtersOpen:false};",'state')
build=r'''function buildRows(docs){
  const oIndex=buildOddsIndex(docs.odds),sIndex=buildSimIndex(docs.sim);const rows=[];
  for(const g of docs.slate?.games||[]){
    if(g.status&&g.status!=='pre')continue;
    const og=oIndex.get(String(g.gameId))||oIndex.get(`${team(g.away?.abbr)}-${team(g.home?.abbr)}`),sg=sIndex.get(String(g.gameId));
    for(const p of g.players||[]){
      if(!POSITIONS.includes(String(p.position||'').toUpperCase()))continue;
      const op=matchOddsPlayer(og,p);if(!op?.odds)continue;const sp=matchSimPlayer(sg,p);
      for(const [key,meta] of Object.entries(MARKET_META)){
        const om=op.odds?.[key];if(!om)continue;if(meta.positions&&!meta.positions.includes(String(p.position||'').toUpperCase()))continue;
        const line=key==='atd'?0.5:num(om.line);if(line==null)continue;const dist=sp?.distributions?.[meta.stat]||null;
        const proj=key==='atd'?num(sp?.probabilities?.atd):num(dist?.mean),overProb=simProbability(sp,key,line,'over'),underProb=simProbability(sp,key,line,'under');
        let side='over',prob=overProb;if(key!=='atd'&&underProb!=null&&(overProb==null||underProb>overProb)){side='under';prob=underProb;}
        const offer=key==='atd'?om.best:om?.[side]?.best,price=num(offer?.price),implied=impliedFromAmerican(price),edge=prob!=null&&implied!=null?prob-implied:null,pos=String(p.position||'').toUpperCase();
        rows.push({id:`${g.gameId}|${p.gsisId||p.espnId||p.name}|${key}`,gameId:String(g.gameId),game:`${g.away?.abbr} @ ${g.home?.abbr}`,kickoff:g.startTimeUTC,playerId:String(p.gsisId||p.espnId||p.name),espnId:p.espnId||null,gsisId:p.gsisId||null,name:p.name,team:team(p.team),opp:team(p.opponent),position:pos,headshot:p.headshot||'',market:key,marketLabel:meta.short,line,side,book:offer?.book||'',price,proj,prob,edge,l10Avg:num(dist?.median),l5:null,l10:null,h2h:null,defRank:null,defTotal:null,defValue:null,matchup:'SIM',matchupTone:'neutral'});
      }
    }
  }
  return rows;
}
'''
s=one(s,r"function buildRows\(docs\)\{.*?\n\}\nfunction rowsForDocs",build+"function rowsForDocs",'buildRows',re.S)
qual=r'''function qualify(row){if(!state.positions.has(row.position))return false;if(state.game!=='ALL'&&row.gameId!==state.game)return false;if(state.market!=='ALL'&&row.market!==state.market)return false;if(state.team!=='ALL'&&row.team!==state.team)return false;if(state.search){const q=norm(state.search);if(!norm(`${row.name} ${row.team} ${row.opp} ${row.position} ${row.marketLabel} ${row.game}`).includes(q))return false;}return true;}
'''
s=one(s,r"function qualify\(row\)\{.*?\}\nfunction sortRows",qual+"function sortRows",'qualify',re.S)
controls=r'''function controlsHtml(docs,rows){const games=[...new Map((docs.slate?.games||[]).filter(g=>!g.status||g.status==='pre').map(g=>[String(g.gameId),g])).values()],teams=[...new Set(rows.map(r=>r.team))].sort(),styles=[['tsoPick','TSO Pick'],['safest','Safest'],['bestEdge','Best Edge'],['balanced','Balanced'],['aggressive','Aggressive'],['correlated','Correlated'],['longshot','Longshot']];return`<div class="nfl-ppt-toolbar"><div class="nfl-ppt-selects"><label><span>Bet Style</span><select id="nflPptMode" data-nfl-ppt-authority-select="94.5">${styles.map(([v,l])=>`<option value="${v}" ${state.mode===v?'selected':''}>${l}</option>`).join('')}</select></label><label><span>Game</span><select id="nflPptGame"><option value="ALL">All Games</option>${games.map(g=>`<option value="${esc(g.gameId)}" ${state.game===String(g.gameId)?'selected':''}>${esc(g.away?.abbr)} @ ${esc(g.home?.abbr)}</option>`).join('')}</select></label><label><span>Prop</span><select id="nflPptMarket"><option value="ALL">All Props</option>${Object.entries(MARKET_META).map(([k,m])=>`<option value="${k}" ${state.market===k?'selected':''}>${esc(m.label)}</option>`).join('')}</select></label></div><div class="nfl-ppt-positions">${POSITIONS.map(p=>`<button type="button" data-nfl-ppt-pos="${p}" class="${state.positions.has(p)?'active':''}">${p}</button>`).join('')}</div><div class="nfl-ppt-actions"><button type="button" id="nflPptGuide">Quick Guide</button><button type="button" id="nflPptColor" class="toggle ${state.color?'on':''}"><span>Color Cells</span><i></i></button><button type="button" id="nflPptFilters">Filters ⚙</button><button type="button" id="nflPptRefresh">Refresh ↻</button></div></div><div class="nfl-ppt-filter-panel" id="nflPptFilterPanel" ${state.filtersOpen?'':'hidden'}><label>Search<input id="nflPptSearch" type="search" value="${esc(state.search)}" placeholder="Player, team, matchup…"></label><label>Team<select id="nflPptTeam"><option value="ALL">All Teams</option>${teams.map(t=>`<option value="${t}" ${state.team===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Min Cov Prob<select id="nflPptMin"><option value="0.50" ${state.minProb===.5?'selected':''}>50%</option><option value="0.52" ${state.minProb===.52?'selected':''}>52%</option><option value="0.55" ${state.minProb===.55?'selected':''}>55%</option><option value="0.60" ${state.minProb===.6?'selected':''}>60%</option></select></label><button type="button" id="nflPptClear">Clear Filters</button></div>`;}
'''
s=one(s,r"function controlsHtml\(docs,rows\)\{.*?\nfunction headerHtml",controls+"\nfunction headerHtml",'controls',re.S)
s=s.replace('MODEL PROB','COV PROB')
s=s.replace("Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',mode:'picks',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});","Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});")
s=s.replace("if(t.id==='nflPptMode')state.mode=t.value;else if(t.id==='nflPptGame')state.game=t.value;","if(t.id==='nflPptMode')return;else if(t.id==='nflPptGame')state.game=t.value;")
s=one(s,r"export const __NFL_PLAYER_PROP_TOOL_V926_TEST__=\{([^}]*)\};",r"export const __NFL_PLAYER_PROP_TOOL_V926_TEST__={\1,getCachedDocs:()=>cache};",'export')
write(p,s)

# Snapshot: explicit ready event, no View semantics, authority eligibility respected.
p='sports/nfl/player-prop-tool-snapshot-v928.js'; s=read(p)
s=s.replace("./player-prop-tool-v926.js?v=92.7","./player-prop-tool-v926.js?v=94.5").replace("  state.mode='all';\n","").replace("  setValue('#nflPptMode',state.mode);\n","")
s=s.replace("Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',mode:'picks',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});","Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',sort:'edge',sortDir:'desc',minProb:.52,filtersOpen:true});")
sq=r'''function qualifies(row){const d=row.dataset;if(d.nflPptAuthorityEligible==='0')return false;if(!state.positions.has(d.snapshotPosition))return false;if(state.game!=='ALL'){const gameKey=gameKeyById.get(String(state.game));if(gameKey&&d.snapshotGame!==gameKey)return false;}if(state.market!=='ALL'&&d.snapshotMarket!==state.market)return false;if(state.team!=='ALL'&&d.snapshotTeam!==state.team)return false;if(state.search&&!(d.snapshotSearch||'').includes(norm(state.search)))return false;const prob=d.snapshotProb===''?null:Number(d.snapshotProb);if(prob!=null&&Number(state.minProb)>0&&prob<Number(state.minProb))return false;return true;}
'''
s=one(s,r"function qualifies\(row\)\{.*?\n\}\nfunction sortValue",sq+"function sortValue",'snapshot qualify',re.S)
s=s.replace("  if(t.id==='nflPptMode')state.mode=t.value;\n  else if(t.id==='nflPptGame')state.game=t.value;","  if(t.id==='nflPptMode')return;\n  else if(t.id==='nflPptGame')state.game=t.value;")
s=s.replace("  tool.dataset.nflPptSnapshotRows=String(tool.querySelectorAll('.nfl-ppt-table tbody tr[data-nfl-ppt-row]').length);\n  applySnapshot({reorder:true});","  tool.dataset.nflPptSnapshotRows=String(tool.querySelectorAll('.nfl-ppt-table tbody tr[data-nfl-ppt-row]').length);\n  document.dispatchEvent(new CustomEvent('tso:nfl-player-prop-snapshot-ready',{detail:{tool}}));\n  applySnapshot({reorder:true});")
s=s.replace("  window.addEventListener('hashchange',onHashChange);\n}","  window.addEventListener('hashchange',onHashChange);\n  window.__TSO_NFL_PROP_SNAPSHOT_V928__={apply:(options={})=>applySnapshot(options),decorateRow,requestApply};\n}")
write(p,s)

# Remove stale writers at source.
stubs={
'sports/nfl/player-prop-tool-sim-v939.js':"export function installNflPlayerPropToolSimV939(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_SIM_V939_TEST__={compatibilityOnly:true};\n",
'sports/nfl/player-prop-tool-controls-v933.js':"export function installNflPlayerPropToolControlsV933(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_CONTROLS_V933_TEST__={compatibilityOnly:true};\n",
'sports/nfl/player-prop-tool-build-period-v940.js':"export function installNflPlayerPropToolBuildPeriodV940(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__={compatibilityOnly:true};\n",
'sports/nfl/player-prop-tool-reference-v941.js':"export function installNflPlayerPropToolReferenceV941(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__={compatibilityOnly:true};\n"}
for path,text in stubs.items(): write(path,text)

# Production wrapper: only v94.5 authority owns table data/columns.
p='sports/nfl-preview-v893.js'; s=read(p)
s=s.replace("./nfl/player-prop-tool-v926.js?v=92.7","./nfl/player-prop-tool-v926.js?v=94.5").replace("./nfl/player-prop-tool-snapshot-v928.js?v=93.2","./nfl/player-prop-tool-snapshot-v928.js?v=94.5")
for pat in [r"import \{ installNflPlayerPropToolSimV939 \}.*?\n",r"import \{ installNflPlayerPropToolControlsV933 \}.*?\n",r"import \{ installNflPlayerPropToolBuildPeriodV940 \}.*?\n",r"import \{ installNflPlayerPropToolReferenceV941 \}.*?\n"]:
    s=re.sub(pat,'',s)
if "installNflPlayerPropToolAuthorityV945" not in s:
    s=s.replace("import { installNflPlayerPropToolUxV930 } from './nfl/player-prop-tool-ux-v930.js?v=93.7';\n","import { installNflPlayerPropToolUxV930 } from './nfl/player-prop-tool-ux-v930.js?v=93.7';\nimport { installNflPlayerPropToolAuthorityV945 } from './nfl/player-prop-tool-authority-v945.js?v=94.5';\n")
for call in ['installNflPlayerPropToolSimV939();','installNflPlayerPropToolControlsV933();','installNflPlayerPropToolBuildPeriodV940();','installNflPlayerPropToolReferenceV941();']:
    s=s.replace('    '+call+'\n','')
s=s.replace("    installNflPlayerPropToolUxV930();\n","    installNflPlayerPropToolUxV930();\n    installNflPlayerPropToolAuthorityV945();\n")
s=re.sub(r"\[NFL Player Prop Tool v[0-9.]+\]","[NFL Player Prop Tool v94.5]",s)
write(p,s)

# Cache bust.
p='sports/router.js'; s=read(p); s=one(s,r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)","import('./nfl-preview-v893.js?v=94.5')",'router'); write(p,s)
p='index.html'; s=read(p); m=re.search(r'\./sports/router\.js\?v=(\d+)\.(\d+)',s)
if not m: raise SystemExit('index router marker missing')
s=one(s,r'\./sports/router\.js\?v=(\d+)\.(\d+)',f'./sports/router.js?v={m.group(1)}.{int(m.group(2))+1}','index'); write(p,s)

# Static regression.
write('scripts/nfl-player-prop-tool-v945-selftest.mjs',r'''import fs from'node:fs';import assert from'node:assert/strict';
const base=fs.readFileSync('sports/nfl/player-prop-tool-v926.js','utf8'),snap=fs.readFileSync('sports/nfl/player-prop-tool-snapshot-v928.js','utf8'),auth=fs.readFileSync('sports/nfl/player-prop-tool-authority-v945.js','utf8'),preview=fs.readFileSync('sports/nfl-preview-v893.js','utf8'),router=fs.readFileSync('sports/router.js','utf8');
assert.ok(preview.includes('installNflPlayerPropToolAuthorityV945'));for(const x of['installNflPlayerPropToolSimV939','installNflPlayerPropToolControlsV933','installNflPlayerPropToolBuildPeriodV940','installNflPlayerPropToolReferenceV941'])assert.ok(!preview.includes(x));
assert.ok(base.includes('<span>Bet Style</span><select id="nflPptMode"'));assert.ok(base.includes('<span>Prop</span><select id="nflPptMarket"'));assert.ok(!base.includes('<span>Week</span><select id="nflPptWeek"'));assert.ok(base.includes('getCachedDocs:()=>cache'));
assert.ok(snap.includes('tso:nfl-player-prop-snapshot-ready'));assert.ok(snap.includes("d.nflPptAuthorityEligible==='0'"));
assert.ok(auth.includes("const HEADERS=['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']"));assert.ok(!auth.includes('fetch('));assert.ok(!auth.includes('MutationObserver')&&!auth.includes('setInterval(')&&!auth.includes('setTimeout('));assert.ok(auth.includes('base?.getCachedDocs?.()'));assert.ok(router.includes('nfl-preview-v893.js?v=94.5'));console.log('✓ NFL Player Prop Tool v94.5 single authority passed');
''')

# Browser regression catches even transient stale-header flashes.
write('tests/nfl-player-prop-tool-authority-v945.spec.js',r'''import{test,expect}from'@playwright/test';test.setTimeout(180000);const B='http://127.0.0.1:4173/index.html#nfl',H=['PLAYER','CONSENSUS','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H'];
async function open(page,v={width:1440,height:900}){await page.setViewportSize(v);await page.goto(B,{waitUntil:'domcontentloaded'});await page.waitForSelector('#nflPlayerPropToolBtn',{timeout:45000});await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptSnapshot==='ready',{timeout:90000});await page.waitForFunction(()=>document.getElementById('nflPlayerPropTool')?.dataset.nflPptAuthority==='94.5',{timeout:15000});}
async function heads(page){return page.locator('#nflPlayerPropTool thead tr:nth-child(2) th').allTextContents().then(a=>a.map(x=>x.trim()));}
test('v94.5 never flashes retired headers during video sequence',async({page})=>{await open(page);await expect.poll(()=>heads(page)).toEqual(H);await page.evaluate(()=>{window.__hs=[];const t=document.querySelector('#nflPlayerPropTool thead'),f=()=>window.__hs.push([...t.querySelectorAll('tr:nth-child(2) th')].map(x=>x.textContent.trim()).join('|'));f();window.__ho=new MutationObserver(f);window.__ho.observe(t,{subtree:true,childList:true,characterData:true});});const props=await page.locator('#nflPptMarket option').evaluateAll(o=>o.map(x=>x.value).filter(x=>x!=='ALL'));if(props[0])await page.locator('#nflPptMarket').selectOption(props[0]);for(const style of await page.locator('#nflPptMode option').evaluateAll(o=>o.map(x=>x.value))){await page.locator('#nflPptMode').selectOption(style);await expect.poll(()=>heads(page)).toEqual(H);}for(const period of['q1','full','2h','full']){const b=page.locator(`[data-nfl-ppt-period="${period}"]`);if(await b.count()){await b.click();await expect.poll(()=>heads(page)).toEqual(H);}}const states=await page.evaluate(()=>{window.__ho?.disconnect();return window.__hs});for(const x of states)expect(x).toBe(H.join('|'));});
test('style and period use frozen four-file snapshot only',async({page})=>{const P=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'],c=new Map(P.map(x=>[x,0]));page.on('request',r=>{try{const p=new URL(r.url()).pathname;if(c.has(p))c.set(p,c.get(p)+1)}catch{}});await open(page);await expect.poll(()=>[...c.values()].reduce((a,b)=>a+b,0),{timeout:15000}).toBe(4);for(const s of['safest','bestEdge','balanced','aggressive','correlated','longshot'])if(await page.locator(`#nflPptMode option[value="${s}"]`).count())await page.locator('#nflPptMode').selectOption(s);for(const p of['q1','q2','q3','q4','1h','2h','full']){const b=page.locator(`[data-nfl-ppt-period="${p}"]`);if(await b.count())await b.click()}await page.waitForTimeout(400);expect([...c.values()].reduce((a,b)=>a+b,0)).toBe(4);});
test('mobile remains horizontally contained',async({page})=>{await open(page,{width:390,height:844});await expect.poll(()=>heads(page)).toEqual(H);const m=await page.evaluate(()=>{const w=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap'),d=document.documentElement;return{scroll:w.scrollWidth>w.clientWidth,body:d.scrollWidth-d.clientWidth}});expect(m.scroll).toBe(true);expect(m.body).toBeLessThanOrEqual(3);});
''')
write('tests/nfl-player-prop-tool-build-period-v940.spec.js',"export * from './nfl-player-prop-tool-authority-v945.spec.js';\n")
write('tests/nfl-player-prop-tool-clean-v944.spec.js',"export * from './nfl-player-prop-tool-authority-v945.spec.js';\n")

# Keep normal QA aligned with v94.5; obsolete one-time workflows cannot race it.
p='.github/workflows/nfl-player-prop-tool-browser-v923.yml'; s=read(p)
s=re.sub(r'^name: NFL Player Prop Tool Browser QA v[^\n]+','name: NFL Player Prop Tool Browser QA v94.5',s,flags=re.M)
if "sports/nfl/player-prop-tool-authority-v945.js" not in s:s=s.replace("      - 'sports/nfl/player-prop-tool-v926.js'\n","      - 'sports/nfl/player-prop-tool-v926.js'\n      - 'sports/nfl/player-prop-tool-authority-v945.js'\n")
if "tests/nfl-player-prop-tool-authority-v945.spec.js" not in s:s=s.replace("      - 'tests/nfl-player-prop-tool-v923.spec.js'\n","      - 'tests/nfl-player-prop-tool-v923.spec.js'\n      - 'tests/nfl-player-prop-tool-authority-v945.spec.js'\n")
s=one(s,r"      - name: Run static Player Prop Tool regressions\n        run: \|\n(?:          .*\n)+?      - name: Verify sportsbook-aware 50K Bet Style cache is present","      - name: Run static Player Prop Tool regressions\n        run: |\n          node scripts/nfl-player-prop-tool-v945-selftest.mjs\n          node scripts/nfl-player-prop-tool-v923-selftest.mjs\n          node scripts/mobile-swipe-anywhere-selftest.mjs\n      - name: Verify sportsbook-aware 50K Bet Style cache is present",'qa static')
s=one(s,r"          npx playwright test tests/nfl-player-prop-tool-v923\.spec\.js .*? --reporter=line --workers=1","          npx playwright test tests/nfl-player-prop-tool-v923.spec.js tests/nfl-player-prop-tool-theme-v936.spec.js tests/nfl-player-prop-tool-polish-v938.spec.js tests/nfl-player-prop-tool-authority-v945.spec.js --reporter=line --workers=1",'qa playwright')
write(p,s)
for old in['.github/workflows/one-time-nfl-prop-build-period-v940.yml','.github/workflows/one-time-nfl-player-prop-tool-video-v943.yml']:Path(old).unlink(missing_ok=True)
print('v94.5 transform ready')
