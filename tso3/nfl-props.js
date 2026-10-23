/* NFL exact-line prop and injury research (TSO 3.0). */
(()=>{
'use strict';
const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const label={atd:'Anytime TD',firstTd:'First TD',passYds:'Passing Yards',rushYds:'Rushing Yards',recYds:'Receiving Yards',
 receptions:'Receptions',targets:'Targets',carries:'Rush Attempts',passTds:'Passing TDs',passAttempts:'Pass Attempts',completions:'Completions'};
const fields={passYds:'passYds',rushYds:'rushYds',recYds:'recYds',receptions:'receptions',targets:'targets',
 carries:'carries',passTds:'passTds',passAttempts:'attempts',completions:'completions'};
const state={view:'props',games:[],markets:[],positions:[],search:'',window:'l5',open:{games:false,markets:false,positions:false},rows:[],shown:[],max:90,ctx:null,signature:''};
const fmt=v=>n(v)===null?'—':Number(v).toFixed(1);
const price=v=>n(v)===null?'—':(Number(v)>0?'+':'')+Number(v);
const when=v=>{const d=new Date(v||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'—'};
const asof=v=>{const d=new Date(v||'');return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT':'unavailable'};
const team=t=>({LAR:'LA',WSH:'WAS',JAX:'JAC'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
const metrics=(r,market)=>market==='atd'?(n(r.rushTds)||0)+(n(r.recTds)||0):market==='firstTd'?null:n(r[fields[market]]);
function actual(logs,key,line,count){
 const values=(logs||[]).slice(0,count).map(g=>metrics(g,key)).filter(x=>x!==null);
 if(!values.length)return null;
 return {n:values.length,over:values.filter(x=>x>line).length,avg:values.reduce((a,b)=>a+b,0)/values.length};
}
function build(ctx,view){
 const games=(ctx.games||[]).filter(g=>g.league==='nfl'&&g.state!=='post'&&Date.parse(g.startTime)>Date.now()-15*60000);
 const athletes=ctx.research?.players||[],playerMap=new Map(athletes.map(p=>[norm(p.name)+'|'+team(p.team),p]));
 if(view==='injuries'){
  const verified=Array.isArray(ctx.injuries?.entries)?ctx.injuries.entries:[];
  return verified.filter(report=>!/^active$/i.test(String(report.status||''))).flatMap(report=>{
   const game=games.find(g=>[String(g.home?.id),String(g.away?.id)].includes(String(report.teamId))
     ||[team(g.home?.abbr),team(g.away?.abbr)].includes(team(report.team)));
   if(!game)return [];
   const athlete=athletes.find(p=>String(p.id)===String(report.athleteId))
    ||athletes.find(p=>norm(p.name)===norm(report.name)&&[game.away?.abbr,game.home?.abbr].map(team).includes(team(p.team)));
   const player={id:report.athleteId,name:report.name,team:athlete?.team||report.team||'—',
    position:athlete?.position||'—',depthRank:athlete?.depthRank||null,snapTrend:athlete?.snapTrend||null,
    injury:{status:report.status,detail:report.issue||report.shortReport||null},status:report.status};
   return [{id:'inj|'+report.teamId+'|'+report.athleteId,player,game,mode:view,report}];
  });
 }
 const odds=ctx.odds?.rows||[],tdGames=ctx.td?.games||[],simGames=ctx.sim?.games||[];
 const out=new Map();
 for(const q of odds){
  const game=games.find(g=>String(g.id)===String(q.verifiedGameId));
  if(!game||!label[q.market]||!['over','yes'].includes(String(q.side)))continue;
  const player=playerMap.get(norm(q.player)+'|'+team(q.team))||
   athletes.find(p=>norm(p.name)===norm(q.player)&&[team(game.home?.abbr),team(game.away?.abbr)].includes(team(p.team)));
  if(!player)continue;
  const line=n(q.line);if(line===null)continue;
  const id=[game.id,norm(player.name),q.market,line].join('|');
  const original=out.get(id);
  if(original&&Number(original.quote.price)>=Number(q.price))continue;
  const r={id,player,game,quote:q,mode:view};
  r.l5=actual(player.logs,q.market,line,5);r.l10=actual(player.logs,q.market,line,10);
  const modelPlayer=tdGames.find(g=>String(g.id)===String(game.id))?.players?.find(p=>norm(p.name)===norm(player.name)&&team(p.team)===team(player.team));
  r.atd=ctx.td?.modelFresh&&q.market==='atd'?n(modelPlayer?.modelProbability):null;
  const simPlayer=simGames.find(g=>String(g.id)===String(game.id))?.players?.find(p=>
   norm(p.name)===norm(player.name)&&team(p.team)===team(player.team));
  // Compare player, official game, Over side, market and the EXACT book line.
  const over=simPlayer?.exactOver?.[q.market];
  const probability=q.market==='atd'&&Number(q.line)===0.5?n(simPlayer?.atd)
   :over&&Math.abs(Number(over.line)-Number(q.line))<0.000001?n(over.probability):null;
  r.exactModelOver=probability!==null&&probability>=0&&probability<=1?probability:null;
  out.set(id,r);
 }
 return [...out.values()];
}
const pct=r=>r?r.over+'/'+r.n+' · '+Math.round(r.over/r.n*100)+'%':'—';
const picker=(id,items)=>{
 const chosen=state[id],name=id==='games'?'MATCHUPS':id==='markets'?'MARKET':'POSITION',all='All '+(id==='games'?'Matchups':id==='markets'?'Markets':'Positions');
 return '<div class="matchup-filter nfl-prop-filter"><span class="matchup-label">'+name+'</span><details class="matchup-picker" data-nfl-prop-picker="'+id+'" '+(state.open[id]?'open':'')+'><summary class="matchup-trigger"><span class="matchup-trigger-text">'+text(chosen.length?chosen.length+' selected':all)+'</span><span class="matchup-chevron"></span></summary><div class="matchup-options">'
  +[['all',all],...items].map(([value,title])=>'<label class="matchup-option"><input type="checkbox" data-nfl-prop-check="'+id+'" data-nfl-prop-value="'+text(value)+'" '+((value==='all'?!chosen.length:chosen.includes(value))?'checked':'')+'><span class="matchup-name">'+text(title)+'</span></label>').join('')
  +'</div></details></div>';
};
function severity(status){
 const s=String(status||'').toLowerCase();
 if(/out|injured reserve|suspension|inactive/.test(s))return 4;
 if(/doubtful/.test(s))return 3;
 if(/questionable/.test(s))return 2;
 return 1;
}
function filtered(){
 const q=state.search.trim().toLowerCase();
 let result=state.rows.filter(r=>(!state.games.length||state.games.includes(String(r.game?.id)))
 &&(!state.positions.length||state.positions.includes(String(r.player?.position||'').toUpperCase()))
 &&(state.view==='injuries'||!state.markets.length||state.markets.includes(r.quote?.market))
 &&(!q||[r.player?.name,r.player?.team,r.game?.away?.abbr,r.game?.home?.abbr,r.quote?.market].join(' ').toLowerCase().includes(q)));
 result.sort((a,b)=>state.view==='injuries'?(severity(b.report?.status)-severity(a.report?.status)||a.player.name.localeCompare(b.player.name))
  :(b.l5?.n?b.l5.over/b.l5.n:-1)-(a.l5?.n?a.l5.over/a.l5.n:-1));
 state.shown=result;return result;
}
function markup(ctx,view){
 state.ctx=ctx;state.view=view;
 const id=[view,ctx.research?.generatedAt,ctx.injuries?.fetchedAt,ctx.odds?.fetchedAt,ctx.td?.generatedAt,ctx.sim?.generatedAt,(ctx.games||[]).map(g=>g.id).join(',')].join('|');
 if(id!==state.signature){
  state.signature=id;state.rows=build(ctx,view);state.max=90;
  // Preserve multi-select filters when odds, injuries or schedules refresh.
  const scheduled=new Set((ctx.games||[]).filter(g=>g.league==='nfl'&&g.state!=='post').map(g=>String(g.id)));
  state.games=state.games.filter(id=>scheduled.has(String(id)));
  state.markets=state.markets.filter(id=>Object.hasOwn(label,id));
  state.positions=state.positions.filter(pos=>['QB','RB','WR','TE'].includes(pos));
 }
 const allGames=(ctx.games||[]).filter(g=>g.league==='nfl'&&g.state!=='post'&&Date.parse(g.startTime)>Date.now()-15*60000);
 const opts=allGames.map(g=>[String(g.id),(g.away?.abbr||'—')+' @ '+(g.home?.abbr||'—')+' · '+when(g.startTime)]);
 const controls='<div class="nba-controls nfl-props-controls">'+picker('games',opts)
  +(view==='props'?picker('markets',Object.entries(label)):'')
  +picker('positions',['QB','RB','WR','TE'].map(x=>[x,x]))
  +'<label class="nba-search-label">SEARCH<input type="search" data-nfl-prop-search value="'+text(state.search)+'" placeholder="Player / team"></label></div>';
 const result=filtered(),list=result.slice(0,state.max);
 const rows=list.map(r=>{
  const game=r.game,who='<td><b>'+text(r.player.name)+'</b><small>'+text(r.player.team)+' · '+text(r.player.position||'—')+'</small></td>',
   match='<td><b>'+text(game.away?.abbr)+' @ '+text(game.home?.abbr)+'</b><small>'+text(when(game.startTime))+'</small></td>';
  if(view==='injuries')return '<tr data-nfl-prop-row="'+text(r.id)+'">'+who+match
   +'<td><b>'+text(r.player.injury?.status||r.player.status||'—')+'</b></td><td>'+text(r.player.depthRank||'—')+'</td>'
   +'<td>'+text(r.player.injury?.detail||r.player.injury?.type||'—')+'</td>'
   +'<td>'+text(r.player.snapTrend?.avgOffensePct==null?'—':fmt(r.player.snapTrend.avgOffensePct)+'%')+'</td><td>'+text(asof(r.report?.updatedAt||ctx.injuries?.fetchedAt))+'</td></tr>';
  return '<tr data-nfl-prop-row="'+text(r.id)+'">'+who+match
   +'<td><b>'+text(label[r.quote.market])+'</b></td><td><b>Over '+fmt(r.quote.line)+'</b></td>'
   +'<td><b>'+text(pct(r.l5))+'</b></td><td><b>'+text(pct(r.l10))+'</b></td>'
   +'<td><b class="'+(r.exactModelOver!==null&&r.exactModelOver>=.65?'nfl-high':'')+'">'+(r.exactModelOver===null?'—':(r.exactModelOver*100).toFixed(1)+'%')+'</b><small>EXACT LINE ONLY</small></td>'
   +'<td><b>'+fmt(r.l5?.avg)+'</b></td><td><b>'+text(price(r.quote.price))+'</b><small>'+text(r.quote.book)+'</small></td></tr>';
 }).join('');
 return '<section class="nba-lab nfl-lab nfl-props"><div class="nba-intro"><div><span class="nba-eyebrow">NFL / TSO RESEARCH 3.0</span><h2>'+ (view==='injuries'?'NFL INJURY & DEPTH REPORT':'NFL EXACT-LINE PLAYER PROPS')+'</h2><p>'
  +(view==='injuries'?'Current ESPN questionable, doubtful, out, IR, and suspension reports, ranked by status severity. Practice participation is not a final inactive designation.':
   'Current verified Over lines, observed L5/L10 results and 50K model percentages only when the exact player, event, market and line match. No unders, fabricated projections or implied probabilities.')
  +'</p></div></div>'
  +'<div class="nba-depth-source">OFFICIAL NFL SCHEDULE · '+allGames.length+' UPCOMING · RESEARCH '+text(asof(ctx.research?.generatedAt))+' · BOOK SNAPSHOT '+text(asof(ctx.odds?.fetchedAt))
  +(view==='injuries'?' · ESPN INJURIES '+text(asof(ctx.injuries?.fetchedAt)):' · 50K SIM '+text(asof(ctx.sim?.generatedAt))+' · '+(ctx.odds?.available?'FRESH VERIFIED PRE-GAME BOOKS':'CURRENT VERIFIED BOOKS UNAVAILABLE'))+'</div>'
  +controls+'<div class="nba-table-scroll"><table class="nba-table nfl-table"><thead><tr>'
  +(view==='injuries'?['PLAYER','MATCHUP','STATUS','DEPTH','INJURY','L5 SNAP %','RESEARCH UPDATED']:['PLAYER','MATCHUP','MARKET','CURRENT LINE','L5 OVER','L10 OVER','50K EXACT OVER','L5 AVG','BEST BOOK'])
   .map(x=>'<th>'+text(x)+'</th>').join('')+'</tr></thead><tbody>'
  +(rows||'<tr><td colspan="8">No current verified '+(view==='injuries'?'injury reports':'NFL sportsbook quotes')+' meet these filters. No historical or unmatched selections are substituted.</td></tr>')
  +'</tbody></table></div><div class="nba-table-foot"><span>'+list.length+' shown of '+result.length+' exact, verified records</span>'
  +(list.length<result.length?'<button type="button" data-nfl-prop-more>SHOW MORE →</button>':'')+'</div>'
  +'<p class="nba-footnote">Source: TSO ParlayAPI snapshot matched by two teams and kickoff to official ESPN NFL events; nflverse 2026 observed game logs (CC BY 4.0), ESPN rosters/injuries. Historical hit rates count games exceeding the displayed exact line; missing games remain excluded. Touchdown projections on the separate TSO ATD page use a calibrated model and are not implied by sportsbook odds.</p></section>';
}
function details(r){
 if(state.view==='injuries')return '<div class="drawer-contents"><h2>'+text(r.player.name)+'</h2><p>'+text(r.player.injury?.status||'Status unknown')+'</p><p>'+text(r.player.injury?.detail||'No official detail attached.')+'</p><p>ESPN NFL injury feed checked '+text(asof(state.ctx.injuries?.fetchedAt))+'. This is not a final official game-day inactive list.</p></div>';
 const q=r.quote,log=r.player.logs||[];
 return '<div class="drawer-contents"><span class="eyebrow">NFL / VERIFIED MARKET</span><h2>'+text(r.player.name)+'</h2><p>'+text(label[q.market])+' · OVER '+fmt(q.line)+' · '+price(q.price)+' '+text(q.book)+'</p>'
  +'<div class="nfl-detail-grid"><div><small>L5 OVER</small><b>'+text(pct(r.l5))+'</b></div><div><small>L10 OVER</small><b>'+text(pct(r.l10))+'</b></div>'
  +'<div><small>50K EXACT-LINE OVER</small><b>'+(r.exactModelOver===null?'—':(r.exactModelOver*100).toFixed(1)+'%')+'</b><small>Model estimate, not sportsbook odds</small></div>'
  +'<div><small>L5 AVERAGE</small><b>'+fmt(r.l5?.avg)+'</b></div><div><small>TSO ATD MODEL</small><b>'+(r.atd===null?'—':(r.atd*100).toFixed(1)+'%')+'</b></div></div>'
  +'<h3>Verified recent game log</h3><div class="nba-log-scroll"><table class="nba-log"><thead><tr><th>WEEK</th><th>SEASON</th><th>OPP</th><th>RESULT</th><th>VS LINE</th></tr></thead><tbody>'
  +log.slice(0,20).map(g=>{const value=metrics(g,q.market);return '<tr><td>'+text(g.week)+'</td><td>'+text(g.season)+'</td><td>'+text(g.opponent)+'</td><td>'+fmt(value)+'</td><td>'+ (value===null?'—':value>q.line?'OVER':'NOT OVER')+'</td></tr>'}).join('')
  +'</tbody></table></div><p class="nba-footnote">Last source update: '+text(asof(state.ctx.odds?.fetchedAt))+'. The 50K model requires an exact game, player, Over side, prop category and current line. If a line differs or a simulation is unavailable, no model percentage appears. Odds are timestamped snapshots, not a live streaming book.</p></div>';
}
function repaint(){const root=document.getElementById('nflPropsSlot');if(root)root.innerHTML=markup(state.ctx,state.view)}
function click(event){
 if(event.target.closest('[data-nfl-prop-more]')){state.max+=100;repaint();return true}
 const node=event.target.closest('[data-nfl-prop-row]');if(!node)return false;
 const r=state.rows.find(x=>x.id===node.dataset.nflPropRow);if(!r)return true;
 document.getElementById('drawerBody').innerHTML=details(r);
 document.getElementById('drawer').hidden=false;document.getElementById('scrim').hidden=false;return true;
}
function change(event){
 const option=event.target.closest('[data-nfl-prop-check]');if(!option)return false;
 const k=option.dataset.nflPropCheck,value=option.dataset.nflPropValue;
 if(!['games','markets','positions'].includes(k))return false;
 if(value==='all')state[k]=[];
 else{const chosen=new Set(state[k]);if(option.checked)chosen.add(value);else chosen.delete(value);state[k]=[...chosen]}
 state.open[k]=true;repaint();return true;
}
function input(event){
 if(!event.target.matches('[data-nfl-prop-search]'))return false;
 const cursor=event.target.selectionStart;state.search=event.target.value;repaint();
 const x=document.querySelector('[data-nfl-prop-search]');x?.focus?.();try{x?.setSelectionRange?.(cursor,cursor)}catch(_){}
 return true;
}
document.addEventListener('toggle',event=>{const k=event.target.dataset?.nflPropPicker;if(['games','markets','positions'].includes(k))state.open[k]=Boolean(event.target.open)},true);
document.addEventListener('click',event=>{for(const k of ['games','markets','positions'])if(state.open[k]&&!event.target.closest?.('[data-nfl-prop-picker="'+k+'"]')){const x=document.querySelector('[data-nfl-prop-picker="'+k+'"]');if(x){x.open=false;state.open[k]=false}}});
window.TSO3NflProps={render:markup,click,change,input,state};
})();