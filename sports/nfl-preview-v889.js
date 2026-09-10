import * as basePreview from './nfl-preview.js?v=88.6e';
import { installNflGamecastV889Enhancer, enhanceNflGamecastV889Now } from './nfl/gamecast-v889-enhancer.js?v=88.9';

let enhancerInstalled=false;

function armEnhancer(){
  if(!enhancerInstalled){
    enhancerInstalled=true;
    installNflGamecastV889Enhancer();
  }
  if(typeof requestAnimationFrame==='function'){
    requestAnimationFrame(()=>enhanceNflGamecastV889Now());
  }else{
    queueMicrotask(()=>enhanceNflGamecastV889Now());
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

export const __V889_BASE__=basePreview;