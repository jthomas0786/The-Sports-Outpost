import { normName, normTeam } from './sim/utils.js';
import { buildTsoPropView } from './sim/prop-probabilities-v8917.js';
const n=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
export function propWatchModel({sim,gameId,live,player,metric,current,line,price,oppositePrice,now}){
 const game=sim?.games?.find(g=>String(g.game?.gameId)===String(gameId));
 if(!game)return null;
 const at=Date.parse(game.generatedAt||''),model=game.liveModel;
 // Do not attach a pregame or previous-quarter distribution to a live alert.
 if(!Number.isFinite(at)||now-at>360000||at>now+60000||!model?.active||model.period!==live.period)return null;
 if(game.game?.currentScore?.away!==live.awayScore||game.game?.currentScore?.home!==live.homeScore)return null;
 if(n(model.clockMin)==null||n(live.clockMin)==null||model.clockMin<live.clockMin||model.clockMin-live.clockMin>4.1)return null;
 if(['away','home'].some(side=>normTeam(game.game?.[side]?.abbr)!==normTeam(live[`${side}Abbr`])))return null;
 const p=game.players?.find(p=>normTeam(p.team)===normTeam(player.team)&&((p.espnId&&player.espnId&&String(p.espnId)===String(player.espnId))||normName(p.name)===normName(player.name)));
 if(!p||n(p.current?.[metric])!==current)return null;
 if(model.possession!==live.possession)return null;
 if(live.period===2&&live.clockMin===0&&model.clockMin!==0)return null;
 const row=Object.values(live.playerStats?.byId||{}).find(r=>normTeam(r.team)===normTeam(player.team)&&normName(r.name)===normName(player.name));
 for(const key of ['targets','receptions','recYds','carries','rushYds','passYds']){
  if(n(row?.flat?.[key])!=null&&n(p.current?.[key])!==n(row.flat[key]))return null;
 }
 return buildTsoPropView({playerSim:p,market:metric,line,side:'over',price,oppositePrice,iterations:game.iterations});
}
export function remainingGameText(live){
 const period=n(live.period),clock=n(live.clockMin);
 if(period==null||clock==null)return 'Game clock unavailable';
 if(period>4)return 'Overtime';
 const seconds=Math.max(0,Math.round(((4-period)*15+clock)*60));
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} left in regulation`;
}
