import {installNhlPlayerModalV913} from './player-modal-v913.js?v=90.13';

let installed=false,observer=null,queued=false;

function ensureStyle(){
 if(typeof document==='undefined'||document.getElementById('nhl-player-modal-v917'))return;
 const l=document.createElement('link');
 l.id='nhl-player-modal-v917';
 l.rel='stylesheet';
 l.href='./sports/nhl/player-modal-v917.css?v=90.17';
 document.head.appendChild(l);
}
function density(n){return n>15?'dense':n>5?'medium':'light';}
function isolateRecentChart(chart){
 if(!chart||chart.classList.contains('tso-nhl-rg-chart'))return;
 const cols=[...chart.querySelectorAll(':scope > .b')];
 if(!cols.length)return;
 const gap=String(chart.style.gap||'6px').trim()||'6px';
 chart.className='tso-nhl-rg-chart';
 chart.removeAttribute('style');
 chart.style.setProperty('--tso-rg-count',String(cols.length));
 chart.style.setProperty('--tso-rg-gap',gap);
 chart.dataset.count=String(cols.length);
 chart.dataset.density=density(cols.length);
 for(const col of cols){
  const wasBig=col.classList.contains('td2');
  const wasHit=wasBig||col.classList.contains('on');
  col.className=`tso-nhl-rg-col${wasBig?' is-big-hit':wasHit?' is-hit':''}`;
  const plot=col.querySelector(':scope > .plot');
  const labels=col.querySelector(':scope > .xbottom');
  if(plot){
   const bar=plot.querySelector(':scope > .tso-nhl-game-bar, :scope > .bar');
   plot.className='tso-nhl-rg-plot';
   for(const marker of plot.querySelectorAll('.tso-nhl-line-marker'))marker.remove();
   if(bar){
    const h=bar.style.getPropertyValue('--nhl-bar-h')||bar.style.height||'5%';
    const value=bar.querySelector(':scope > .v');
    bar.className='tso-nhl-rg-bar';
    bar.removeAttribute('style');
    bar.style.setProperty('--tso-rg-height',h);
    if(value)value.className='tso-nhl-rg-value';
   }
  }
  if(labels){
   labels.className='tso-nhl-rg-labels';
   labels.querySelector(':scope > .xd')?.classList.replace('xd','tso-nhl-rg-date');
   labels.querySelector(':scope > .xo')?.classList.replace('xo','tso-nhl-rg-opp');
  }
 }
}
function scan(){
 queued=false;
 document.querySelectorAll('.tso-nhl-history-bars').forEach(isolateRecentChart);
}
function queueScan(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(scan);
}
export function installNhlPlayerModalV917(host=document.getElementById('nhlView')){
 ensureStyle();
 installNhlPlayerModalV913(host);
 if(installed)return;
 installed=true;
 observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1)))queueScan();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',e=>{if(e.target?.id==='tsoNhlPropSelect')setTimeout(queueScan,0);});
 document.addEventListener('click',e=>{if(e.target?.closest?.('[data-nhl-chart-range],[data-nhl-chart-venue]'))setTimeout(queueScan,0);},true);
 queueScan();
}

export const __NHL_PLAYER_MODAL_V917_TEST__={isolateRecentChart,density};
