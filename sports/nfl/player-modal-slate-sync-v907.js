const TEAM_ALIASES={LAR:'LA',JAC:'JAX',WAS:'WSH',OAK:'LV',SD:'LAC',STL:'LA'};
const normTeam=v=>TEAM_ALIASES[String(v||'').toUpperCase()]||String(v||'').toUpperCase();
const normName=v=>String(v||'').toLowerCase().replace(/\./g,'').replace(/['’]/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let observer=null,checking=false,lastCheck=0;

function modalIdentity(modal){
  const name=(modal.querySelector('.ms-modal-name h2, header h2, h2')?.textContent||'').trim();
  const text=(modal.querySelector('header')?.textContent||modal.textContent||'');
  const teams=['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LA','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WSH'];
  const team=teams.find(t=>new RegExp(`\\b${t}\\b`).test(text))||'';
  return {name,team:normTeam(team)};
}
function currentModalOpponent(modal){
  const text=(modal.querySelector('header')?.textContent||modal.textContent||'');
  const m=text.match(/\bvs\s+([A-Z]{2,3})\b/);
  return normTeam(m?.[1]||modal.dataset.currentOpponent||'');
}
function findSlatePlayer(slate,name,team){
  const nn=normName(name),nt=normTeam(team);
  for(const game of slate?.games||[]){
    const player=(game.players||[]).find(p=>normName(p.name)===nn&&(!nt||normTeam(p.team)===nt));
    if(player) return {game,player};
  }
  return null;
}
function deriveOpponent(game,player){
  const team=normTeam(player?.team),away=normTeam(game?.away?.abbr),home=normTeam(game?.home?.abbr);
  if(team&&team===away)return home;
  if(team&&team===home)return away;
  return normTeam(player?.opponent);
}
function findResearchPlayer(research,name,team){
  const nn=normName(name),nt=normTeam(team);
  return (research?.players||[]).find(p=>normName(p.name)===nn&&(!nt||normTeam(p.team)===nt))||null;
}
async function getJson(url){
  const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`${url} ${r.status}`);
  return r.json();
}
function patchOpponentLabels(modal,oldOpp,newOpp){
  if(!oldOpp||!newOpp||oldOpp===newOpp)return;
  const walker=document.createTreeWalker(modal,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  const re=new RegExp(`\\b${oldOpp}\\b`,'g');
  for(const node of nodes){if(re.test(node.nodeValue||'')){re.lastIndex=0;node.nodeValue=node.nodeValue.replace(re,newOpp);}}
  modal.dataset.currentOpponent=newOpp;
}
async function verifyModal(){
  const modal=document.querySelector('#nflView .ms-modal');
  if(!modal||checking)return;
  const now=Date.now();if(now-lastCheck<800)return;lastCheck=now;checking=true;
  try{
    const id=modalIdentity(modal);if(!id.name)return;
    const [slate,research]=await Promise.all([getJson('./slates/nfl.json'),getJson('./slates/nfl-research.json')]);
    const hit=findSlatePlayer(slate,id.name,id.team);if(!hit)return;
    const expected=deriveOpponent(hit.game,hit.player);if(!expected)return;
    const researchPlayer=findResearchPlayer(research,id.name,id.team);
    const researchOpp=normTeam(researchPlayer?.matchup?.opponent);
    const shown=currentModalOpponent(modal);
    const pageWeek=Number(window.DW_NFL_PREVIEW_SUMMARY?.week||0);
    const freshWeek=Number(slate?.week||0);
    const slateId=String(slate?.slateId||`${slate?.season||''}-${freshWeek}`);
    const needsReload=(pageWeek&&freshWeek&&pageWeek!==freshWeek)||(shown&&shown!==expected&&researchOpp===expected);
    if(needsReload){
      const key=`tso:nfl:modal-sync:${slateId}`;
      if(sessionStorage.getItem(key)!=='1'){
        sessionStorage.setItem(key,'1');
        location.reload();
        return;
      }
    }
    // Defensive visible correction if a stale modal survived a refresh. This only
    // changes opponent labels; synchronized weekly publishing supplies the matching
    // defensive metrics from nfl-research.json on the next normal render.
    if(shown&&shown!==expected)patchOpponentLabels(modal,shown,expected);
    modal.dataset.currentSlateId=slateId;
    modal.dataset.currentGameId=String(hit.game?.gameId||hit.game?.id||'');
  }catch(err){console.warn('[NFL modal slate sync v90.7]',err);}
  finally{checking=false;}
}
export function installNflPlayerModalSlateSyncV907(){
  if(observer)return;
  observer=new MutationObserver(()=>{if(document.querySelector('#nflView .ms-modal'))verifyModal();});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.querySelector('#nflView .ms-modal'))verifyModal();});
}
