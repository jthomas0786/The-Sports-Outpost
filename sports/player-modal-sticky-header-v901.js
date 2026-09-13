const STYLE_ID='tso-player-modal-sticky-header-v901';
const CARD_CLASS='tso-player-sticky-shell';
const WATCH_CLASS='tso-player-watch-action';
let installed=false,observer=null,queued=false;

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
 .ms-modal>.player-card-v2.${CARD_CLASS}:not([class*="tso-nhl-player-card"]){
   max-height:100%!important;
   min-height:0!important;
   overflow-y:auto!important;
   overflow-x:hidden!important;
   overscroll-behavior:contain!important;
   -webkit-overflow-scrolling:touch;
 }
 .player-card-v2.${CARD_CLASS}>.hdr{
   position:sticky!important;
   top:0!important;
   z-index:45!important;
   flex:0 0 auto!important;
   padding-right:112px!important;
   background:var(--surface,#081a40)!important;
   box-shadow:0 1px 0 rgba(120,176,239,.16),0 10px 18px rgba(2,10,24,.18)!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.modal-close{
   position:absolute!important;
   top:12px!important;
   right:12px!important;
   z-index:4!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.${WATCH_CLASS}{
   position:absolute!important;
   top:12px!important;
   right:58px!important;
   z-index:4!important;
   margin:0!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.tso-nfl-prop-control,
 .player-card-v2.${CARD_CLASS}>.hdr>.tso-mlb-parity-prop-control{
   min-width:0!important;
   max-width:100%!important;
 }
 @media(max-width:680px){
   .player-card-v2.${CARD_CLASS}>.hdr{
     padding-right:48px!important;
   }
   .player-card-v2.${CARD_CLASS}>.hdr>.who{
     padding-right:64px!important;
   }
   .player-card-v2.${CARD_CLASS}>.hdr>.tso-nfl-prop-control,
   .player-card-v2.${CARD_CLASS}>.hdr>.tso-mlb-parity-prop-control{
     width:100%!important;
     max-width:none!important;
   }
 }
 `;
 document.head.appendChild(style);
}

function isWatchButton(btn){
 const text=String(btn?.textContent||'').trim();
 const meta=[btn?.getAttribute?.('aria-label'),btn?.getAttribute?.('title'),btn?.id,btn?.className,btn?.dataset?.action]
   .filter(Boolean).join(' ').toLowerCase();
 return /^[☆★⭐]$/.test(text)||/(watch\s*list|watchlist|favorite|favourite)/.test(meta);
}
function watchButton(card){
 const modal=card?.closest?.('.ms-modal');
 const buttons=[...(modal||card)?.querySelectorAll?.('button')||[]];
 return buttons.find(isWatchButton)||null;
}

function prepareCard(card){
 if(!card)return;
 const hdr=card.querySelector(':scope > .hdr');
 if(!hdr)return;
 card.classList.add(CARD_CLASS);
 const close=card.querySelector(':scope > .modal-close')||card.closest('.ms-modal')?.querySelector(':scope > .modal-close');
 if(close&&close.parentElement!==hdr)hdr.appendChild(close);
 const watch=watchButton(card);
 if(watch){
   watch.classList.add(WATCH_CLASS);
   if(watch.parentElement!==hdr)hdr.appendChild(watch);
 }
}

function scan(){
 queued=false;
 document.querySelectorAll('.ms-modal .player-card-v2,.tso-nhl-modal-backdrop .player-card-v2').forEach(prepareCard);
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(scan);}

export function installPlayerModalStickyHeaderV901(){
 ensureStyle();
 if(installed){queue();return;}
 installed=true;
 observer=new MutationObserver(queue);
 observer.observe(document.body,{childList:true,subtree:true});
 queue();
}

export const __PLAYER_MODAL_STICKY_HEADER_V901_TEST__={isWatchButton,watchButton,prepareCard};
