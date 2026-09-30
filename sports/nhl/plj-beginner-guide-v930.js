let installed=false,observer=null,queued=false;

export function pljBeginnerAction(grade,bet=''){
 const g=String(grade||'').toUpperCase();
 const pick=String(bet||'').trim();
 if(g==='A')return {grade:g,tone:'play',label:'PREGAME PLAY',detail:`Beginner rule: ${pick?`play ${pick}`:'play the listed favorite -1.5'} before puck drop.`};
 if(g==='B')return {grade:g,tone:'watch',label:'WATCHLIST',detail:`Beginner rule: pass and monitor. ${pick?`${pick} is `:'This is '}an optional small pregame play only if you intentionally use the more aggressive A+B approach.`};
 return {grade:g||'C',tone:'pass',label:'PASS',detail:'Skip this as a PLJ play. Wait for a stronger Grade A market-shape setup.'};
}

function ensureStyle(){
 if(document.getElementById('nhl-plj-beginner-v930-css'))return;
 const l=document.createElement('link');l.id='nhl-plj-beginner-v930-css';l.rel='stylesheet';l.href='./sports/nhl/plj-beginner-guide-v930.css?v=90.30';document.head.appendChild(l);
}
function guideHTML(){return `<aside id="hkPljBeginnerGuide" class="plj-how-guide" aria-label="How to play Puck Line Jesus"><div class="plj-how-title"><span>NEW TO PLJ?</span><h3>How to Play Puck Line Jesus</h3><p>PLJ is not a separate sportsbook market. The pregame bet is the listed favorite <b>-1.5</b>.</p></div><div class="plj-how-steps"><div><b>1</b><strong>Choose the setup</strong><span><em>A</em> = Pregame Play · <em>B</em> = Watchlist · <em>C</em> = Pass. Beginner rule: stick to A.</span></div><div><b>2</b><strong>Bet before puck drop</strong><span>Take the exact favorite -1.5 shown on the card. No extra live bet is required.</span></div><div><b>3</b><strong>Track the game</strong><span>Favorite up 1 late = PLJ WATCH. Opponent pulls goalie = <em>PLJ LIVE</em>.</span></div><div><b>4</b><strong>Look for the empty net</strong><span>Favorite scores into the empty net and moves from +1 to +2 = <em>PLJ CASHED</em>.</span></div></div><small>Grades describe market shape, not a guaranteed outcome. Keep stakes small and consistent while the history sample grows.</small></aside>`;}
function gradeForCard(card){
 if(card.classList.contains('plj-candidate-card-a'))return 'A';
 if(card.classList.contains('plj-candidate-card-b'))return 'B';
 if(card.classList.contains('plj-candidate-card-c'))return 'C';
 return '';
}
function decorateCard(card){
 const grade=gradeForCard(card);if(!grade)return;
 const bet=card.querySelector('.plj-line>div:first-child b')?.textContent?.replace(/\s+/g,' ')?.trim()||'';
 const action=pljBeginnerAction(grade,bet);
 let box=card.querySelector('.plj-play-call');
 if(!box){box=document.createElement('div');box.className='plj-play-call';const p=card.querySelector(':scope>p');(p||card.querySelector(':scope>button'))?.before(box);}
 if(!box)return;
 const sig=`${grade}|${bet}|${action.tone}|${action.label}|${action.detail}`;
 if(box.dataset.pljGuideSig===sig)return;
 box.dataset.pljGuideSig=sig;
 box.className=`plj-play-call tone-${action.tone}`;
 box.innerHTML=`<small>WHAT TO DO</small><strong>${action.label}</strong><span>${action.detail}</span>`;
}
function sync(){
 const panel=document.getElementById('hkPuckLineJesusPanel');if(!panel)return;
 panel.querySelectorAll('.plj-candidate-card-a,.plj-candidate-card-b,.plj-candidate-card-c').forEach(decorateCard);
 const pregame=[...panel.querySelectorAll('.plj-section')].find(s=>s.querySelector('h3')?.textContent?.trim()==='Pregame PLJ Candidates');
 if(pregame&&!document.getElementById('hkPljBeginnerGuide'))pregame.insertAdjacentHTML('beforebegin',guideHTML());
}
function mutationNeedsSync(records){
 return records.some(r=>[...r.addedNodes].some(n=>{
  if(n.nodeType!==1)return false;
  return n.matches?.('#hkPuckLineJesusPanel,.plj-candidate-card-a,.plj-candidate-card-b,.plj-candidate-card-c')||
   n.querySelector?.('#hkPuckLineJesusPanel,.plj-candidate-card-a,.plj-candidate-card-b,.plj-candidate-card-c');
 }));
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
export function installPljBeginnerGuideV930(){
 ensureStyle();
 if(installed){queue();return;}installed=true;queue();
 observer=new MutationObserver(records=>{if(mutationNeedsSync(records))queue();});
 observer.observe(document.body,{childList:true,subtree:true});
 window.DW_pljBeginnerGuide={sync,action:pljBeginnerAction};
}
