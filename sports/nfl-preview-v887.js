import * as basePreview from './nfl-preview.js?v=88.6e';
import { installNflGamecastV887Enhancer, enhanceNflGamecastV887Now } from './nfl/gamecast-v887-enhancer.js?v=88.7';

let enhancerInstalled=false;

function armEnhancer(){
  if(!enhancerInstalled){
    enhancerInstalled=true;
    installNflGamecastV887Enhancer();
  }
  queueMicrotask(()=>enhanceNflGamecastV887Now());
  if(typeof requestAnimationFrame==='function') requestAnimationFrame(()=>enhanceNflGamecastV887Now());
}

export async function mount(){
  const result=await basePreview.mount();
  armEnhancer();
  return result;
}

export function selectTab(tab){
  const result=typeof basePreview.selectTab==='function' ? basePreview.selectTab(tab) : undefined;
  armEnhancer();
  return result;
}

export const __V887_BASE__=basePreview;
