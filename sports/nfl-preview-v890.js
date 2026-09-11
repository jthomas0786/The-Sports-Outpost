import * as basePreview from './nfl-preview.js?v=89.7';
import { ensureNflGamecastV890Styles } from './nfl/gamecast-v890-styles.js?v=89.0';
import { installNflGamecastV890Enhancer, enhanceNflGamecastV890Now } from './nfl/gamecast-v890-enhancer.js?v=89.0';

let installed=false;

function arm(){
  if(!installed){
    installed=true;
    installNflGamecastV890Enhancer();
  }
  if(typeof requestAnimationFrame==='function') requestAnimationFrame(()=>enhanceNflGamecastV890Now());
  else queueMicrotask(()=>enhanceNflGamecastV890Now());
}

export async function mount(){
  // Load the hide/restructure CSS before the old renderer paints, preventing a
  // flash of the baked-player shell during initial mount and live refreshes.
  ensureNflGamecastV890Styles();
  const result=await basePreview.mount();
  arm();
  return result;
}

export function selectTab(tab){
  const result=typeof basePreview.selectTab==='function' ? basePreview.selectTab(tab) : undefined;
  arm();
  return result;
}

export const __V890_BASE__=basePreview;
