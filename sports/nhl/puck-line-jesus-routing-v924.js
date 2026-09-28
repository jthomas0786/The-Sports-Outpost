let installed=false;

function openExactGame(id){
  const gameId=String(id||'');
  if(!gameId)return;
  document.querySelector('#hkPuckLineJesusPanel [data-plj-close]')?.click();
  window.DW_openNhlTab?.('slate');
  queueMicrotask(()=>{
    const target=[...document.querySelectorAll('#nhlView [data-hk-game]')]
      .find(el=>String(el.dataset.hkGame||'')===gameId);
    if(target){target.click();return;}
    window.DW_openNhlTab?.('live');
  });
}

export function installPuckLineJesusRoutingV924(){
  if(installed)return;
  installed=true;
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-plj-game]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openExactGame(button.dataset.pljGame);
  },true);
}
