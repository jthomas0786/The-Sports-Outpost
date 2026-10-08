/* TSO 2.0 research board: verified feeds only, shared across all four sports. */
(() => {
  'use strict';
  const sports=['all','nfl','nba','mlb','nhl'];
  const names={all:'ALL SPORTS',nfl:'NFL',nba:'NBA',mlb:'MLB',nhl:'NHL'};
  const state={gameId:'',sport:'all',view:'lab',market:'all',team:'all',model:'all',query:'',sort:'edge',descending:true};
  let context=null,visibleRows=[],games=[];
  const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const number=x=>valid(x)?Number(x):null;
  const fixed=(x,d=1)=>number(x)===null?'—':Number(x).toFixed(d).replace(/\.0$/,'');
  const pct=x=>number(x)===null?'—':fixed(x,1)+'%';
  const posneg=x=>number(x)===null?'—':(Number(x)>0?'+':'')+fixed(x,1)+' pp';
  const price=x=>number(x)===null?'—':(Number(x)>0?'+':'')+Math.round(Number(x));
  const abbr=x=>String(x??'').trim().toUpperCase();
  const time=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(t)):'Time pending';};
  const sourceTime=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?'Updated '+new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(t)):'Timestamp unavailable';};
  const identity=x=>[abbr(x?.away?.abbr||x?.awayTeam),abbr(x?.home?.abbr||x?.homeTeam)].join('|');
  const gameId=(g,i)=>String(g?.id||'')+'|'+identity(g)+'|'+String(g?.startTime||'')+'|'+i;
  const orderGames=arr=>[...arr].sort((a,b)=>({in:0,pre:1,post:2}[a.state]??3)-({in:0,pre:1,post:2}[b.state]??3)||((Date.parse(a.startTime||'')||0)-(Date.parse(b.startTime||'')||0)));
  const matchedModel=r=>valid(r?.model?.probabilityPct);
  const marketName=r=>String(r?.marketLabel||r?.market||'Market').trim();
  const sideText=r=>String(r?.selection||(['atd','atg','fgs','hr'].includes(String(r?.market||'').toLowerCase()) && r.side!=='under'?'YES':(r.side==='under'?'UNDER':'OVER')+(valid(r.line)?' '+r.line:'')));
  const keyFor=r=>String(r?.key||'')+'|'+String(r?.player||'')+'|'+String(r?.market||'');
  const rowGameMatch=(r,g)=>{
    if(!g)return true;
    const home=abbr(g.home?.abbr),away=abbr(g.away?.abbr);
    const rowHome=abbr(r.homeTeam),rowAway=abbr(r.awayTeam),team=abbr(r.team);
    if(rowHome&&rowAway)return (rowHome===home&&rowAway===away)||(rowHome===away&&rowAway===home);
    return !!team&&(team===home||team===away);
  };
  const teamFor=r=>abbr(r?.team)||'—';
  const sportRow=r=>names[r?.sport]||abbr(r?.sport)||'SPORT';
  const sortMetric=(r,sort)=>({
    edge:number(r.model?.edgePct),model:number(r.model?.probabilityPct),
    market:number(r.impliedPct),price:number(r.price),line:number(r.line),
    projected:number(r.model?.projection?.mean??r.model?.projection?.median),
    books:number(r.bookCount),player:String(r.player||'').toLowerCase()
  }[sort]??null);
  const metric=(r,field)=>{
    if(field==='player')return '<span class="lab2-player">'+(r.headshotUrl?'<img src="'+escapeHTML(r.headshotUrl)+'" alt="" loading="lazy" data-player-headshot>':'<span class="lab2-avatar">'+escapeHTML(String(r.player||'?').trim().charAt(0))+'</span>')+
      '<span><b>'+escapeHTML(r.player||'Player')+'</b><small>'+escapeHTML(teamFor(r))+' · '+escapeHTML(sportRow(r))+'</small></span></span>';
    if(field==='selection')return '<span class="lab2-selection"><b>'+escapeHTML(marketName(r))+'</b><small>'+escapeHTML(sideText(r))+'</small></span>';
    if(field==='model')return matchedModel(r)?'<strong class="lab2-cell-accent">'+pct(r.model.probabilityPct)+'</strong>':'<span class="lab2-unavailable">—</span>';
    if(field==='market')return pct(r.impliedPct);
    if(field==='edge')return matchedModel(r)&&valid(r.model?.edgePct)?'<strong class="'+(Number(r.model.edgePct)>=0?'lab2-positive':'lab2-negative')+'">'+posneg(r.model.edgePct)+'</strong>':'—';
    if(field==='projected')return fixed(r.model?.projection?.mean??r.model?.projection?.median,2);
    if(field==='line')return valid(r.line)?escapeHTML(r.line):escapeHTML(sideText(r));
    if(field==='price')return '<b>'+price(r.price)+'</b>';
    if(field==='book')return escapeHTML(r.book||'—');
    if(field==='books')return valid(r.bookCount)?escapeHTML(r.bookCount):escapeHTML(r.books?.length||'—');
    if(field==='source')return '<span class="lab2-source" title="'+escapeHTML(String(r.model?.sourceLabel||r.model?.source||r.snapshotTime||''))+'">'+escapeHTML(matchedModel(r)?(r.model.sourceLabel||r.model.source||'Verified model'):'Market only')+'</span>';
    if(field==='role')return escapeHTML(r.position||r.role||'—');
    const extras={
      nfl:{'usage':r.model?.usage?.snapPct??r.research?.snapPct,'sport2':r.model?.usage?.redZonePct??r.research?.redZonePct},
      nba:{'usage':r.model?.usage?.minutes??r.research?.minutes,'sport2':r.model?.usage?.usagePct??r.research?.usagePct},
      mlb:{'usage':r.model?.contact?.barrelPct??r.research?.barrelPct,'sport2':r.model?.contact?.hardHitPct??r.research?.hardHitPct},
      nhl:{'usage':r.model?.usage?.toi??r.research?.toi,'sport2':r.model?.usage?.shotsPerGame??r.research?.shotsPerGame}
    };
    let value=extras[r.sport]?.[field];
    if(!valid(value))return '<span class="lab2-unavailable" title="Not verified for this exact selection">—</span>';
    return escapeHTML(fixed(value,1)+(field==='sport2'&&r.sport!=='nhl'?'%':field==='usage'&&['nfl','mlb'].includes(r.sport)?'%':''));
  };
  const fieldsFor=s=>{
    const columns=[['player','PLAYER'],['selection','EXACT PICK'],['model','MODEL %'],['market','MARKET %'],['projected','PROJECTED'],['line','LINE'],['edge','EDGE'],['price','ODDS'],['book','BOOK']];
    const extra={
      nfl:[['usage','SNAPS %'],['sport2','RZ %']],
      nba:[['usage','MINUTES'],['sport2','USAGE %']],
      mlb:[['usage','BARREL %'],['sport2','HARD HIT %']],
      nhl:[['usage','TOI'],['sport2','SHOTS / GAME']]
    };
    if(extra[s])columns.splice(7,0,...extra[s]);
    columns.push(['books','BOOKS'],['source','MODEL SOURCE']);
    return columns;
  };
  const gameTeam=(team,label)=>{
    const image=team?.logo?'<img src="'+escapeHTML(team.logo)+'" alt="" loading="lazy" data-team-logo>':'<span class="lab2-team-fallback">'+escapeHTML(team?.abbr||label)+'</span>';
    return '<span class="lab2-team">'+image+'<span><small>'+escapeHTML(team?.abbr||label)+'</small><strong>'+escapeHTML(team?.name||team?.abbr||label)+'</strong></span></span>';
  };
  function drawTable(root){
    if(!root||!context)return;
    const rows=(context.rows||[]);
    const selected=games.find(g=>g._labId===state.gameId)||null;
    let filtered=rows.filter(r=>
      (state.sport==='all'||r.sport===state.sport)
      &&(!selected||rowGameMatch(r,selected))
      &&(state.market==='all'||String(r.market||r.marketLabel)===state.market)
      &&(state.team==='all'||teamFor(r)===state.team)
      &&(state.model!=='matched'||matchedModel(r))
      &&(state.model!=='market'||!matchedModel(r))
      &&(state.view!=='rank'||matchedModel(r))
      &&(!state.query||[r.player,r.team,r.market,r.marketLabel,r.book,r.homeTeam,r.awayTeam,sideText(r)].filter(Boolean).join(' ').toLowerCase().includes(state.query.toLowerCase()))
    );
    filtered.sort((a,b)=>{
      const x=sortMetric(a,state.sort),y=sortMetric(b,state.sort);
      if(x==null&&y!=null)return 1;
      if(x!=null&&y==null)return -1;
      let cmp=(typeof x==='string'||typeof y==='string')?String(x??'').localeCompare(String(y??'')):(Number(x||0)-Number(y||0));
      return (state.descending?-1:1)*cmp || String(a.player||'').localeCompare(String(b.player||''));
    });
    visibleRows=filtered.slice(0,180);
    const sport=state.sport==='all'?(selected?.league||'all'):state.sport;
    const fields=fieldsFor(sport);
    const table=root.querySelector('[data-lab-table]');
    if(table){
      table.innerHTML='<table><thead><tr>'+fields.map(([k,title])=>'<th scope="col">'+
        (['player','model','market','projected','line','edge','price','books'].includes(k)?'<button type="button" data-lab-sort="'+k+'" aria-label="Sort by '+escapeHTML(title)+'">'+escapeHTML(title)+' <i>'+((state.sort===k)?(state.descending?'↓':'↑'):'↕')+'</i></button>':escapeHTML(title))+'</th>').join('')+
        '<th scope="col">ACTION</th></tr></thead><tbody>'+visibleRows.map((r,i)=>'<tr class="'+(matchedModel(r)?'is-modeled':'is-market')+'">'+fields.map(([k])=>'<td data-label="'+escapeHTML(fields.find(f=>f[0]===k)?.[1])+'">'+metric(r,k)+'</td>').join('')+
        '<td class="lab2-actions"><button type="button" data-lab-add="'+i+'" aria-label="Add '+escapeHTML(r.player)+' to parlay">+ ADD</button><button type="button" data-lab-detail="'+i+'" aria-label="Research '+escapeHTML(r.player)+'">INTEL</button></td></tr>').join('')+'</tbody></table>';
      if(!filtered.length)table.innerHTML='<div class="lab2-empty"><b>No verified selections match these filters.</b><span>'+escapeHTML(selected?'Try a different game, market or sport.':'Choose another sport or wait for a verified feed update.')+'</span></div>';
    }
    const count=root.querySelector('[data-lab-count]');
    if(count)count.textContent=visibleRows.length+' of '+filtered.length+' exact selections';
    const modeled=root.querySelector('[data-lab-modeled]');
    if(modeled)modeled.textContent=filtered.filter(matchedModel).length+' exact model matches';
  }
  function render(root,props){
    if(!root)return;
    context=props;
    const requested=props.league||'all';
    state.sport=sports.includes(requested)?requested:'all';
    const allGames=(Array.isArray(props.games)?props.games:[]).filter(g=>state.sport==='all'||g.league===state.sport);
    games=orderGames(allGames).slice(0,60).map((g,i)=>({...g,_labId:gameId(g,i)}));
    if(state.gameId!=='all'&&!games.some(g=>g._labId===state.gameId)){
      const withMarkets=games.find(g=>(props.rows||[]).some(r=>rowGameMatch(r,g)));
      state.gameId=(withMarkets||games[0])?._labId||'';
    }
    const selected=state.gameId==='all'?null:(games.find(g=>g._labId===state.gameId)||null);
    const htmlOptions=(items,label)=>'<option value="all">'+escapeHTML(label)+'</option>'+items.map(x=>'<option value="'+escapeHTML(x)+'">'+escapeHTML(x)+'</option>').join('');
    const marketValues=[...new Set((props.rows||[]).filter(r=>state.sport==='all'||r.sport===state.sport).map(r=>String(r.market||r.marketLabel||'')).filter(Boolean))].sort();
    const teams=[...new Set((props.rows||[]).filter(r=>state.sport==='all'||r.sport===state.sport).map(teamFor).filter(t=>t!=='—'))].sort();
    if(!marketValues.includes(state.market))state.market='all';
    if(!teams.includes(state.team))state.team='all';
    const newest=(props.rows||[]).reduce((acc,r)=>Date.parse(r.snapshotTime||'')>(Date.parse(acc||'')||0)?r.snapshotTime:acc,'');
    const gameMarkup=games.length?games.map(g=>'<button type="button" data-lab-game="'+escapeHTML(g._labId)+'" class="'+(g._labId===state.gameId?'is-active':'')+'" aria-pressed="'+(g._labId===state.gameId)+'"><b>'+escapeHTML(g.away?.abbr||'?')+' @ '+escapeHTML(g.home?.abbr||'?')+'</b><small>'+escapeHTML(g.state==='in'?(g.detail||'LIVE'):g.state==='post'?'FINAL':time(g.startTime))+'</small></button>').join(''):'<span class="lab2-no-games">No games on the current verified slate</span>';
    const matchup=selected?'<div class="lab2-matchup">'
      +gameTeam(selected.away,'AWAY')+'<div class="lab2-versus"><small>'+escapeHTML(names[selected.league]||abbr(selected.league))+' · '+escapeHTML(selected.state==='in'?'LIVE':selected.state==='post'?'FINAL':'SCHEDULED')+'</small><strong>'+escapeHTML(selected.state==='pre'?'VS':String(selected.away?.score??'—')+' : '+String(selected.home?.score??'—'))+'</strong><span>'+escapeHTML(time(selected.startTime))+'</span><small>'+escapeHTML(selected.venue||'Venue pending')+'</small></div>'+gameTeam(selected.home,'HOME')+'</div>':
      '<div class="lab2-matchup lab2-matchup--empty"><b>All-sports Research Lab</b><span>Verified player props and modeled selections across NFL, NBA, MLB and NHL.</span></div>';
    root.innerHTML='<div class="lab2-top"><div><span class="lab2-eyebrow">TSO 2.0 · RESEARCH</span><h1>Research Lab</h1><p>Game-by-game research · exact sportsbook lines · verified model intelligence</p></div><div class="lab2-top-actions"><button data-lab-refresh type="button">↻ REFRESH</button><button data-lab-props type="button">PROP BOARD →</button></div></div>'
      +'<div class="lab2-sports" role="group" aria-label="Choose sport">'+sports.map(s=>'<button type="button" data-lab-sport="'+s+'" aria-pressed="'+(state.sport===s)+'" class="'+(state.sport===s?'is-active':'')+'">'+names[s]+'</button>').join('')+'</div>'
      +'<div class="lab2-game-bar"><div class="lab2-game-heading"><b>GAME SELECTOR</b><button type="button" data-lab-all-games class="'+(state.gameId==='all'?'is-active':'')+'">ALL GAMES</button></div><div class="lab2-game-list">'+gameMarkup+'</div></div>'
      +matchup
      +'<section class="lab2-board"><div class="lab2-board-head"><div><span class="lab2-eyebrow">SOURCE-BACKED PLAYER INTELLIGENCE</span><h2>'+escapeHTML((selected?.league||state.sport)==='all'?'All Sports':names[selected?.league||state.sport]||'All Sports')+' Props Research</h2><p>Projection, probability, book, and edge appear only when verified for the exact pick.</p></div><div class="lab2-view" role="group" aria-label="Research view">'+['board','rank','lab'].map(v=>'<button data-lab-view="'+v+'" type="button" class="'+(state.view===v?'is-active':'')+'">'+v.toUpperCase()+'</button>').join('')+'</div></div>'
      +'<div class="lab2-filters"><label class="lab2-search"><span>⌕</span><input type="search" data-lab-search placeholder="Search player, team, market or sportsbook" value="'+escapeHTML(state.query)+'" aria-label="Search research selections"></label>'
      +'<label>MARKET<select data-lab-market>'+htmlOptions(marketValues.map(x=>x), 'All markets')+'</select></label>'
      +'<label>TEAM<select data-lab-team>'+htmlOptions(teams,'All teams')+'</select></label>'
      +'<label>DATA<select data-lab-model><option value="all">All verified</option><option value="matched">Modeled</option><option value="market">Market only</option></select></label></div>'
      +'<div class="lab2-summary"><span data-lab-count>Loading exact selections…</span><span data-lab-modeled></span><span>'+escapeHTML(sourceTime(newest))+'</span></div>'
      +'<div class="lab2-table-wrap" role="region" aria-label="Research data table (scroll horizontally for more metrics)" tabindex="0" data-lab-table></div>'
      +'<p class="lab2-disclaimer">No made-up probabilities, player roles, lineup metrics or usage stats. A dash means the current validated feed does not supply the value. Tap INTEL for existing detailed research; + ADD sends an exact selection to Parlay Lab.</p></section>';
    root.querySelector('[data-lab-market]').value=state.market;
    root.querySelector('[data-lab-team]').value=state.team;
    root.querySelector('[data-lab-model]').value=state.model;
    root.onclick=ev=>{
      const target=ev.target.closest('button');
      if(!target||!root.contains(target))return;
      if(target.hasAttribute('data-lab-sport')){state.gameId='';state.market='all';state.team='all';props.changeLeague?.(target.dataset.labSport);return}
      if(target.hasAttribute('data-lab-game')){state.gameId=target.dataset.labGame;state.team='all';state.market='all';render(root,context);return}
      if(target.hasAttribute('data-lab-all-games')){state.gameId='all';state.market='all';state.team='all';render(root,context);return}
      if(target.hasAttribute('data-lab-view')){state.view=target.dataset.labView;root.querySelectorAll('[data-lab-view]').forEach(b=>b.classList.toggle('is-active',b===target));drawTable(root);return}
      if(target.hasAttribute('data-lab-sort')){const key=target.dataset.labSort;if(state.sort===key)state.descending=!state.descending;else{state.sort=key;state.descending=key!=='player'}drawTable(root);return}
      if(target.hasAttribute('data-lab-detail')){props.openDetail?.(visibleRows[Number(target.dataset.labDetail)]);return}
      if(target.hasAttribute('data-lab-add')){props.addSelection?.(visibleRows[Number(target.dataset.labAdd)]);return}
      if(target.hasAttribute('data-lab-refresh')){props.refresh?.();return}
      if(target.hasAttribute('data-lab-props')){props.openProps?.();return}
    };
    root.oninput=ev=>{if(ev.target.matches('[data-lab-search]')){state.query=ev.target.value;drawTable(root)}};
    root.onchange=ev=>{
      if(ev.target.matches('[data-lab-market]'))state.market=ev.target.value;
      else if(ev.target.matches('[data-lab-team]'))state.team=ev.target.value;
      else if(ev.target.matches('[data-lab-model]'))state.model=ev.target.value;
      else return;
      drawTable(root);
    };
    drawTable(root);
  }
  window.TSO2ResearchLab={render};
})();