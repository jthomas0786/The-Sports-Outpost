import { ensureNflGamecastV890Styles } from './nfl/gamecast-v890-styles.js?v=89.0';
import { installNflGamecastV890Enhancer, enhanceNflGamecastV890Now } from './nfl/gamecast-v890-enhancer.js?v=89.7b';

let installed=false;
let basePromise=null;
export let __V890_BASE__=null;

async function loadBase(){
  if(!basePromise){
    basePromise=(async()=>{
      // sports/nfl-preview.js still imports live.js as ?v=78. Reload that exact
      // URL before evaluating a fresh base-preview module so the latest live
      // poller cannot be hidden behind the browser module/http cache.
      try{await fetch(new URL('./nfl/live.js?v=78',import.meta.url),{cache:'reload'});}catch{}
      const mod=await import('./nfl-preview.js?v=89.10');
      __V890_BASE__=mod;
      return mod;
    })();
  }
  return basePromise;
}

function arm(){
  if(!installed){
    installed=true;
    installNflGamecastV890Enhancer();
  }
  if(typeof requestAnimationFrame==='function') requestAnimationFrame(()=>enhanceNflGamecastV890Now());
  else queueMicrotask(()=>enhanceNflGamecastV890Now());
}

export async function mount(){
  ensureNflGamecastV890Styles();
  const basePreview=await loadBase();
  const result=await basePreview.mount();
  arm();
  return result;
}

export function selectTab(tab){
  const result=typeof __V890_BASE__?.selectTab==='function' ? __V890_BASE__.selectTab(tab) : undefined;
  arm();
  return result;
}
