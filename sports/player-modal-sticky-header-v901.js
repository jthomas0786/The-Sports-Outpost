const STYLE_ID='tso-player-modal-sticky-header-v901';
const CARD_CLASS='tso-player-static-shell';
const BODY_CLASS='tso-player-modal-scroll-body';
const ACTIONS_CLASS='tso-player-header-actions';
const WATCH_CLASS='tso-player-watch-action';
let installed=false,observer=null,queued=false;

const imp=(el,prop,value)=>{if(el)el.style.setProperty(prop,value,'important');};
const isMobile=()=>typeof matchMedia==='function'&&matchMedia('(max-width:680px)').matches;

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
 .ms-modal>.player-card-v2.${CARD_CLASS},
 .tso-nhl-modal-backdrop .player-card-v2.${CARD_CLASS}{
   display:flex!important;
   flex-direction:column!important;
   flex:1 1 auto!important;
   width:100%!important;
   min-height:0!important;
   max-height:100%!important;
   overflow:hidden!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr{
   flex:0 0 auto!important;
   z-index:45!important;
   width:100%!important;
   box-sizing:border-box!important;
   overflow:visible!important;
   background:var(--surface,#081a40)!important;
   box-shadow:0 1px 0 rgba(120,176,239,.16),0 10px 18px rgba(2,10,24,.18)!important;
 }
 .player-card-v2.${CARD_CLASS}>.${BODY_CLASS}{
   display:flex!important;
   flex-direction:column!important;
   flex:1 1 auto!important;
   min-height:0!important;
   max-height:none!important;
   overflow-y:auto!important;
   overflow-x:hidden!important;
   overscroll-behavior:contain!important;
   -webkit-overflow-scrolling:touch;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.${ACTIONS_CLASS}{
   display:flex!important;
   align-items:flex-start!important;
   justify-content:flex-end!important;
   gap:8px!important;
   min-width:40px!important;
   position:relative!important;
   z-index:5!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.${ACTIONS_CLASS}>button{
   position:relative!important;
   inset:auto!important;
   top:auto!important;
   right:auto!important;
   bottom:auto!important;
   left:auto!important;
   margin:0!important;
   transform:none!important;
   flex:0 0 auto!important;
 }
 .player-card-v2.${CARD_CLASS}>.hdr>.${ACTIONS_CLASS}>.${WATCH_CLASS}{order:1!important}
 .player-card-v2.${CARD_CLASS}>.hdr>.${ACTIONS_CLASS}>.modal-close{order:2!important}
 .player-card-v2.${CARD_CLASS}>.hdr>.tso-nfl-prop-control,
 .player-card-v2.${CARD_CLASS}>.hdr>.tso-mlb-parity-prop-control{
   min-width:0!important;
   max-width:none!important;
   margin:0!important;
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

function resetActionButton(btn){
 if(!btn)return;
 for(const [prop,value] of [['position','relative'],['top','auto'],['right','auto'],['bottom','auto'],['left','auto'],['margin','0'],['transform','none']])imp(btn,prop,value);
}

function ensureActions(card,hdr){
 let actions=hdr.querySelector(`:scope > .${ACTIONS_CLASS}`);
 if(!actions){actions=document.createElement('div');actions.className=ACTIONS_CLASS;hdr.appendChild(actions);}
 const modal=card.closest('.ms-modal');
 const close=card.querySelector(':scope > .modal-close')||hdr.querySelector(':scope > .modal-close')||modal?.querySelector(':scope > .modal-close');
 const watch=watchButton(card);
 if(watch){watch.classList.add(WATCH_CLASS);resetActionButton(watch);if(watch.parentElement!==actions)actions.appendChild(watch);}
 if(close){resetActionButton(close);if(close.parentElement!==actions)actions.appendChild(close);}
 actions.dataset.hasWatch=watch?'1':'0';
 return actions;
}

function ensureBody(card,hdr){
 const nhlBody=card.querySelector(':scope > .tso-nhl-scroll');
 if(nhlBody){nhlBody.classList.add(BODY_CLASS);return nhlBody;}
 let body=card.querySelector(`:scope > .${BODY_CLASS}`);
 if(body)return body;
 const nodes=[...card.children].filter(node=>node!==hdr);
 body=document.createElement('div');body.className=BODY_CLASS;hdr.after(body);
 for(const node of nodes){
   if(node.classList?.contains(ACTIONS_CLASS))continue;
   if(node.classList?.contains('modal-close'))continue;
   if(node.classList?.contains(WATCH_CLASS))continue;
   body.appendChild(node);
 }
 return body;
}

function layoutHeader(card,hdr,actions){
 const mobile=isMobile();
 const avatar=hdr.querySelector(':scope > .ava-reticle');
 const who=hdr.querySelector(':scope > .who');
 const prop=hdr.querySelector(':scope > .tso-nfl-prop-control,:scope > .tso-mlb-parity-prop-control');

 imp(hdr,'display','grid');
 imp(hdr,'align-items','start');
 imp(hdr,'column-gap',mobile?'10px':'14px');
 imp(hdr,'row-gap',mobile?'10px':'8px');
 imp(hdr,'padding-right','0');
 imp(hdr,'position','relative');
 imp(hdr,'top','auto');

 if(mobile){
   imp(hdr,'grid-template-columns','auto minmax(0,1fr) auto');
   if(avatar){imp(avatar,'grid-column','1');imp(avatar,'grid-row','1');}
   if(who){imp(who,'grid-column','2');imp(who,'grid-row','1');imp(who,'padding-right','0');}
   if(actions){imp(actions,'grid-column','3');imp(actions,'grid-row','1');}
   if(prop){
     imp(prop,'grid-column','1 / -1');imp(prop,'grid-row','2');imp(prop,'width','100%');imp(prop,'max-width','none');
   }
 }else{
   imp(hdr,'grid-template-columns','auto minmax(0,1fr) minmax(180px,232px) auto');
   if(avatar){imp(avatar,'grid-column','1');imp(avatar,'grid-row','1');}
   if(who){imp(who,'grid-column','2');imp(who,'grid-row','1');imp(who,'padding-right','0');}
   if(prop){
     imp(prop,'grid-column','3');imp(prop,'grid-row','1');imp(prop,'width','100%');imp(prop,'max-width','232px');imp(prop,'justify-self','stretch');
   }
   if(actions){imp(actions,'grid-column','4');imp(actions,'grid-row','1');}
 }
}

function prepareCard(card){
 if(!card)return;
 const hdr=card.querySelector(':scope > .hdr');
 if(!hdr)return;
 card.classList.add(CARD_CLASS);
 const modal=card.closest('.ms-modal');
 if(modal){
   imp(modal,'display','flex');imp(modal,'flex-direction','column');imp(modal,'overflow','hidden');
 }
 imp(card,'display','flex');imp(card,'flex-direction','column');imp(card,'overflow','hidden');imp(card,'min-height','0');imp(card,'max-height','100%');imp(card,'flex','1 1 auto');
 const actions=ensureActions(card,hdr);
 ensureBody(card,hdr);
 layoutHeader(card,hdr,actions);
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
 window.addEventListener('resize',queue,{passive:true});
 queue();
}

export const __PLAYER_MODAL_STICKY_HEADER_V901_TEST__={isWatchButton,watchButton,resetActionButton,ensureActions,ensureBody,layoutHeader,prepareCard};
