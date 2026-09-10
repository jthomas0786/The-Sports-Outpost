import * as basePreview from './nfl-preview.js?v=88.6e';
import { installNflGamecastV888Enhancer, enhanceNflGamecastV888Now } from './nfl/gamecast-v888-enhancer.js?v=88.8';

let enhancerInstalled=false;

function armEnhancer(){
  if(!enhancerInstalled){
    enhancerInstalled=true;
    installNflGamecastV888Enhancer();
  }
  if(typeof requestAnimationFrame==='function'){
    requestAnimationFrame(()=>enhanceNflGamecastV888Now());
    requestAnimationFrame(()=>enhanceNflGamecastV888Now());
  }else{
    queueMicrotask(()=>enhanceNflGamecastV888Now());
  }
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

export const __V888_BASE__=basePreview;
