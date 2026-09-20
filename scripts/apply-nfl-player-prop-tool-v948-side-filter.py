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
    "search:'',minProb:.40,side:null,sortKey:'style',sortDir:'desc',color:true,filtersOpen:false,",
    'side switch state',
)

s=replace_once(
    s,
    "  if(ignore!=='position'&&state.positions.size&&!state.positions.has(row.position))return false;\n  if(ignore!=='game'",
    "  if(ignore!=='position'&&state.positions.size&&!state.positions.has(row.position))return false;\n  if(ignore!=='side'&&state.side&&row.side!==state.side)return false;\n  if(ignore!=='game'",
    'side switch predicate',
)

s=replace_once(
    s,
    "    </div>\n    <div class=\"nfl-ppt-positions-v947\">${POSITIONS.map(p=>`<button type=\"button\" data-nfl-ppt-pos=\"${p}\" class=\"active\">${p}</button>`).join('')}</div>",
    "    </div>\n    <div class=\"nfl-ppt-side-v948\" role=\"group\" aria-label=\"Over or Under filter\"><span>Side</span><div class=\"nfl-ppt-side-switch-v948\"><button type=\"button\" data-nfl-ppt-side=\"over\" aria-pressed=\"false\">Over</button><button type=\"button\" data-nfl-ppt-side=\"under\" aria-pressed=\"false\">Under</button></div></div>\n    <div class=\"nfl-ppt-positions-v947\">${POSITIONS.map(p=>`<button type=\"button\" data-nfl-ppt-pos=\"${p}\" class=\"active\">${p}</button>`).join('')}</div>",
    'side switch controls',
)

s=replace_once(
    s,
    "  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(b=>b.classList.toggle('active',state.positions.has(b.dataset.nflPptPos)));",
    "  tool.querySelectorAll('[data-nfl-ppt-side]').forEach(b=>{const on=state.side===b.dataset.nflPptSide;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false');});\n  tool.querySelectorAll('[data-nfl-ppt-pos]').forEach(b=>b.classList.toggle('active',state.positions.has(b.dataset.nflPptPos)));",
    'side switch control sync',
)

s=replace_once(
    s,
    "    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);renderRows();return;}",
    "    const side=t.closest?.('[data-nfl-ppt-side]');if(side){const v=side.dataset.nflPptSide;state.side=state.side===v?null:v;renderRows();return;}\n    const pos=t.closest?.('[data-nfl-ppt-pos]');if(pos){const p=pos.dataset.nflPptPos;if(state.positions.has(p)&&state.positions.size>1)state.positions.delete(p);else state.positions.add(p);renderRows();return;}",
    'side switch click handler',
)

s=replace_once(
    s,
    "  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,sortKey:'style',sortDir:'desc',filtersOpen:true});\n  state.positions=new Set(POSITIONS);renderRows();",
    "  Object.assign(state,{game:'ALL',market:'ALL',team:'ALL',search:'',minProb:.40,side:null,sortKey:'style',sortDir:'desc',filtersOpen:true});\n  state.positions=new Set(POSITIONS);renderRows();",
    'clear side switch',
)

write(p,s)

p='sports/nfl/player-prop-tool-v947.css'
c=read(p)
extra='''\n#nflView .nfl-ppt-side-v948{display:flex;align-items:center;gap:7px;min-height:36px}\n#nflView .nfl-ppt-side-v948>span{font:800 8.5px/1 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:#6f8aa4}\n#nflView .nfl-ppt-side-switch-v948{display:grid;grid-template-columns:1fr 1fr;padding:2px;border:1px solid #253d56;border-radius:10px;background:#07131f;overflow:hidden}\n#nflView .nfl-ppt-side-switch-v948 button{height:32px;min-width:62px;padding:0 12px;border:0;border-radius:7px;background:transparent;color:#a9c0d5;font:800 10px/1 "JetBrains Mono",monospace;cursor:pointer;transition:background .14s ease,color .14s ease,box-shadow .14s ease}\n#nflView .nfl-ppt-side-switch-v948 button:hover{color:#fff}\n#nflView .nfl-ppt-side-switch-v948 button.active,#nflView .nfl-ppt-side-switch-v948 button[aria-pressed="true"]{background:#2d7fff;color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 3px 10px rgba(45,127,255,.22)}\n'''
if '.nfl-ppt-side-switch-v948{' not in c:c+=extra
write(p,c)

p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(!tool.includes('addEventListener(\"scroll\"'),'Player Prop Tool must not render/refetch from scroll events');"
add="""\nassert.ok(tool.includes('data-nfl-ppt-side=\\\"over\\\"'),'Over switch option missing');\nassert.ok(tool.includes('data-nfl-ppt-side=\\\"under\\\"'),'Under switch option missing');\nassert.ok(tool.includes("state.side=state.side===v?null:v"),'Over/Under switch must be mutually exclusive and same-click clear');\nassert.ok(tool.includes("if(ignore!=='side'&&state.side&&row.side!==state.side)return false"),'Side filter predicate missing');\nassert.ok(tool.includes("side:null"),'Default and clear state must show both sides');"""
if add.strip() not in t:
    if anchor not in t: raise SystemExit('side switch selftest anchor missing')
    t=t.replace(anchor,anchor+add,1)
write(p,t)

