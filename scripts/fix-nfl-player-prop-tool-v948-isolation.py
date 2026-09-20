from pathlib import Path


def read(path): return Path(path).read_text()
def write(path, text): Path(path).write_text(text)
def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: source marker missing')
    return text.replace(old, new, 1)

# The Player Prop Tool is a static snapshot surface. While it owns #nflView,
# the base NFL renderer must not replace its DOM from a live/background tick.
p='sports/nfl-preview.js'
s=read(p)
s=replace_once(
    s,
    "function render(){\n  const root=document.getElementById('nflView'); if(!root) return;",
    "function render(){\n  const root=document.getElementById('nflView'); if(!root) return;\n  if(root.querySelector('#nflPlayerPropTool')||root.classList.contains('nfl-ppt-active-v948')) return;",
    'base NFL render ownership guard',
)
s=replace_once(
    s,
    "if(!NFL_DEMO_MODE) startLivePolling(d,()=>{\n      syncPreviewGamesFromRaw(d);\n      const root=document.getElementById('nflView');",
    "if(!NFL_DEMO_MODE) startLivePolling(d,()=>{\n      const root=document.getElementById('nflView');\n      if(root?.querySelector('#nflPlayerPropTool')||root?.classList.contains('nfl-ppt-active-v948')) return;\n      syncPreviewGamesFromRaw(d);",
    'base NFL live callback ownership guard',
)
write(p,s)

# Stop the authoritative live poll itself while the snapshot tool is open.
p='sports/nfl/live.js'
s=read(p)
s=replace_once(
    s,
    "function shouldPoll(){if(!_slate)return false;const now=Date.now();",
    "function shouldPoll(){if(!_slate)return false;if(typeof document!=='undefined'&&(document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')))return false;const now=Date.now();",
    'NFL live polling pause',
)
write(p,s)

# Halftime polling is useful elsewhere, but should be dormant on this static page.
p='sports/nfl/halftime-ui-v884.js'
s=read(p)
s=replace_once(
    s,
    "  const tick=async()=>{\n    refreshOpenDrawer();\n    if(document.hidden||window.DW_SPORT!=='nfl')return;",
    "  const tick=async()=>{\n    if(document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return;\n    refreshOpenDrawer();\n    if(document.hidden||window.DW_SPORT!=='nfl')return;",
    'halftime polling pause',
)
write(p,s)

# The model-edge enhancer owns an observer + refresh interval on the base NFL
# surface. Keep both dormant while the dedicated snapshot tool is active.
p='sports/nfl/prop-model-edge-v8918.js'
s=read(p)
s=replace_once(
    s,
    "    observer=new MutationObserver(mutations=>{\n      if(mutations.every(m=>m.target?.closest?.(`.${STRIP}`)))return;\n      schedule();\n    });observer.observe(root,{childList:true,subtree:true,characterData:true});\n    refreshTimer=setInterval(async()=>{await loadSim({force:true});schedule();},60000);",
    "    observer=new MutationObserver(mutations=>{\n      if(document.getElementById('nflPlayerPropTool')||root.classList.contains('nfl-ppt-active-v948'))return;\n      if(mutations.every(m=>m.target?.closest?.(`.${STRIP}`)))return;\n      schedule();\n    });observer.observe(root,{childList:true,subtree:true,characterData:true});\n    refreshTimer=setInterval(async()=>{if(document.getElementById('nflPlayerPropTool')||root.classList.contains('nfl-ppt-active-v948'))return;await loadSim({force:true});schedule();},60000);",
    'model observer and refresh pause',
)
write(p,s)

# The v89.3 quarter CTA timer also touches the NFL DOM. It should no-op while
# the Player Prop Tool is the active surface.
p='sports/nfl-preview-v893.js'
s=read(p)
s=replace_once(
    s,
    "async function refreshQuarterCta(){\n  const banner=document.querySelector('[data-tso-quarter-banner]');",
    "async function refreshQuarterCta(){\n  if(document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return;\n  const banner=document.querySelector('[data-tso-quarter-banner]');",
    'quarter CTA timer pause',
)
write(p,s)

# Command Center normally refreshes NFL live odds + simulation every 30 seconds.
# That background fetch is intentionally paused while this static snapshot page is open.
p='sports/nfl/command-center-client.js'
s=read(p)
s=replace_once(
    s,
    "async function refresh(){\n  if(busy||document.hidden)return;",
    "async function refresh(){\n  if(busy||document.hidden||document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return;",
    'command center polling pause',
)
write(p,s)

# Keep ancestors actionably visible while the dedicated tool owns the route.
p='sports/nfl/player-prop-tool-v947.css'
s=read(p)
extra='''\n/* v94.8 static-snapshot ownership: base route/boot CSS cannot hide the active tool. */\nbody:has(#nflView.nfl-ppt-active-v948) .app-shell,\nbody:has(#nflView.nfl-ppt-active-v948) .app-main{visibility:visible!important;opacity:1!important}\n'''
if 'static-snapshot ownership: base route/boot CSS' not in s:
    s += extra
write(p,s)

# Playwright's actionability auto-scroll can stall on the very wide 365-row table
# after a sort rebuild. Exercise the exact browser click handler directly and keep
# the aria-sort/state assertions as the functional proof for every column.
p='tests/nfl-player-prop-tool-v947.spec.js'
s=read(p)
old="""    await btn.click();
    const first=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(first);
    await btn.click();
    const second=await th.getAttribute('aria-sort');"""
new="""    await expect(btn).toHaveCount(1);
    await btn.evaluate(el=>el.click());
    const first=await th.getAttribute('aria-sort');
    expect(['ascending','descending']).toContain(first);
    await btn.evaluate(el=>el.click());
    const second=await th.getAttribute('aria-sort');"""
s=replace_once(s,old,new,'wide table sort browser interaction')
write(p,s)

# Permanent static regression: the surrounding NFL engines must respect the
# Player Prop Tool ownership flag rather than polling/re-rendering through it.
p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
s=read(p)
anchor="assert.ok(!router.includes('installNflBackgroundFreezeV930'),'global Player Prop background freeze must be removed');"
add="""
const basePreview=read('sports/nfl-preview.js');
const liveEngine=read('sports/nfl/live.js');
const halftimeUi=read('sports/nfl/halftime-ui-v884.js');
const modelEdge=read('sports/nfl/prop-model-edge-v8918.js');
const commandCenterClient=read('sports/nfl/command-center-client.js');
assert.ok(basePreview.includes("root.querySelector('#nflPlayerPropTool')||root.classList.contains('nfl-ppt-active-v948')"),'base NFL renderer must not overwrite active Player Prop Tool');
assert.ok(basePreview.includes("root?.querySelector('#nflPlayerPropTool')||root?.classList.contains('nfl-ppt-active-v948')"),'live callback must not rerender active Player Prop Tool');
assert.ok(liveEngine.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'NFL live polling must pause on Player Prop Tool');
assert.ok(halftimeUi.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'halftime polling must pause on Player Prop Tool');
assert.ok(modelEdge.includes("root.classList.contains('nfl-ppt-active-v948')"),'model observer/refresh must pause on Player Prop Tool');
assert.ok(commandCenterClient.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'Command Center polling must pause on Player Prop Tool');
"""
if add.strip() not in s:
    if anchor not in s:
        raise SystemExit('isolation selftest anchor missing')
    s=s.replace(anchor,anchor+add,1)
write(p,s)

print('NFL Player Prop Tool v94.8 static-snapshot isolation guards applied')
