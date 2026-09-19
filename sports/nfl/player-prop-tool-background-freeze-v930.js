const DEBUG_KEY='__TSO_NFL_BACKGROUND_FREEZE_V930__';
const TOKEN=Symbol('tsoNflBackgroundTimer');

let installed=false;
let suspended=false;
let suspendReason='';
let NativeMutationObserver=null;
let nativeSetInterval=null;
let nativeClearInterval=null;
let nativeSetTimeout=null;
let nativeClearTimeout=null;
const intervals=new Set();
const timeouts=new Set();
const observers=new Set();

const stackText=()=>String(new Error().stack||'');
const isNflStack=stack=>/\/sports\/nfl(?:\/|-)/i.test(String(stack||''));
const isPropToolStack=stack=>/player-prop-tool/i.test(String(stack||''));
const shouldManageTimer=stack=>isNflStack(stack)&&!isPropToolStack(stack);

function runTimer(token){
  if(!token||token.cancelled)return;
  try{token.fn.apply(window,token.args);}catch(error){queueMicrotask(()=>{throw error;});}
}
function armTimer(token){
  if(!token||token.cancelled||suspended||token.nativeId!=null)return;
  if(token.kind==='interval'){
    token.nativeId=nativeSetInterval.call(window,()=>runTimer(token),token.delay);
    return;
  }
  token.nativeId=nativeSetTimeout.call(window,()=>{
    token.nativeId=null;
    timeouts.delete(token);
    runTimer(token);
    token.cancelled=true;
  },token.delay);
}
function clearManagedTimer(token){
  if(!token?.[TOKEN])return false;
  token.cancelled=true;
  if(token.nativeId!=null){
    if(token.kind==='interval')nativeClearInterval.call(window,token.nativeId);
    else nativeClearTimeout.call(window,token.nativeId);
  }
  token.nativeId=null;
  intervals.delete(token);
  timeouts.delete(token);
  return true;
}
function createManagedTimer(kind,fn,delay,args){
  const token={
    [TOKEN]:true,kind,fn,delay:Number(delay)||0,args,nativeId:null,cancelled:false
  };
  (kind==='interval'?intervals:timeouts).add(token);
  armTimer(token);
  return token;
}

function targetIsNfl(target){
  if(typeof document==='undefined'||!target)return false;
  const root=document.getElementById('nflView');
  return !!(root&&(target===root||root.contains?.(target)));
}

class ManagedMutationObserverBase{
  // Populated at install time with a subclass of the browser's native observer.
}

function installMutationObserverWrapper(){
  if(!NativeMutationObserver)return;
  window.MutationObserver=class TsoNflManagedMutationObserver extends NativeMutationObserver{
    constructor(callback){
      const stack=stackText();
      let instance=null;
      super((records)=>{
        if(!instance)return;
        if(instance._tsoManaged&&suspended)return;
        callback(records,instance);
      });
      instance=this;
      this._tsoManaged=isNflStack(stack);
      this._tsoSuspended=false;
      this._tsoOwnerDisconnected=false;
      this._tsoObservations=new Map();
      if(this._tsoManaged)observers.add(this);
    }
    observe(target,options){
      if(targetIsNfl(target))this._tsoManaged=true;
      if(this._tsoManaged){
        this._tsoOwnerDisconnected=false;
        this._tsoObservations.set(target,{...options});
        observers.add(this);
        if(suspended){this._tsoSuspended=true;return;}
      }
      super.observe(target,options);
    }
    disconnect(){
      super.disconnect();
      if(this._tsoManaged){
        this._tsoObservations.clear();
        this._tsoOwnerDisconnected=true;
        this._tsoSuspended=false;
        observers.delete(this);
      }
    }
    _tsoSuspend(){
      if(!this._tsoManaged||this._tsoOwnerDisconnected||this._tsoSuspended)return;
      super.disconnect();
      this._tsoSuspended=true;
    }
    _tsoResume(){
      if(!this._tsoManaged||this._tsoOwnerDisconnected||!this._tsoSuspended)return;
      this._tsoSuspended=false;
      for(const [target,options] of this._tsoObservations){
        if(target?.isConnected!==false)super.observe(target,options);
      }
    }
  };
}

export function snapshotNflBackgroundFreezeV930(){
  return {
    installed,suspended,reason:suspendReason,
    managedIntervals:intervals.size,
    runningIntervals:[...intervals].filter(t=>t.nativeId!=null&&!t.cancelled).length,
    managedTimeouts:timeouts.size,
    runningTimeouts:[...timeouts].filter(t=>t.nativeId!=null&&!t.cancelled).length,
    managedObservers:observers.size,
    observingObservers:[...observers].filter(o=>!o._tsoSuspended&&!o._tsoOwnerDisconnected&&o._tsoObservations?.size).length
  };
}

export function suspendNflBackgroundFreezeV930(reason='nfl-player-prop-tool'){
  if(!installed)installNflBackgroundFreezeV930();
  suspended=true;
  suspendReason=reason;
  for(const token of intervals){
    if(token.nativeId!=null)nativeClearInterval.call(window,token.nativeId);
    token.nativeId=null;
  }
  for(const token of timeouts){
    if(token.nativeId!=null)nativeClearTimeout.call(window,token.nativeId);
    token.nativeId=null;
  }
  for(const observer of observers)observer._tsoSuspend?.();
  return snapshotNflBackgroundFreezeV930();
}

export function resumeNflBackgroundFreezeV930(){
  if(!installed)return snapshotNflBackgroundFreezeV930();
  suspended=false;
  suspendReason='';
  for(const token of intervals)armTimer(token);
  for(const token of timeouts)armTimer(token);
  for(const observer of observers)observer._tsoResume?.();
  return snapshotNflBackgroundFreezeV930();
}

export function installNflBackgroundFreezeV930(){
  if(typeof window==='undefined')return;
  if(installed)return;
  installed=true;
  nativeSetInterval=window.setInterval;
  nativeClearInterval=window.clearInterval;
  nativeSetTimeout=window.setTimeout;
  nativeClearTimeout=window.clearTimeout;
  NativeMutationObserver=window.MutationObserver;

  window.setInterval=function(fn,delay,...args){
    const stack=stackText();
    if(typeof fn==='function'&&shouldManageTimer(stack))return createManagedTimer('interval',fn,delay,args);
    return nativeSetInterval.call(window,fn,delay,...args);
  };
  window.clearInterval=function(id){
    if(clearManagedTimer(id))return;
    return nativeClearInterval.call(window,id);
  };
  window.setTimeout=function(fn,delay,...args){
    const stack=stackText();
    if(typeof fn==='function'&&shouldManageTimer(stack))return createManagedTimer('timeout',fn,delay,args);
    return nativeSetTimeout.call(window,fn,delay,...args);
  };
  window.clearTimeout=function(id){
    if(clearManagedTimer(id))return;
    return nativeClearTimeout.call(window,id);
  };
  installMutationObserverWrapper();

  window[DEBUG_KEY]={
    suspend:suspendNflBackgroundFreezeV930,
    resume:resumeNflBackgroundFreezeV930,
    snapshot:snapshotNflBackgroundFreezeV930
  };
}

export const __NFL_BACKGROUND_FREEZE_V930_TEST__={
  isNflStack,isPropToolStack,shouldManageTimer,snapshotNflBackgroundFreezeV930
};
