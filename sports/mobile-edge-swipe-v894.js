let installed=false;

const MAX_WIDTH=1023;
const EDGE_PX=30;
const OPEN_DISTANCE=64;
const LOCK_DISTANCE=14;
const MAX_VERTICAL=84;
const MAX_DURATION_MS=900;

function mobileViewport(){
  return window.matchMedia(`(max-width:${MAX_WIDTH}px)`).matches;
}

function sidebarNodes(){
  return {
    sidebar:document.getElementById('appSidebarNav'),
    backdrop:document.getElementById('sidebarBackdrop'),
    hamburger:document.getElementById('sidebarHamburger'),
  };
}

function drawerOpen(){
  return !!document.getElementById('appSidebarNav')?.classList.contains('is-open');
}

function blockingOverlayOpen(){
  return !!document.querySelector(
    '[role="dialog"][aria-modal="true"], .ms-modal-backdrop, .sub-modal, .tso-q-backdrop, .tso-ht-backdrop'
  );
}

function openSidebar(){
  const {sidebar,backdrop,hamburger}=sidebarNodes();
  if(!sidebar||!backdrop||!mobileViewport()) return false;
  sidebar.classList.add('is-open');
  backdrop.classList.add('is-open');
  hamburger?.setAttribute('aria-expanded','true');
  document.body.style.overflow='hidden';
  window.dispatchEvent(new CustomEvent('tso:mobile-nav-open',{detail:{source:'edge-swipe'}}));
  return true;
}

function closeSidebar(){
  const {sidebar,backdrop,hamburger}=sidebarNodes();
  if(!sidebar||!backdrop) return false;
  sidebar.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  hamburger?.setAttribute('aria-expanded','false');
  document.body.style.overflow='';
  return true;
}

export function installMobileEdgeSwipeV894(){
  if(installed||typeof window==='undefined'||typeof document==='undefined') return;
  installed=true;

  let gesture=null;

  const reset=()=>{gesture=null;};

  document.addEventListener('touchstart',e=>{
    if(!mobileViewport()||drawerOpen()||blockingOverlayOpen()||e.touches.length!==1){reset();return;}
    const t=e.touches[0];
    if(t.clientX>EDGE_PX){reset();return;}
    gesture={
      x0:t.clientX,
      y0:t.clientY,
      x:t.clientX,
      y:t.clientY,
      startedAt:performance.now(),
      horizontal:false,
      cancelled:false,
    };
  },{passive:true});

  document.addEventListener('touchmove',e=>{
    if(!gesture||gesture.cancelled||e.touches.length!==1) return;
    const t=e.touches[0];
    gesture.x=t.clientX;
    gesture.y=t.clientY;
    const dx=gesture.x-gesture.x0;
    const dy=gesture.y-gesture.y0;
    const ax=Math.abs(dx),ay=Math.abs(dy);

    if(!gesture.horizontal&&Math.max(ax,ay)>=LOCK_DISTANCE){
      if(dx>0&&ax>ay*1.2) gesture.horizontal=true;
      else gesture.cancelled=true;
    }
    if(gesture.horizontal){
      // Once the gesture has clearly declared itself as a rightward edge swipe,
      // stop the page from horizontally/vertically drifting under the finger.
      e.preventDefault();
    }
  },{passive:false});

  document.addEventListener('touchend',e=>{
    if(!gesture){reset();return;}
    const changed=e.changedTouches?.[0];
    if(changed){gesture.x=changed.clientX;gesture.y=changed.clientY;}
    const dx=gesture.x-gesture.x0;
    const dy=gesture.y-gesture.y0;
    const duration=performance.now()-gesture.startedAt;
    const shouldOpen=!gesture.cancelled&&gesture.horizontal&&dx>=OPEN_DISTANCE&&Math.abs(dy)<=MAX_VERTICAL&&duration<=MAX_DURATION_MS;
    reset();
    if(shouldOpen) openSidebar();
  },{passive:true});

  document.addEventListener('touchcancel',reset,{passive:true});

  // Nice matching gesture while the drawer is open: swipe it left to dismiss.
  let closeGesture=null;
  document.addEventListener('touchstart',e=>{
    if(!mobileViewport()||!drawerOpen()||e.touches.length!==1){closeGesture=null;return;}
    const t=e.touches[0];
    const sidebar=document.getElementById('appSidebarNav');
    const width=sidebar?.getBoundingClientRect().width||0;
    if(t.clientX>width){closeGesture=null;return;}
    closeGesture={x0:t.clientX,y0:t.clientY,x:t.clientX,y:t.clientY,startedAt:performance.now(),horizontal:false,cancelled:false};
  },{passive:true});

  document.addEventListener('touchmove',e=>{
    if(!closeGesture||closeGesture.cancelled||e.touches.length!==1)return;
    const t=e.touches[0];closeGesture.x=t.clientX;closeGesture.y=t.clientY;
    const dx=closeGesture.x-closeGesture.x0,dy=closeGesture.y-closeGesture.y0;
    const ax=Math.abs(dx),ay=Math.abs(dy);
    if(!closeGesture.horizontal&&Math.max(ax,ay)>=LOCK_DISTANCE){
      if(dx<0&&ax>ay*1.2)closeGesture.horizontal=true;
      else closeGesture.cancelled=true;
    }
    if(closeGesture.horizontal)e.preventDefault();
  },{passive:false});

  document.addEventListener('touchend',e=>{
    if(!closeGesture)return;
    const t=e.changedTouches?.[0];if(t){closeGesture.x=t.clientX;closeGesture.y=t.clientY;}
    const dx=closeGesture.x-closeGesture.x0,dy=closeGesture.y-closeGesture.y0;
    const duration=performance.now()-closeGesture.startedAt;
    const shouldClose=!closeGesture.cancelled&&closeGesture.horizontal&&dx<=-OPEN_DISTANCE&&Math.abs(dy)<=MAX_VERTICAL&&duration<=MAX_DURATION_MS;
    closeGesture=null;
    if(shouldClose)closeSidebar();
  },{passive:true});

  document.addEventListener('touchcancel',()=>{closeGesture=null;},{passive:true});

  window.DW_openMobileNavFromEdge=openSidebar;
  window.DW_closeMobileNavFromSwipe=closeSidebar;
}
