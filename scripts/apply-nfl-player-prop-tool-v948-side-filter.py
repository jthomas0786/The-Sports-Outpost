from pathlib import Path


def read(path): return Path(path).read_text()
def write(path,text): Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text: return text
    if old not in text: raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

p='sports/nfl/player-prop-tool-v947.js'
s=read(p)

s=replace_once(
    s,
    "search:'',minProb:.40,sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,",
    "search:'',minProb:.40,sides:new Set(),sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,",
    'side filter state',
)

s=replace_once(
    s,
    "  if(ignore!=='position'&&state.positions.size&&!state.positions.has(row.position))return false;\n  if(ignore!=='game'",
    "  if(ignore!=='position'&&state.positions.size&&!state.positions.has(row.position))return false;\n  if(ignore!=='side'&&state.sides?.size===1&&!state.sides.has(row.side))return false;\n  if(ignore!=='game'",
    'side filter predicate',
)

s=replace_once(
    s,
    "    </div>\n    <div class=\"nfl-ppt-positions-v947\">${POSITIONS.map(p=>`<button type=\"button\" data-nfl-ppt-pos=\"${p}\" class=\"active\">${p}</button>`).join('')}</div>",
    "    </div>\n    <div class=\"nfl-ppt-side-v948\"><span>Side</span><button type=\"button\" data-nfl-ppt-side=\"over\" aria-pressed=\"false\">Over</button><button type=\"button\" data-nfl-ppt-side=\"under\" aria-pressed=\"false\">Under</button></div>\n    <div class=\"nfl-ppt-positions-v947\">${POSITIONS.map(p=>`<button type=\"button\" data-nfl-ppt-pos=\"${p}\" class=\"active\">${p}</button>`).join('')}</div>",
    'side filter controls',
)

s=replace_once(
    s,
    "  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(b=>b.classList.toggle('active',state.positions.has(b.dataset.nflPptPos)));",
    "  tool.querySelectorAll('[data-nfl-ppt-side]').forEach(b=>{const on=state.sides?.has(b.dataset.nflPptSide);b.classList.toggle('active',!!on);b.setAttribute('aria-pressed',on?'true':'false');});\n  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(b=>b.classList.toggle('active',state.positions.has(b.dataset.nflPptPos)));",
    'side filter control sync',
)

s=replace_once(
    s,
    "    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);renderRows();return;}",
    "    const side=t.closest?.('[data-nfl-ppt-side]');if(side){const v=side.dataset.nflPptSide;if(state.sides.has(v))state.sides.delete(v);else state.sides.add(v);renderRows();return;}\n    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);renderRows();return;}",
    'side filter click handler',
)

s=replace_once(
    s,
    "  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,sortKey:'style',sortDir:'desc',filtersOpen:true});\n  state.positions=new Set(POSITIONS);renderRows();",
    "  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,sortKey:'style',sortDir:'desc',filtersOpen:true});\n  state.sides=new Set();state.positions=new Set(POSITIONS);renderRows();",
    'clear side filters',
)

write(p,s)

p='sports/nfl/player-prop-tool-v947.css'
c=read(p)
extra='''\n#nflView .nfl-ppt-side-v948{display:flex;align-items:center;gap:7px;min-height:36px}\n#nflView .nfl-ppt-side-v948>span{font:800 8.5px/1 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:#6f8aa4}\n#nflView .nfl-ppt-side-v948 button{height:36px;min-width:62px;padding:0 12px;border:1px solid #253d56;border-radius:8px;background:#0a1724;color:#a9c0d5;font:800 10px/1 "JetBrains Mono",monospace;cursor:pointer}\n#nflView .nfl-ppt-side-v948 button:hover{border-color:#4887c4;color:#fff}\n#nflView .nfl-ppt-side-v948 button.active,#nflView .nfl-ppt-side-v948 button[aria-pressed="true"]{border-color:#2d7fff;background:rgba(45,127,255,.16);color:#fff;box-shadow:inset 0 0 0 1px rgba(45,127,255,.20)}\n'''
if '.nfl-ppt-side-v948{' not in c:c+=extra
write(p,c)

p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(!tool.includes('addEventListener(\"scroll\"'),'Player Prop Tool must not render/refetch from scroll events');"
add="""\nassert.ok(tool.includes('data-nfl-ppt-side=\\\"over\\\"'),'Over quick filter missing');\nassert.ok(tool.includes('data-nfl-ppt-side=\\\"under\\\"'),'Under quick filter missing');\nassert.ok(tool.includes("state.sides?.size===1"),'Side filtering must show both when neither or both are selected');\nassert.ok(tool.includes("state.sides=new Set()"),'Clear Filters must reset Over/Under to both');"""
if add.strip() not in t:
    if anchor not in t: raise SystemExit('side filter selftest anchor missing')
    t=t.replace(anchor,anchor+add,1)
write(p,t)

p='tests/nfl-player-prop-tool-v947.spec.js'
t=read(p)
qa="""\n\ntest('Over and Under quick filters are additive and neither means both',async({page})=>{\n  await open(page);\n  const sideState=()=>page.evaluate(()=>({\n    sides:[...window.__TSO_NFL_PLAYER_PROP_V947__.state.sides],\n    visible:[...document.querySelectorAll('#nflPlayerPropTool tbody tr')].map(r=>r.querySelector('.nfl-ppt-pick-v947')?.classList.contains('under')?'under':'over')\n  }));\n  let st=await sideState();\n  expect(st.sides).toEqual([]);\n  await page.locator('[data-nfl-ppt-side=\"over\"]').click();\n  st=await sideState();expect(st.sides).toEqual(['over']);expect(st.visible.length).toBeGreaterThan(0);expect(new Set(st.visible)).toEqual(new Set(['over']));\n  await page.locator('[data-nfl-ppt-side=\"under\"]').click();\n  st=await sideState();expect(new Set(st.sides)).toEqual(new Set(['over','under']));expect(st.visible.length).toBeGreaterThan(0);\n  await page.locator('[data-nfl-ppt-side=\"over\"]').click();\n  st=await sideState();expect(st.sides).toEqual(['under']);expect(st.visible.length).toBeGreaterThan(0);expect(new Set(st.visible)).toEqual(new Set(['under']));\n  await page.locator('[data-nfl-ppt-side=\"under\"]').click();\n  st=await sideState();expect(st.sides).toEqual([]);expect(st.visible.length).toBeGreaterThan(0);\n});\n"""
if 'Over and Under quick filters are additive and neither means both' not in t:t+=qa
write(p,t)

print('NFL Player Prop Tool v94.8 Over/Under quick filter applied')
