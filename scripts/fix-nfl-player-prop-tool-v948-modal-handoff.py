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

# The Prop Tool is the authoritative frozen snapshot and can contain players that
# are not present in the legacy hidden NFL player list. Build the lightweight
# native modal shell directly from the frozen row identity, then let the existing
# nfl-research-ui layer upgrade it into the exact modern player card.
old_open="""async function openPlayer(row){
  const tool=document.getElementById(TOOL_ID),proxy=findPlayerProxy(row);if(!tool||!proxy)return;
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  modalReturn={tool,x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0};
  document.documentElement.classList.add('nfl-ppt-opening-modal');
  proxy.click();
  await enhanceOpenedPlayerModal();
}"""
new_open="""async function openPlayer(row){
  const tool=document.getElementById(TOOL_ID),root=document.getElementById('nflView');if(!tool||!root)return;
  const wrap=tool.querySelector('.nfl-ppt-table-wrap');
  modalReturn={tool,x:window.scrollX,y:window.scrollY,tableX:wrap?.scrollLeft||0,directModal:true};
  document.documentElement.classList.add('nfl-ppt-opening-modal');
  root.querySelector('[data-nfl-ppt-direct-modal]')?.remove();
  const backdrop=document.createElement('div');
  backdrop.className='ms-modal-backdrop';backdrop.dataset.nflPptDirectModal='1';backdrop.setAttribute('data-nfl-close-modal','');
  backdrop.innerHTML=`<div class=\"ms-modal\" data-nfl-ppt-direct-shell=\"1\"><button class=\"ms-modal-x\" type=\"button\" data-nfl-close-modal>×</button><header><div><div class=\"ms-modal-name\"><h2>${esc(row.name)}</h2></div><p>${esc(row.team)} · ${esc(row.position||'')}</p></div></header></div>`;
  const closeDirect=()=>backdrop.remove();
  backdrop.querySelector('.ms-modal-x')?.addEventListener('click',closeDirect);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeDirect();});
  root.append(backdrop);
  await enhanceOpenedPlayerModal();
  if(!root.querySelector('.tso-nfl-player-card-v72')){backdrop.remove();queueModalRestore();}
}"""
s=replace_once(s,old_open,new_open,'direct player modal shell')

old_restore="""    const modal=root.querySelector('.ms-modal,.tso-nfl-player-card-v72');
    if(modal&&modal.getClientRects().length&&++frames<240){restoreRaf=requestAnimationFrame(run);return;}
    const existing=root.querySelector(`#${STASH_ID}`);existing?.remove();"""
new_restore="""    const modal=root.querySelector('.ms-modal,.tso-nfl-player-card-v72');
    if(modal&&modal.getClientRects().length&&++frames<240){restoreRaf=requestAnimationFrame(run);return;}
    if(saved.directModal){
      const wrap=saved.tool.querySelector('.nfl-ppt-table-wrap');if(wrap)wrap.scrollLeft=saved.tableX;
      window.scrollTo(saved.x,saved.y);modalReturn=null;syncNav();return;
    }
    const existing=root.querySelector(`#${STASH_ID}`);existing?.remove();"""
s=replace_once(s,old_restore,new_restore,'direct player modal restore')
write(p,s)

p='scripts/nfl-player-prop-tool-v947-selftest.mjs'
t=read(p)
anchor="assert.ok(tool.includes(\"root.querySelector('.tso-nfl-player-card-v72')\"),'must wait for actual modern NFL player modal');"
add="""
assert.ok(tool.includes("directModal:true"),'player modal must preserve the frozen Prop Tool in place');
assert.ok(tool.includes("data-nfl-ppt-direct-shell"),'player modal must be created from the frozen row identity');
assert.ok(tool.includes("<h2>${esc(row.name)}</h2>"),'direct player modal must use the selected frozen player name');
assert.ok(tool.includes("${esc(row.team)} · ${esc(row.position||'')}"),'direct player modal must provide team and position to research UI');
assert.ok(tool.includes("if(saved.directModal)"),'direct modal close must restore scroll without rebuilding the Prop Tool snapshot');
assert.ok(!tool.includes("tool.remove();"),'player modal must not detach the static Prop Tool snapshot');
"""
if add.strip() not in t:
    if anchor not in t:
        raise SystemExit('direct modal selftest anchor missing')
    t=t.replace(anchor,anchor+add,1)
write(p,t)

print('NFL Player Prop Tool v94.8 direct modern player modal handoff applied')