p='tests/nfl-player-prop-tool-v947.spec.js'
t=read(p)
qa="""

test('Over Under segmented switch covers both directions and same-side clear',async({page})=>{
  let toolRequests=0;
  page.on('request',r=>{try{const u=new URL(r.url());if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('94.7-'))toolRequests++;}catch{}});
  await open(page);
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  const baseline=toolRequests;
  const over=page.locator('[data-nfl-ppt-side="over"]'),under=page.locator('[data-nfl-ppt-side="under"]');
  const sideState=()=>page.evaluate(()=>{
    const rows=[...document.querySelectorAll('#nflPlayerPropTool tbody tr:visible')];
    const visible=rows.map(r=>r.querySelector('.nfl-ppt-pick-v947')?.classList.contains('under')?'under':'over');
    const source=(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).map(r=>r.side);
    return {
      side:window.__TSO_NFL_PLAYER_PROP_V947__?.state?.side??null,
      visible,
      source,
      overPressed:document.querySelector('[data-nfl-ppt-side="over"]')?.getAttribute('aria-pressed'),
      underPressed:document.querySelector('[data-nfl-ppt-side="under"]')?.getAttribute('aria-pressed')
    };
  });
  const expectOnly=async(side)=>{
    const st=await sideState();
    expect(st.side).toBe(side);
    expect(st.visible.length).toBeGreaterThan(0);
    expect(new Set(st.visible)).toEqual(new Set([side]));
    expect(st.overPressed).toBe(side==='over'?'true':'false');
    expect(st.underPressed).toBe(side==='under'?'true':'false');
  };
  let st=await sideState();
  expect(st.side).toBeNull();
  expect(st.overPressed).toBe('false');expect(st.underPressed).toBe('false');
  expect(new Set(st.source)).toEqual(new Set(['over','under']));
  expect(new Set(st.visible)).toEqual(new Set(['over','under']));

  await over.click();await expectOnly('over');
  await under.click();await expectOnly('under');
  await over.click();await expectOnly('over');
  await over.click();
  st=await sideState();
  expect(st.side).toBeNull();expect(st.overPressed).toBe('false');expect(st.underPressed).toBe('false');
  expect(new Set(st.visible)).toEqual(new Set(['over','under']));

  await under.click();await expectOnly('under');
  await under.click();
  st=await sideState();
  expect(st.side).toBeNull();expect(new Set(st.visible)).toEqual(new Set(['over','under']));
  await page.waitForTimeout(150);
  expect(toolRequests).toBe(baseline);
});

test('Over Under side selection survives every other Player Prop Tool filter',async({page})=>{
  await open(page);
  const over=page.locator('[data-nfl-ppt-side="over"]');
  await over.click();
  const assertOver=async()=>{
    await expect(over).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-nfl-ppt-side="under"]')).toHaveAttribute('aria-pressed','false');
    expect(await page.evaluate(()=>window.__TSO_NFL_PLAYER_PROP_V947__?.state?.side)).toBe('over');
    const sides=await page.locator('#nflPlayerPropTool tbody tr:visible .nfl-ppt-pick-v947').evaluateAll(nodes=>nodes.map(n=>n.classList.contains('under')?'under':'over'));
    expect(sides.every(x=>x==='over')).toBe(true);
  };
  await assertOver();

  await page.locator('#nflPptMode').selectOption('safest');await assertOver();
  const game=page.locator('#nflPptGame');
  const gv=await game.locator('option').nth(1).getAttribute('value');if(gv){await game.selectOption(gv);await assertOver();}
  const prop=page.locator('#nflPptMarket');
  const pv=await prop.locator('option').nth(1).getAttribute('value');if(pv){await prop.selectOption(pv);await assertOver();}

  const activeRowId=await page.locator('#nflPlayerPropTool tbody tr:visible').first().getAttribute('data-nfl-ppt-row').catch(()=>null);
  if(activeRowId){
    const activePos=await page.evaluate(id=>(window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[]).find(r=>r.id===id)?.position||'',activeRowId);
    const alternate=['QB','RB','WR','TE'].find(p=>p!==activePos);
    if(alternate){await page.locator(`[data-nfl-ppt-pos="${alternate}"]`).click();await assertOver();}
  }

  await page.locator('#nflPptFilters').click();
  const playerName=await page.locator('#nflPlayerPropTool tbody tr:visible [data-nfl-tool-player] b').first().textContent().catch(()=>null);
  if(playerName){await page.locator('#nflPptSearch').fill(playerName.replace('↗','').trim().split(/\s+/)[0]);await assertOver();await page.locator('#nflPptSearch').fill('');}
  const team=page.locator('#nflPptTeam');
  const tv=await team.locator('option').nth(1).getAttribute('value');if(tv){await team.selectOption(tv);await assertOver();await team.selectOption('ALL');}
  await page.locator('#nflPptMin').selectOption('0.50');await assertOver();

  await game.selectOption('ALL');await prop.selectOption('ALL');
  await page.locator('#nflPptMin').selectOption('0.40');
  for(const p of ['1h','q1','full']){await page.locator(`[data-nfl-ppt-period="${p}"]`).click();await assertOver();}
});
"""
if 'Over Under segmented switch covers both directions and same-side clear' not in t:t+=qa
write(p,t)

print('NFL Player Prop Tool v94.8 Over/Under exclusive switch and full regression coverage applied')
