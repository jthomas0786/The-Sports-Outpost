from pathlib import Path

p=Path('sports/mlb/live-game-switcher-v901.js')
s=p.read_text()

old="""function paint(host,games){
 const active=activeGames(games);
 host.classList.toggle('is-idle',active.length===0);
 if(active.length){
  if(!active.some(g=>g.id===currentGameId))currentGameId=active[0].id;
  host.innerHTML=`<label><span>Game</span><select>${active.map(g=>`<option value=\"${esc(g.id)}\" ${g.id===currentGameId?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label><span class=\"tso-mlb-live-switcher-state\">● ${active.length} LIVE</span>`;
  host.querySelector('select')?.addEventListener('change',e=>switchGame(e.target.value));
 }else{
  currentGameId='';
  removeInlineGamecast();
  const next=nextGame(games);
  host.innerHTML=`<label><span>Game</span><select disabled><option>${esc(idleLabel(next))}</option></select></label><span class=\"tso-mlb-live-switcher-state\">Waiting for first pitch</span>`;
 }
}
"""
new="""function paint(host,games){
 const active=activeGames(games);
 host.classList.toggle('is-idle',active.length===0);
 if(active.length){
  if(!active.some(g=>g.id===currentGameId))currentGameId=active[0].id;
  const signature=active.map(g=>`${g.id}:${g.label}`).join('|');
  let select=host.querySelector('select');
  if(host.dataset.gameSignature!==signature||!select){
   host.innerHTML=`<label><span>Game</span><select>${active.map(g=>`<option value=\"${esc(g.id)}\">${esc(g.label)}</option>`).join('')}</select></label><span class=\"tso-mlb-live-switcher-state\">● ${active.length} LIVE</span>`;
   host.dataset.gameSignature=signature;
   select=host.querySelector('select');
  }
  const state=host.querySelector('.tso-mlb-live-switcher-state');
  if(state)state.textContent=`● ${active.length} LIVE`;
  if(select&&document.activeElement!==select&&select.value!==currentGameId)select.value=currentGameId;
 }else{
  const next=nextGame(games),signature=`idle:${idleLabel(next)}`;
  currentGameId='';
  removeInlineGamecast();
  if(host.dataset.gameSignature!==signature||!host.querySelector('select')){
   host.innerHTML=`<label><span>Game</span><select disabled><option>${esc(idleLabel(next))}</option></select></label><span class=\"tso-mlb-live-switcher-state\">Waiting for first pitch</span>`;
   host.dataset.gameSignature=signature;
  }
 }
}
"""
if old not in s:
    if 'host.dataset.gameSignature' not in s: raise SystemExit('live selector paint marker missing')
else:
    s=s.replace(old,new,1)

old2=""" document.addEventListener('click',e=>{
  if(e.target?.closest?.('.notify-watch-btn'))return;
"""
new2=""" document.addEventListener('change',e=>{
  const select=e.target?.closest?.(`#${HOST_ID} select`);
  if(!select)return;
  switchGame(select.value);
 });
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('.notify-watch-btn'))return;
"""
if old2 not in s:
    if "closest?.(`#${HOST_ID} select`)" not in s: raise SystemExit('delegated selector marker missing')
else:
    s=s.replace(old2,new2,1)
p.write_text(s)
print('Applied stable MLB live game selector: preserved select DOM + delegated change handler')
