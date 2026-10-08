/* TSO 2.0 · game-first research, inspired by the approved video.
 * Presentation is native to the existing Outpost 2.0 broadcast shell.
 * All numeric values must originate in verified game/props/model data.
 */
(() => {
  'use strict';
  const leagues=['all','nfl','nba','mlb','nhl'];
  const labels={all:'ALL SPORTS',nfl:'NFL',nba:'NBA',mlb:'MLB',nhl:'NHL'};
  const categories={
    nfl:[['td','TDs',['atd','firstTd']],['receiving','Receiving',['recYds','receptions']],['rushing','Rushing',['rushYds']],['passing','Passing',['passYds','passTds','completions']],['all','All Props',null]],
    nba:[['points','Points',['points']],['rebounds','Rebounds',['rebounds']],['assists','Assists',['assists']],['threes','Threes',['threes']],['all','All Props',null]],
    mlb:[['hitters','Hitters',['hr','hits','totalBases','tb','rbi','runs','stolenBases']],['hr','Home Runs',['hr']],['pitching','Pitching',['strikeouts','pitcherStrikeouts','outsRecorded']],['all','All Props',null]],
    nhl:[['goals','Goals',['atg','fgs']],['shots','Shots on Goal',['sog']],['points','Points',['points','assists']],['goalies','Goalies',['saves']],['all','All Props',null]]
  };
  const primary={nfl:'td',nba:'points',mlb:'hitters',nhl:'goals'};
  const state={league:null,stage:'games',gameKey:'',tab:'',view:'lab',sort:'model',descending:true,query:'',team:'all',role:'all'};
  let ctx=null,gameList=[],visible=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const fmt=(v,d=1)=>num(v)===null?'—':Number(v).toFixed(d).replace(/\.0$/,'');
  const percent=v=>num(v)===null?'—':fmt(v)+'%';
  const edge=v=>num(v)===null?'—':(Number(v)>0?'+':'')+fmt(v)+' pp';
  const odds=v=>num(v)===null?'—':(Number(v)>0?'+':'')+fmt(v,0);
  const up=v=>String(v??'').toUpperCase().trim();
  const slug=v=>up(v).replace(/[^A-Z0-9]/g,'');
  const day=v=>{const x=Date.parse(v||'');return Number.isFinite(x)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(x)):'Time TBD'};
  const sameName=(a,b)=>!!a&&!!b&&(slug(a)===slug(b)||((String(a).trim().split(/\s+/).length>1 || String(b).trim().split(/\s+/).length>1)&&slug(a).endsWith(slug(b))&&slug(b).length>=5)|| (slug(b).endsWith(slug(a))&&slug(a).length>=5));
  const oneOf=(v,team)=>!!v&&!!team&&(sameName(v,team.abbr)||sameName(v,team.name)||sameName(v,team.displayName));
  const id=g=>[String(g.league||''),String(g.id||''),up(g.away?.abbr),up(g.home?.abbr),String(g.startTime||'')].join('|');
  const relevance=(g,r)=>{
    if(!g||g.league!==r.sport)return false;
    const eid=String(r.eventId||'').trim(),gid=String(g.id||'').trim();
    // IDs are authoritative only when they originate from the same fixture source.
    if(eid&&gid&&eid===gid)return true;
    const home=String(r.homeTeam||''),away=String(r.awayTeam||'');
    if(!home||!away)return false;
    if(!((oneOf(home,g.home)&&oneOf(away,g.away))||(oneOf(home,g.away)&&oneOf(away,g.home))))return false;
    if(r.commenceTime&&g.startTime){
      const drift=Math.abs(Date.parse(r.commenceTime)-Date.parse(g.startTime));
      if(Number.isFinite(drift)&&drift>36*60*60*1000)return false;
    }
    return true;
  };
  const mode=r=>num(r?.model?.probabilityPct);
  const validModel=r=>mode(r)!==null;
  const rowName=r=>up(r.market);
  const yes=r=>['yes','over'].includes(String(r.side||'').toLowerCase())||String(r.selection||'').toUpperCase()==='YES';
  const choose=rows=>[...rows].sort((a,b)=>(validModel(b)?1:0)-(validModel(a)?1:0)
    || (num(b?.model?.edgePct)??-999)-(num(a?.model?.edgePct)??-999)
    || String(a.player||'').localeCompare(String(b.player||'')))[0];
  const forMarket=(rows,market,onlyYes=false)=>choose(rows.filter(r=>rowName(r)===up(market)&&(!onlyYes||yes(r))))||null;
  const project=r=>num(r?.model?.projection?.mean??r?.model?.projection?.median??r?.model?.projectedValue);
  const val=(obj,keys)=>{for(const key of keys){const parts=key.split('.');let x=obj;for(const p of parts)x=x?.[p];if(num(x)!==null)return num(x)}return null};
  const gameLine=(g)=>ctx?.lineFor?.(g)||g.gameLines||null;
  function markets(g){
    const l=gameLine(g),p=l?.puckLine||l?.spread;
    const spread=l?.puckLine?(p?.favoriteAbbr&&num(p.line)!==null?String(p.favoriteAbbr)+' '+(Number(p.line)>0?'+':'')+fmt(p.line):'—')
      :p?.home&&num(p.home.point)!==null?up(g.home?.abbr)+' '+(Number(p.home.point)>0?'+':'')+fmt(p.home.point)
      :p?.away&&num(p.away.point)!==null?up(g.away?.abbr)+' '+(Number(p.away.point)>0?'+':'')+fmt(p.away.point):'—';
    const total=l?.total&&num(l.total.line)!==null?fmt(l.total.line):'—';
    const money=l?.moneyline?(num(l.money.homeBest??l.money.home?.price)!==null?up(g.home?.abbr)+' '+odds(l.money.homeBest??l.money.home?.price):'—'):'—';
    return {spread,total,money};
  }
  function team(gteam,cls=''){
    const image=gteam?.logo?'<img data-team-logo alt="" src="'+esc(gteam.logo)+'" loading="lazy">':'<span>'+esc(gteam?.abbr||'—')+'</span>';
    return '<span class="rg2-team '+cls+'"><span class="rg2-logo">'+image+'</span><span class="rg2-team-copy"><b>'+esc(gteam?.abbr||'—')+'</b><small>'+esc(gteam?.name||'')+'</small></span></span>';
  }
  function cards(){
    const html=gameList.map(g=>{
      const m=markets(g),live=g.state==='in',final=g.state==='post';
      return '<button type="button" class="rg2-game-card '+(live?'rg2-live':'')+'" data-rg2-game="'+esc(id(g))+'">'
        +'<div class="rg2-game-card-top"><span>'+esc(labels[g.league]||up(g.league))+' · '+esc(live?'LIVE':final?'FINAL':day(g.startTime))+'</span><strong>'+(live?'● LIVE':final?'FINAL':'OPEN GAME →')+'</strong></div>'
        +'<div class="rg2-card-matchup">'+team(g.away,'rg2-away')+'<span class="rg2-card-score">'+(g.state==='pre'?'@':esc(String(g.away?.score??'—')+' – '+String(g.home?.score??'—')))+'</span>'+team(g.home,'rg2-home')+'</div>'
        +'<div class="rg2-game-lines"><span><small>SPREAD</small><b>'+esc(m.spread)+'</b></span><span><small>TOTAL</small><b>'+esc(m.total)+'</b></span><span><small>MONEYLINE</small><b>'+esc(m.money)+'</b></span></div>'
        +'<div class="rg2-game-foot"><small>'+esc(g.venue||'Matchup research')+'</small><b>RESEARCH GAME →</b></div>'
      +'</button>';
    }).join('');
    return '<div class="rg2-heading"><div><span class="rg2-kicker">THE SPORTS OUTPOST · RESEARCH</span><h1>Game Research</h1><p>Pick a game to open its player research lab.</p></div><button type="button" class="rg2-refresh" data-rg2-refresh>↻ REFRESH</button></div>'
      +'<div class="rg2-filter-row"><div class="rg2-leagues" role="group" aria-label="Sports">'+leagues.map(k=>'<button type="button" data-rg2-league="'+k+'" class="'+(k===state.league?'is-active':'')+'" aria-pressed="'+(k===state.league)+'">'+esc(labels[k])+'</button>').join('')+'</div><span class="rg2-count">'+gameList.length+' game'+(gameList.length===1?'':'s')+' in the current slate</span></div>'
      +'<section class="rg2-game-section"><div class="rg2-section-header"><span>'+esc(state.league==='nfl'?'THIS WEEK’S GAMES':state.league==='all'?'CURRENT GAMES':'AVAILABLE GAMES')+'</span><small>Choose a matchup to see player data</small></div>'
      +(gameList.length?'<div class="rg2-cards">'+html+'</div>':'<div class="rg2-empty"><b>No games currently listed for '+esc(labels[state.league])+'.</b><span>Check another sport or refresh when the next slate is published. No simulated games are shown.</span></div>')
      +'</section>';
  }
  function detail(){
    const g=gameList.find(x=>id(x)===state.gameKey);
    if(!g){state.stage='games';return cards()}
    const m=markets(g),all=ctx.rows||[];
    const actual=all.filter(r=>relevance(g,r));
    const tabs=categories[g.league]||[['all','All Props',null]];
    if(!tabs.some(t=>t[0]===state.tab)){state.tab=primary[g.league]||'all';state.sort=g.league==='nfl'?'atd':g.league==='mlb'?'hr':g.league==='nhl'?'atg':'points';}
    const active=tabs.find(t=>t[0]===state.tab)||tabs[0];
    const filtered=active[2]?actual.filter(r=>active[2].includes(r.market)):actual;
    const roleChoices=[...new Set(filtered.map(r=>String(r.position||r.role||'').trim()).filter(Boolean))].sort();
    const selection=filtered.filter(r=>(state.team==='all'||up(r.team)===state.team||(state.team===up(g.away?.abbr)&&oneOf(r.team,g.away))||(state.team===up(g.home?.abbr)&&oneOf(r.team,g.home)))
      &&(state.role==='all'||String(r.position||r.role||'')===state.role)
      &&(!state.query||[r.player,r.team,r.market,r.marketLabel].filter(Boolean).join(' ').toLowerCase().includes(state.query.toLowerCase())));
    const players=state.tab==='all'?selection.map(r=>({key:String(r.key),name:r.player,team:r.team,role:r.position||r.role||'',rows:[r]})):groupPlayers(selection);
    const cols=columns(g.league,state.tab);
    const sortValue=p=>cellRaw(p,state.sort,g.league);
    players.sort((a,b)=>{const x=sortValue(a),y=sortValue(b);if(x===null&&y!==null)return 1;if(x!==null&&y===null)return -1;
      const cmp=typeof x==='string'||typeof y==='string'?String(x||'').localeCompare(String(y||'')):(Number(x||0)-Number(y||0));
      return (state.descending?-1:1)*cmp||String(a.name).localeCompare(String(b.name))});
    visible=players.slice(0,180);
    const modeInfo=actual.filter(r=>validModel(r)).length;
    const ticker=gameList.filter(v=>v.league===g.league).map(v=>'<button type="button" data-rg2-game="'+esc(id(v))+'" class="'+(id(v)===state.gameKey?'is-active':'')+'">'+esc(up(v.away?.abbr))+' @ '+esc(up(v.home?.abbr))+' <small>'+esc(v.state==='pre'?day(v.startTime):v.state==='in'?'LIVE':'FINAL')+'</small></button>').join('');
    const header='<div class="rg2-detail-top"><button type="button" class="rg2-back" data-rg2-back>← ALL GAMES</button><span class="rg2-kicker">'+esc(labels[g.league])+' · MATCHUP RESEARCH</span></div>'
      +'<div class="rg2-matchup-strip"><div class="rg2-matchup-teams">'+team(g.away)+ '<span class="rg2-at">'+(g.state==='pre'?'@':esc(String(g.away?.score??'—')+' – '+String(g.home?.score??'—')))+'</span>'+team(g.home)+'</div>'
      +'<div class="rg2-matchup-markets"><span><small>SPREAD</small><strong>'+esc(m.spread)+'</strong></span><span><small>TOTAL</small><strong>'+esc(m.total)+'</strong></span><span><small>MONEYLINE</small><strong>'+esc(m.money)+'</strong></span><span><small>'+esc(g.state==='in'?'LIVE':g.state==='post'?'FINAL':'START')+'</small><strong>'+esc(day(g.startTime))+'</strong></span></div></div>'
      +'<div class="rg2-game-rail" role="group" aria-label="Choose another game">'+ticker+'</div>';
    const choices=(values,label,current)=>'<option value="all">'+esc(label)+'</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('');
    const board=state.view==='board'?'<div class="rg2-player-grid">'+visible.map((p,i)=>'<article class="rg2-player-card">'+playerTitle(p)+'<div class="rg2-player-card-number"><small>MODEL</small><b>'+metric(p,'model',g.league)+'</b></div><div class="rg2-player-card-values"><span>MARKET '+metric(p,'market',g.league)+'</span><span>EDGE '+metric(p,'edge',g.league)+'</span></div><button type="button" data-rg2-intel="'+i+'">DEEP RESEARCH →</button></article>').join('')+'</div>'
      :'<div class="rg2-table-scroll" role="region" tabindex="0" aria-label="'+esc(labels[g.league])+' research table; scroll horizontally for all columns"><table class="rg2-table"><thead><tr><th scope="col">PLAYER</th>'+cols.map(([key,label])=>'<th scope="col"><button type="button" data-rg2-sort="'+key+'">'+esc(label)+' <i>'+(key===state.sort?(state.descending?'↓':'↑'):'↕')+'</i></button></th>').join('')+'<th>ACTIONS</th></tr></thead><tbody>'+visible.map((p,i)=>'<tr><td>'+playerTitle(p)+'</td>'+cols.map(([key])=>'<td class="rg2-val rg2-val-'+key+'">'+metric(p,key,g.league)+'</td>').join('')+'<td class="rg2-action"><button type="button" data-rg2-intel="'+i+'">INTEL</button><button type="button" data-rg2-add="'+i+'">+ ADD</button></td></tr>').join('')+'</tbody></table></div>';
    return header+'<section class="rg2-detail">'
      +'<div class="rg2-detail-nav"><div class="rg2-tabs" role="group" aria-label="Research category">'+tabs.map(([v,l])=>'<button type="button" data-rg2-tab="'+v+'" class="'+(v===state.tab?'is-active':'')+'">'+esc(l)+'</button>').join('')+'</div>'
      +'<div class="rg2-view" role="group" aria-label="Research display">'+['board','rank','lab'].map(v=>'<button type="button" data-rg2-view="'+v+'" class="'+(v===state.view?'is-active':'')+'">'+v.toUpperCase()+'</button>').join('')+'</div></div>'
      +'<div class="rg2-lab-heading"><div><span class="rg2-kicker">THE OUTPOST LAB · '+esc(labels[g.league])+'</span><h2>'+esc(active[1])+' Research</h2><p>One player per row with sport-specific research signals. Exact verified models only.</p></div><div class="rg2-lab-status"><b>'+visible.length+' PLAYERS</b><small>'+modeInfo+' modeled selections for this game</small></div></div>'
      +'<div class="rg2-searchbar"><label class="rg2-find"><span>⌕</span><input data-rg2-search type="search" placeholder="Search players or stats" value="'+esc(state.query)+'" aria-label="Filter players"></label>'
      +'<label>TEAM <select data-rg2-team>'+choices([up(g.away?.abbr),up(g.home?.abbr)].filter(Boolean),'Both teams',state.team)+'</select></label>'
      +'<label>ROLE <select data-rg2-role>'+choices(roleChoices,'All positions',state.role)+'</select></label>'
      +'<button type="button" data-rg2-refresh class="rg2-refresh">↻ REFRESH</button></div>'
      +(visible.length?board:'<div class="rg2-empty"><b>No verified '+esc(active[1].toLowerCase())+' player data available for this matchup.</b><span>Sportsbook markets and exact player models will appear here when their source feed has this game. Try another tab or game.</span></div>')
      +'<div class="rg2-note">— means this statistic is not provided by a verified feed. No estimated history, usage, probabilities or fake players. INTEL opens the existing TSO Deep Research panel.</div>'
      +'</section>';
  }
  function groupPlayers(rows){
    const groups=new Map();
    for(const r of rows){
      const k=[r.sport,slug(r.playerId||r.player),up(r.team)].join('|');
      let p=groups.get(k);
      if(!p){p={key:k,name:r.player,team:r.team,role:r.position||r.role||'',headshotUrl:r.headshotUrl,rows:[]};groups.set(k,p)}
      if(!p.headshotUrl&&r.headshotUrl)p.headshotUrl=r.headshotUrl;
      p.rows.push(r);
    }
    return [...groups.values()];
  }
  function best(p){return choose(p.rows.filter(r=>validModel(r)))||choose(p.rows)||null}
  function forP(p,market){return forMarket(p.rows,market,true)}
  function columnData(p,key,sport){
    const r=best(p)||{},m=r.model||{},pModel=validModel(r);
    const marketLine=forP(p,key)||null;
    switch(key){
      case 'role':return p.role||r.position||r.role||null;
      case 'model':return pModel?mode(r):null;
      case 'market':return num(r.impliedPct);
      case 'edge':return pModel?num(m.edgePct):null;
      case 'price':return num(r.price);
      case 'book':return r.book||null;
      case 'projected':return project(r);
      case 'line':return num(r.line);
      case 'form':return val(m,['trendPct','formPct','form.score'])??val(r,['stats.formPct']);
      case 'yield':return val(m,['yieldPct','yield']);
      case 'purity':return val(m,['purity','purityScore']);
      case 'usage':return val(m,['usagePct','usage.usagePct','context.usagePct']);
      case 'minutes':return val(m,['minutes','usage.minutes','projection.minutes']);
      case 'toi':return val(m,['toi','usage.toi']);
      case 'snap':return val(m,['snapPct','usage.snapPct']);
      case 'gl':return val(m,['goalLinePct','usage.goalLinePct']);
      case 'carry':return val(m,['carryPct','usage.carryPct']);
      case 'target':return val(m,['targetPct','usage.targetPct']);
      case 'rz':return val(m,['redZonePct','usage.redZonePct']);
      case 'barrel':return val(m,['barrelPct','contact.barrelPct']);
      case 'hardhit':return val(m,['hardHitPct','contact.hardHitPct']);
      case 'l5':return val(m,['hitRateL5','last5RatePct','history.l5Pct']);
      case 'l10':return val(m,['hitRateL10','last10RatePct','history.l10Pct']);
      case 'prevFirst':return val(m,['previousSeasonFirstTds','history.prevSeasonFirstTds']);
      case 'prevTD':return val(m,['previousSeasonTds','history.prevSeasonTds']);
      case 'yearTD':return val(m,['currentSeasonTds','history.currentSeasonTds']);
      case 'atd':case 'firstTd':case 'atg':case 'fgs':case 'hr':case 'hits':case 'sog':case 'points':case 'rebounds':case 'assists':case 'threes':case 'pra':case 'rbi':
        return marketLine&&validModel(marketLine)?mode(marketLine):null;
      default:return null;
    }
  }
  function cellRaw(p,key,sport){if(key==='player')return String(p.name).toLowerCase();return columnData(p,key,sport)}
  function metric(p,key,sport){
    const r=best(p)||{};
    if(key==='selection')return '<span class="rg2-cell-label">'+esc(r.marketLabel||r.market||'—')+'</span><small>'+esc(r.selection||((r.side==='under'?'U ':'O ')+(num(r.line)===null?'':fmt(r.line))))+'</small>';
    if(key==='book')return esc(r.book||'—');
    if(key==='price'){const v=columnData(p,key,sport);return v===null?'—':odds(v)}
    if(key==='role')return esc(columnData(p,key,sport)||'—');
    if(key==='line')return columnData(p,key,sport)===null?esc(r.selection||'—'):fmt(columnData(p,key,sport));
    const value=columnData(p,key,sport);
    if(value===null)return '<span class="rg2-na" title="Source data unavailable">—</span>';
    if(['projected','minutes','toi'].includes(key))return fmt(value,2);
    if(['prevFirst','prevTD','yearTD'].includes(key))return fmt(value,0);
    if(key==='purity')return fmt(value,0);
    if(key==='edge')return '<strong class="'+(value>0?'rg2-pos':value<0?'rg2-neg':'')+'">'+edge(value)+'</strong>';
    if(key==='form')return '<b class="'+(value>0?'rg2-pos':value<0?'rg2-neg':'')+'">'+(value>0?'↑ ':value<0?'↓ ':'→ ')+fmt(value)+'</b>';
    if(['model','atd','atg','hr','firstTd','fgs'].includes(key))return '<strong class="rg2-highlight">'+percent(value)+'</strong>';
    return percent(value);
  }
  function playerTitle(p){
    const image=p.headshotUrl||p.rows.find(r=>r.headshotUrl)?.headshotUrl;
    const avatar=image?'<img data-player-headshot src="'+esc(image)+'" alt="" loading="lazy">':'<span class="rg2-avatar">'+esc(String(p.name||'?').charAt(0))+'</span>';
    return '<span class="rg2-player">'+avatar+'<span><b>'+esc(p.name||'—')+'</b><small>'+esc(up(p.team)||'—')+(p.role?' · '+esc(p.role):'')+'</small></span></span>';
  }
  function columns(sport,tab){
    if(tab==='all')return [['selection','EXACT PICK'],['model','MODEL %'],['market','MARKET %'],['line','LINE'],['projected','PROJECTION'],['edge','EDGE'],['price','ODDS'],['book','BOOK']];
    if(sport==='nfl'&&tab==='td')return [['role','ROLE'],['atd','ANYTIME %'],['firstTd','FIRST %'],['prevFirst','2025 1ST'],['prevTD','2025 TDs'],['yearTD','2026 TDs'],['form','FORM'],['yield','YIELD'],['gl','GL %'],['carry','CARRY %'],['target','TGT %'],['rz','RZ %'],['purity','PURITY']];
    if(sport==='nfl')return [['role','ROLE'],['selection','EXACT PICK'],['model','MODEL %'],['market','MARKET %'],['projected','PROJECTION'],['l5','L5 %'],['l10','L10 %'],['edge','EDGE'],['snap','SNAPS %'],['target','TGT %'],['rz','RZ %']];
    if(sport==='nhl')return [['role','ROLE'],['atg','ANYTIME %'],['fgs','FIRST %'],['sog','SOG %'],['points','POINTS %'],['assists','ASSISTS %'],['model','MODEL %'],['projected','PROJECTION'],['toi','TOI'],['l5','L5 %'],['edge','EDGE'],['purity','PURITY']];
    if(sport==='mlb')return [['role','ROLE'],['hr','HR %'],['hits','HITS %'],['rbi','RBI %'],['model','MODEL %'],['projected','PROJECTION'],['barrel','BARREL %'],['hardhit','HARD HIT %'],['l5','L5 %'],['edge','EDGE'],['purity','PURITY']];
    return [['role','ROLE'],['points','POINTS %'],['rebounds','REB %'],['assists','AST %'],['threes','3PT %'],['model','MODEL %'],['projected','PROJECTION'],['minutes','MINUTES'],['usage','USAGE %'],['l5','L5 %'],['edge','EDGE'],['purity','PURITY']];
  }
  function render(root,props){
    if(!root)return;
    ctx=props||{};
    const league=leagues.includes(props.league)?props.league:'all';
    if(state.league!==league){state.league=league;state.stage='games';state.gameKey='';state.tab='';state.query='';state.team='all';state.role='all';state.sort='model';state.view='lab'}
    gameList=(Array.isArray(props.games)?props.games:[]).filter(g=>league==='all'||g.league===league);
    const seen=new Set();gameList=gameList.filter(g=>{const key=id(g);if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>({'in':0,'pre':1,'post':2}[a.state]??3)-({'in':0,'pre':1,'post':2}[b.state]??3)
      || (Date.parse(a.startTime||'')||0)-(Date.parse(b.startTime||'')||0));
    if(state.stage==='detail'&&!gameList.some(g=>id(g)===state.gameKey)){state.stage='games';state.gameKey=''}
    root.innerHTML=state.stage==='detail'?detail():cards();
    root.onclick=e=>{
      const t=e.target.closest('button');
      if(!t||!root.contains(t))return;
      if(t.hasAttribute('data-rg2-game')){state.gameKey=t.dataset.rg2Game;state.stage='detail';state.tab='';state.search='';state.query='';state.team='all';state.role='all';state.sort='model';state.descending=true;render(root,ctx);root.scrollIntoView?.({block:'start'});return}
      if(t.hasAttribute('data-rg2-back')){state.stage='games';state.gameKey='';render(root,ctx);return}
      if(t.hasAttribute('data-rg2-league')){const next=t.dataset.rg2League;state.stage='games';state.gameKey='';props.changeLeague?.(next);if(next===league)render(root,ctx);return}
      if(t.hasAttribute('data-rg2-tab')){state.tab=t.dataset.rg2Tab;state.query='';state.role='all';state.sort=state.tab==='td'?'atd':state.tab==='hitters'||state.tab==='hr'?'hr':state.tab==='goals'?'atg':state.tab==='points'?'points':'model';render(root,ctx);return}
      if(t.hasAttribute('data-rg2-view')){state.view=t.dataset.rg2View;if(state.view==='rank'){state.sort='model';state.descending=true}render(root,ctx);return}
      if(t.hasAttribute('data-rg2-sort')){const key=t.dataset.rg2Sort;if(state.sort===key)state.descending=!state.descending;else{state.sort=key;state.descending=key!=='role'}render(root,ctx);return}
      if(t.hasAttribute('data-rg2-intel')){const p=visible[Number(t.dataset.rg2Intel)];const row=best(p||{rows:[]});if(row)props.openDetail?.(row);return}
      if(t.hasAttribute('data-rg2-add')){const p=visible[Number(t.dataset.rg2Add)];const row=best(p||{rows:[]});if(row)props.addSelection?.(row);return}
      if(t.hasAttribute('data-rg2-refresh')){props.refresh?.();return}
    };
    root.onchange=e=>{
      if(e.target.matches('[data-rg2-team]'))state.team=e.target.value;
      else if(e.target.matches('[data-rg2-role]'))state.role=e.target.value;
      else return;
      render(root,ctx);
    };
    root.oninput=e=>{
      if(!e.target.matches('[data-rg2-search]'))return;
      const input=e.target,from=input.selectionStart;
      state.query=input.value;
      render(root,ctx);
      const fresh=root.querySelector('[data-rg2-search]');
      fresh?.focus?.({preventScroll:true});
      try{fresh?.setSelectionRange(from,from)}catch{}
    };
  }
  window.TSO2ResearchGameFlow={render,reset:()=>{state.stage='games';state.gameKey=''}};
})();