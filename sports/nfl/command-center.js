import { propWatchModel, remainingGameText } from './prop-watch.js?v=89.21';
import { normName, normTeam } from './sim/utils.js';

const number=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const unavailable=p=>p?.active===false||/out|inactive|injured reserve|doubtful|suspend/i.test(String(p?.injury?.status||p?.rosterStatus||p?.availability||''));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metrics={passYds:'passing yards',rushYds:'rushing yards',recYds:'receiving yards',receptions:'receptions'};
function stamp(v){const n=number(v);return n!=null?(n<1e12?n*1000:n):Date.parse(v||'');}
function freshOffer(offer,doc,now){
  if(!offer||!number(offer.price))return false;
  const ts=stamp(offer.ts),fetch=stamp(doc?.meta?.fetchedAt),age=number(offer.ageSeconds);
  const ages=[];
  if(Number.isFinite(ts))ages.push((now-ts)/1000);
  if(age!=null&&Number.isFinite(fetch))ages.push(age+Math.max(0,(now-fetch)/1000));
  return ages.length>0&&ages.every(a=>a>=0&&a<=600);
}
function rowsFor(live){
  const rows=new Map();
  for(const [key,p] of [...Object.entries(live.playerStats?.byId||{}),...Object.entries(live.playerStats?.byName||{})]){
    const name=normName(p?.name),team=normTeam(p?.team||key.split('|')[0]);
    if(name)rows.set(`${team}|${name}`,p);
  }
  return rows;
}
// Count scoring events, not player TD credits (a passing TD has two credits).
function slateTouchdowns(doc){
  if(!doc?.games)return null;
  let total=0;
  for(const game of Object.values(doc.games)){
    if(!['in','live','post','final'].includes(String(game.status).toLowerCase()))continue;
    if(!Array.isArray(game.scoringPlays))return null;
    const seen=new Set();
    for(const play of game.scoringPlays){
      if(!/\btouchdown\b/i.test(play.type||''))continue;
      const key=play.id||JSON.stringify([play.period,play.clock,play.team,play.homeScore,play.awayScore,play.text]);
      if(!seen.has(key)){seen.add(key);total++;}
    }
  }
  return total;
}
export function buildNflCommandCenter({liveDoc=null,research=null,odds=null,sim=null,now=Date.now()}={}){
  const alerts=[],games=[];
  let stale=false;
  for(const [gameId,live] of Object.entries(liveDoc?.games||{})){
    if(!['in','live'].includes(String(live.status).toLowerCase()))continue;
    const fetched=stamp(live.lastFetchedAt??liveDoc.lastFetchedAt);
    if(!Number.isFinite(fetched)||now-fetched>120000||fetched>now+60000){stale=true;continue;}
    const away=normTeam(live.awayAbbr),home=normTeam(live.homeAbbr);
    const period=number(live.period),clock=number(live.clockMin);
    const atHalf=/half\s*time/i.test(live.statusDetail||'')||(period===2&&clock===0);
    const clockText=clock==null?'':`${Math.floor(clock)}:${String(Math.round((clock%1)*60)).padStart(2,'0')}`;
    const state=atHalf?'Halftime':`${period>4?'OT':`Q${period||'?'}`} ${clockText}`.trim();
    const score=live.awayScore!=null&&live.homeScore!=null?`${live.awayScore}–${live.homeScore}`:'';
    games.push({gameId,matchup:`${away} @ ${home}`,state,score});
    const rows=rowsFor(live);
    const roster=(research?.players||[]).filter(p=>String(p.gameId)===gameId || (!p.gameId&&[away,home].includes(normTeam(p.team))));
    const own=live.possession==='home'?home:live.possession==='away'?away:null;
    const yard=number(live.yardFromOwn);
    const active=p=>!unavailable(p)&&!unavailable(rows.get(`${normTeam(p.team)}|${normName(p.name)}`));
    const add=(p,type,detail,priority,discriminator='')=>alerts.push({key:`nfl:${gameId}:${p?.espnId||normName(p?.name)||own}:${type}:${discriminator}`,gameId,name:p?.name||own||'Offense',team:normTeam(p?.team||own),type,detail,priority,state,matchup:`${away} @ ${home}`});
    const driveFinished=/touchdown|field goal|punt|interception|fumble|end of|end game|downs/i.test(live.currentDrive?.result||'');
    if(!atHalf&&!driveFinished&&own&&yard!=null&&yard>=80&&yard<100){
      const drive=live.currentDrive?.id||`${period}:${own}:${live.awayScore}-${live.homeScore}`;
      const threats=roster.filter(p=>active(p)&&['RB','HB','FB','WR','TE'].includes(p.position)).filter(p=>normTeam(p.team)===own).sort((a,b)=>(number(b.model?.atdProbability)||0)-(number(a.model?.atdProbability)||0)).slice(0,3);
      const context=`${own} at opponent ${100-yard} · ${live.downDistanceText||([live.down,live.distance].every(v=>number(v)!=null)?`Down ${live.down}, ${live.distance} to go`:'Red zone')}`;
      if(threats.length)for(const p of threats)add(p,'Touchdown watch',context,3,drive);
      else add(null,'Red-zone opportunity',context,3,drive);
    }
    const oddsGame=(odds?.games||[]).find(g=>String(g.gameId||'')===gameId||(!g.gameId&&normTeam(g.away)===away&&normTeam(g.home)===home));
    const elapsed=period!=null&&clock!=null&&period<=4?((period-1)*15+15-clock)/60:0;
    for(const p of roster.filter(active)){
      const row=rows.get(`${normTeam(p.team)}|${normName(p.name)}`),flat=row?.flat;
      if(!flat)continue;
      const op=oddsGame?.players?.find(x=>normTeam(x.team)===normTeam(p.team)&&normName(x.name)===normName(p.name));
      for(const [metric,label] of Object.entries(metrics)){
        const current=number(flat[metric]),slot=op?.odds?.[metric],line=number(slot?.line);
        if(current==null||line==null||line<=0||current>=line||current/line<.8)continue;
        if(!freshOffer(slot?.over?.best,odds,now))continue;
        const needed=Math.floor(line-current)+1;
        const view=propWatchModel({sim,gameId,live,player:p,metric,current,line,price:slot.over.best.price,oppositePrice:freshOffer(slot?.under?.best,odds,now)?slot.under.best.price:null,now});
        add(p,'Prop watch',`${current} ${label} · Over ${line} · ${needed} more to go over`,2,`${metric}:${line}`);
        Object.assign(alerts.at(-1),{remaining:remainingGameText(live),model:view});
      }
      if(elapsed>=.25&&elapsed<.95){
        for(const key of ['targets','carries']){
          const count=number(flat[key]);
          const prior=number(p.currentSeason?.perGame?.[key]??p.last5?.avg?.[key]??p.previousSeason?.perGame?.[key]);
          if(count==null||prior==null||prior<=0||count<(key==='targets'?5:8)||count/elapsed<prior*1.5)continue;
          add(p,'Usage surge',`${count} ${key} so far · ahead of usual full-game pace (${prior} per game)`,1,key);
        }
      }
    }
  }
  return {loaded:!!liveDoc,stale,games,touchdowns:slateTouchdowns(liveDoc),alerts:alerts.sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key))};
}
export function renderNflCommandCenter(model){
  const {alerts=[],games=[]}=model||{};
  const rows=alerts.map(a=>`<button type="button" class="cc-alert-row cc-nfl-alert" data-cc-nfl-game="${safe(a.gameId)}" style="width:100%;text-align:left;color:inherit;background:transparent;border:0;border-bottom:1px solid var(--line);cursor:pointer"><span class="cc-alert-avatar" style="display:grid;place-items:center;background:var(--panel2);font:700 10px monospace">${safe(a.team)}</span><span class="cc-alert-text">${safe(a.name)}<small>${safe(a.type)} · ${safe(a.detail)}</small><small>${safe(a.matchup)} · ${safe(a.state)}</small>${a.type==='Prop watch'?`<small>${safe(a.remaining)}</small><span class="cc-prop-context">${a.model?`<span>TSO Over <b>${(a.model.tsoProbability*100).toFixed(1)}%</b></span><span>Edge <b>${a.model.edgePoints>=0?'+':''}${a.model.edgePoints.toFixed(1)} pp</b> vs ${a.model.edgeBasis==='fair-market'?'fair odds':'implied odds'}</span><span>Mean ${a.model.mean??'—'} · Median ${a.model.median??'—'}</span><span>${a.model.iterations?.toLocaleString()} sims · ${a.model.probabilityMethod==='exact-line'?'Matched line':'Estimated at new line'}</span>`:'<span>Near the line · waiting for an updated projection</span>'}</span>`:''}</span><span class="cc-alert-time">WATCH →</span></button>`).join('');
  const note=!model?.loaded?'Loading NFL live action…':model.stale?'Waiting for fresh game action. Older alerts are hidden.':games.length?'No active threats right now. Alerts appear as scoring opportunities and player usage develop.':'No live NFL games right now. Threat alerts appear during games.';
  return `<div class="cc-col-title">Football</div><div class="cc-kpi-row"><div class="cc-kpi-tile"><b>${games.length}</b><span>Live Now</span></div><div class="cc-kpi-tile" title="Touchdowns reported across the current NFL slate, including completed games"><b>${model?.touchdowns==null?'—':safe(model.touchdowns)}</b><span>Touchdowns</span></div><div class="cc-kpi-tile"><b>${alerts.filter(a=>a.type==='Touchdown watch'||a.type==='Red-zone opportunity').length}</b><span>Red-zone Watches</span></div><div class="cc-kpi-tile"><b>${alerts.filter(a=>a.type==='Prop watch').length}</b><span>Prop Watches</span></div></div><div class="cc-section"><div class="cc-section-label">Threat Alerts <span>${alerts.length||''}</span></div>${rows||`<div class="cc-empty-note">${note}</div>`}</div><div class="cc-section"><div class="cc-section-label">Live Games</div>${games.map(g=>`<button type="button" data-cc-nfl-game="${safe(g.gameId)}" class="cc-game-row" style="width:100%;background:transparent;color:inherit;border:0;cursor:pointer"><span class="teams">${safe(g.matchup)}</span><span class="state">${safe(g.score)} · ${safe(g.state)}</span></button>`).join('')||`<div class="cc-empty-note">${note}</div>`}</div>`;
}
