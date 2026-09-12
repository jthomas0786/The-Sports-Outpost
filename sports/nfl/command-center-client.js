import { buildNflCommandCenter, renderNflCommandCenter } from './command-center.js?v=89.21';

let inputs={},busy=false,lastResearch=0;
const liveUrl=()=>window.DW_NFL_LIVE_ENDPOINT||window.TSO_NFL_LIVE_URL||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';
async function get(url){
  try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});return r.ok?await r.json():null;}catch{return null;}
}
const model=()=>buildNflCommandCenter(inputs);
function render(){
  const host=document.getElementById('ccFootballCol');
  if(host?.classList.contains('active')){
    const body=host.closest('.cc-body'),scroll=body?.scrollTop||0;
    const html=renderNflCommandCenter(model());
    if(host.innerHTML!==html)host.innerHTML=html;
    if(body)body.scrollTop=scroll;
  }
  window.refreshCommandCenterAlertState?.();
}
async function refresh(){
  if(busy||document.hidden)return;
  busy=true;
  try{
    const [remote,odds,research,sim]=await Promise.all([
      get(liveUrl()),get('./slates/nfl-live-odds.json'),
      Date.now()-lastResearch>300000?get('./slates/nfl-research.json'):Promise.resolve(null),
      get('./slates/nfl-sim.json'),
    ]);
    const live=remote?.games?remote:await get('./slates/nfl-live.json');
    if(live?.games)inputs.liveDoc=live;
    if(odds)inputs.odds=odds;
    if(sim)inputs.sim=sim;
    if(research){inputs.research=research;lastResearch=Date.now();}
    render();
  }finally{busy=false;}
}
window.DW_NFL_COMMAND_CENTER={html:()=>renderNflCommandCenter(model()),alerts:()=>model().alerts,refresh};
window.addEventListener('tso:nfl-live-snapshot',({detail:s})=>{
  if(!s?.gameId||!s.status)return;
  const live={...s.liveScore,status:s.status,statusDetail:s.statusDetail,awayAbbr:s.away?.abbr,homeAbbr:s.home?.abbr,awayScore:s.away?.score,homeScore:s.home?.score};
  inputs.liveDoc={...(inputs.liveDoc||{}),games:{...(inputs.liveDoc?.games||{}),[s.gameId]:live}};
  render();
});
document.getElementById('ccFootballCol')?.addEventListener('click',event=>{
  const button=event.target.closest('[data-cc-nfl-game]');if(!button)return;
  window.DW_nflCommandCenterGame=button.dataset.ccNflGame;
  window.closeCommandCenter?.();window.DW_openNflPreviewTab?.('live');
});
refresh();setInterval(refresh,30000);
