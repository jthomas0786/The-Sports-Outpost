/* Original TSO 3.0 NBA analytics. Historical data is never called a forecast. */
(()=>{
"use strict";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=x=>x===null||x===undefined||x===""||!Number.isFinite(Number(x))?null:Number(x);
const fm=(x,d=1)=>num(x)===null?"—":Number(x).toFixed(d);
const date=x=>{const d=new Date(x||"");return Number.isFinite(d.getTime())?d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—"};
const avg=arr=>{const a=arr.filter(x=>num(x)!==null);return a.length?a.reduce((s,x)=>s+Number(x),0)/a.length:null};
const tools=["pace-possessions","minutes-rotation","usage-touches","team-stats","injury-impact","game-projections"];
const names={"pace-possessions":"PACE & POSSESSIONS","minutes-rotation":"MINUTES & ROTATION","usage-touches":"PRODUCTION & USAGE CONTEXT","team-stats":"TEAM STATISTICS","injury-impact":"INJURIES & ROTATION CONTEXT","game-projections":"GAME RESEARCH"};
const descriptions={"pace-possessions":"Compare observed team pace with league baseline and the next verified opponent.","minutes-rotation":"Compare verified recent player minutes and current reported injury status.","usage-touches":"Observed production per 36 minutes. True touches and usage percentage are not in this dataset.","team-stats":"Position-group defensive allowances, historical game sample and team pace.","injury-impact":"ESPN injury status alongside past player minutes; no projected replacements.","game-projections":"Upcoming games and historical pace context; score and win probabilities require a validated model."};
const state={tool:null,search:"",team:"all",window:"l10",limit:120,ctx:null,rows:[]};
function logs(p){const seen=new Set();return (p?.recentGames||[]).filter(g=>g?.date&&num(g.minutes)!==null&&g.minutes>=3&&Number(g.seasonType)!==1).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).filter(g=>{const k=String(g.date).slice(0,10);if(seen.has(k))return false;seen.add(k);return true})}
function windowLogs(p,ctx){const all=logs(p);return state.window==="season"?all.filter(g=>Number(g.season)===Number(ctx.research?.currentSeason)):all.slice(0,state.window==="l5"?5:state.window==="l20"?20:10)}
const tid=(g,side)=>String(g?.[side]?.id||"");
const activeGames=ctx=>(ctx.games||[]).filter(g=>g.league==="nba"&&g.state!=="post");
const gameFor=(ctx,id)=>activeGames(ctx).find(g=>tid(g,"home")===String(id)||tid(g,"away")===String(id))||null;
const opponent=(g,id)=>!g?"—":String((tid(g,"home")===String(id)?g.away:g.home)?.abbr||"—");
const time=g=>!g?"—":window.TSO3?.matchupTime?.(g.startTime)||date(g.startTime);
const injuries=ctx=>Array.isArray(ctx.injuries?.entries)?ctx.injuries.entries:[];
function injuryFor(ctx,p){return injuries(ctx).find(x=>String(x.athleteId)===String(p.id)&&String(x.teamId)===String(p.teamId))||null}
function latestGame(ctx){const dates=Object.values(ctx.research?.players||{}).map(p=>Date.parse(p.recentGames?.[0]?.date||"")).filter(Number.isFinite);return dates.length?date(Math.max(...dates)):"Not available"}
const safeTeam=(ctx,id)=>ctx.research?.teams?.[String(id)]||{};
function build(ctx,tool){
 const r=ctx.research||{};
 if(tool==="pace-possessions"||tool==="team-stats")return Object.entries(r.teams||{}).map(([id,t])=>{
  const p=r.teamProfiles?.[id]||{},d=r.teamDefense?.[id]?.byPosition||{},g=gameFor(ctx,id);
  return {id,name:t.name||id,abbr:t.abbr||"",teamId:id,pace:num(p.pace),games:num(p.games),leaguePace:num(r.league?.pace),opponent:opponent(g,id),game:g,
   guard:num(d.G?.points),forward:num(d.F?.points),center:num(d.C?.points),guardAst:num(d.G?.assists)};
 });
 if(tool==="minutes-rotation"||tool==="usage-touches")return Object.values(r.players||{}).filter(p=>p?.name).map(p=>{
  const l=windowLogs(p,ctx),all=logs(p),g=gameFor(ctx,p.teamId),mins=avg(l.map(x=>x.minutes));
  const pts=avg(l.map(x=>x.stats?.points)),reb=avg(l.map(x=>x.stats?.rebounds)),ast=avg(l.map(x=>x.stats?.assists));
  const per36=x=>mins!==null&&mins>0&&x!==null?x*36/mins:null;
  return {id:p.id,name:p.name,teamId:String(p.teamId),team:p.team||"",position:p.position||"",minutes:mins,
   l5:avg(all.slice(0,5).map(x=>x.minutes)),l10:avg(all.slice(0,10).map(x=>x.minutes)),
   pts,reb,ast,pts36:per36(pts),reb36:per36(reb),ast36:per36(ast),games:l.length,log:all,injury:injuryFor(ctx,p),opponent:opponent(g,p.teamId),game:g};
 });
 if(tool==="injury-impact")return injuries(ctx).map(i=>{
  const p=r.players?.[String(i.athleteId)]||Object.values(r.players||{}).find(p=>p.name===i.player&&String(p.teamId)===String(i.teamId));
  const l=logs(p),g=gameFor(ctx,i.teamId);
  return {id:i.athleteId,name:i.player,team:i.team||"",teamId:i.teamId,injury:i,
   minutes:avg(l.slice(0,10).map(x=>x.minutes)),games:l.length,opponent:opponent(g,i.teamId),game:g,log:l};
 });
 if(tool==="game-projections")return activeGames(ctx).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime)).map(g=>{
  const h=r.teamProfiles?.[tid(g,"home")],a=r.teamProfiles?.[tid(g,"away")];
  return {id:g.id,name:(g.away?.abbr||"—")+" @ "+(g.home?.abbr||"—"),teamId:tid(g,"home"),game:g,
   homePace:num(h?.pace),awayPace:num(a?.pace),pace:avg([h?.pace,a?.pace]),games:Math.min(num(h?.games)||0,num(a?.games)||0)};
 });
 return [];
}
function sorted(){
 const q=state.search.toLowerCase();
 const all=state.rows.filter(r=>(state.team==="all"||r.teamId===state.team||(r.game&&(tid(r.game,"away")===state.team||tid(r.game,"home")===state.team)))
 &&(!q||[r.name,r.team,r.abbr,r.opponent,r.injury?.status].join(" ").toLowerCase().includes(q)));
 const score=(r)=>{
  if(state.tool==="pace-possessions")return r.pace;
  if(state.tool==="team-stats")return r.guard;
  if(state.tool==="minutes-rotation")return r.l5;
  if(state.tool==="usage-touches")return r.pts36;
  if(state.tool==="injury-impact")return r.minutes;
  return 0;
 };
 if(state.tool==="game-projections")return all;
 return all.sort((a,b)=>score(a)===null?1:score(b)===null?-1:score(b)-score(a)||a.name.localeCompare(b.name));
}
const cell=(v,caption="")=>"<td><b>"+fm(v)+"</b>"+(caption?"<small>"+esc(caption)+"</small>":"")+"</td>";
const txt=v=>"<td>"+esc(v)+"</td>";
const player=r=>"<td><b>"+esc(r.name)+"</b><small>"+esc(r.team||r.abbr||"")+" "+esc(r.position||"")+"</small></td>";
const cols={
 "pace-possessions":["TEAM","PACE","VS LEAGUE","HISTORY GAMES","NEXT OPPONENT"],
 "minutes-rotation":["PLAYER","L5 MIN","L10 MIN","SAMPLE MIN","GAMES","NEXT GAME","INJURY STATUS"],
 "usage-touches":["PLAYER","SAMPLE MIN","PTS/G","REB/G","AST/G","PTS/36","REB/36","AST/36"],
 "team-stats":["TEAM","PACE","G PTS ALLOWED","F PTS ALLOWED","C PTS ALLOWED","G AST ALLOWED","OBS GAMES"],
 "injury-impact":["PLAYER","STATUS","INJURY TYPE","HIST L10 MIN","NEXT GAME","REPORT DATE"],
 "game-projections":["NEXT GAME","TIPOFF","AWAY HIST PACE","HOME HIST PACE","AVG HIST PACE","MODEL PROJECTION"]
};
function tableRow(r){
 const label="<tr data-depth-row='"+esc(r.id)+"'>";
 const close="</tr>";
 if(state.tool==="pace-possessions")return label+player(r)+cell(r.pace)+cell(r.pace!==null&&r.leaguePace!==null?r.pace-r.leaguePace:null,"vs league pace")+cell(r.games)+txt(r.opponent+" · "+time(r.game))+close;
 if(state.tool==="team-stats")return label+player(r)+cell(r.pace)+cell(r.guard)+cell(r.forward)+cell(r.center)+cell(r.guardAst)+cell(r.games)+close;
 if(state.tool==="minutes-rotation")return label+player(r)+cell(r.l5)+cell(r.l10)+cell(r.minutes)+cell(r.games)+txt(r.opponent+" · "+time(r.game))+txt(r.injury?.status||"Not reported")+close;
 if(state.tool==="usage-touches")return label+player(r)+cell(r.minutes)+cell(r.pts)+cell(r.reb)+cell(r.ast)+cell(r.pts36)+cell(r.reb36)+cell(r.ast36)+close;
 if(state.tool==="injury-impact")return label+player(r)+txt(r.injury?.status||"Unknown")+txt(r.injury?.detail||"—")+cell(r.minutes)+txt(r.opponent+" · "+time(r.game))+txt(date(r.injury?.updatedAt))+close;
 if(state.tool==="game-projections")return label+player(r)+txt(time(r.game))+cell(r.awayPace)+cell(r.homePace)+cell(r.pace)+txt("No validated prediction")+close;
 return "";
}
function render(ctx,tool){
 if(!tools.includes(tool))return "";
 state.ctx=ctx;if(state.tool!==tool){state.tool=tool;state.search="";state.team="all";state.limit=120;}
 state.rows=build(ctx,tool);
 const list=sorted(),teams=Object.entries(ctx.research?.teams||{});
 const teamOptions=teams.map(([id,t])=>"<option value='"+esc(id)+"' "+(state.team===id?"selected":"")+">"+esc(t.abbr||id)+" · "+esc(t.name||"")+"</option>").join("");
 const windows=tool==="minutes-rotation"||tool==="usage-touches";
 const fields="<div class='nba-depth-filters'><label>TEAM<select data-depth-team><option value='all'>All Teams</option>"+teamOptions+"</select></label>"
  +(windows?"<label>HISTORY WINDOW<select data-depth-window>"+[["l5","Last 5"],["l10","Last 10"],["l20","Last 20"],["season","Current Season"]].map(([id,x])=>"<option value='"+id+"' "+(state.window===id?"selected":"")+">"+x+"</option>").join("")+"</select></label>":"")
  +"<label>FIND<input type='search' data-depth-search value='"+esc(state.search)+"' placeholder='Search players and teams'></label></div>";
 const source="<div class='nba-depth-source'>RESEARCH SOURCE "+esc(date(ctx.research?.generatedAt))+" · LAST OBSERVED GAME "+esc(latestGame(ctx))+" · "+(ctx.injuries?.fetchedAt?"INJURIES UPDATED "+esc(date(ctx.injuries.fetchedAt)):"INJURY FEED UNAVAILABLE")+"</div>";
 const warning=tool==="usage-touches"?"True touches and true usage percentage are unavailable. Per-36 production is a verified descriptive rate, not a usage statistic."
  :tool==="game-projections"?"Predicted score, spread, totals and win probability require a validated TSO model. Historical pace is not a game prediction."
  :tool==="injury-impact"?"Reports reflect ESPN status at the stated time. Historical minutes do not prove a player will participate or identify a replacement."
  :"Historical performance is shown using the last completed game dates, which may belong to a prior season.";
 const selected=list.slice(0,state.limit),header=cols[tool];
 const table="<div class='nba-table-scroll'><table class='nba-table nba-depth-table'><thead><tr>"+header.map(x=>"<th>"+esc(x)+"</th>").join("")+"</tr></thead><tbody>"
  +(selected.length?selected.map(tableRow).join(""):"<tr><td colspan='"+header.length+"'>No verified records available for these filters.</td></tr>")+"</tbody></table></div>"
  +"<div class='nba-table-foot'><span>Showing "+selected.length+" of "+list.length+" verified records</span>"+(selected.length<list.length?"<button data-depth-more>SHOW MORE →</button>":"")+"</div>";
 return "<section class='nba-lab nba-depth'><div class='nba-intro'><div><span class='nba-eyebrow'>THE SPORTS OUTPOST / NBA RESEARCH</span><h2>"+esc(names[tool])+"</h2><p>"+esc(descriptions[tool])+"</p></div></div>"
  +source+"<div class='nba-depth-note'>"+esc(warning)+"</div>"+fields+table
  +"<p class='nba-footnote'>ESPN-derived NBA game histories and team statistics; current schedule and live ESPN injury status where available. No invented model outputs.</p></section>";
}
function repaint(){const node=document.getElementById("nbaDepthSlot");if(node&&state.ctx)node.innerHTML=render(state.ctx,state.tool)}
function choose(evt){
 const p=evt.target.closest("[data-depth-team]"),w=evt.target.closest("[data-depth-window]");
 if(p){state.team=p.value;repaint();return true}
 if(w){state.window=w.value;repaint();return true}
 return false;
}
function input(evt){if(!evt.target.matches?.("[data-depth-search]"))return false;const caret=evt.target.selectionStart;state.search=evt.target.value;repaint();const next=document.querySelector("[data-depth-search]");if(next){next.focus();try{next.setSelectionRange(caret,caret)}catch(_){}}return true}
function click(evt){
 if(evt.target.closest("[data-depth-more]")){state.limit+=100;repaint();return true}
 const el=evt.target.closest("[data-depth-row]");if(!el)return false;
 const row=state.rows.find(r=>String(r.id)===String(el.dataset.depthRow));if(!row)return true;
 const entries=Array.isArray(row.log)?row.log.slice(0,20):[];
 const report=row.injury?.report?"<div class='nba-depth-note'>"+esc(row.injury.report)+"</div>":"";
 const history=entries.length?"<div class='nba-log-scroll'><table class='nba-log'><thead><tr><th>DATE</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead><tbody>"+entries.map(g=>"<tr><td>"+esc(date(g.date))+"</td>"+cell(g.minutes)+cell(g.stats?.points)+cell(g.stats?.rebounds)+cell(g.stats?.assists)+"</tr>").join("")+"</tbody></table></div>":"";
 document.getElementById("drawerBody").innerHTML="<div class='drawer-contents'><span class='eyebrow'>VERIFIED NBA SOURCE RECORD</span><h2>"+esc(row.name)+"</h2><p class='subtitle'>"+esc(names[state.tool])+"</p>"+report+history+"<p class='nba-footnote'>Observed historical records, not projections. Availability requires the current official injury and lineup report.</p></div>";
 document.getElementById("drawer").hidden=false;document.getElementById("scrim").hidden=false;document.getElementById("closeDrawer")?.focus();return true
}
window.TSO3NbaDepth={render,click,choose,input,tools,state};
})();