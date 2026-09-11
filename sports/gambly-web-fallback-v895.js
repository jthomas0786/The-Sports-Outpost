let installed=false;

function readSlip(){
  try{
    const legs=JSON.parse(localStorage.getItem('dw_betslip')||'[]');
    return Array.isArray(legs)?legs:[];
  }catch{return [];}
}

function legToText(l){
  if(l?.kind==='firstinning') return `${l.game} first inning ${l.side} ${l.line} runs`;
  const market=String(l?.market||'').trim();
  const side=String(l?.side||'over').toLowerCase();
  if(/^(atd|anytime td|anytime touchdown)$/i.test(market)) return `${l.player} anytime touchdown`;
  return `${l.player} ${market} ${side} ${l.line}`;
}

function betslipText(){
  const betslip=readSlip();
  if(!betslip.length) return '';
  const legs=betslip.map(legToText);
  const head=legs.length===1?'Find me the best odds on ':`Build me a ${legs.length}-leg parlay with `;
  return head+legs.join(', ')+'.';
}

function gamblyChatUrl(text){
  return `https://gambly.com/chat?q=${encodeURIComponent(text)}`;
}

function handoffToGambly(){
  const text=betslipText();
  if(!text) return false;
  // Keep a clipboard copy as a fail-safe, but the q= handoff is what prefills
  // GamblyBot so the user normally only needs to press Send.
  try{navigator.clipboard?.writeText(text)?.catch?.(()=>{});}catch{}
  const url=gamblyChatUrl(text);
  const opened=window.open(url,'_blank','noopener');
  if(!opened) window.location.href=url;
  return true;
}

export function installGamblyWebFallbackV895(){
  if(installed||typeof document==='undefined') return;
  installed=true;
  // Capture-phase interception intentionally runs before the legacy #bsText
  // onclick handler, which still points at the old SMS phone-number fallback.
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#bsText');
    if(!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!handoffToGambly()){
      const note=document.getElementById('bsNote');
      if(note) note.textContent='Add at least one pick before opening GamblyBot.';
    }
  },true);
}

export const __V895_TEST__={legToText,betslipText,gamblyChatUrl};
