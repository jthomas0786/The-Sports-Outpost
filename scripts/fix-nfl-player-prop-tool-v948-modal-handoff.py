from pathlib import Path


def read(path): return Path(path).read_text()
def write(path,text): Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

p='sports/nfl/player-prop-tool-v947.js'
s=read(p)

# Opening the modern player modal must temporarily yield #nflView ownership to
# the base NFL renderer. The detached Prop Tool node is kept in modalReturn and
# is restored unchanged after the modal closes, preserving the frozen snapshot.
old_open="""async function openPlayer(row){
  const tool=document.getElementById(TOOL_ID),proxy=findPlayerProxy(row);if(!tool||!proxy)return;
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  modalReturn={tool,x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0};
  document.documentElement.classList.add('nfl-ppt-opening-modal');
  proxy.click();
  await enhanceOpenedPlayerModal();
}"""
new_open="""async function openPlayer(row){
  const tool=document.getElementById(TOOL_ID),proxy=findPlayerProxy(row),root=document.getElementById('nflView');if(!tool||!proxy||!root)return;
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  modalReturn={tool,x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0};
  document.documentElement.classList.add('nfl-ppt-opening-modal');
  tool.remove();
  root.classList.remove('nfl-ppt-active-v948');
  proxy.click();
  await enhanceOpenedPlayerModal();
  if(!root.querySelector('.tso-nfl-player-card-v72,.ms-modal'))queueModalRestore();
}"""
s=replace_once(s,old_open,new_open,'player modal ownership handoff')

old_restore="""    root.append(stash,saved.tool);
    const wrap=saved.tool.querySelector('.nfl-ppt-table-wrap');if(wrap)wrap.scrollLeft=saved.tableX;"""
new_restore="""    root.removeAttribute('hidden');
    root.classList.add('nfl-ppt-active-v948');
    root.append(stash,saved.tool);
    const wrap=saved.tool.querySelector('.nfl-ppt-table-wrap');if(wrap)wrap.scrollLeft=saved.tableX;"""
s=replace_once(s,old_restore,new_restore,'player modal ownership restore')
write(p,s)

p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(tool.includes(\"root.querySelector('.tso-nfl-player-card-v72')\"),'must wait for actual modern NFL player modal');"
add="""
assert.ok(tool.includes("tool.remove();"),'player modal handoff must detach the static Prop Tool before base modal render');
assert.ok(tool.includes("root.classList.remove('nfl-ppt-active-v948')"),'player modal handoff must temporarily yield NFL surface ownership');
assert.ok(tool.includes("root.classList.add('nfl-ppt-active-v948')"),'player modal close must restore Prop Tool surface ownership');
"""
if add.strip() not in t:
    if anchor not in t:
        raise SystemExit('modal handoff selftest anchor missing')
    t=t.replace(anchor,anchor+add,1)
write(p,t)

print('NFL Player Prop Tool v94.8 player-modal ownership handoff applied')
