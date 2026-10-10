/* TSO 2.0 · game-first research, inspired by the approved video.
 * Presentation is native to the existing Outpost 2.0 broadcast shell.
 * All numeric values must originate in verified game/props/model data.
 */
(() => {
  'use strict';
  const leagues=['all','nfl','nba','mlb','nhl'];
  const labels={all:'ALL SPORTS',nfl:'NFL',nba:'NBA',mlb:'MLB',nhl:'NHL'};
  const categories={
    nfl:[['defense','Defense',null],['td','TDs',['atd','firstTd']],['key','Key players',null],['props','Props',null]],
    nba:[['points','Points',['points']],['rebounds','Rebounds',['rebounds']],['assists','Assists',['assists']],['threes','Threes',['threes']],['all','All Props',null]],
    mlb:[['hitters','Hitters',['hr','hits','totalBases','tb','rbi','runs','stolenBases']],['hr','Home Runs',['hr']],['pitching','Pitching',['strikeouts','pitcherStrikeouts','outsRecorded']],['all','All Props',null]],
    nhl:[['goals','Goals',['atg','fgs']],['shots','Shots on Goal',['sog']],['points','Points',['points','assists']],['goalies','Goalies',['saves']],['all','All Props',null]]
  };
  const primary={nfl:'td',nba:'points',mlb:'hitters',nhl:'goals'};
  const state={league:null,stage:'games',gameKey:'',tab:'',view:'lab',sort:'model',descending:true,query:'',team:'all',role:'all'};
  let ctx=null,gameList=[],visible=[];
  // Populate selected-game columns with the existing source-backed TSO player feed.
  // Odds probabilities still come ONLY from the exact player-market model rows.
  const detailCache=new Map(), detailPending=new Set(), detailQueue=[];
  const DETAIL_TTL_MS=180000;
  // A compact, branch-isolated source derived from nflverse PBP (CC BY 4.0).
  // GSIS IDs prevent accidentally assigning another player's shares/history.
  const NFL_PBP_URL='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/tso-2.0-restructure/tso2/data/nfl-td-opportunities.json';
  const pbpState={data:null,fetchedAt:0,pending:null};
  const nbaRosterCache=new Map(),nbaRosterPending=new Set();
  const nbaTeamCode=v=>({GSW:'GS',NYK:'NY',NOP:'NO',SAS:'SA',UTA:'UTAH'}[up(v)]||up(v));
  function requestNbaRoster(g){
    if(g?.league!=='nba'||typeof fetch!=='function')return;
    for(const t of [g.away,g.home]){
      const team=nbaTeamCode(t?.abbr),entry=nbaRosterCache.get(team);
      if(!team||nbaRosterPending.has(team)||(entry&&Date.now()-entry.time<600000))continue;
      nbaRosterPending.add(team);
      const endpoint='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/'+encodeURIComponent(team)+'/roster';
      fetch(endpoint,{cache:'no-store'}).then(async response=>{
        if(!response.ok)throw Error('ESPN NBA roster HTTP '+response.status);
        const payload=await response.json();
        if(!Array.isArray(payload?.athletes)||!payload?.team?.id||
          nbaTeamCode(payload.team.abbreviation)!==team)throw Error('NBA roster identity mismatch');
        const players=payload.athletes.filter(a=>a?.id&&a?.displayName).map(a=>({
          id:String(a.id),name:String(a.displayName),position:a.position?.abbreviation||'',
          headshot:a.headshot?.href||'',team
        }));
        nbaRosterCache.set(team,{time:Date.now(),snapshot:payload.timestamp||null,players});
        queueRefresh();
      }).catch(error=>{
        // Retry transient upstream failures after 30 seconds, not ten minutes.
        nbaRosterCache.set(team,{time:Date.now()-570000,snapshot:null,players:[]});
        console.warn('TSO NBA verified roster unavailable:',String(error?.message||error));
        queueRefresh();
      }).finally(()=>nbaRosterPending.delete(team));
    }
  }
  function nbaRosterResearchRows(game,exactRows){
    if(game?.league!=='nba')return [];
    const rows=[];
    for(const side of [game.away,game.home]){
      const team=nbaTeamCode(side?.abbr),entry=nbaRosterCache.get(team);
      if(!entry?.players?.length)continue;
      for(const athlete of entry.players.slice(0,30)){
        for(const market of ['points','rebounds','assists','threes']){
          if(exactRows.some(r=>r.sport==='nba'&&matchesGameTeam(r.team,side,'nba')
            &&(String(r.playerId||'')===athlete.id||sameName(r.player,athlete.name))
            &&up(r.market)===up(market)))continue;
          rows.push({
            key:'nba-verified-roster|'+id(game)+'|'+team+'|'+athlete.id+'|'+market,
            sport:'nba',player:athlete.name,playerId:athlete.id,team:up(side.abbr),
            position:athlete.position,headshotUrl:athlete.headshot,
            homeTeam:game.home.abbr,awayTeam:game.away.abbr,commenceTime:game.startTime,
            market,marketLabel:market[0].toUpperCase()+market.slice(1),
            selection:'Historical stats only',researchRosterRow:true,
            rosterSnapshot:entry.snapshot,side:'historical'
          });
        }
      }
    }
    return rows;
  }
  function nbaRecentAverage(deep,field){
    const source=deep?.recentGames;
    if(!Array.isArray(source))return null;
    const games=[...source].sort((a,b)=>(Date.parse(b.date||'')||0)-(Date.parse(a.date||'')||0));
    const values=games.map(g=>num(g.stats?.[field])).filter(v=>v!==null).slice(0,5);
    return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100:null;
  }
  function pbpPlayer(deep,year){
    const gsis=String(deep?.gsisId||'').trim();
    if(!gsis||pbpState.data?.schemaVersion!==1)return null;
    return pbpState.data.seasons?.[String(year)]?.players?.[gsis]||null;
  }
  function requestNflPbp(){
    if(typeof fetch!=='function')return;
    if(pbpState.pending||Date.now()-pbpState.fetchedAt<300000)return;
    pbpState.fetchedAt=Date.now();
    pbpState.pending=fetch(NFL_PBP_URL+'?v='+Math.floor(Date.now()/300000),{cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw Error('NFL source HTTP '+response.status);
        const payload=await response.json();
        if(payload?.schemaVersion!==1||!payload?.source?.includes('nflverse')
          ||!payload?.seasons?.['2025']?.players||!payload?.seasons?.['2026']?.players)throw Error('Unverified NFL PBP payload');
        pbpState.data=payload;
        queueRefresh();
      })
      .catch(error=>{
        // The optional situational data may not have been published yet.
        // Keep these columns unavailable rather than substituting an estimate.
        console.warn('TSO NFL PBP enrichment unavailable:',String(error?.message||error));
      })
      .finally(()=>{pbpState.pending=null;});
  }
  let activeRequests=0,hostRoot=null,refreshTimer=null;
  const detailsKey=(g,p)=>[g.league,id(g),String(p?.name||'').toLowerCase(),String(p?.team||'').toLowerCase()].join('|');
  const getDetails=(g,p)=>{
    if(!g||!p)return null;
    const entry=detailCache.get(detailsKey(g,p));
    return entry&&Date.now()-entry.time<DETAIL_TTL_MS?entry.doc:null;
  };
  const opponentFor=(g,p)=>oneOf(p.team,g.home)?g.away?.abbr:oneOf(p.team,g.away)?g.home?.abbr:'';
  function queuePlayerDetails(g,players){
    if(typeof fetch!=='function'||!g||!players?.length)return;
    for(const p of players.slice(0,40)){
      const key=detailsKey(g,p),existing=detailCache.get(key);
      if((existing&&Date.now()-existing.time<DETAIL_TTL_MS)||detailPending.has(key))continue;
      const row=p.rows[0]||{};
      const params=new URLSearchParams({
        sport:g.league,name:p.name,team:p.team||'',opponent:opponentFor(g,p)||'',
        playerId:row.playerId||row.nflPbpId||'',eventId:row.eventId||''
      });
      detailPending.add(key);
      detailQueue.push({key,url:'/api/research-detail?'+params.toString(),g,p});
    }
    pumpPlayerDetails();
  }
  function queueRefresh(){
    if(refreshTimer!==null||typeof setTimeout!=='function')return;
    refreshTimer=setTimeout(()=>{
      refreshTimer=null;
      if(state.stage!=='detail'||!hostRoot||!hostRoot.isConnected)return;
      render(hostRoot,ctx);
    },350);
  }
  function pumpPlayerDetails(){
    while(activeRequests<4&&detailQueue.length){
      const job=detailQueue.shift();
      activeRequests++;
      fetch(job.url,{cache:'no-store'}).then(async response=>{
        if(!response.ok)throw Error('Research source '+response.status);
        const payload=await response.json();
        const verifiedGsis=String(job.p.rows?.find(r=>r.nflPbpId)?.nflPbpId||'');
        const exactGsis=verifiedGsis&&String(payload?.player?.gsisId||'')===verifiedGsis;
        const found=payload?.available&&payload?.player
          &&(exactGsis||(!verifiedGsis&&sameName(payload.player.name,job.p.name)))
          &&(matchesGameTeam(payload.player.team,job.g.home,job.g.league)
            ||matchesGameTeam(payload.player.team,job.g.away,job.g.league));
        detailCache.set(job.key,{doc:found?payload:null,time:Date.now()});
        if(found&&state.stage==='detail'&&state.gameKey===id(job.g))queueRefresh();
      }).catch(()=>{
        detailCache.set(job.key,{doc:null,time:Date.now()});
      }).finally(()=>{
        activeRequests--;detailPending.delete(job.key);pumpPlayerDetails();
      });
    }
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const fmt=(v,d=1)=>num(v)===null?'—':Number(v).toFixed(d).replace(/\.0$/,'');
  const percent=v=>num(v)===null?'—':fmt(v)+'%';
  const edge=v=>num(v)===null?'—':(Number(v)>0?'+':'')+fmt(v)+' pp';
  const odds=v=>num(v)===null?'—':(Number(v)>0?'+':'')+fmt(v,0);
  const up=v=>String(v??'').toUpperCase().trim();
  // Cross-feed NFL code normalization: ESPN WSH/LAR/JAC vs nflverse WAS/LA/JAX.
  const nflCode=v=>({LAR:'LA',STL:'LA',WSH:'WAS',WFT:'WAS',JAC:'JAX',OAK:'LV'}[up(v)]||up(v));
  const matchesGameTeam=(value,team,league)=>oneOf(value,team)||(league==='nfl'&&!!value&&!!team?.abbr&&nflCode(value)===nflCode(team.abbr));
  const slug=v=>up(v).replace(/[^A-Z0-9]/g,'');
  const day=v=>{const x=Date.parse(v||'');return Number.isFinite(x)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(x)):'Time TBD'};
  const sameName=(a,b)=>!!a&&!!b&&(slug(a)===slug(b)||((String(a).trim().split(/\s+/).length>1 || String(b).trim().split(/\s+/).length>1)&&slug(a).endsWith(slug(b))&&slug(b).length>=5)|| (slug(b).endsWith(slug(a))&&slug(a).length>=5));
  const oneOf=(v,team)=>!!v&&!!team&&(sameName(v,team.abbr)||sameName(v,team.name)||sameName(v,team.displayName));
  const id=g=>[String(g.league||''),String(g.id||''),up(g.away?.abbr),up(g.home?.abbr),String(g.startTime||'')].join('|');
  const relevance=(g,r)=>{
    if(!g||g.league!==r.sport)return false;
    const eid=String(r.eventId||'').trim(),gid=String(g.id||'').trim();
    // A shared event ID alone cannot validate data across independent providers.
    // Always confirm the matchup, including canonical NFL team abbreviations.
    const home=String(r.homeTeam||''),away=String(r.awayTeam||'');
    if(!home||!away)return false;
    if(!((matchesGameTeam(home,g.home,g.league)&&matchesGameTeam(away,g.away,g.league))
      ||(matchesGameTeam(home,g.away,g.league)&&matchesGameTeam(away,g.home,g.league))))return false;
    if(r.commenceTime&&g.startTime){
      const drift=Math.abs(Date.parse(r.commenceTime)-Date.parse(g.startTime));
      if(Number.isFinite(drift)&&drift>36*60*60*1000)return false;
    }
    return true;
  };
  // Model-only NHL goal research, using the already-verified TSO scorer feed.
  // It is not a sportsbook slip: no parlay buttons or invented betting lines.
  function nhlScorerResearchRows(game,sourceGames){
    if(game?.league!=='nhl'||!Array.isArray(sourceGames))return [];
    const match=sourceGames.find(source=>{
      if(!source?.home?.abbr||!source?.away?.abbr)return false;
      if(!oneOf(source.home.abbr,game.home)||!oneOf(source.away.abbr,game.away))return false;
      const diff=Math.abs(Date.parse(source.startTime||'')-Date.parse(game.startTime||''));
      return Number.isFinite(diff)&&diff<36*60*60*1000;
    });
    if(!match)return [];
    const rows=[];
    for(const team of [match.away,match.home]){
      if(!team?.abbr)continue;
      for(const [market,primary,risky,probKey,marketKey,priceKey,bookKey,label] of [
        ['fgs',team.players,team.riskyFirstGoal,'probability','marketFirstGoalProbability','bestOdds','bestBook','First Goal'],
        ['atg',team.atgPlayers,team.riskyAtg,'anytimeProbability','anytimeMarketProbability','bestAtgOdds','bestAtgBook','Anytime Goal']
      ]){
        const seen=new Set();
        const players=[...(Array.isArray(primary)?primary:[]),...(risky?[risky]:[])];
        for(const p of players){
          const name=String(p?.name||'').trim(),key=slug(name);
          const prob=num(p?.[probKey]),marketProb=num(p?.[marketKey]);
          if(!name||!key||seen.has(key)||prob===null||prob<0||prob>1)continue;
          seen.add(key);
          const verifiedPrice=num(p?.[priceKey]);
          rows.push({
            key:'nhl-research-scorer|'+String(match.gameId||'')+'|'+up(team.abbr)+'|'+key+'|'+market,
            sport:'nhl',player:name,playerId:p.id||'',team:up(team.abbr),position:p.position||'',
            headshotUrl:p.photo||'',homeTeam:match.home.abbr,awayTeam:match.away.abbr,
            commenceTime:match.startTime,market,marketLabel:label,selection:'Yes',side:'yes',
            price:verifiedPrice,book:verifiedPrice!==null?(p?.[bookKey]||''):null,
            impliedPct:marketProb!==null&&marketProb>=0&&marketProb<=1?Math.round(marketProb*1000)/10:null,
            model:{probabilityPct:Math.round(prob*10000)/100,
              sourceLabel:'TSO NHL Scorer Model v3',phase:'pregame'},
            researchScorerModel:true,
            researchScorerStats:{
              goalsGp:num(p.seasonGoalRate),sogGp:num(p.seasonSogRate),
              l10Goals:num(p.recentGoals),l10First:num(p.recentFirstGoals)
            }
          });
        }
      }
    }
    return rows;
  }
  // Verified GSIS-keyed nflverse 2026 PBP opportunities remain useful even
  // when no sportsbook offers an exact player market for the chosen game.
  // These historical rows are NOT bets and never get implied/model odds.
  function pbpNameMatches(shortName,fullName){
    const match=String(shortName||'').trim().match(/^([A-Za-z])\.\s*(.+)$/);
    if(!match)return sameName(shortName,fullName);
    const parts=String(fullName||'').trim().split(/\s+/);
    if(parts.length<2||up(parts[0][0])!==up(match[1]))return false;
    return slug(parts.slice(1).join(' '))===slug(match[2]);
  }
  function nflPbpResearchRows(game){
    if(game?.league!=='nfl'||!pbpState.data?.seasons?.['2026']?.players)return [];
    const sourceAge=Date.parse(pbpState.data.generatedAt||'');
    // Historical PBP is still valid when the snapshot is old. Date it in the UI;
    // never use a stale snapshot as a current forecast input.
    if(!Number.isFinite(sourceAge)||sourceAge>Date.now()+86400000)return [];
    const all=pbpState.data.seasons['2026'].players;
    const extras=[];
    for(const team of [up(game.away?.abbr),up(game.home?.abbr)]){
      if(!team)continue;
      const sourceTeam=nflCode(team);
      const choices=Object.entries(all).filter(([gsis,p])=>
        /^00-\d{7}$/.test(gsis)&&nflCode(p?.team)===sourceTeam
        &&(num(p.carries)??0)+(num(p.targets)??0)>0
        &&Number(p.gamesWithOpportunities||0)>=1
        &&String(p.name||'').trim()
      ).sort((a,b)=>(Number(b[1].carries||0)+Number(b[1].targets||0))
        -(Number(a[1].carries||0)+Number(a[1].targets||0))).slice(0,18);
      for(const [gsis,p] of choices){
        const possible=(ctx?.rows||[]).filter(r=>r.sport==='nfl'&&up(r.team)===team
          &&pbpNameMatches(p.name,r.player));
        const known=possible.length===1?possible[0]:null;
        extras.push({
          key:'nfl-pbp|'+id(game)+'|'+gsis,sport:'nfl',
          player:known?.player||p.name,playerId:known?.playerId||'',nflPbpId:gsis,
          headshotUrl:known?.headshotUrl||'',team,position:known?.position||'',
          market:'atd',marketLabel:'Touchdown opportunities',side:'yes',
          selection:'Historical data only',researchPbpRow:true,
          homeTeam:game.home?.abbr,awayTeam:game.away?.abbr,
          commenceTime:game.startTime
        });
      }
    }
    return extras;
  }
  // A source-only NFL row still deserves working Intel even without a bettable prop.
  // This dialog contains only nflverse PBP counts/shares keyed to the exact GSIS ID.
  function openPbpIntel(p){
    const r=p?.rows?.find(item=>item.researchPbpRow),playerId=r?.nflPbpId;
    const now=pbpState.data?.seasons?.['2026']?.players?.[playerId];
    const prior=pbpState.data?.seasons?.['2025']?.players?.[playerId];
    if(!r||!now||typeof document==='undefined')return;
    document.querySelector('[data-rg2-pbp-intel]')?.remove();
    const dlg=document.createElement('dialog');
    dlg.className='rg2-pbp-intel';dlg.dataset.rg2PbpIntel='1';
    const value=(v,suffix='')=>num(v)===null?'—':fmt(v,Number(v)%1?1:0)+suffix;
    const items=[
      ['2026 GAMES WITH OPPORTUNITIES',now.gamesWithOpportunities],
      ['2026 CARRIES',now.carries],['2026 TARGETS',now.targets],
      ['2026 RED-ZONE OPPORTUNITIES',now.redZoneOpps],
      ['2026 GOAL-LINE OPPORTUNITIES',now.goalLineOpps],
      ['2026 CARRY SHARE',now.carrySharePct,'%'],
      ['2026 TARGET SHARE',now.targetSharePct,'%'],
      ['2026 RED-ZONE SHARE',now.redZoneSharePct,'%'],
      ['2026 GOAL-LINE SHARE',now.goalLineSharePct,'%'],
      ['2026 RED-ZONE TD YIELD',now.redZoneTdYieldPct,'%'],
      ['2026 FIRST TD GAMES',now.firstTdGames],
      ['2025 FIRST TD GAMES',prior?.firstTdGames]
    ];
    const updated=String(pbpState.data?.generatedAt||'').slice(0,10)||'Date unavailable';
    dlg.innerHTML='<div class="rg2-pbp-shell">'
      +'<div class="rg2-pbp-head"><div><small>TSO 2.0 / VERIFIED NFLVERSE PBP</small><h2>'+esc(p.name)+'</h2><p>'+esc(up(p.team))+' · Historical usage snapshot as of '+esc(updated)+'</p></div>'
      +'<button type="button" data-rg2-pbp-close aria-label="Close NFL stats">×</button></div>'
      +'<div class="rg2-pbp-stats">'+items.map(([label,v,suffix])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value(v,suffix||''))+'</strong></div>').join('')+'</div>'
      +'<p class="rg2-pbp-disclaimer">Source: nflverse / nflfastR play-by-play (CC BY 4.0). Historical counts and team shares only. No sportsbook price or predictive probability is inferred from these values.</p></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('[data-rg2-pbp-close]')?.addEventListener('click',()=>dlg.close());
    dlg.addEventListener('click',event=>{if(event.target===dlg)dlg.close()});
    dlg.addEventListener('close',()=>dlg.remove(),{once:true});
    if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  }
  const exactActionRow=p=>choose((p?.rows||[]).filter(r=>!r.researchScorerModel&&!r.researchPbpRow&&!r.researchRosterRow))||null;
  const addActionButton=(p,i)=>'<button type="button" data-rg2-add="'+i+'"'
    +(exactActionRow(p)?'':' disabled title="No verified exact sportsbook selection"')
    +'>+ ADD</button>';
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
    const money=l?.moneyline?(num(l.moneyline.homeBest??l.moneyline.home?.price)!==null?up(g.home?.abbr)+' '+odds(l.moneyline.homeBest??l.moneyline.home?.price):'—'):'—';
    return {spread,total,money};
  }
  function team(gteam,cls=''){
    const image=gteam?.logo?'<img data-team-logo alt="" src="'+esc(gteam.logo)+'" loading="lazy">':'<span>'+esc(gteam?.abbr||'—')+'</span>';
    return '<span class="rg2-team '+cls+'"><span class="rg2-logo">'+image+'</span><span class="rg2-team-copy"><b>'+esc(gteam?.abbr||'—')+'</b><small>'+esc(gteam?.name||'')+'</small></span></span>';
  }
  // The same TSO 2.0 broadcast destination header is used across Live, Models,
  // Props and Research. Keep it visible when a matchup is opened.
  function researchChrome(stage,game=null){
    const selected=stage==='detail',sport=game?.league||state.league||'all';
    const heading=selected?'Matchup <em>Research</em>':'Game Research <em>Lab</em>';
    const description=selected
      ?'Explore this matchup with verified player trends, model outputs and market context. Switch games below without leaving Research.'
      :'Choose a matchup to explore the Board, Rank and Lab views, with player stats backed by the available data feeds.';
    return '<header class="destination-hero rg2-destination-hero'+(selected?' rg2-destination-hero--detail':'')+'">'
      +'<div class="rg2-destination-copy"><div class="rg2-title-lockup">'
      +'<img class="rg2-hero-icon" src="/brand/production/tso2-product-research-approved.webp" alt="" loading="lazy">'
      +'<span class="destination-kicker rg2-destination-kicker"><i></i> RESEARCH COMMAND CENTER · '+esc(labels[sport]||labels.all)+'</span></div>'
      +'<h1>'+heading+'</h1><p>'+description+'</p></div>'
      +'<div class="destination-actions rg2-destination-actions">'
      +'<span class="rg2-source-status"><i></i> VERIFIED FEEDS ONLY</span>'
      +'<button type="button" class="button primary rg2-refresh" data-rg2-refresh>↻ REFRESH DATA</button>'
      +'</div></header>'
      +'<div class="rg2-status-deck" aria-label="Research status">'
      +'<div class="rg2-status-item"><span>RESEARCH DESK</span><strong>TSO 2.0</strong></div>'
      +'<div class="rg2-status-item"><span>CURRENT SLATE</span><strong>'+gameList.length+' GAME'+(gameList.length===1?'':'S')+'</strong></div>'
      +'<div class="rg2-status-item"><span>SELECTED SPORT</span><strong>'+esc(labels[sport]||labels.all)+'</strong></div>'
      +'<div class="rg2-status-item rg2-status-item--last"><span>PLAYER INTELLIGENCE</span><strong>VERIFIED SOURCES</strong></div>'
      +'</div>';
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
    return researchChrome('games')
      +'<div class="rg2-filter-row live-filter-strip" aria-label="Sport filters">'
      +'<div class="rg2-leagues segmented destination-segmented" role="group" aria-label="Sports">'+leagues.map(k=>'<button type="button" data-rg2-league="'+k+'" class="'+(k===state.league?'is-active':'')+'" aria-pressed="'+(k===state.league)+'">'+esc(labels[k])+'</button>').join('')+'</div>'
      +'<span class="rg2-count">'+gameList.length+' matchup'+(gameList.length===1?'':'s')+' available</span></div>'
      +'<section class="destination-section rg2-game-section"><div class="destination-section-head rg2-section-header"><div><span class="rg2-section-kicker">MATCHUP BOARD</span><h2>'+esc(state.league==='nfl'?'This week’s games':state.league==='all'?'Current games':'Available games')+'</h2></div><small>SELECT A MATCHUP →</small></div>'
      +(gameList.length?'<div class="rg2-cards">'+html+'</div>':'<div class="rg2-empty"><b>No games currently listed for '+esc(labels[state.league])+'.</b><span>Check another sport or refresh when the next slate is published. No simulated games are shown.</span></div>')
      +'</section>';
  }
  function detail(){
    const g=gameList.find(x=>id(x)===state.gameKey);
    if(!g){state.stage='games';return cards()}
    const m=markets(g),all=ctx.rows||[];
    const matched=all.filter(r=>relevance(g,r));
    const pbp=nflPbpResearchRows(g);
    const exact=matched.map(r=>{
      const info=pbp.find(p=>up(p.team)===up(r.team)&&pbpNameMatches(p.player,r.player));
      return info?{...r,nflPbpId:info.nflPbpId}:r;
    });
    const scorer=nhlScorerResearchRows(g,ctx.scorerGames);
    if(g.league==='nba')requestNbaRoster(g);
    const roster=nbaRosterResearchRows(g,exact);
    const actual=[...exact,
      ...pbp.filter(row=>!exact.some(existing=>up(existing.team)===up(row.team)
        &&(existing.nflPbpId===row.nflPbpId||pbpNameMatches(row.player,existing.player)))),
      ...scorer.filter(row=>!exact.some(existing=>sameName(existing.player,row.player)&&up(existing.team)===up(row.team)&&up(existing.market)===up(row.market)&&yes(existing))),
      ...roster];
    const tabs=categories[g.league]||[['all','All Props',null]];
    if(!tabs.some(t=>t[0]===state.tab)){state.tab=primary[g.league]||'all';state.sort=g.league==='nfl'?'atd':g.league==='mlb'?'hr':g.league==='nhl'?'atg':'points';}
    const active=tabs.find(t=>t[0]===state.tab)||tabs[0];
    const filtered=active[2]?actual.filter(r=>active[2].includes(r.market)):actual;
    const roleChoices=[...new Set(filtered.map(r=>String(r.position||r.role||'').trim()).filter(Boolean))].sort();
    const selection=filtered.filter(r=>(state.team==='all'||up(r.team)===state.team||(state.team===up(g.away?.abbr)&&oneOf(r.team,g.away))||(state.team===up(g.home?.abbr)&&oneOf(r.team,g.home)))
      &&(state.role==='all'||String(r.position||r.role||'')===state.role)
      &&(!state.query||[r.player,r.team,r.market,r.marketLabel].filter(Boolean).join(' ').toLowerCase().includes(state.query.toLowerCase())));
    const selectedRows=state.tab==='key'?selection.filter(validModel):selection;
    const players=(state.tab==='all'||state.tab==='props')?
      [...selectedRows.filter(r=>!r.researchRosterRow).map(r=>({key:String(r.key),name:r.player,team:r.team,role:r.position||r.role||'',rows:[r]})),
       ...groupPlayers(selectedRows.filter(r=>r.researchRosterRow))]
      :groupPlayers(selectedRows);
    const historicalOnly=g.league==='nfl'&&state.tab==='td'&&selectedRows.some(r=>r.researchPbpRow)&&!selectedRows.some(validModel);
    const nbaHistoryOnly=g.league==='nba'&&selectedRows.some(r=>r.researchRosterRow)&&!selectedRows.some(validModel);
    const nbaRosterLoading=g.league==='nba'&&[g.away,g.home].some(side=>nbaRosterPending.has(nbaTeamCode(side?.abbr)));
    const nbaRankKey={points:'nbaL5Pts',rebounds:'nbaL5Reb',assists:'nbaL5Ast',threes:'nbaL5Threes'}[state.tab]||'nbaL5Pts';
    if(historicalOnly&&['model','atd'].includes(state.sort))state.sort='opps';
    if(nbaHistoryOnly&&['model','points','rebounds','assists','threes'].includes(state.sort))state.sort=nbaRankKey;
    // Verified GSIS-backed historical players must hydrate too, even when
    // their sportsbook does not list an exact touchdown selection.
    queuePlayerDetails(g,players.filter(p=>p.rows.some(r=>!r.researchPbpRow||r.nflPbpId)));
    if(g.league==='nfl')requestNflPbp();
    const cols=columns(g.league,state.tab);
    const sortValue=p=>cellRaw(p,state.sort,g.league);
    players.sort((a,b)=>{const x=sortValue(a),y=sortValue(b);if(x===null&&y!==null)return 1;if(x!==null&&y===null)return -1;
      const cmp=typeof x==='string'||typeof y==='string'?String(x||'').localeCompare(String(y||'')):(Number(x||0)-Number(y||0));
      return (state.descending?-1:1)*cmp||String(a.name).localeCompare(String(b.name))});
    visible=players.slice(0,180);
    const modeInfo=actual.filter(r=>validModel(r)).length;
    const pbpSnapshot=pbp.length&&pbpState.data?.generatedAt?String(pbpState.data.generatedAt).slice(0,10):null;
    const onlyPbp=p=>!!p?.rows?.length&&p.rows.every(r=>r.researchPbpRow);
    const onlyRoster=p=>!!p?.rows?.length&&p.rows.every(r=>r.researchRosterRow);
    const historyKey=p=>onlyPbp(p)?'opps':nbaRankKey;
    const historyLabel=p=>onlyPbp(p)?'2026 VERIFIED OPPORTUNITIES':'VERIFIED L5 '+({nbaL5Pts:'POINTS',nbaL5Reb:'REBOUNDS',nbaL5Ast:'ASSISTS',nbaL5Threes:'THREES'}[nbaRankKey]||'POINTS');
    const ticker=gameList.filter(v=>v.league===g.league).map(v=>'<button type="button" data-rg2-game="'+esc(id(v))+'" class="'+(id(v)===state.gameKey?'is-active':'')+'">'+esc(up(v.away?.abbr))+' @ '+esc(up(v.home?.abbr))+' <small>'+esc(v.state==='pre'?day(v.startTime):v.state==='in'?'LIVE':'FINAL')+'</small></button>').join('');
    const header='<div class="rg2-detail-top"><button type="button" class="rg2-back" data-rg2-back>← BACK TO MATCHUPS</button><span class="rg2-kicker">THE SPORTS OUTPOST / '+esc(labels[g.league])+' GAME LAB</span><span class="rg2-source-status '+(actual.length?'':'is-pending')+'"><i></i>'+(actual.length?(exact.length?'VERIFIED PLAYER FEED':pbp.length?'NFLVERSE PBP DATA':roster.length?'ESPN NBA ROSTER':'TSO SCORER MODEL'):nbaRosterLoading?'CONNECTING ESPN ROSTER':'PLAYER FEED UNAVAILABLE')+'</span></div>'
      +'<div class="rg2-matchup-strip"><div class="rg2-matchup-teams">'+team(g.away)+ '<span class="rg2-at">'+(g.state==='pre'?'@':esc(String(g.away?.score??'—')+' – '+String(g.home?.score??'—')))+'</span>'+team(g.home)+'</div>'
      +'<div class="rg2-matchup-markets"><span><small>SPREAD</small><strong>'+esc(m.spread)+'</strong></span><span><small>TOTAL</small><strong>'+esc(m.total)+'</strong></span><span><small>MONEYLINE</small><strong>'+esc(m.money)+'</strong></span><span><small>'+esc(g.state==='in'?'LIVE':g.state==='post'?'FINAL':'START')+'</small><strong>'+esc(day(g.startTime))+'</strong></span></div></div>'
      +'<div class="rg2-game-rail-heading"><b>ON THE SLATE</b><small>Switch games without leaving Research</small></div><div class="rg2-game-rail" role="group" aria-label="Choose another game">'+ticker+'</div>';
    const choices=(values,label,current)=>'<option value="all">'+esc(label)+'</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('');
    const boardCards='<div class="rg2-player-grid">'+visible.map((p,i)=>'<article class="rg2-player-card">'
      +'<div class="rg2-player-card-top">'+playerTitle(p)+'<span class="rg2-card-index">#'+String(i+1).padStart(2,'0')+'</span></div>'
      +'<div class="rg2-player-card-number"><small>'+(onlyPbp(p)||onlyRoster(p)?historyLabel(p):'VERIFIED MODEL CHANCE')+'</small><b>'+metric(p,onlyPbp(p)||onlyRoster(p)?historyKey(p):'model',g.league)+'</b></div>'
      +'<div class="rg2-player-card-values">'+(onlyPbp(p)?'<span>GOAL LINE <b>'+metric(p,'gl',g.league)+'</b></span><span>TARGET SHARE <b>'+metric(p,'target',g.league)+'</b></span>':onlyRoster(p)?'<span>L5 PTS <b>'+metric(p,'nbaL5Pts',g.league)+'</b></span><span>L5 REB <b>'+metric(p,'nbaL5Reb',g.league)+'</b></span>':'<span>MARKET <b>'+metric(p,'market',g.league)+'</b></span><span>EDGE <b>'+metric(p,'edge',g.league)+'</b></span>')+'</div>'
      +'<div class="rg2-player-card-actions"><button type="button" data-rg2-intel="'+i+'">PLAYER INTEL →</button>'+addActionButton(p,i)+'</div>'
      +'</article>').join('')+'</div>';
    const rankRows='<div class="rg2-rank-list" aria-label="Player rankings">'
      +visible.map((p,i)=>'<article class="rg2-rank-row">'
        +'<strong class="rg2-rank-number">'+String(i+1).padStart(2,'0')+'</strong><div class="rg2-rank-player">'+playerTitle(p)+'</div>'
        +'<div class="rg2-rank-metric"><small>'+(onlyPbp(p)?'2026 OPPS':onlyRoster(p)?'VERIFIED L5':'MODEL')+'</small><b>'+metric(p,onlyPbp(p)||onlyRoster(p)?historyKey(p):'model',g.league)+'</b></div>'
        +'<div class="rg2-rank-metric"><small>'+(onlyPbp(p)?'GOAL LINE':onlyRoster(p)?'L5 PTS':'MARKET')+'</small><b>'+metric(p,onlyPbp(p)?'gl':onlyRoster(p)?'nbaL5Pts':'market',g.league)+'</b></div>'
        +'<div class="rg2-rank-metric"><small>'+(onlyPbp(p)?'TGT SHARE':onlyRoster(p)?'L5 AST':'EDGE')+'</small><b>'+metric(p,onlyPbp(p)?'target':onlyRoster(p)?'nbaL5Ast':'edge',g.league)+'</b></div>'
        +'<div class="rg2-rank-actions"><button type="button" data-rg2-intel="'+i+'">INTEL</button>'+addActionButton(p,i)+'</div>'
        +'</article>').join('')+'</div>';
    const labTable='<div class="rg2-table-scroll" role="region" tabindex="0" aria-label="'+esc(labels[g.league])+' research table; scroll horizontally for all columns">'
      +'<table class="rg2-table"><thead><tr><th scope="col">PLAYER <span class="rg2-sticky-hint">↔ SCROLL STATS</span></th>'
      +cols.map(([key,label])=>'<th scope="col"><button type="button" data-rg2-sort="'+key+'" aria-label="Sort '+esc(label)+'" aria-pressed="'+(key===state.sort)+'">'+esc(label)+' <i>'+(key===state.sort?(state.descending?'↓':'↑'):'↕')+'</i></button></th>').join('')
      +'<th scope="col">ACTIONS</th></tr></thead><tbody>'
      +visible.map((p,i)=>'<tr><td>'+playerTitle(p)+'</td>'
        +cols.map(([key])=>'<td class="rg2-val rg2-val-'+key+'">'+metric(p,key,g.league)+'</td>').join('')
        +'<td class="rg2-action"><button type="button" data-rg2-intel="'+i+'">INTEL</button>'+addActionButton(p,i)+'</td></tr>').join('')
      +'</tbody></table></div>';
    const board=state.view==='board'?boardCards:state.view==='rank'?rankRows:labTable;
    return researchChrome('detail',g)+header+'<section class="destination-section rg2-detail">'
      +'<div class="rg2-detail-nav"><div class="rg2-tabs" role="group" aria-label="Research category">'+tabs.map(([v,l])=>'<button type="button" data-rg2-tab="'+v+'" class="'+(v===state.tab?'is-active':'')+'">'+esc(l)+'</button>').join('')+'</div>'
      +'<div class="rg2-view" role="group" aria-label="Research display">'+['board','rank','lab'].map(v=>'<button type="button" data-rg2-view="'+v+'" class="'+(v===state.view?'is-active':'')+'">'+v.toUpperCase()+'</button>').join('')+'</div></div>'
      +'<div class="rg2-lab-heading"><div><span class="rg2-kicker">OUTPOST RESEARCH / '+esc(labels[g.league])+'</span><h2>'+esc(active[1])+' <em>Lab</em></h2><p>Game-specific stats and model signals from verified feeds.'+(scorer.length?' NHL scorer-model rows are not sportsbook selections.':'')+(pbp.length?' NFL PBP usage is historical data'+(pbpSnapshot?' as of '+pbpSnapshot:'')+', not a sportsbook offer.':'')+(roster.length?' ESPN NBA roster rows display only verified historical box-score stats. No sportsbook line, projection, or probability is inferred.':'')+'</p></div><div class="rg2-lab-status"><b>'+visible.length+' PLAYERS</b><small>'+modeInfo+' modeled selections for this matchup</small></div></div>'
      +(g.league==='nfl'&&['td','key'].includes(state.tab)?'<div class="rg2-atd-legend" aria-label="Anytime touchdown percentage sources"><b>ANYTIME TD % SOURCES</b><span><i class="rg2-source-pip rg2-source-pip--model"></i> MODEL: TSO chance</span><span><i class="rg2-source-pip rg2-source-pip--market"></i> MARKET: sportsbook implied (vig)</span><span><i class="rg2-source-pip rg2-source-pip--history"></i> HIST: actual TD game rate (not a prediction)</span></div>':'')
      +'<div class="rg2-mode-description"><span class="rg2-mode-indicator">'+esc(state.view.toUpperCase())+' VIEW</span><p>'+esc(state.view==='board'?'Player cards focused on model strength, market and edge.':state.view==='rank'?(historicalOnly?'Ranked by verified 2026 carries + targets, not predicted touchdown probability.':nbaHistoryOnly?'Ranked by verified last-five game averages, not predicted probabilities.':'Ranked players using the active column and sort direction.'):'Full statistical lab: compare player production, usage and model context side by side.')+'</p></div>'
      +'<div class="rg2-searchbar"><label class="rg2-find"><span>⌕</span><input data-rg2-search type="search" placeholder="Search players or stats" value="'+esc(state.query)+'" aria-label="Filter players"></label>'
      +'<label>TEAM <select data-rg2-team>'+choices([up(g.away?.abbr),up(g.home?.abbr)].filter(Boolean),'Both teams',state.team)+'</select></label>'
      +'<label>ROLE <select data-rg2-role>'+choices(roleChoices,'All positions',state.role)+'</select></label>'
      +'<button type="button" data-rg2-refresh class="rg2-refresh">↻ REFRESH</button></div>'
      +(visible.length?board:nbaRosterLoading?'<div class="rg2-empty" role="status"><b>Loading verified NBA rosters…</b><span>Connecting to ESPN player records. Historical research will appear independently of sportsbook availability.</span></div>':'<div class="rg2-empty"><b>No verified '+esc(active[1].toLowerCase())+' player data available for this matchup.</b><span>Sportsbook markets and exact player models will appear here when their source feed has this game. Try another tab or game.</span></div>')
      +'<details class="rg2-method"><summary>ABOUT THESE NUMBERS <span>Data sources &amp; methodology ↓</span></summary><div class="rg2-note">— means the exact statistic is unavailable. NFL TD usage: carry share = player / team carries; GL = share of opportunities inside 5 yards; RZ = share of carries + targets inside 20; yield = RZ TDs / RZ opportunities. 2025 1ST = first TDs scored / games played. These are TSO calculations from nflverse PBP, not the reference app’s proprietary scoring. ANYTIME TD % prefers a validated game-specific model, then exact sportsbook-implied percentage including margin, then a verified historical last-up-to-10-games TD hit rate labeled HIST. Bookmaker and historic percentages must not be mistaken for model probabilities. FIRST % is an experimental uncalibrated NFL first-TD estimate. All TSO PURITY scores are separate 0–100 data-quality/opportunity consistency indexes, not probabilities; NBA/NHL/MLB depend on selected-market recent verified game logs. Estimates require verified 2025/2026 nflverse GSIS data and at least two 2026 player games. INTEL opens Deep Research.</div></details>'
      +'</section>';
  }
  function groupPlayers(rows){
    const groups=new Map();
    for(const r of rows){
      const k=[r.sport,slug(r.playerId||r.nflPbpId||r.player),up(r.team)].join('|');
      let p=groups.get(k);
      if(!p){p={key:k,name:r.player,team:r.team,role:r.position||r.role||'',headshotUrl:r.headshotUrl,rows:[]};groups.set(k,p)}
      if(!p.headshotUrl&&r.headshotUrl)p.headshotUrl=r.headshotUrl;
      p.rows.push(r);
    }
    return [...groups.values()];
  }
  function best(p){return choose(p.rows.filter(r=>validModel(r)))||choose(p.rows)||null}
  function forP(p,market){return forMarket(p.rows,market,true)}
  // Verified game logs can fill historical form columns independently of
  // predictive model probabilities. Every rate uses the EXACT sportsbook line
  // and side, and pushes are omitted from the decisions denominator.
  function recentPropStats(p,sport,windowSize){
    const pick=best(p||{rows:[]});
    const game=gameList.find(g=>id(g)===state.gameKey);
    const deep=getDetails(game,p)?.player||{};
    if(!pick||!Object.keys(deep).length)return null;
    const market=String(pick.market||'');
    const binary=['atd','firstTd','atg','fgs','hr'].includes(market);
    const line=num(pick.line)??(binary?0.5:null);
    if(line===null)return null;
    const source=sport==='nfl'?deep.gameLog: sport==='mlb'?deep.gameLog:deep.recentGames;
    if(!Array.isArray(source))return null;
    const mapped={nfl:{atd:'tds',recYds:'recYds',rushYds:'rushYds',passYds:'passYds',passTds:'passTds',receptions:'receptions',completions:'completions'},
      nba:{points:'points',rebounds:'rebounds',assists:'assists',threes:'threes',pra:'pra'},
      nhl:{atg:'goals',fgs:'firstGoal',sog:'sog',points:'points',assists:'assists',saves:'saves'},
      mlb:{hr:'hr',hits:'h',rbi:'rbi',runs:'r',totalBases:'totalBases',stolenBases:'stolenBases'}}[sport]||{};
    const stat=mapped[market];
    if(!stat)return null;
    const sorted=[...source].sort((a,b)=>{
      const x=Date.parse(a.date||''),y=Date.parse(b.date||'');
      return Number.isFinite(x)&&Number.isFinite(y)?y-x:0;
    });
    const decisions=[];
    for(const row of sorted){
      let v;
      if(sport==='nfl')v=num(row[stat]);
      else if(sport==='mlb')v=num(row[stat]);
      else if(sport==='nhl'&&stat==='firstGoal')v=typeof row.firstGoal==='boolean'?(row.firstGoal?1:0):null;
      else v=num(row.stats?.[stat]);
      if(v!==null){decisions.push(v);if(decisions.length>=windowSize)break;}
    }
    if(!decisions.length)return null;
    const under=pick.side==='under';
    const pushes=decisions.filter(x=>Math.abs(x-line)<1e-9).length;
    const hits=decisions.filter(x=>under?x<line:x>line).length;
    const nonPush=decisions.length-pushes;
    return nonPush?{rate:+(hits/nonPush*100).toFixed(1),hits,nonPush,actual:decisions.length,market,line,side:pick.side}:null;
  }
  function recentMinutes(deep,sport){
    const games=deep?.recentGames;
    if(!Array.isArray(games))return null;
    const values=[];
    for(const row of games.slice(0,5)){
      let minutes=num(row.minutes);
      if(sport==='nhl'){
        const raw=row.stats?.toi||row.stats?.timeOnIce||row.toi;
        if(typeof raw==='string'&&/^\d{1,2}:\d\d$/.test(raw)){
          const [min,sec]=raw.split(':').map(Number);minutes=min+sec/60;
        }else minutes=num(raw);
      }
      if(minutes!==null)values.push(minutes);
    }
    return values.length?+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2):null;
  }
  // Market-specific TSO Purity for non-NFL sports.
  // A descriptive opportunity/consistency index, never a scoring chance.
  // All factors below are derived from the selected player's verified
  // historical game log / Statcast; no odds, model %, or fabricated defaults.
  function otherSportPurity(game,p,sport){
    const detail=getDetails(game,p);
    const d=detail?.player||{},row=best(p);
    if(!d||!row||!['nba','nhl','mlb'].includes(sport))return null;
    const market=String(row.market||'');
    // A yes/no goal or HR occurrence is exactly the >0.5 event, not
    // a nearby substituted sportsbook line. Other markets require
    // their source-supplied numeric threshold.
    const yesNo=['atg','hr'].includes(market)
      &&['yes','over'].includes(String(row.side||'').toLowerCase());
    const line=num(row.line)??(yesNo?0.5:null);
    if(line===null)return null;
    const leagueMarkets={
      nba:{points:'points',rebounds:'rebounds',assists:'assists',threes:'threes'},
      nhl:{atg:'goals',sog:'sog',points:'points',assists:'assists',saves:'saves'},
      mlb:{hr:'hr',hits:'h',rbi:'rbi',runs:'r',totalBases:'totalBases'}
    };
    const field=leagueMarkets[sport]?.[market];
    if(!field)return null;
    const games=sport==='mlb'?d.gameLog:d.recentGames;
    if(!Array.isArray(games))return null;
    const values=[],minutes=[];
    for(const g of [...games].sort((a,b)=>(Date.parse(b.date||'')||0)-(Date.parse(a.date||'')||0))){
      if(sport==='nba'&&g.usedInProjection===false)continue;
      let value=sport==='mlb'?num(g[field]):num(g.stats?.[field]);
      if(value===null)continue;
      values.push(value);
      if(sport==='nba'){
        const time=num(g.minutes);
        if(time!==null&&time>=0&&time<65)minutes.push(time);
      }
      if(sport==='nhl'){
        const raw=g.stats?.toi||g.stats?.timeOnIce||g.toi;
        let time=num(raw);
        if(typeof raw==='string'&&/^\d{1,3}:\d{2}$/.test(raw)){
          const [mm,ss]=raw.split(':').map(Number);
          time=ss<60?mm+ss/60:null;
        }
        if(time!==null&&time>=0&&time<=70)minutes.push(time);
      }
      if(values.length===10)break;
    }
    if(values.length<5)return null;
    const yes=String(row.side||'').toLowerCase()==='under';
    const pushes=values.filter(x=>Math.abs(x-line)<1e-9).length;
    const trials=values.length-pushes;
    if(trials<5)return null;
    const wins=values.filter(x=>yes?x<line:x>line).length;
    const hitRate=100*wins/trials;
    const mean=values.reduce((a,b)=>a+b,0)/values.length;
    const sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length);
    const stability=100/(1+sd/Math.max(1,mean));
    const clamp=v=>Math.max(0,Math.min(100,v));
    const sampleScale=0.65+0.35*Math.min(values.length/10,1);
    let strength=null;
    if(sport==='nba'){
      if(minutes.length<5)return null;
      const minMean=minutes.reduce((a,b)=>a+b,0)/minutes.length;
      strength=clamp(minMean/36*100);
      return Math.round(clamp((0.45*hitRate+0.35*stability+0.20*strength)*sampleScale));
    }
    if(sport==='nhl'){
      if(minutes.length<5)return null;
      const avg=minutes.reduce((a,b)=>a+b,0)/minutes.length;
      const deviation=Math.sqrt(minutes.reduce((a,b)=>a+(b-avg)**2,0)/minutes.length);
      strength=100/(1+deviation/Math.max(1,avg));
      return Math.round(clamp((0.45*hitRate+0.35*stability+0.20*strength)*sampleScale));
    }
    if(sport==='mlb'){
      const hardHit=num(d.statcast?.hardHitPct),barrel=num(d.statcast?.barrelPct);
      if(hardHit===null||barrel===null||hardHit<0||hardHit>100||barrel<0||barrel>100)return null;
      const contact=clamp(hardHit),power=clamp(barrel/20*100);
      return Math.round(clamp((0.45*hitRate+0.30*contact+0.25*power)*sampleScale));
    }
    return null;
  }
  // TSO experimental FIRST touchdown forecast (v0.1).
  // This is not a calibrated betting probability. The total probability
  // across all players in a game is capped by observed offensive-first-TD
  // frequency; defense, special teams, and no-TD outcomes retain mass.
  // No undocumented third-party First%/Purity values are copied.
  function firstTdInputs(game,player){
    if(game?.league!=='nfl'||game.state!=='pre')return null;
    const doc=pbpState.data;
    const past=doc?.seasons?.['2025'],current=doc?.seasons?.['2026'];
    const sourceAge=Date.parse(doc?.generatedAt||'');
    if(!Number.isFinite(sourceAge)||Date.now()-sourceAge>10*24*3600*1000)return null;
    if(!past?.teams||!current?.teams||!Number.isFinite(Number(past.offensiveFirstTdGames))
      ||!Number.isFinite(Number(current.offensiveFirstTdGames)))return null;
    const detail=getDetails(game,player)?.player||{};
    const playerId=String(detail.gsisId||player?.rows?.find(r=>r.nflPbpId)?.nflPbpId||'');
    const team=nflCode(detail.team||player?.team);
    if(!playerId||!team||![game.home,game.away].some(side=>nflCode(side?.abbr)===team))return null;
    const recent=current.players?.[playerId],prior=past.players?.[playerId];
    if(!recent||nflCode(recent.team)!==team||Number(recent.gamesWithOpportunities||0)<2)return null;
    const currentTeam=current.teams[team];
    if(!currentTeam||Number(currentTeam.gamesPlayed||0)<2)return null;
    return {doc,past,current,team,playerId,recent,
      prior:up(prior?.team)===team?prior:null,currentTeam};
  }
  function firstTdTeamStrength(yearNow,yearBefore,team){
    const a=yearNow.teams?.[team],b=yearBefore.teams?.[team];
    if(!a||!b)return null;
    const cg=num(a.gamesPlayed),pg=num(b.gamesPlayed);
    const cf=num(a.firstTdOffenseGames)||0,pf=num(b.firstTdOffenseGames)||0;
    if(cg===null||pg===null||cg<2||pg<12)return null;
    // Beta(0.5,0.5) prior; weight last season at 0.6 to favor current games.
    return (cf+0.6*pf+0.5)/(cg+0.6*pg+1);
  }
  function firstTdPlayerWeight(recent,prior,teamStats){
    if(!recent||!teamStats)return 0;
    const rzDen=num(teamStats.redZoneOpps),glDen=num(teamStats.goalLineOpps);
    const opportunityDen=(num(teamStats.carries)||0)+(num(teamStats.targets)||0);
    const rz=rzDen?Math.max(0,(num(recent.redZoneOpps)||0)/rzDen):0;
    const gl=glDen?Math.max(0,(num(recent.goalLineOpps)||0)/glDen):0;
    const touches=opportunityDen?
      Math.max(0,((num(recent.carries)||0)+(num(recent.targets)||0))/opportunityDen):0;
    const firstNow=num(recent.firstTdGames)||0;
    const firstPrev=num(prior?.firstTdGames)||0;
    return 0.015 + 0.75*firstNow + 0.35*firstPrev
      + 2.5*rz + 1.5*gl + 0.45*touches;
  }
  function firstTdEstimate(game,player){
    const input=firstTdInputs(game,player);
    if(!input)return null;
    const {past,current,team,recent,prior,currentTeam}=input;
    const home=nflCode(game.home?.abbr),away=nflCode(game.away?.abbr);
    const homeStrength=firstTdTeamStrength(current,past,home);
    const awayStrength=firstTdTeamStrength(current,past,away);
    if(homeStrength===null||awayStrength===null)return null;
    const totalGames=(num(past.gamesScanned)||0)+(num(current.gamesScanned)||0);
    const offenseFirst=(num(past.offensiveFirstTdGames)||0)+(num(current.offensiveFirstTdGames)||0);
    if(totalGames<200||offenseFirst<=0||offenseFirst>totalGames)return null;
    const gameMass=offenseFirst/totalGames;
    const teamStrength=team===home?homeStrength:awayStrength;
    const teamMass=gameMass*teamStrength/(homeStrength+awayStrength);
    let denom=0.8; // reserve mass for new/nonlisted offensive players.
    for(const [id,row] of Object.entries(current.players||{})){
      if(nflCode(row?.team)!==team||Number(row.gamesWithOpportunities||0)<1)continue;
      const old=past.players?.[id];
      denom+=firstTdPlayerWeight(row,up(old?.team)===team?old:null,currentTeam);
    }
    const weight=firstTdPlayerWeight(recent,prior,currentTeam);
    if(!(denom>weight&&weight>0))return null;
    let forecast=100*teamMass*weight/denom;
    const atd=forP(player,'atd');
    if(validModel(atd))forecast=Math.min(forecast,num(atd.model.probabilityPct));
    return Number.isFinite(forecast)&&forecast>=0&&forecast<=100
      ? +forecast.toFixed(1):null;
  }
  // TSO PURITY: role opportunity/finishing *signal*, not a probability,
  // calibration grade, or the source video's proprietary formula.
  function tsoPurity(game,player){
    const data=firstTdInputs(game,player);
    if(!data)return null;
    const {recent}=data;
    const gl=num(recent.goalLineSharePct),rz=num(recent.redZoneSharePct),
      yieldPct=num(recent.redZoneTdYieldPct);
    const role=String(getDetails(game,player)?.player?.position||player.role||'').toUpperCase();
    const share=role==='RB'||role==='FB'?num(recent.carrySharePct)
      :['WR','TE'].includes(role)?num(recent.targetSharePct)
      :Math.max(num(recent.carrySharePct)||0,num(recent.targetSharePct)||0);
    const games=num(recent.gamesWithOpportunities);
    if([gl,rz,yieldPct,share,games].some(v=>v===null)||games<2)return null;
    if([gl,rz,yieldPct,share].some(v=>v<0||v>100))return null;
    const sourceScore=0.30*gl+0.30*rz+0.20*share+0.20*yieldPct;
    const sampleFactor=0.7+0.3*Math.min(1,games/8);
    return Math.round(Math.max(0,Math.min(100,sourceScore*sampleFactor)));
  }
  // Distinguish game-specific model probability, exact bookmaker implied
  // percentage (including vig), and observed touchdown occurrence in game logs.
  function nflAnytimeSource(p){
    const exact=forP(p,'atd');
    if(exact&&validModel(exact))return {value:mode(exact),kind:'model',sample:0};
    if(exact&&!exact.researchPbpRow&&yes(exact)&&
       num(exact.impliedPct)!==null&&num(exact.price)!==null){
      const implied=num(exact.impliedPct);
      if(implied>=0&&implied<=100)return {value:implied,kind:'market',sample:0};
    }
    const g=gameList.find(game=>id(game)===state.gameKey);
    const deep=getDetails(g,p)?.player||{};
    const logs=(Array.isArray(deep.gameLog)?deep.gameLog:[])
      .filter(r=>Number.isFinite(Date.parse(r?.date||''))&&num(r?.tds)!==null&&num(r.tds)>=0)
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,10);
    if(logs.length<3)return null;
    const scored=logs.filter(r=>Number(r.tds)>=1).length;
    return {value:+(scored/logs.length*100).toFixed(1),kind:'history',sample:logs.length};
  }
  function columnData(p,key,sport){
    const r=best(p)||{},m=r.model||{},pModel=validModel(r);
    const selectedGame=gameList.find(g=>id(g)===state.gameKey);
    const deep=getDetails(selectedGame,p)?.player||{};
    const previous=deep.previousSeason||{},current=deep.currentSeason||{},recent=deep.last5||{};
    const pbpIdentity={...deep,gsisId:deep.gsisId||p.rows?.find(r=>r.nflPbpId)?.nflPbpId};
    const prevPbp=pbpPlayer(pbpIdentity,2025),currentPbp=pbpPlayer(pbpIdentity,2026);
    const recentTdRate=num(recent.avg?.tds),seasonTdRate=num(current.perGame?.tds);
    const marketLine=forP(p,key)||null;
    const scorerStats=p.rows?.find(row=>row.researchScorerStats)?.researchScorerStats;
    switch(key){
      case 'nbaL5Pts':return nbaRecentAverage(deep,'points');
      case 'nbaL5Reb':return nbaRecentAverage(deep,'rebounds');
      case 'nbaL5Ast':return nbaRecentAverage(deep,'assists');
      case 'nbaL5Threes':return nbaRecentAverage(deep,'threes');
      case 'goalsGp':return scorerStats?.goalsGp??null;
      case 'sogGp':return scorerStats?.sogGp??null;
      case 'l10Goals':return scorerStats?.l10Goals??null;
      case 'l10First':return scorerStats?.l10First??null;
      case 'role':{const position=deep.position||p.role||r.position||r.role||null;const depth=num(deep.depth?.rank);return position?(position+(depth!==null&&depth>0&&depth<10?fmt(depth,0):'')):null;}
      case 'model':return pModel?mode(r):null;
      case 'market':return num(r.impliedPct);
      case 'edge':return pModel?num(m.edgePct):null;
      case 'price':return num(r.price);
      case 'book':return r.book||null;
      case 'projected':return project(r);
      case 'line':return num(r.line);
      case 'form':return val(m,['trendPct','formPct','form.score'])??val(r,['stats.formPct'])??(recentTdRate!==null&&seasonTdRate!==null?recentTdRate-seasonTdRate:null);
      case 'yield':return currentPbp?.redZoneTdYieldPct??val(m,['yieldPct','yield']);
      case 'purity':return sport==='nfl'?tsoPurity(selectedGame,p):otherSportPurity(selectedGame,p,sport);
      case 'usage':return val(m,['usagePct','usage.usagePct','context.usagePct']);
      case 'minutes':return val(m,['minutes','usage.minutes','projection.minutes'])??num(deep.recentAverages?.minutes)??recentMinutes(deep,sport);
      case 'toi':return val(m,['toi','usage.toi'])??num(deep.recentAverages?.toi)??recentMinutes(deep,sport);
      case 'snap':return val(m,['snapPct','usage.snapPct'])??num(deep.snapTrend?.avgOffensePct);
      case 'gl':return currentPbp?.goalLineSharePct??val(m,['goalLinePct','usage.goalLinePct']);
      case 'carry':return currentPbp?.carrySharePct??val(m,['carryPct','usage.carryPct']);
      case 'target':return currentPbp?.targetSharePct??val(m,['targetPct','usage.targetPct'])??num(current.targetShare);
      case 'rz':return currentPbp?.redZoneSharePct??val(m,['redZonePct','usage.redZonePct']);
      case 'barrel':return val(m,['barrelPct','contact.barrelPct'])??num(deep.statcast?.barrelPct);
      case 'hardhit':return val(m,['hardHitPct','contact.hardHitPct'])??num(deep.statcast?.hardHitPct);
      case 'l5':return recentPropStats(p,sport,5)?.rate??val(m,['hitRateL5','last5RatePct','history.l5Pct']);
      case 'l10':return recentPropStats(p,sport,10)?.rate??val(m,['hitRateL10','last10RatePct','history.l10Pct']);
      case 'opptds':return num(deep.matchup?.previousSeasonAllowed?.perGame?.tds);
      case 'opprush':return num(deep.matchup?.previousSeasonAllowed?.perGame?.rushYds);
      case 'opprec':return num(deep.matchup?.previousSeasonAllowed?.perGame?.recYds);
      case 'oppcarries':return num(deep.matchup?.previousSeasonAllowed?.perGame?.carries);
      case 'prevFirst':return prevPbp?.firstTdGames??val(m,['previousSeasonFirstTds','history.prevSeasonFirstTds'])??num(previous.firstTdGames);
      case 'prevTD':return val(m,['previousSeasonTds','history.prevSeasonTds'])??num(previous.totalTds);
      case 'yearTD':return val(m,['currentSeasonTds','history.currentSeasonTds'])??num(current.totalTds);
      case 'opps':return currentPbp?(num(currentPbp.carries)??0)+(num(currentPbp.targets)??0):null;
      case 'firstTd':return marketLine&&validModel(marketLine)?mode(marketLine):firstTdEstimate(selectedGame,p);
      case 'atd':return sport==='nfl'?nflAnytimeSource(p)?.value??null:(marketLine&&validModel(marketLine)?mode(marketLine):null);
      case 'atg':case 'fgs':case 'hr':case 'hits':case 'sog':case 'points':case 'rebounds':case 'assists':case 'threes':case 'pra':case 'rbi':
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
    if(['projected','minutes','toi','opptds','opprush','opprec','oppcarries','goalsGp','sogGp','nbaL5Pts','nbaL5Reb','nbaL5Ast','nbaL5Threes'].includes(key))return fmt(value,2);
    if(['l10Goals','l10First'].includes(key))return fmt(value,0);
    if(key==='prevFirst'){
      const deep=getDetails(gameList.find(g=>id(g)===state.gameKey),p)?.player||{};
      const games=num(deep.previousSeason?.games);
      return fmt(value,0)+(games!==null&&games>0?'/'+fmt(games,0):'');
    }
    if(['prevTD','yearTD','opps'].includes(key))return fmt(value,0);
    if(key==='purity'){const notes={nfl:'Opportunity quality: goal-line share 30%, red-zone share 30%, position opportunity share 20%, red-zone TD yield 20%.',nba:'Selected exact-line last-10 hit rate 45%, production consistency 35%, recent minutes 20%.',nhl:'Selected exact-line last-10 hit rate 45%, production consistency 35%, time-on-ice stability 20%.',mlb:'Selected exact-line last-10 hit rate 45%, hard-hit percentage 30%, barrel percentage relative to 20% reference 25%.'};return '<strong class="rg2-purity" title="Experimental TSO Purity, 0–100 opportunity-quality index; not a probability. '+esc(notes[sport]||'')+' Sample-size adjusted.">'+fmt(value,0)+'/100</strong>';}
    if(key==='atd'&&sport==='nfl'){
      const info=nflAnytimeSource(p);
      if(!info)return '<span class="rg2-na" title="No verified anytime model, exact market price or completed-game history">—</span>';
      const tooltip=info.kind==='model'?'Exact-match validated TSO touchdown model':
        info.kind==='market'?'Exact sportsbook-implied percentage, INCLUDING bookmaker margin. Not a TSO model prediction.':
        'Observed TD hit rate in '+info.sample+' completed games. Historical rate ONLY, NOT a prediction.';
      const badge=info.kind==='model'?'MODEL':info.kind==='market'?'MARKET':'HIST · '+info.sample+'G';
      return '<span class="rg2-atd-stack" title="'+esc(tooltip)+'"><strong class="rg2-highlight rg2-atd--'+info.kind+'">'+percent(info.value)+'</strong><small>'+esc(badge)+'</small></span>';
    }
    if(key==='firstTd'&&sport==='nfl'&&!validModel(forP(p,'firstTd')))return '<strong class="rg2-highlight" title="Experimental uncalibrated TSO First TD forecast — not sportsbook odds or a validated probability">'+percent(value)+'</strong>';
    if(key==='edge')return '<strong class="'+(value>0?'rg2-pos':value<0?'rg2-neg':'')+'">'+edge(value)+'</strong>';
    if(key==='form')return '<b class="'+(value>0?'rg2-pos':value<0?'rg2-neg':'')+'">'+(value>0?'↑ ':value<0?'↓ ':'→ ')+fmt(value)+'</b>';
    if(['model','atd','atg','hr','firstTd','fgs'].includes(key))return '<strong class="rg2-highlight">'+percent(value)+'</strong>';
    return percent(value);
  }
  function playerTitle(p){
    const game=gameList.find(g=>id(g)===state.gameKey);
    const deep=getDetails(game,p)?.player||{};
    const sourceId=String(p.rows?.find(r=>r.nflPbpId)?.nflPbpId||'');
    const verified=sourceId&&String(deep.gsisId||'')===sourceId;
    const displayName=verified&&deep.name?deep.name:p.name;
    const image=p.headshotUrl||p.rows.find(r=>r.headshotUrl)?.headshotUrl||(verified?deep.headshot:null);
    const avatar=image?'<img data-player-headshot src="'+esc(image)+'" alt="" loading="lazy">':'<span class="rg2-avatar">'+esc(String(displayName||'?').charAt(0))+'</span>';
    const role=columnData(p,'role',game?.league||p.rows?.[0]?.sport)||null;
    const team=up(p.team)||'—';
    return '<span class="rg2-player">'+avatar+'<span><b>'+esc(displayName||'—')+'</b><small>'+esc(role?role+' - '+team:team)+'</small></span></span>';
  }
  function columns(sport,tab){
    if(tab==='all'||tab==='props')return [['selection','EXACT PICK'],['model','MODEL %'],['market','MARKET %'],['line','LINE'],['projected','PROJECTION'],['edge','EDGE'],['price','ODDS'],['book','BOOK']];
    if(sport==='nfl'&&tab==='td')return [['atd','ANYTIME TD %'],['firstTd','FIRST %'],['opps','2026 OPPS'],['prevFirst','2025 1ST'],['prevTD','2025 TDs'],['yearTD','2026 TDs'],['form','FORM'],['yield','YIELD'],['gl','GL %'],['carry','CARRY %'],['target','TGT %'],['rz','RZ %'],['purity','TSO PURITY']];
    if(sport==='nfl'&&tab==='defense')return [['opptds','OPP TD / GM'],['opprush','OPP RUSH YD'],['opprec','OPP REC YD'],['oppcarries','OPP CARRIES'],['snap','SNAPS %'],['model','MODEL %'],['edge','EDGE']];
    if(sport==='nfl'&&tab==='key')return [['atd','ANYTIME TD %'],['firstTd','FIRST %'],['prevTD','2025 TDs'],['yearTD','2026 TDs'],['form','FORM'],['snap','SNAPS %'],['target','TGT %'],['model','MODEL %'],['edge','EDGE']];
    if(sport==='nfl')return [['selection','EXACT PICK'],['model','MODEL %'],['market','MARKET %'],['projected','PROJECTION'],['l5','L5 %'],['l10','L10 %'],['edge','EDGE'],['snap','SNAPS %'],['target','TGT %'],['rz','RZ %']];
    if(sport==='nhl'&&tab==='goals')return [['atg','ANYTIME %'],['fgs','FIRST %'],['goalsGp','GOALS/GP'],['sogGp','SHOTS/GP'],['toi','TOI MIN'],['l10Goals','L10 GOALS'],['l10First','L10 FIRST'],['l5','L5 %'],['edge','EDGE'],['price','ODDS'],['purity','TSO PURITY']];
    if(sport==='nhl')return [['atg','ANYTIME %'],['fgs','FIRST %'],['sog','SOG %'],['points','POINTS %'],['assists','ASSISTS %'],['model','MODEL %'],['projected','PROJECTION'],['toi','TOI MIN'],['l5','L5 %'],['edge','EDGE'],['purity','TSO PURITY']];
    if(sport==='mlb')return [['hr','HR %'],['hits','HITS %'],['rbi','RBI %'],['model','MODEL %'],['projected','PROJECTION'],['barrel','BARREL %'],['hardhit','HARD HIT %'],['l5','L5 %'],['edge','EDGE'],['purity','TSO PURITY']];
    return [['points','POINTS %'],['nbaL5Pts','L5 PTS'],['rebounds','REB %'],['nbaL5Reb','L5 REB'],['assists','AST %'],['nbaL5Ast','L5 AST'],['threes','3PT %'],['nbaL5Threes','L5 3PT'],['model','MODEL %'],['projected','PROJECTION'],['minutes','MINUTES'],['usage','USAGE %'],['l5','L5 %'],['edge','EDGE'],['purity','TSO PURITY']];
  }
  function render(root,props){
    if(!root)return;
    hostRoot=root;
    ctx=props||{};
    const league=leagues.includes(props.league)?props.league:'all';
    if(state.league!==league){state.league=league;state.stage='games';state.gameKey='';state.tab='';state.query='';state.team='all';state.role='all';state.sort='model';state.view='lab'}
    gameList=(Array.isArray(props.games)?props.games:[]).filter(g=>league==='all'||g.league===league);
    const seen=new Set();gameList=gameList.filter(g=>{const key=id(g);if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>({'in':0,'pre':1,'post':2}[a.state]??3)-({'in':0,'pre':1,'post':2}[b.state]??3)
      || (Date.parse(a.startTime||'')||0)-(Date.parse(b.startTime||'')||0));
    if(state.stage==='detail'&&!gameList.some(g=>id(g)===state.gameKey)){state.stage='games';state.gameKey=''}
    if(root.dataset)root.dataset.researchMode=state.stage==='detail'?state.view:'games';
    root.innerHTML=state.stage==='detail'?detail():cards();
    root.onclick=e=>{
      const t=e.target.closest('button');
      if(!t||!root.contains(t))return;
      if(t.hasAttribute('data-rg2-game')){state.gameKey=t.dataset.rg2Game;state.stage='detail';state.tab='';state.search='';state.query='';state.team='all';state.role='all';state.sort='model';state.descending=true;render(root,ctx);root.scrollIntoView?.({block:'start'});return}
      if(t.hasAttribute('data-rg2-back')){state.stage='games';state.gameKey='';render(root,ctx);return}
      if(t.hasAttribute('data-rg2-league')){const next=t.dataset.rg2League;state.stage='games';state.gameKey='';props.changeLeague?.(next);if(next===league)render(root,ctx);return}
      if(t.hasAttribute('data-rg2-tab')){state.tab=t.dataset.rg2Tab;state.query='';state.role='all';state.sort=state.tab==='td'?'atd':state.tab==='defense'?'opptds':state.tab==='hitters'||state.tab==='hr'?'hr':state.tab==='goals'?'atg':state.tab==='points'?'points':'model';render(root,ctx);return}
      if(t.hasAttribute('data-rg2-view')){state.view=t.dataset.rg2View;if(state.view==='rank'){state.sort='model';state.descending=true}render(root,ctx);return}
      if(t.hasAttribute('data-rg2-sort')){const key=t.dataset.rg2Sort;if(state.sort===key)state.descending=!state.descending;else{state.sort=key;state.descending=key!=='role'}render(root,ctx);return}
      if(t.hasAttribute('data-rg2-intel')){const p=visible[Number(t.dataset.rg2Intel)];const row=exactActionRow(p)||best(p||{rows:[]});if(row?.researchPbpRow)openPbpIntel(p);else if(row)props.openDetail?.(row);return}
      if(t.hasAttribute('data-rg2-add')){const p=visible[Number(t.dataset.rg2Add)];const row=exactActionRow(p);if(row)props.addSelection?.(row);return}
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

(() => {
  const shell = document.querySelector('.app-shell');
  const toast = document.querySelector('.route-toast');
  const pageContent = document.getElementById('pageContent');
  const homeHTML = pageContent.innerHTML;
  const profileMenu = document.querySelector('.profile-menu');
  const profileButton = profileMenu?.querySelector('.profile-pill');
  const profileDropdown = profileMenu?.querySelector('.profile-dropdown');
  const notificationMenu = document.querySelector('.notification-menu');
  const notificationButton = document.querySelector('[data-notification-toggle]');
  const notificationPanel = document.querySelector('[data-notification-panel]');
  const notificationList = document.querySelector('[data-notification-list]');
  const notificationDot = document.querySelector('[data-notification-dot]');
  const notificationCount = document.querySelector('[data-notification-count]');
  const notificationReadIds = new Set();
  let verifiedHitAlerts=[];
  let verifiedHitOwnerId='';
  let verifiedHitFetchedAt=0;
  let verifiedHitLastCheckAt=0;
  let verifiedHitRequest=null;
  let verifiedHitError='';
  const VERIFIED_HIT_POLL_MS=5*60*1000;
  let savedAccountNotifications=[];
  let savedAccountNotificationOwnerId='';
  let savedAccountNotificationFetchedAt=0;
  let savedAccountNotificationRequest=null;
  let savedAccountNotificationError='';
  const ACCOUNT_NOTIFICATION_REFRESH_MS=60000;
  const PROFILE_ACTIVITY_REFRESH_MS=60000;
  let profileActivityOwnerId='';
  let profileActivitySnapshot=null;
  let profileActivityFetchedAt=0;
  let profileActivityRequest=null;
  let profileActivityError='';

  let liveFeedError = null;
  let propsFeedError = null;
  const sideNav = document.querySelector('.tso-side-nav');
  const sideNavToggle = document.querySelector('.side-nav-toggle');
  const sideNavClose = document.querySelector('.tso-side-nav-close');
  const sideNavBackdrop = document.querySelector('.tso-side-nav-backdrop');
  const navCurrentLabel = document.querySelector('[data-nav-current]');
  const OWNER_HANDLE = 'justcallme_jt';
  let currentRoute = 'home';
  let currentLeague = 'all';
  let liveFeedCache = null;
  let liveFeedFetchedAt = 0;
  let liveFeedInFlight = null;
  let nflWeeklyFeedCache = null;
  let nflWeeklyFetchedAt = 0;
  let nflWeeklyInFlight = null;
  let selectedLiveGameId = null;
  let liveDetailTab = 'plays';
  let livePlayFilter = 'all';
  const liveDetailCache = new Map();
  const liveDetailFetchedAt = new Map();
  const liveDetailInFlight = new Map();
  let propsFeedCache = null;
  let propsFeedFetchedAt = 0;
  let propsFeedInFlight = null;
  let parlayLegKeys = [];
  let parlayTarget = 3;
  let parlayMode = 'pregame';
  let parlayQuarterPeriod = 'q1';
  let parlayCheckpointStrategy = 'tsoPick';
  let parlayCheckpointLegKeys = [];
  let nflCheckpointCache = null;
  let nflCheckpointFetchedAt = 0;
  let nflCheckpointInFlight = null;
  let researchQuery = '';
  const propsFilterState = {
    search:'',
    market:'',
    book:'',
    side:'',
    model:'',
    sort:'edge'
  };
  const deepResearchCache = new Map();
  const propHistoryCache = new Map();
  let nhlScorerCache = null;
  let nhlScorerFetchedAt = 0;
  let nhlScorerInFlight = null;
  let nhlScorerMarket = 'fgs';
  const gameEdgeCache = new Map();
  const gameEdgeFetchedAt = new Map();
  const gameEdgeInFlight = new Map();
  const LIVE_FEED_TTL = 12000;
  const LIVE_POLL_MS = 30000;
  const LIVE_DETAIL_POLL_MS = 10000;
  const LIVE_DETAIL_LIVE_TTL = 8000;
  const PROPS_FEED_TTL = 30000;
  const PROPS_POLL_MS = 60000;
  const GAME_EDGE_TTL = 30000;
  const GAME_EDGE_POLL_MS = 60000;
  const GAME_EDGE_RAW_BASE = 'https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/';
  const GAME_EDGE_SCOREBOARD_BASE = 'https://tso2-game-edge.jthomas0786-tso.workers.dev/';
  const NBA_MODEL_BASE = 'https://tso2-nba-model.jthomas0786-tso.workers.dev/';
  const NFL_CHECKPOINT_BASE = 'https://tso2-nfl-checkpoints.jthomas0786-tso.workers.dev/';
  const NFL_CHECKPOINT_TTL = 30000;
  let scoreTickerResumeTimer = null;
  const SCORE_TICKER_PX_PER_SECOND = 34;

  const normalizeHandle = value => String(value || '').trim().replace(/^@/, '').toLowerCase();
  // Identity must come from Supabase Auth's server-verified getUser() result;
  // never treat a hard-coded DOM username as an authenticated user.
  const currentUserHandle = () => normalizeHandle(window.TSO_AUTH?.user?.username || '');
  const isOwner = () => Boolean(window.TSO_AUTH?.user?.isOwner === true);

  function syncOwnerTools(){
    document.querySelectorAll('[data-owner-only]').forEach(item => {
      item.hidden = !isOwner();
      item.setAttribute('aria-hidden', String(!isOwner()));
    });
  }

  function closeProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    profileMenu.classList.remove('is-open');
    profileDropdown.hidden = true;
    profileButton.setAttribute('aria-expanded','false');
  }

  function toggleProfileMenu(){
    if(!profileMenu || !profileDropdown || !profileButton) return;
    const opening = profileDropdown.hidden;
    profileMenu.classList.toggle('is-open', opening);
    profileDropdown.hidden = !opening;
    profileButton.setAttribute('aria-expanded', String(opening));
  }

  function closeNotificationCenter(){
    if(!notificationPanel||!notificationButton)return;
    notificationPanel.hidden=true;
    notificationButton.setAttribute('aria-expanded','false');
  }

  function toggleNotificationCenter(){
    if(!notificationPanel||!notificationButton)return;
    const opening=notificationPanel.hidden;
    if(opening)closeProfileMenu();
    notificationPanel.hidden=!opening;
    notificationButton.setAttribute('aria-expanded',String(opening));
    if(opening){
      renderNotificationCenter();
      void refreshSavedAccountNotifications(false);
    }
  }

  function setSideNavOpen(open){
    if(!shell || !sideNav) return;
    const allowed = window.innerWidth <= 900;
    const next = allowed && Boolean(open);
    shell.classList.toggle('is-side-nav-open', next);
    document.body.classList.toggle('tso-side-nav-open', next);
    sideNavToggle?.setAttribute('aria-expanded', String(next));
    sideNav.setAttribute('aria-hidden', String(!next && allowed));
  }

  function closeSideNav(){
    setSideNavOpen(false);
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const localDateKey = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('');
  };

  const leagueLabel = value => String(value || '').toUpperCase();
  const stateRank = state => state === 'in' ? 0 : state === 'pre' ? 1 : 2;

  function sortedGames(games=[]){
    return [...games].sort((a,b) => {
      const rank = stateRank(a.state) - stateRank(b.state);
      if(rank) return rank;
      const at = Date.parse(a.startTime || '') || 0;
      const bt = Date.parse(b.startTime || '') || 0;
      return a.state === 'post' ? bt-at : at-bt;
    });
  }

  function gameStatusText(game){
    if(game.state === 'post') return game.detail || 'FINAL';
    if(game.state === 'in') return game.detail || [game.period ? 'P'+game.period : '', game.clock || ''].filter(Boolean).join(' · ') || 'LIVE';
    const dt = Date.parse(game.startTime || '');
    if(!Number.isFinite(dt)) return game.detail || 'UPCOMING';
    return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(dt));
  }

  function gameShortState(game){
    if(game.state === 'post') return 'FINAL';
    if(game.state === 'in') return game.detail || 'LIVE';
    return gameStatusText(game);
  }

  function gameMarqueeStatusText(game){
    if(game.state==='post')return 'FINAL';
    if(game.state==='in')return game.detail||'LIVE';
    const dt=Date.parse(game.startTime||'');
    if(!Number.isFinite(dt))return game.detail||'UPCOMING';
    const start=new Date(dt);
    const now=new Date();
    const sameDay=start.getFullYear()===now.getFullYear()
      && start.getMonth()===now.getMonth()
      && start.getDate()===now.getDate();
    const time=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(start);
    if(sameDay)return time;
    const days=['SUN','MON','TUES','WED','THURS','FRI','SAT'];
    return days[start.getDay()]+' '+time;
  }

  function currentFeedGames(){
    if(currentLeague==='nfl'&&nflWeeklyFeedCache?.games){
      return sortedGames(nflWeeklyFeedCache.games);
    }
    const all = sortedGames(liveFeedCache?.games || []);
    return currentLeague === 'all' ? all : all.filter(g => g.league === currentLeague);
  }

  function feedUpdatedText(){
    const when = Date.parse(liveFeedCache?.generatedAt || '');
    if(!Number.isFinite(when)) return 'Live scoreboard';
    const seconds = Math.max(0,Math.round((Date.now()-when)/1000));
    if(seconds < 10) return 'Updated just now';
    if(seconds < 60) return 'Updated '+seconds+' sec ago';
    return 'Updated '+Math.floor(seconds/60)+' min ago';
  }

  function teamLogoMarkup(team,className=''){
    const abbr = esc(team?.abbr || 'TEAM');
    if(!team?.logo) return '<span class="team-logo-fallback '+esc(className)+'">'+abbr.slice(0,2)+'</span>';
    return '<span class="team-logo-shell '+esc(className)+'"><span class="team-logo-fallback-text">'+abbr.slice(0,2)+'</span><img data-team-logo src="'+esc(team.logo)+'" alt="'+abbr+' logo" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'is-missing\')" /></span>';
  }

  function liveTileMarkup(game){
    const awayScore = game.state === 'pre' ? '' : '<em>'+esc(game.away?.score ?? 0)+'</em>';
    const homeScore = game.state === 'pre' ? '' : '<em>'+esc(game.home?.score ?? 0)+'</em>';
    return '<button class="score-tile '+(game.state==='in'?'hot-game':'')+'" data-live-open="'+esc(game.id)+'">'
      +'<span class="league-chip">'+esc(leagueLabel(game.league))+'</span>'
      +'<strong class="score-team-line">'+teamLogoMarkup(game.away,'score-team-logo')+'<span>'+esc(game.away?.abbr || 'AWAY')+'</span> '+awayScore+'</strong>'
      +'<strong class="score-team-line">'+teamLogoMarkup(game.home,'score-team-logo')+'<span>'+esc(game.home?.abbr || 'HOME')+'</span> '+homeScore+'</strong>'
      +'<small>'+esc(gameMarqueeStatusText(game))+'</small>'
      +'</button>';
  }

  function bindLiveGeneratedActions(){
    document.querySelectorAll('[data-live-open]').forEach(btn => {
      btn.onclick = () => {
        const id=String(btn.dataset.liveOpen||'');
        if(id) selectedLiveGameId=id;
        if(currentRoute === 'live') renderLiveCenter();
        else setRoute('live');
      };
    });
    document.querySelectorAll('[data-live-refresh]').forEach(btn => {
      btn.onclick = () => refreshLiveData(true);
    });
    bindMediaFallbacks();
  }

  function stopScoreTicker(){
    if(scoreTickerResumeTimer){
      window.clearTimeout(scoreTickerResumeTimer);
      scoreTickerResumeTimer=null;
    }
    document.querySelectorAll('.score-ticker-track').forEach(track=>{
      track.classList.remove('is-running','is-paused');
      track.style.removeProperty('--ticker-distance');
      track.style.removeProperty('--ticker-duration');
    });
  }

  function bindScoreTicker(strip){
    stopScoreTicker();
    if(!strip) return;
    const track=strip.querySelector('.score-ticker-track');
    const firstSet=strip.querySelector('[data-score-ticker-set="primary"]');
    if(!track||!firstSet)return;

    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const start=()=>{
      const loopWidth=firstSet.getBoundingClientRect().width;
      if(loopWidth<=0)return;
      const duration=Math.max(12,loopWidth/SCORE_TICKER_PX_PER_SECOND);
      track.style.setProperty('--ticker-distance',loopWidth+'px');
      track.style.setProperty('--ticker-duration',duration.toFixed(2)+'s');
      track.classList.add('is-running');
      track.classList.remove('is-paused');
    };
    const pause=()=>track.classList.add('is-paused');
    const resume=()=>{
      if(scoreTickerResumeTimer)window.clearTimeout(scoreTickerResumeTimer);
      scoreTickerResumeTimer=window.setTimeout(()=>track.classList.remove('is-paused'),250);
    };

    strip.addEventListener('mouseenter',pause);
    strip.addEventListener('mouseleave',resume);
    strip.addEventListener('focusin',pause);
    strip.addEventListener('focusout',resume);
    strip.addEventListener('touchstart',pause,{passive:true});
    strip.addEventListener('touchend',()=>{
      if(scoreTickerResumeTimer)window.clearTimeout(scoreTickerResumeTimer);
      scoreTickerResumeTimer=window.setTimeout(()=>track.classList.remove('is-paused'),700);
    },{passive:true});

    requestAnimationFrame(()=>requestAnimationFrame(start));
  }

  function renderGlobalScoreStrip(){
    const strip = document.querySelector('.broadcast-score-strip');
    if(!strip || !liveFeedCache) return;
    const games = currentFeedGames();
    const liveGames = games.filter(g => g.state === 'in');
    const liveCount = liveGames.length;
    const visible = liveCount ? liveGames : games.slice(0,8);
    const label = liveCount
      ? '<div class="score-strip-label"><span class="pulse"></span>'+liveCount+' LIVE</div>'
      : '<div class="score-strip-label"><span class="pulse is-idle"></span>'+(currentLeague==='nfl'?'NFL WEEK':'TODAY')+'</div>';
    const primaryTiles = visible.length
      ? visible.map(liveTileMarkup).join('')
      : '<div class="score-strip-empty">'+(currentLeague==='nfl'?'No NFL games returned for the current weekly slate.':'No games returned for today.')+'</div>';
    const cloneTiles = visible.length>1
      ? visible.map(liveTileMarkup).join('')
      : '';
    const ticker = visible.length
      ? '<div class="score-ticker-viewport" data-score-ticker-viewport><div class="score-ticker-track"><div class="score-ticker-set" data-score-ticker-set="primary">'+primaryTiles+'</div>'+(cloneTiles?'<div class="score-ticker-set score-ticker-set--clone" aria-hidden="true">'+cloneTiles+'</div>':'')+'</div></div>'
      : primaryTiles;
    strip.innerHTML = label + ticker + '<button class="score-more" data-route-jump="live">FULL SCOREBOARD →</button>';
    strip.querySelector('[data-route-jump="live"]')?.addEventListener('click',()=>setRoute('live'));
    strip.querySelectorAll('.score-ticker-set--clone .score-tile').forEach(btn=>btn.tabIndex=-1);
    bindLiveGeneratedActions();
    const viewport=strip.querySelector('[data-score-ticker-viewport]');
    if(viewport)viewport.scrollLeft=0;
    if(visible.length>1)bindScoreTicker(strip);
    else stopScoreTicker();
  }

  function featureGameMarkup(game,home=false){
    if(!game) return '<div class="live-feed-empty"><div><b>No games on the current slate.</b><small>The live feed is connected; there is simply nothing scheduled for this filter.</small></div></div>';
    const awayScore = game.state === 'pre' ? '—' : esc(game.away?.score ?? 0);
    const homeScore = game.state === 'pre' ? '—' : esc(game.home?.score ?? 0);
    const stateText = game.state === 'in' ? 'LIVE · '+gameShortState(game) : gameShortState(game);
    const start = gameStatusText(game);
    const venue = game.venue || 'Venue pending';
    if(home){
      return '<div class="feature-game-bg"></div>'
        +'<div class="matchup-energy matchup-energy--left"></div><div class="matchup-energy matchup-energy--right"></div>'
        +'<div class="home-scoreboard-logo-art home-scoreboard-logo-art--away">'+teamLogoMarkup(game.away,'home-scoreboard-bg-logo')+'</div>'
        +'<div class="home-scoreboard-logo-art home-scoreboard-logo-art--home">'+teamLogoMarkup(game.home,'home-scoreboard-bg-logo')+'</div>'
        +'<div class="feature-topline"><span class="feature-live '+(game.state==='in'?'':'is-upcoming')+'"><i></i>'+esc(stateText)+'</span><span>'+esc(leagueLabel(game.league))+' · LIVE SCOREBOARD</span></div>'
        +'<div class="matchup-stage">'
          +'<div class="matchup-side matchup-side--home"><span class="matchup-team-code">'+esc(game.away?.abbr)+'</span><strong>'+awayScore+'</strong><small>'+esc(game.away?.name)+'</small></div>'
          +'<div class="matchup-center"><span>VS</span><b>'+esc(game.state==='in'?'LIVE NOW':'TODAY')+'</b></div>'
          +'<div class="matchup-side matchup-side--away"><span class="matchup-team-code">'+esc(game.home?.abbr)+'</span><strong>'+homeScore+'</strong><small>'+esc(game.home?.name)+'</small></div>'
        +'</div>'
        +'<div class="feature-stats concept-matchup-stats">'
          +'<span><small>STATUS</small><b>'+esc(gameShortState(game))+'</b></span>'
          +'<span><small>PERIOD</small><b>'+esc(game.period || '—')+'</b></span>'
          +'<span><small>CLOCK</small><b>'+esc(game.clock || '—')+'</b></span>'
          +'<span><small>VENUE</small><b>'+esc(venue)+'</b></span>'
        +'</div>'
        +'<div class="feature-footer"><div><span>LIVE SCORE FEED</span><b>'+esc(game.away?.abbr)+' @ '+esc(game.home?.abbr)+'</b><strong>'+esc(start)+'</strong></div><button class="broadcast-cta" data-route-jump="live">OPEN LIVE CENTER →</button></div>';
    }
    return '<div class="live-gamecast-energy live-gamecast-energy--blue"></div><div class="live-gamecast-energy live-gamecast-energy--orange"></div>'
      +'<div class="live-scoreboard-logo-art live-scoreboard-logo-art--away">'+teamLogoMarkup(game.away,'live-scoreboard-bg-logo')+'</div>'
      +'<div class="live-scoreboard-logo-art live-scoreboard-logo-art--home">'+teamLogoMarkup(game.home,'live-scoreboard-bg-logo')+'</div>'
      +'<div class="live-gamecast-top"><span class="live-state-chip '+(game.state==='in'?'':'is-upcoming')+'"><i></i>'+esc(stateText)+'</span><span>'+esc(leagueLabel(game.league))+' · SCOREBOARD</span></div>'
      +'<div class="live-matchup-stage">'
        +'<div class="live-team"><span>'+esc(game.away?.abbr)+'</span><strong>'+awayScore+'</strong><small>'+esc(game.away?.name)+'</small></div>'
        +'<div class="live-center-mark"><b>VS</b><span>'+esc(game.state==='in'?'LIVE NOW':'TODAY')+'</span></div>'
        +'<div class="live-team live-team--away"><span>'+esc(game.home?.abbr)+'</span><strong>'+homeScore+'</strong><small>'+esc(game.home?.name)+'</small></div>'
      +'</div>'
      +'<div class="live-stat-strip">'
        +'<div><span>STATUS</span><b>'+esc(gameShortState(game))+'</b></div>'
        +'<div><span>PERIOD</span><b>'+esc(game.period || '—')+'</b></div>'
        +'<div><span>CLOCK</span><b>'+esc(game.clock || '—')+'</b></div>'
        +'<div><span>START</span><b>'+esc(start)+'</b></div>'
      +'</div>'
      +'<div class="live-gamecast-footer"><div><span>LIVE SCORE FEED</span><b>'+esc(venue)+'</b><strong>'+esc(feedUpdatedText())+'</strong></div><button class="broadcast-cta" data-live-refresh>REFRESH SCORES →</button></div>';
  }

  const LIVE_DETAIL_PATHS = {
    mlb:'baseball/mlb',
    nfl:'football/nfl',
    nhl:'hockey/nhl',
    nba:'basketball/nba'
  };

  const liveDetailKey = game => game ? String(game.league||'')+':'+String(game.id||'') : '';
  const liveDetailTtl = game => game?.state === 'in' ? LIVE_DETAIL_LIVE_TTL : 300000;

  function liveDetailUrl(game){
    const league=String(game?.league||'').toLowerCase();
    if(!LIVE_DETAIL_PATHS[league] || !game?.id) return '';
    return '/api/game-detail?league='+encodeURIComponent(league)+'&event='+encodeURIComponent(game.id);
  }

  function liveDetailPlays(summary){
    if(Array.isArray(summary?.plays)) return summary.plays;
    const drives=[];
    if(Array.isArray(summary?.drives?.previous)) drives.push(...summary.drives.previous);
    if(summary?.drives?.current) drives.push(summary.drives.current);
    const plays=drives.flatMap(d=>Array.isArray(d?.plays)?d.plays:[]);
    if(plays.length) return plays;
    return Array.isArray(summary?.scoringPlays) ? summary.scoringPlays : [];
  }

  function playPeriodNumber(play){
    const value=play?.period?.number ?? play?.period?.value ?? play?.period;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function playPeriodLabel(play,game){
    const league=String(game?.league||'').toLowerCase();
    const period=playPeriodNumber(play);
    const display=String(play?.period?.displayValue||play?.period?.name||'').trim();

    if(league==='mlb'){
      if(display) return display.toUpperCase();
      const half=String(play?.period?.type||play?.halfInning||play?.inningHalf||'');
      const prefix=/top/i.test(half)?'TOP':/bottom|bot/i.test(half)?'BOT':'INN';
      return period!=null ? prefix+' '+period : 'INNING';
    }
    if(league==='nba'){
      if(period==null) return game?.state==='pre'?'PRE':'—';
      return period<=4 ? 'Q'+period : (period===5?'OT':(period-4)+'OT');
    }
    if(league==='nfl'){
      if(period==null) return game?.state==='pre'?'PRE':'—';
      return period<=4 ? 'Q'+period : (period===5?'OT':(period-4)+'OT');
    }
    if(league==='nhl'){
      if(period==null) return game?.state==='pre'?'PRE':'—';
      return period<=3 ? 'P'+period : (period===4?'OT':'SO');
    }
    return period==null ? (game?.state==='pre'?'PRE':'—') : 'P'+period;
  }

  function playScoreLabel(play){
    const away=play?.awayScore ?? play?.away?.score;
    const home=play?.homeScore ?? play?.home?.score;
    if(away==null || home==null) return '';
    return String(away)+'–'+String(home);
  }

  function playTextValue(play){
    return String(play?.text||play?.shortText||play?.description||'Play update').trim();
  }

  function playClockValue(play){
    return String(play?.clock?.displayValue||play?.clock||'').trim();
  }

  function playTeamValue(play){
    return String(play?.team?.abbreviation||play?.team?.shortDisplayName||play?.team?.displayName||'').trim();
  }

  function playTypeText(play){
    return String(play?.type?.text||play?.type?.abbreviation||play?.type?.name||'').trim();
  }

  function sportPlayTag(play,league){
    const text=(playTypeText(play)+' '+playTextValue(play)).toLowerCase();
    if(league==='mlb'){
      if(/home run|homered/.test(text)) return {label:'HR',tone:'score'};
      if(/single|double|triple|hit into|singled|doubled|tripled/.test(text)) return {label:'HIT',tone:'positive'};
      if(/walk|base on balls|intentional walk/.test(text)) return {label:'BB',tone:'neutral'};
      if(/strikeout|struck out/.test(text)) return {label:'K',tone:'muted'};
      if(/run scored|scores|scored/.test(text)) return {label:'RUN',tone:'score'};
      if(/out|grounded|flied|lined|popped/.test(text)) return {label:'OUT',tone:'muted'};
      return {label:'PLAY',tone:'neutral'};
    }
    if(league==='nhl'){
      if(/(^|\s)goal(\s|$)|scores/.test(text)) return {label:'GOAL',tone:'score'};
      if(/penalty/.test(text)) return {label:'PEN',tone:'warning'};
      if(/save/.test(text)) return {label:'SAVE',tone:'positive'};
      if(/shot/.test(text)) return {label:'SHOT',tone:'neutral'};
      if(/hit/.test(text)) return {label:'HIT',tone:'muted'};
      if(/faceoff/.test(text)) return {label:'FO',tone:'muted'};
      if(/block/.test(text)) return {label:'BLK',tone:'muted'};
      return {label:'PLAY',tone:'neutral'};
    }
    if(league==='nba'){
      if(/3-pt|three point|three-point/.test(text) && /made|makes/.test(text)) return {label:'3PT',tone:'score'};
      if(/free throw/.test(text) && /made|makes/.test(text)) return {label:'FT',tone:'score'};
      if(/makes|made/.test(text)) return {label:'2PT',tone:'score'};
      if(/rebound/.test(text)) return {label:'REB',tone:'positive'};
      if(/turnover/.test(text)) return {label:'TO',tone:'warning'};
      if(/foul/.test(text)) return {label:'FOUL',tone:'warning'};
      if(/block/.test(text)) return {label:'BLK',tone:'positive'};
      if(/steal/.test(text)) return {label:'STL',tone:'positive'};
      if(/timeout/.test(text)) return {label:'TIME',tone:'muted'};
      return {label:'PLAY',tone:'neutral'};
    }
    if(league==='nfl'){
      if(/touchdown/.test(text)) return {label:'TD',tone:'score'};
      if(/field goal/.test(text) && !/no good|missed|blocked/.test(text) && /good|made/.test(text)) return {label:'FG',tone:'score'};
      if(/extra point/.test(text) && !/no good|missed|blocked/.test(text)) return {label:'XP',tone:'score'};
      if(/two-point|two point|2-point/.test(text) && /good|successful|conversion/.test(text)) return {label:'2PT',tone:'score'};
      if(/safety/.test(text)) return {label:'SAFE',tone:'score'};
      if(/intercept/.test(text)) return {label:'INT',tone:'warning'};
      if(/fumble/.test(text)) return {label:'FUM',tone:'warning'};
      if(/sack/.test(text)) return {label:'SACK',tone:'positive'};
      if(/punt/.test(text)) return {label:'PUNT',tone:'muted'};
      if(/pass/.test(text)) return {label:'PASS',tone:'neutral'};
      if(/rush|run /.test(text)) return {label:'RUSH',tone:'neutral'};
      if(/penalty/.test(text)) return {label:'PEN',tone:'warning'};
      return {label:'PLAY',tone:'neutral'};
    }
    return {label:'PLAY',tone:'neutral'};
  }

  function mlbCountText(play){
    const count=play?.count||play?.end?.count||play?.start?.count||{};
    const balls=count?.balls;
    const strikes=count?.strikes;
    const outs=count?.outs;
    const bits=[];
    if(balls!=null || strikes!=null) bits.push((balls??0)+'-'+(strikes??0));
    if(outs!=null) bits.push(outs+' OUT'+(Number(outs)===1?'':'S'));
    return bits.join(' · ');
  }

  function nflDownDistance(play){
    const spot=play?.start||play?.end||{};
    const down=Number(spot?.down);
    const distance=spot?.distance;
    const yard=spot?.yardLine;
    const team=spot?.team?.abbreviation||spot?.team?.shortDisplayName||'';
    const parts=[];
    if(Number.isFinite(down)&&down>0) parts.push(down+(down===1?'ST':down===2?'ND':down===3?'RD':'TH')+(distance!=null?' & '+distance:''));
    if(team && yard!=null) parts.push(team+' '+yard);
    else if(yard!=null) parts.push('YARD '+yard);
    return parts.join(' · ');
  }

  function isScoringPlay(play,league){
    if(play?.scoringPlay===true || Number(play?.scoreValue)>0) return true;
    const text=(playTypeText(play)+' '+playTextValue(play)).toLowerCase();
    if(league==='mlb') return /home run|homered|scores|scored|run scored/.test(text);
    if(league==='nhl') return /(^|\s)goal(\s|$)|scores/.test(text);
    if(league==='nba') return /makes|made/.test(text) && !/misses|missed/.test(text);
    if(league==='nfl'){
      if(/touchdown|safety/.test(text)) return true;
      if(/field goal|extra point/.test(text)) return !/no good|missed|blocked/.test(text) && /good|made/.test(text);
      return /two-point|two point|2-point/.test(text) && /good|successful|conversion/.test(text);
    }
    return sportPlayTag(play,league).tone==='score';
  }

  function playTeamObject(game,abbr){
    const key=String(abbr||'').toUpperCase();
    if(String(game?.away?.abbr||'').toUpperCase()===key) return game.away;
    if(String(game?.home?.abbr||'').toUpperCase()===key) return game.home;
    return null;
  }

  function playCounts(summary,game){
    const league=String(game?.league||'').toLowerCase();
    const plays=liveDetailPlays(summary).filter(p=>playTextValue(p));
    return {
      all:plays.length,
      scoring:plays.filter(p=>isScoringPlay(p,league)).length
    };
  }

  function playRowMarkup(play,game,index,total){
    const league=String(game?.league||'').toLowerCase();
    const text=playTextValue(play);
    const clock=playClockValue(play);
    const team=playTeamValue(play);
    const score=playScoreLabel(play);
    const tag=sportPlayTag(play,league);
    const scoring=isScoringPlay(play,league);
    const teamObject=playTeamObject(game,team);
    let meta='';
    if(league==='mlb') meta=mlbCountText(play);
    else if(league==='nfl') meta=nflDownDistance(play);
    else if(league==='nhl') meta=String(play?.strength?.text||play?.strength||'');
    else if(league==='nba') meta=String(play?.shootingPlay===true?'SHOT':'');
    const copyHead=scoring
      ? '<div class="live-pbp-copy-head">'+(teamObject?teamLogoMarkup(teamObject,'live-pbp-score-logo'):'')+'<div>'+(team?'<b>'+esc(team)+'</b>':'')+'<span>SCORING PLAY</span></div></div>'
      : (team?'<b>'+esc(team)+'</b>':'');
    return '<article class="live-pbp-row sport-'+esc(league)+' '+(scoring?'is-scoring ':'')+'tone-'+esc(tag.tone)+'">'
      +'<div class="live-pbp-marker"><span>'+esc(playPeriodLabel(play,game))+'</span><small>'+esc(clock||String(total-index).padStart(2,'0'))+'</small></div>'
      +'<div class="live-pbp-event-tag">'+esc(tag.label)+'</div>'
      +'<div class="live-pbp-copy">'+copyHead+'<p>'+esc(text)+'</p>'+(meta?'<small>'+esc(meta)+'</small>':'')+'</div>'
      +(score?'<strong class="'+(scoring?'is-score-change':'')+'">'+esc(score)+'</strong>':'<strong></strong>')
    +'</article>';
  }

  function groupedSportPlayByPlay(summary,game){
    const league=String(game?.league||'').toLowerCase();
    let plays=liveDetailPlays(summary).filter(p=>playTextValue(p));
    if(livePlayFilter==='scoring') plays=plays.filter(p=>isScoringPlay(p,league));
    plays=plays.slice(-120).reverse();
    if(!plays.length){
      if(livePlayFilter==='scoring') return '<div class="live-detail-empty live-scoring-empty"><b>No scoring plays yet.</b><small>Switch to ALL PLAYS to follow every event.</small></div>';
      return '';
    }

    let previousLabel=null;
    const rows=[];
    plays.forEach((play,index)=>{
      const label=playPeriodLabel(play,game);
      if(label!==previousLabel){
        rows.push('<div class="live-pbp-period-head"><span>'+esc(label)+'</span><small>'+esc(league==='mlb'?'INNING':'PERIOD')+'</small></div>');
        previousLabel=label;
      }
      rows.push(playRowMarkup(play,game,index,plays.length));
    });
    return '<div class="live-pbp-list sport-'+esc(league)+'">'+rows.join('')+'</div>';
  }

  function nflDriveStartText(drive){
    const start=drive?.start||{};
    const period=start?.period?.number ?? start?.period;
    const clock=start?.clock?.displayValue||start?.clock||'';
    const yard=start?.yardLine;
    const team=start?.team?.abbreviation||drive?.team?.abbreviation||'';
    const parts=[];
    if(period!=null) parts.push(Number(period)<=4?'Q'+period:(Number(period)===5?'OT':(Number(period)-4)+'OT'));
    if(clock) parts.push(clock);
    if(team&&yard!=null) parts.push(team+' '+yard);
    else if(yard!=null) parts.push('YARD '+yard);
    return parts.join(' · ');
  }

  function nflDriveMarkup(drive,game,isCurrent=false){
    let plays=(drive?.plays||[]).filter(p=>playTextValue(p));
    if(livePlayFilter==='scoring') plays=plays.filter(p=>isScoringPlay(p,'nfl'));
    plays=plays.slice(-30).reverse();
    if(!plays.length) return '';
    const team=drive?.team?.abbreviation||drive?.team?.shortDisplayName||'';
    const result=drive?.displayResult||drive?.result||drive?.description||'DRIVE';
    const summaryBits=[];
    if(drive?.yards!=null) summaryBits.push(drive.yards+' YDS');
    if(drive?.timeElapsed?.displayValue) summaryBits.push(drive.timeElapsed.displayValue);
    if(drive?.plays?.length) summaryBits.push(drive.plays.length+' PLAYS');

    return '<section class="nfl-drive-card '+(isCurrent?'is-current':'')+' '+(livePlayFilter==='scoring'?'is-scoring-filter':'')+'">'
      +'<div class="nfl-drive-head"><div><span>'+esc(team||'DRIVE')+'</span><h4>'+esc(String(result).toUpperCase())+'</h4></div>'
      +'<div><b>'+esc(nflDriveStartText(drive))+'</b>'+(summaryBits.length?'<small>'+esc(summaryBits.join(' · '))+'</small>':'')+'</div></div>'
      +'<div class="nfl-drive-plays">'+plays.map((play,index)=>playRowMarkup(play,game,index,plays.length)).join('')+'</div>'
    +'</section>';
  }

  function nflPlayByPlayMarkup(summary,game){
    const previous=Array.isArray(summary?.drives?.previous)?summary.drives.previous:[];
    const current=summary?.drives?.current||null;
    const drives=[...previous.map(d=>({drive:d,current:false})),...(current?[{drive:current,current:true}]:[])]
      .filter(x=>{
        const plays=(x.drive?.plays||[]).filter(p=>playTextValue(p));
        return livePlayFilter==='scoring' ? plays.some(p=>isScoringPlay(p,'nfl')) : plays.length>0;
      })
      .slice(-12)
      .reverse();

    if(drives.length){
      return '<div class="nfl-drive-feed">'+drives.map(x=>nflDriveMarkup(x.drive,game,x.current)).join('')+'</div>';
    }
    if(livePlayFilter==='scoring') return '<div class="live-detail-empty live-scoring-empty"><b>No scoring plays yet.</b><small>Switch to ALL PLAYS to follow every drive.</small></div>';
    return groupedSportPlayByPlay(summary,game);
  }

  function playByPlayMarkup(summary,game){
    const league=String(game?.league||'').toLowerCase();
    let markup='';
    if(league==='nfl') markup=nflPlayByPlayMarkup(summary,game);
    else markup=groupedSportPlayByPlay(summary,game);

    if(markup) return markup;
    const msg=game?.state==='pre'
      ? 'No plays yet. Play-by-play will begin when the game starts.'
      : 'No play-by-play has been published for this game yet.';
    return '<div class="live-detail-empty"><b>'+esc(msg)+'</b><small>'+esc(game?.venue||gameStatusText(game))+'</small></div>';
  }

  function boxTeamEntry(summary,abbr,fallbackIndex){
    const teams=Array.isArray(summary?.boxscore?.teams)?summary.boxscore.teams:[];
    return teams.find(row=>String(row?.team?.abbreviation||'').toUpperCase()===String(abbr||'').toUpperCase()) || teams[fallbackIndex] || null;
  }

  function teamStatMap(entry){
    const map=new Map();
    (entry?.statistics||[]).forEach(stat=>{
      const key=String(stat?.name||stat?.label||stat?.displayName||'').trim();
      if(key) map.set(key,stat);
    });
    return map;
  }

  function teamStatsMarkup(summary,game){
    const away=boxTeamEntry(summary,game?.away?.abbr,0);
    const home=boxTeamEntry(summary,game?.home?.abbr,1);
    if(!away && !home) return '';
    const aMap=teamStatMap(away), hMap=teamStatMap(home);
    const preferred={
      nfl:['firstDowns','totalYards','netPassingYards','rushingYards','turnovers','possessionTime','thirdDownEff','fourthDownEff'],
      nba:['fieldGoalPct','threePointFieldGoalPct','freeThrowPct','totalRebounds','assists','turnovers','steals','blocks'],
      nhl:['shotsTotal','powerPlayGoals','powerPlayOpportunities','faceoffPercent','blockedShots','hits','giveaways','takeaways'],
      mlb:['hits','errors','leftOnBase','homeRuns','strikeouts','walks','stolenBases']
    }[String(game?.league||'').toLowerCase()] || [];
    const all=[...new Set([...preferred,...aMap.keys(),...hMap.keys()])];
    const rows=all.filter(key=>aMap.has(key)||hMap.has(key)).slice(0,10);
    if(!rows.length) return '';
    const value=stat=>stat?.displayValue ?? stat?.value ?? '—';
    const label=key=>aMap.get(key)?.label||aMap.get(key)?.displayName||hMap.get(key)?.label||hMap.get(key)?.displayName||key.replace(/([A-Z])/g,' $1');
    return '<section class="live-box-team-stats">'
      +'<div class="live-box-team-stats-head"><b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>TEAM STATS</span><b>'+esc(game?.home?.abbr||'HOME')+'</b></div>'
      +rows.map(key=>'<div class="live-box-team-stat-row"><strong>'+esc(value(aMap.get(key)))+'</strong><span>'+esc(label(key))+'</span><strong>'+esc(value(hMap.get(key)))+'</strong></div>').join('')
    +'</section>';
  }

  function playerBoxMarkup(summary){
    const teams=Array.isArray(summary?.boxscore?.players)?summary.boxscore.players:[];
    if(!teams.length) return '';
    return '<div class="live-player-box">'+teams.map(teamBlock=>{
      const teamName=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
      const groups=Array.isArray(teamBlock?.statistics)?teamBlock.statistics:[];
      const groupMarkup=groups.map(group=>{
        const athletes=(group?.athletes||[]).filter(row=>row?.athlete && !row?.didNotPlay).slice(0,24);
        if(!athletes.length) return '';
        const labels=Array.isArray(group?.labels)?group.labels:[];
        const title=group?.displayName||group?.name||'Players';
        return '<section class="live-player-stat-group"><h4>'+esc(title)+'</h4><div class="live-player-table-wrap"><table class="live-player-table"><thead><tr><th>PLAYER</th>'
          +labels.map(label=>'<th>'+esc(label)+'</th>').join('')
          +'</tr></thead><tbody>'
          +athletes.map(row=>'<tr><td>'+esc(row?.athlete?.shortName||row?.athlete?.displayName||'Player')+'</td>'
            +(row?.stats||[]).map(stat=>'<td>'+esc(stat??'—')+'</td>').join('')
          +'</tr>').join('')
          +'</tbody></table></div></section>';
      }).join('');
      return groupMarkup ? '<section class="live-player-team"><h3>'+esc(teamName)+'</h3>'+groupMarkup+'</section>' : '';
    }).join('')+'</div>';
  }

  function mlbSummaryCompetitor(summary,game,side){
    const rows=summary?.header?.competitions?.[0]?.competitors || [];
    const abbr=String(game?.[side]?.abbr||'').toUpperCase();
    return rows.find(row=>row?.homeAway===side)
      || rows.find(row=>String(row?.team?.abbreviation||'').toUpperCase()===abbr)
      || null;
  }

  function mlbLineValue(row,index){
    const item=Array.isArray(row?.linescores)?row.linescores[index]:null;
    if(item==null) return '—';
    const value=item?.displayValue ?? item?.value ?? item;
    return value==null || value==='' ? '—' : String(value);
  }

  function mlbTeamBoxStat(summary,game,side,key){
    const entry=boxTeamEntry(summary,game?.[side]?.abbr,side==='away'?0:1);
    const map=teamStatMap(entry);
    const stat=map.get(key);
    return stat?.displayValue ?? stat?.value ?? '—';
  }

  function mlbLineScoreMarkup(summary,game){
    const away=mlbSummaryCompetitor(summary,game,'away');
    const home=mlbSummaryCompetitor(summary,game,'home');
    const awayLines=Array.isArray(away?.linescores)?away.linescores:[];
    const homeLines=Array.isArray(home?.linescores)?home.linescores:[];
    const played=Math.max(awayLines.length,homeLines.length,Number(game?.period)||0);
    const innings=Math.max(9,played);
    const current=game?.state==='in' ? Number(game?.period)||0 : 0;
    const columns=Array.from({length:innings},(_,i)=>i+1);

    const total=(side,row)=>{
      const liveScore=game?.[side]?.score;
      const raw=row?.score ?? liveScore;
      return raw==null || raw==='' ? '—' : String(raw);
    };
    const hits=side=>mlbTeamBoxStat(summary,game,side,'hits');
    const errors=side=>mlbTeamBoxStat(summary,game,side,'errors');

    const teamRow=(side,row)=>{
      const team=game?.[side]||{};
      return '<tr>'
        +'<th class="mlb-line-team">'+teamLogoMarkup(team,'mlb-line-logo')+'<span>'+esc(team.abbr||side.toUpperCase())+'</span></th>'
        +columns.map(n=>'<td class="'+(n===current?'is-current-inning':'')+'">'+esc(mlbLineValue(row,n-1))+'</td>').join('')
        +'<td class="mlb-line-total">'+esc(total(side,row))+'</td>'
        +'<td class="mlb-line-total">'+esc(hits(side))+'</td>'
        +'<td class="mlb-line-total">'+esc(errors(side))+'</td>'
      +'</tr>';
    };

    return '<section class="mlb-line-score">'
      +'<div class="mlb-box-section-title"><div><span>MLB BOX SCORE</span><h3>Line score</h3></div><b>'+esc(gameShortState(game))+'</b></div>'
      +'<div class="mlb-line-scroll"><table class="mlb-line-table"><thead><tr><th>TEAM</th>'
        +columns.map(n=>'<th class="'+(n===current?'is-current-inning':'')+'">'+n+'</th>').join('')
        +'<th>R</th><th>H</th><th>E</th>'
      +'</tr></thead><tbody>'
        +teamRow('away',away)
        +teamRow('home',home)
      +'</tbody></table></div>'
    +'</section>';
  }

  function mlbGroupKind(group){
    const labels=(group?.labels||[]).map(x=>String(x).toUpperCase());
    const name=String(group?.name||group?.displayName||'').toLowerCase();
    if(labels.includes('IP') || /pitch/.test(name)) return 'pitching';
    return 'batting';
  }

  function mlbPlayerGroupMarkup(teamBlock,group,kind){
    const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
    const labels=Array.isArray(group?.labels)?group.labels:[];
    const athletes=(group?.athletes||[]).filter(row=>row?.athlete && !row?.didNotPlay);
    const title=team+' '+(kind==='pitching'?'PITCHING':'BATTING');

    if(!athletes.length){
      return '<section class="mlb-stat-card"><div class="mlb-stat-card-head"><h4>'+esc(title)+'</h4><span>'+esc(kind.toUpperCase())+'</span></div>'
        +'<div class="mlb-stat-empty">'+(kind==='pitching'?'Pitching lines':'Batting lines')+' will populate after first pitch.</div></section>';
    }

    return '<section class="mlb-stat-card">'
      +'<div class="mlb-stat-card-head"><h4>'+esc(title)+'</h4><span>'+esc(kind.toUpperCase())+'</span></div>'
      +'<div class="mlb-player-table-wrap"><table class="mlb-player-table"><thead><tr><th>PLAYER</th>'
        +labels.map(label=>'<th>'+esc(label)+'</th>').join('')
      +'</tr></thead><tbody>'
        +athletes.map(row=>{
          const player=row?.athlete?.shortName||row?.athlete?.displayName||'Player';
          const pos=row?.athlete?.position?.abbreviation||row?.position?.abbreviation||'';
          return '<tr><td><b>'+esc(player)+'</b>'+(pos?'<small>'+esc(pos)+'</small>':'')+'</td>'
            +(row?.stats||[]).map(stat=>'<td>'+esc(stat??'—')+'</td>').join('')
          +'</tr>';
        }).join('')
      +'</tbody></table></div>'
    +'</section>';
  }

  function mlbPlayerBoxMarkup(summary){
    const teams=Array.isArray(summary?.boxscore?.players)?summary.boxscore.players:[];
    if(!teams.length) return '';
    const batting=[];
    const pitching=[];
    teams.forEach(teamBlock=>{
      (teamBlock?.statistics||[]).forEach(group=>{
        const kind=mlbGroupKind(group);
        const markup=mlbPlayerGroupMarkup(teamBlock,group,kind);
        if(kind==='pitching') pitching.push(markup);
        else batting.push(markup);
      });
    });
    if(!batting.length && !pitching.length) return '';
    return '<div class="mlb-box-player-sections">'
      +(batting.length?'<section class="mlb-box-category"><div class="mlb-category-head"><span>OFFENSE</span><h3>Batting</h3></div>'+batting.join('')+'</section>':'')
      +(pitching.length?'<section class="mlb-box-category"><div class="mlb-category-head"><span>ON THE MOUND</span><h3>Pitching</h3></div>'+pitching.join('')+'</section>':'')
    +'</div>';
  }

  function mlbBoxScoreMarkup(summary,game){
    const line=mlbLineScoreMarkup(summary,game);
    const players=mlbPlayerBoxMarkup(summary);
    return '<div class="mlb-box-score">'+line+(players||'<div class="live-detail-empty"><b>Player box score is not available yet.</b><small>Batting and pitching lines will populate when the game starts.</small></div>')+'</div>';
  }

  const NHL_STAT_LABELS={
    blockedShots:'BLK',hits:'HIT',takeaways:'TK','plusMinus':'+/-',
    timeOnIce:'TOI',powerPlayTimeOnIce:'PP TOI',shortHandedTimeOnIce:'SH TOI',evenStrengthTimeOnIce:'EV TOI',
    shifts:'SHFT',goals:'G',ytdGoals:'YTD G',assists:'A',
    shotsTotal:'SOG',shotsMissed:'MISS',shootoutGoals:'SO G',
    faceoffsWon:'FW',faceoffsLost:'FL',faceoffPercent:'FO%',
    giveaways:'GV',penalties:'PEN',penaltyMinutes:'PIM',
    goalsAgainst:'GA',shotsAgainst:'SA',shootoutSaves:'SO SV',shootoutShotsAgainst:'SO SA',
    saves:'SV',savePct:'SV%',evenStrengthSaves:'EV SV',powerPlaySaves:'PP SV',shortHandedSaves:'SH SV'
  };

  function nhlSummaryCompetitor(summary,game,side){
    const rows=summary?.header?.competitions?.[0]?.competitors || [];
    const abbr=String(game?.[side]?.abbr||'').toUpperCase();
    return rows.find(row=>row?.homeAway===side)
      || rows.find(row=>String(row?.team?.abbreviation||'').toUpperCase()===abbr)
      || null;
  }

  function nhlPeriodScore(row,index){
    const item=Array.isArray(row?.linescores)?row.linescores[index]:null;
    const value=item?.displayValue ?? item?.value ?? item;
    return value==null || value==='' ? '—' : String(value);
  }

  function nhlPeriodScoreMarkup(summary,game){
    const away=nhlSummaryCompetitor(summary,game,'away');
    const home=nhlSummaryCompetitor(summary,game,'home');
    const awayLines=Array.isArray(away?.linescores)?away.linescores:[];
    const homeLines=Array.isArray(home?.linescores)?home.linescores:[];
    const played=Math.max(awayLines.length,homeLines.length,Number(game?.period)||0);
    const periods=Math.max(3,played);
    const columns=Array.from({length:periods},(_,i)=>{
      const n=i+1;
      if(n<=3) return {index:i,label:String(n)};
      if(n===4) return {index:i,label:'OT'};
      return {index:i,label:'OT'+(n-3)};
    });
    const current=game?.state==='in' ? Number(game?.period)||0 : 0;
    const rowMarkup=(side,row)=>{
      const team=game?.[side]||{};
      const total=row?.score ?? team?.score ?? '—';
      return '<tr>'
        +'<th class="nhl-period-team">'+teamLogoMarkup(team,'nhl-period-logo')+'<span>'+esc(team.abbr||side.toUpperCase())+'</span></th>'
        +columns.map(col=>'<td class="'+(col.index+1===current?'is-current-period':'')+'">'+esc(nhlPeriodScore(row,col.index))+'</td>').join('')
        +'<td class="nhl-period-total">'+esc(total)+'</td>'
      +'</tr>';
    };
    return '<section class="nhl-period-score">'
      +'<div class="nhl-box-section-title"><div><span>NHL BOX SCORE</span><h3>Period scoring</h3></div><b>'+esc(gameShortState(game))+'</b></div>'
      +'<div class="nhl-period-scroll"><table class="nhl-period-table"><thead><tr><th>TEAM</th>'
        +columns.map(col=>'<th class="'+(col.index+1===current?'is-current-period':'')+'">'+esc(col.label)+'</th>').join('')
        +'<th>T</th>'
      +'</tr></thead><tbody>'+rowMarkup('away',away)+rowMarkup('home',home)+'</tbody></table></div>'
    +'</section>';
  }

  function nhlTeamStatValue(summary,game,side,key){
    const entry=boxTeamEntry(summary,game?.[side]?.abbr,side==='away'?0:1);
    const stat=teamStatMap(entry).get(key);
    return stat?.displayValue ?? stat?.value ?? '—';
  }

  function nhlTeamSummaryMarkup(summary,game){
    const rows=[
      ['shotsTotal','SOG'],
      ['powerPlayGoals','PP GOALS'],
      ['powerPlayOpportunities','PP OPP'],
      ['faceoffPercent','FO%'],
      ['hits','HITS'],
      ['blockedShots','BLOCKS'],
      ['takeaways','TAKEAWAYS'],
      ['giveaways','GIVEAWAYS'],
      ['penalties','PENALTIES'],
      ['penaltyMinutes','PIM']
    ];
    return '<section class="nhl-team-summary">'
      +'<div class="nhl-team-summary-head"><b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>TEAM STATS</span><b>'+esc(game?.home?.abbr||'HOME')+'</b></div>'
      +rows.map(([key,label])=>'<div class="nhl-team-summary-row"><strong>'+esc(nhlTeamStatValue(summary,game,'away',key))+'</strong><span>'+esc(label)+'</span><strong>'+esc(nhlTeamStatValue(summary,game,'home',key))+'</strong></div>').join('')
    +'</section>';
  }

  function nhlStatColumns(group){
    const keys=Array.isArray(group?.keys)?group.keys:[];
    const labels=Array.isArray(group?.labels)?group.labels:[];
    const descriptions=Array.isArray(group?.descriptions)?group.descriptions:[];
    const count=Math.max(keys.length,labels.length);
    return Array.from({length:count},(_,index)=>{
      const key=keys[index]||'stat'+index;
      const rawLabel=labels[index]||key;
      return {
        key,
        label:NHL_STAT_LABELS[key]||rawLabel,
        rawLabel,
        description:descriptions[index]||''
      };
    });
  }

  function nhlGroupTitle(name){
    const value=String(name||'').toLowerCase();
    if(value==='forwards') return 'FORWARDS';
    if(value==='defenses'||value==='defensemen') return 'DEFENSE';
    if(value==='goalies') return 'GOALIES';
    if(value==='skaters') return 'SKATERS';
    return String(name||'PLAYERS').toUpperCase();
  }

  function nhlPlayerGroupMarkup(teamBlock,group){
    const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
    const athletes=(group?.athletes||[]).filter(row=>row?.athlete && !row?.didNotPlay);
    if(!athletes.length) return '';
    const cols=nhlStatColumns(group);
    const groupName=String(group?.name||group?.displayName||'players');
    return '<section class="nhl-stat-card">'
      +'<div class="nhl-stat-card-head"><div><span>'+esc(team)+'</span><h4>'+esc(nhlGroupTitle(groupName))+'</h4></div><b>'+athletes.length+' PLAYERS</b></div>'
      +'<div class="nhl-player-table-wrap"><table class="nhl-player-table"><thead><tr><th>PLAYER</th>'
        +cols.map(col=>'<th title="'+esc(col.description||col.rawLabel)+'" data-stat-key="'+esc(col.key)+'">'+esc(col.label)+'</th>').join('')
      +'</tr></thead><tbody>'
        +athletes.map(row=>{
          const player=row?.athlete?.shortName||row?.athlete?.displayName||'Player';
          const pos=row?.athlete?.position?.abbreviation||row?.position?.abbreviation||'';
          const stats=Array.isArray(row?.stats)?row.stats:[];
          return '<tr><td><b>'+esc(player)+'</b>'+(pos?'<small>'+esc(pos)+'</small>':'')+'</td>'
            +cols.map((col,index)=>'<td data-stat-key="'+esc(col.key)+'">'+esc(stats[index]??'—')+'</td>').join('')
          +'</tr>';
        }).join('')
      +'</tbody></table></div>'
    +'</section>';
  }

  function nhlPlayerBoxMarkup(summary){
    const teams=Array.isArray(summary?.boxscore?.players)?summary.boxscore.players:[];
    if(!teams.length) return '';
    return '<div class="nhl-player-sections">'+teams.map(teamBlock=>{
      const groups=Array.isArray(teamBlock?.statistics)?teamBlock.statistics:[];
      const hasSplitSkaters=groups.some(group=>['forwards','defenses','defensemen'].includes(String(group?.name||'').toLowerCase()) && (group?.athletes||[]).some(row=>row?.athlete&&!row?.didNotPlay));
      const cards=groups
        .filter(group=>{
          const name=String(group?.name||'').toLowerCase();
          if(name==='skaters' && hasSplitSkaters) return false;
          return (group?.athletes||[]).some(row=>row?.athlete&&!row?.didNotPlay);
        })
        .map(group=>nhlPlayerGroupMarkup(teamBlock,group))
        .join('');
      const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
      return cards ? '<section class="nhl-team-player-block"><div class="nhl-team-player-head"><span>PLAYER STATS</span><h3>'+esc(team)+'</h3></div>'+cards+'</section>' : '';
    }).join('')+'</div>';
  }

  function nhlBoxScoreMarkup(summary,game){
    const periods=nhlPeriodScoreMarkup(summary,game);
    const teamStats=nhlTeamSummaryMarkup(summary,game);
    const players=nhlPlayerBoxMarkup(summary);
    return '<div class="nhl-box-score">'+periods+teamStats+(players||'<div class="live-detail-empty"><b>Player stats are not available yet.</b><small>Skater and goalie lines will populate as the game feed updates.</small></div>')+'</div>';
  }

  function nflSummaryCompetitor(summary,game,side){
    const rows=summary?.header?.competitions?.[0]?.competitors || [];
    const abbr=String(game?.[side]?.abbr||'').toUpperCase();
    return rows.find(row=>row?.homeAway===side)
      || rows.find(row=>String(row?.team?.abbreviation||'').toUpperCase()===abbr)
      || null;
  }

  function nflQuarterValue(row,index){
    const item=Array.isArray(row?.linescores)?row.linescores[index]:null;
    const value=item?.displayValue ?? item?.value ?? item;
    return value==null || value==='' ? '—' : String(value);
  }

  function nflQuarterScoreMarkup(summary,game){
    const away=nflSummaryCompetitor(summary,game,'away');
    const home=nflSummaryCompetitor(summary,game,'home');
    const awayLines=Array.isArray(away?.linescores)?away.linescores:[];
    const homeLines=Array.isArray(home?.linescores)?home.linescores:[];
    const played=Math.max(awayLines.length,homeLines.length,Number(game?.period)||0);
    const quarters=Math.max(4,played);
    const columns=Array.from({length:quarters},(_,i)=>{
      const n=i+1;
      if(n<=4) return {index:i,label:'Q'+n};
      if(n===5) return {index:i,label:'OT'};
      return {index:i,label:(n-4)+'OT'};
    });
    const current=game?.state==='in' ? Number(game?.period)||0 : 0;
    const rowMarkup=(side,row)=>{
      const team=game?.[side]||{};
      const total=row?.score ?? team?.score ?? '—';
      return '<tr>'
        +'<th class="nfl-quarter-team">'+teamLogoMarkup(team,'nfl-quarter-logo')+'<span>'+esc(team.abbr||side.toUpperCase())+'</span></th>'
        +columns.map(col=>'<td class="'+(col.index+1===current?'is-current-quarter':'')+'">'+esc(nflQuarterValue(row,col.index))+'</td>').join('')
        +'<td class="nfl-quarter-total">'+esc(total)+'</td>'
      +'</tr>';
    };
    return '<section class="nfl-quarter-score">'
      +'<div class="nfl-box-section-title"><div><span>NFL BOX SCORE</span><h3>Scoring by quarter</h3></div><b>'+esc(gameShortState(game))+'</b></div>'
      +'<div class="nfl-quarter-scroll"><table class="nfl-quarter-table"><thead><tr><th>TEAM</th>'
        +columns.map(col=>'<th class="'+(col.index+1===current?'is-current-quarter':'')+'">'+esc(col.label)+'</th>').join('')
        +'<th>T</th>'
      +'</tr></thead><tbody>'+rowMarkup('away',away)+rowMarkup('home',home)+'</tbody></table></div>'
    +'</section>';
  }

  const NFL_TEAM_STAT_ORDER=[
    'firstDowns','firstDownsPassing','firstDownsRushing','firstDownsPenalty',
    'thirdDownEff','fourthDownEff','totalOffensivePlays','totalYards','yardsPerPlay','totalDrives',
    'netPassingYards','completionAttempts','yardsPerPass','interceptions','sacksYardsLost',
    'rushingYards','rushingAttempts','yardsPerRushAttempt','redZoneAttempts',
    'totalPenaltiesYards','turnovers','fumblesLost','defensiveTouchdowns','possessionTime'
  ];

  function nflTeamStatsMarkup(summary,game){
    const away=boxTeamEntry(summary,game?.away?.abbr,0);
    const home=boxTeamEntry(summary,game?.home?.abbr,1);
    const aMap=teamStatMap(away), hMap=teamStatMap(home);
    const keys=[...new Set([...NFL_TEAM_STAT_ORDER,...aMap.keys(),...hMap.keys()])]
      .filter(key=>aMap.has(key)||hMap.has(key));
    if(!keys.length) return '';
    const value=stat=>stat?.displayValue ?? stat?.value ?? '—';
    const label=key=>aMap.get(key)?.label||aMap.get(key)?.displayName||hMap.get(key)?.label||hMap.get(key)?.displayName||key.replace(/([A-Z])/g,' $1');
    return '<section class="nfl-team-summary">'
      +'<div class="nfl-team-summary-head"><b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>TEAM STATS</span><b>'+esc(game?.home?.abbr||'HOME')+'</b></div>'
      +keys.map(key=>'<div class="nfl-team-summary-row"><strong>'+esc(value(aMap.get(key)))+'</strong><span>'+esc(label(key))+'</span><strong>'+esc(value(hMap.get(key)))+'</strong></div>').join('')
    +'</section>';
  }

  function nflGroupTitle(name){
    const map={
      passing:'PASSING',rushing:'RUSHING',receiving:'RECEIVING',fumbles:'FUMBLES',
      defensive:'DEFENSE',interceptions:'INTERCEPTIONS',kickreturns:'KICK RETURNS',
      puntreturns:'PUNT RETURNS',kicking:'KICKING',punting:'PUNTING'
    };
    const key=String(name||'').replace(/\s+/g,'').toLowerCase();
    return map[key]||String(name||'PLAYERS').replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase();
  }

  function nflStatColumns(group){
    const keys=Array.isArray(group?.keys)?group.keys:[];
    const labels=Array.isArray(group?.labels)?group.labels:[];
    const descriptions=Array.isArray(group?.descriptions)?group.descriptions:[];
    const count=Math.max(keys.length,labels.length);
    return Array.from({length:count},(_,index)=>({
      key:keys[index]||'stat'+index,
      label:labels[index]||keys[index]||('STAT '+(index+1)),
      description:descriptions[index]||labels[index]||keys[index]||''
    }));
  }

  function nflPlayerGroupMarkup(teamBlock,group){
    const athletes=(group?.athletes||[]).filter(row=>row?.athlete && !row?.didNotPlay);
    if(!athletes.length) return '';
    const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
    const cols=nflStatColumns(group);
    const title=nflGroupTitle(group?.name||group?.displayName);
    return '<section class="nfl-stat-card" data-nfl-group="'+esc(String(group?.name||''))+'">'
      +'<div class="nfl-stat-card-head"><div><span>'+esc(team)+'</span><h4>'+esc(title)+'</h4></div><b>'+athletes.length+' PLAYERS</b></div>'
      +'<div class="nfl-player-table-wrap"><table class="nfl-player-table"><thead><tr><th>PLAYER</th>'
        +cols.map(col=>'<th title="'+esc(col.description)+'" data-stat-key="'+esc(col.key)+'">'+esc(col.label)+'</th>').join('')
      +'</tr></thead><tbody>'
        +athletes.map(row=>{
          const player=row?.athlete?.shortName||row?.athlete?.displayName||'Player';
          const pos=row?.athlete?.position?.abbreviation||row?.position?.abbreviation||'';
          const stats=Array.isArray(row?.stats)?row.stats:[];
          return '<tr><td><b>'+esc(player)+'</b>'+(pos?'<small>'+esc(pos)+'</small>':'')+'</td>'
            +cols.map((col,index)=>'<td data-stat-key="'+esc(col.key)+'">'+esc(stats[index]??'—')+'</td>').join('')
          +'</tr>';
        }).join('')
      +'</tbody></table></div>'
    +'</section>';
  }

  function nflPlayerBoxMarkup(summary){
    const teams=Array.isArray(summary?.boxscore?.players)?summary.boxscore.players:[];
    if(!teams.length) return '';
    return '<div class="nfl-player-sections">'+teams.map(teamBlock=>{
      const cards=(teamBlock?.statistics||[])
        .filter(group=>(group?.athletes||[]).some(row=>row?.athlete&&!row?.didNotPlay))
        .map(group=>nflPlayerGroupMarkup(teamBlock,group))
        .join('');
      const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
      return cards ? '<section class="nfl-team-player-block"><div class="nfl-team-player-head"><span>PLAYER STATS</span><h3>'+esc(team)+'</h3></div>'+cards+'</section>' : '';
    }).join('')+'</div>';
  }

  function nflBoxScoreMarkup(summary,game){
    const quarters=nflQuarterScoreMarkup(summary,game);
    const teamStats=nflTeamStatsMarkup(summary,game);
    const players=nflPlayerBoxMarkup(summary);
    return '<div class="nfl-box-score">'+quarters+teamStats+(players||'<div class="live-detail-empty"><b>Player stats are not available yet.</b><small>Passing, rushing, receiving and defensive lines will populate as the game feed updates.</small></div>')+'</div>';
  }

  function nbaSummaryCompetitor(summary,game,side){
    const rows=summary?.header?.competitions?.[0]?.competitors || [];
    const abbr=String(game?.[side]?.abbr||'').toUpperCase();
    return rows.find(row=>row?.homeAway===side)
      || rows.find(row=>String(row?.team?.abbreviation||'').toUpperCase()===abbr)
      || null;
  }

  function nbaQuarterValue(row,index){
    const item=Array.isArray(row?.linescores)?row.linescores[index]:null;
    const value=item?.displayValue ?? item?.value ?? item;
    return value==null || value==='' ? '—' : String(value);
  }

  function nbaQuarterScoreMarkup(summary,game){
    const away=nbaSummaryCompetitor(summary,game,'away');
    const home=nbaSummaryCompetitor(summary,game,'home');
    const awayLines=Array.isArray(away?.linescores)?away.linescores:[];
    const homeLines=Array.isArray(home?.linescores)?home.linescores:[];
    const played=Math.max(awayLines.length,homeLines.length,Number(game?.period)||0);
    const quarters=Math.max(4,played);
    const columns=Array.from({length:quarters},(_,i)=>{
      const n=i+1;
      if(n<=4) return {index:i,label:'Q'+n};
      if(n===5) return {index:i,label:'OT'};
      return {index:i,label:(n-4)+'OT'};
    });
    const current=game?.state==='in' ? Number(game?.period)||0 : 0;
    const rowMarkup=(side,row)=>{
      const team=game?.[side]||{};
      const total=row?.score ?? team?.score ?? '—';
      return '<tr>'
        +'<th class="nba-quarter-team">'+teamLogoMarkup(team,'nba-quarter-logo')+'<span>'+esc(team.abbr||side.toUpperCase())+'</span></th>'
        +columns.map(col=>'<td class="'+(col.index+1===current?'is-current-quarter':'')+'">'+esc(nbaQuarterValue(row,col.index))+'</td>').join('')
        +'<td class="nba-quarter-total">'+esc(total)+'</td>'
      +'</tr>';
    };
    return '<section class="nba-quarter-score">'
      +'<div class="nba-box-section-title"><div><span>NBA BOX SCORE</span><h3>Scoring by quarter</h3></div><b>'+esc(gameShortState(game))+'</b></div>'
      +'<div class="nba-quarter-scroll"><table class="nba-quarter-table"><thead><tr><th>TEAM</th>'
        +columns.map(col=>'<th class="'+(col.index+1===current?'is-current-quarter':'')+'">'+esc(col.label)+'</th>').join('')
        +'<th>T</th>'
      +'</tr></thead><tbody>'+rowMarkup('away',away)+rowMarkup('home',home)+'</tbody></table></div>'
    +'</section>';
  }

  const NBA_TEAM_STAT_ORDER=[
    'fieldGoalsMade-fieldGoalsAttempted','fieldGoalPct',
    'threePointFieldGoalsMade-threePointFieldGoalsAttempted','threePointFieldGoalPct',
    'freeThrowsMade-freeThrowsAttempted','freeThrowPct',
    'totalRebounds','offensiveRebounds','defensiveRebounds',
    'assists','steals','blocks','turnovers','teamTurnovers','totalTurnovers',
    'technicalFouls','totalTechnicalFouls','flagrantFouls',
    'turnoverPoints','fastBreakPoints','pointsInPaint','fouls',
    'largestLead','leadChanges','leadPercentage'
  ];

  function nbaTeamStatsMarkup(summary,game){
    const away=boxTeamEntry(summary,game?.away?.abbr,0);
    const home=boxTeamEntry(summary,game?.home?.abbr,1);
    const aMap=teamStatMap(away), hMap=teamStatMap(home);
    const keys=[...new Set([...NBA_TEAM_STAT_ORDER,...aMap.keys(),...hMap.keys()])]
      .filter(key=>aMap.has(key)||hMap.has(key));
    if(!keys.length) return '';
    const value=stat=>stat?.displayValue ?? stat?.value ?? '—';
    const label=key=>aMap.get(key)?.label||aMap.get(key)?.displayName||hMap.get(key)?.label||hMap.get(key)?.displayName||key.replace(/([A-Z])/g,' $1');
    return '<section class="nba-team-summary">'
      +'<div class="nba-team-summary-head"><b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>TEAM STATS</span><b>'+esc(game?.home?.abbr||'HOME')+'</b></div>'
      +keys.map(key=>'<div class="nba-team-summary-row"><strong>'+esc(value(aMap.get(key)))+'</strong><span>'+esc(label(key))+'</span><strong>'+esc(value(hMap.get(key)))+'</strong></div>').join('')
    +'</section>';
  }

  function nbaStatColumns(group){
    const keys=Array.isArray(group?.keys)?group.keys:[];
    const labels=Array.isArray(group?.labels)?group.labels:[];
    const descriptions=Array.isArray(group?.descriptions)?group.descriptions:[];
    const count=Math.max(keys.length,labels.length);
    return Array.from({length:count},(_,index)=>({
      key:keys[index]||'stat'+index,
      label:labels[index]||keys[index]||('STAT '+(index+1)),
      description:descriptions[index]||labels[index]||keys[index]||''
    }));
  }

  function nbaPlayerTeamMarkup(teamBlock){
    const team=teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||teamBlock?.team?.displayName||'TEAM';
    const groups=Array.isArray(teamBlock?.statistics)?teamBlock.statistics:[];
    const group=groups.find(g=>Array.isArray(g?.athletes)) || null;
    if(!group) return '';
    const cols=nbaStatColumns(group);
    const allAthletes=group.athletes||[];
    const active=allAthletes.filter(row=>row?.athlete && !row?.didNotPlay);
    const dnp=allAthletes.filter(row=>row?.athlete && row?.didNotPlay);

    const table=active.length
      ? '<div class="nba-player-table-wrap"><table class="nba-player-table"><thead><tr><th>PLAYER</th>'
          +cols.map(col=>'<th title="'+esc(col.description)+'" data-stat-key="'+esc(col.key)+'">'+esc(col.label)+'</th>').join('')
        +'</tr></thead><tbody>'
          +active.map(row=>{
            const player=row?.athlete?.shortName||row?.athlete?.displayName||'Player';
            const pos=row?.athlete?.position?.abbreviation||row?.position?.abbreviation||'';
            const stats=Array.isArray(row?.stats)?row.stats:[];
            const starter=row?.starter===true;
            return '<tr class="'+(starter?'is-starter':'')+'"><td><b>'+esc(player)+'</b>'+(pos?'<small>'+esc(pos)+(starter?' · STARTER':'')+'</small>':'')+'</td>'
              +cols.map((col,index)=>'<td data-stat-key="'+esc(col.key)+'">'+esc(stats[index]??'—')+'</td>').join('')
            +'</tr>';
          }).join('')
        +'</tbody></table></div>'
      : '<div class="nba-stat-empty">Player stats will populate when the game starts.</div>';

    const dnpMarkup=dnp.length
      ? '<div class="nba-dnp-block"><span>DNP</span><div>'+dnp.map(row=>'<b>'+esc(row?.athlete?.shortName||row?.athlete?.displayName||'Player')+'</b><small>'+esc(row?.reason||row?.comment||'Did not play')+'</small>').join('')+'</div></div>'
      : '';

    return '<section class="nba-team-player-block">'
      +'<div class="nba-team-player-head"><span>PLAYER STATS</span><h3>'+esc(team)+'</h3></div>'
      +'<section class="nba-stat-card"><div class="nba-stat-card-head"><div><span>'+esc(team)+'</span><h4>BOX SCORE</h4></div><b>'+active.length+' ACTIVE</b></div>'
      +table+dnpMarkup
      +'</section></section>';
  }

  function nbaPlayerBoxMarkup(summary){
    const teams=Array.isArray(summary?.boxscore?.players)?summary.boxscore.players:[];
    if(!teams.length) return '';
    return '<div class="nba-player-sections">'+teams.map(nbaPlayerTeamMarkup).join('')+'</div>';
  }

  function nbaBoxScoreMarkup(summary,game){
    const quarters=nbaQuarterScoreMarkup(summary,game);
    const teamStats=nbaTeamStatsMarkup(summary,game);
    const players=nbaPlayerBoxMarkup(summary);
    return '<div class="nba-box-score">'+quarters+teamStats+(players||'<div class="live-detail-empty"><b>Player stats are not available yet.</b><small>Full player lines will populate as the game feed updates.</small></div>')+'</div>';
  }

  function boxScoreMarkup(summary,game){
    const league=String(game?.league||'').toLowerCase();
    if(league==='mlb') return mlbBoxScoreMarkup(summary,game);
    if(league==='nhl') return nhlBoxScoreMarkup(summary,game);
    if(league==='nfl') return nflBoxScoreMarkup(summary,game);
    if(league==='nba') return nbaBoxScoreMarkup(summary,game);
    const teamStats=teamStatsMarkup(summary,game);
    const players=playerBoxMarkup(summary);
    if(!teamStats && !players){
      return '<div class="live-detail-empty"><b>Box score is not available yet.</b><small>'+esc(game?.state==='pre'?'Player stats will populate after the game starts.':'The live scoreboard remains connected.')+'</small></div>';
    }
    return teamStats+players;
  }

  async function ensureLiveGameDetail(game,force=false){
    const key=liveDetailKey(game);
    if(!key) return null;
    const fetched=liveDetailFetchedAt.get(key)||0;
    if(!force && liveDetailCache.has(key) && Date.now()-fetched < liveDetailTtl(game)) return liveDetailCache.get(key);
    if(liveDetailInFlight.has(key)) return liveDetailInFlight.get(key);
    const url=liveDetailUrl(game);
    if(!url){
      const unavailable={error:true};
      liveDetailCache.set(key,unavailable);
      liveDetailFetchedAt.set(key,Date.now());
      return unavailable;
    }
    const request=fetch(url,{cache:'no-store'})
      .then(async response=>{
        if(!response.ok) throw new Error('Game detail HTTP '+response.status);
        const payload=await response.json();
        liveDetailCache.set(key,payload||{});
        liveDetailFetchedAt.set(key,Date.now());
        return payload||{};
      })
      .catch(error=>{
        console.error('TSO game detail:',error);
        const unavailable={error:true,message:String(error?.message||error)};
        liveDetailCache.set(key,unavailable);
        liveDetailFetchedAt.set(key,Date.now());
        return unavailable;
      })
      .finally(()=>liveDetailInFlight.delete(key));
    liveDetailInFlight.set(key,request);
    return request;
  }

  function liveDetailFreshnessText(timestamp){
    const age=Math.max(0,Math.round((Date.now()-Number(timestamp||0))/1000));
    if(!timestamp) return 'Waiting for feed';
    if(age<5) return 'Updated just now';
    if(age<60) return 'Updated '+age+' sec ago';
    return 'Updated '+Math.floor(age/60)+' min ago';
  }

  function liveWatchNumber(value){
    if(value==null || value==='') return null;
    if(typeof value==='number') return Number.isFinite(value)?value:null;
    const match=String(value).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    if(!match) return null;
    const n=Number(match[0]);
    return Number.isFinite(n)?n:null;
  }

  function liveWatchMetric(league,groupName,key,label,raw,position=''){
    const value=liveWatchNumber(raw);
    if(value==null || value<=0) return null;
    const group=String(groupName||'').toLowerCase();
    const k=String(key||'');
    const l=String(label||key||'').toUpperCase();

    if(league==='mlb'){
      const pos=String(position||'').toUpperCase();
      const pitching=/pitch/.test(group) || /^(P|SP|RP|CL)$/.test(pos);

      // For Player to Watch, pitchers qualify ONLY on strikeouts.
      // A pitcher allowing hits/runs is never treated as "hot."
      if(pitching){
        if(k!=='strikeouts') return null;
        if(value<6) return null;
        return {label:'K',value,display:String(raw),heat:value*2.8};
      }

      const cfg={
        homeRuns:['HR',14],RBIs:['RBI',4.5],hits:['H',3.6],runs:['R',2.8],stolenBases:['SB',6],walks:['BB',1.8]
      };
      const hit=cfg[k];
      return hit?{label:hit[0],value,display:String(raw),heat:value*hit[1]}:null;
    }

    if(league==='nhl'){
      const cfg={
        goals:['G',14],assists:['A',8],points:['PTS',9],shotsTotal:['SOG',2.4],
        saves:['SV',.65],powerPlayGoals:['PPG',11],shortHandedGoals:['SHG',14]
      };
      const hit=cfg[k];
      return hit?{label:hit[0],value,display:String(raw),heat:value*hit[1]}:null;
    }

    if(league==='nfl'){
      const cfg={
        passingTouchdowns:['PASS TD',15],rushingTouchdowns:['RUSH TD',17],receivingTouchdowns:['REC TD',17],
        passingYards:['PASS YDS',.035],rushingYards:['RUSH YDS',.095],receivingYards:['REC YDS',.095],
        receptions:['REC',2.2],sacks:['SACK',9],interceptions:['INT',11],totalTackles:['TACKLES',1.5],
        tackles:['TACKLES',1.5],fieldGoalsMade:['FG',5]
      };
      const hit=cfg[k];
      return hit?{label:hit[0],value,display:String(raw),heat:value*hit[1]}:null;
    }

    if(league==='nba'){
      // NBA Player to Watch is intentionally based only on the big three:
      // points, rebounds and assists.
      const cfg={
        points:['PTS',.55],
        rebounds:['REB',1.25],
        assists:['AST',1.7]
      };
      const hit=cfg[k];
      return hit?{label:hit[0],value,display:String(raw),heat:value*hit[1]}:null;
    }

    return null;
  }

  function liveWatchAthleteName(athlete){
    return String(athlete?.shortName||athlete?.displayName||athlete?.fullName||athlete?.name||'Player').trim();
  }

  function liveWatchHeadshotMarkup(athlete,name){
    const src=athlete?.headshot?.href||athlete?.headshot?.url||athlete?.image?.href||athlete?.image?.url||'';
    const initials=String(name||'P').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
    if(!src) return '<span class="live-watch-headshot"><span>'+esc(initials)+'</span></span>';
    return '<span class="live-watch-headshot"><span>'+esc(initials)+'</span><img src="'+esc(src)+'" alt="'+esc(name)+'" loading="lazy" onerror="this.style.display=\'none\'" /></span>';
  }

  function liveWatchStatMap(keys,labels,stats){
    const map=new Map();
    const count=Math.max(keys?.length||0,labels?.length||0,stats?.length||0);
    for(let i=0;i<count;i++){
      const key=String(keys?.[i]||'').trim();
      const label=String(labels?.[i]||'').trim();
      const value=stats?.[i];
      if(key) map.set(key,value);
      if(label) map.set(label,value);
    }
    return map;
  }

  function liveWatchMainStats(league,groupName,position,keys,labels,stats){
    const map=liveWatchStatMap(keys,labels,stats);
    const pos=String(position||'').toUpperCase();
    const group=String(groupName||'').toLowerCase();
    const pitching=/pitch/.test(group) || /^(P|SP|RP|CL)$/.test(pos);

    const value=(...names)=>{
      for(const name of names){
        if(map.has(name)){
          const v=map.get(name);
          if(v!=null && v!=='') return String(v);
        }
      }
      return '—';
    };

    if(league==='mlb'){
      if(pitching){
        return [
          {label:'K',value:value('strikeouts','K')},
          {label:'IP',value:value('fullInnings.partInnings','IP')},
          {label:'ER',value:value('earnedRuns','ER')}
        ];
      }
      return [
        {label:'H',value:value('hits','H')},
        {label:'HR',value:value('homeRuns','HR')},
        {label:'RBI',value:value('RBIs','RBI')},
        {label:'R',value:value('runs','R')}
      ];
    }

    if(league==='nba'){
      return [
        {label:'PTS',value:value('points','PTS')},
        {label:'REB',value:value('rebounds','REB')},
        {label:'AST',value:value('assists','AST')}
      ];
    }

    if(league==='nhl'){
      return [
        {label:'G',value:value('goals','G')},
        {label:'A',value:value('assists','A')},
        {label:'SOG',value:value('shotsTotal','SOG','S')},
        {label:'TOI',value:value('timeOnIce','TOI')}
      ];
    }

    if(league==='nfl'){
      if(/pass/.test(group)){
        return [
          {label:'YDS',value:value('passingYards','YDS')},
          {label:'TD',value:value('passingTouchdowns','TD')},
          {label:'CMP/ATT',value:value('completionsAttempts','C/ATT','CMP/ATT')}
        ];
      }
      if(/rush/.test(group)){
        return [
          {label:'CAR',value:value('rushingAttempts','CAR')},
          {label:'YDS',value:value('rushingYards','YDS')},
          {label:'TD',value:value('rushingTouchdowns','TD')}
        ];
      }
      if(/receiv/.test(group)){
        return [
          {label:'REC',value:value('receptions','REC')},
          {label:'YDS',value:value('receivingYards','YDS')},
          {label:'TD',value:value('receivingTouchdowns','TD')},
          {label:'TGT',value:value('receivingTargets','TGTS','TGT')}
        ];
      }
      return [
        {label:'TACK',value:value('totalTackles','tackles','TOT')},
        {label:'SACK',value:value('sacks','SACK')},
        {label:'INT',value:value('interceptions','INT')}
      ];
    }

    return [];
  }

  function livePlayerToWatch(summary,game){
    const league=String(game?.league||'').toLowerCase();
    let best=null;

    for(const teamBlock of summary?.boxscore?.players||[]){
      const teamAbbr=String(teamBlock?.team?.abbreviation||teamBlock?.team?.shortDisplayName||'').toUpperCase();
      const gameTeam=String(game?.away?.abbr||'').toUpperCase()===teamAbbr ? game.away
        : String(game?.home?.abbr||'').toUpperCase()===teamAbbr ? game.home : null;

      for(const group of teamBlock?.statistics||[]){
        const keys=Array.isArray(group?.keys)?group.keys:[];
        const labels=Array.isArray(group?.labels)?group.labels:[];
        const groupName=group?.name||group?.displayName||'';

        for(const row of group?.athletes||[]){
          if(!row?.athlete || row?.didNotPlay) continue;
          const stats=Array.isArray(row?.stats)?row.stats:[];
          let hottest=null;
          for(let i=0;i<Math.max(keys.length,labels.length,stats.length);i++){
            const metric=liveWatchMetric(
              league,
              groupName,
              keys[i]||'',
              labels[i]||keys[i]||'',
              stats[i],
              row?.athlete?.position?.abbreviation||row?.position?.abbreviation||''
            );
            if(metric && (!hottest || metric.heat>hottest.heat)) hottest=metric;
          }
          if(!hottest) continue;

          const starterBonus=row?.starter===true ? .35 : 0;
          const score=hottest.heat+starterBonus;
          if(!best || score>best.score){
            const position=row?.athlete?.position?.abbreviation||row?.position?.abbreviation||'';
            best={
              score,
              metric:hottest,
              athlete:row.athlete,
              team:gameTeam,
              teamAbbr:teamAbbr||gameTeam?.abbr||'',
              position,
              mainStats:liveWatchMainStats(league,groupName,position,keys,labels,stats)
            };
          }
        }
      }
    }
    return best;
  }

  function renderLivePlayerWatch(root,game,summary){
    const node=root?.querySelector('[data-live-player-watch]');
    if(!node) return;

    if(!game){
      node.classList.add('live-player-watch--loading');
      node.innerHTML='<div class="live-player-watch-loading"><div><b>No game selected</b><small>Select a game from Today’s games below.</small></div></div>';
      return;
    }

    if(!summary || summary?.error){
      node.classList.add('live-player-watch--loading');
      node.innerHTML='<div class="live-player-watch-loading"><span class="live-feed-spinner"></span><div><b>Finding player to watch…</b><small>Reading live '+esc(leagueLabel(game.league))+' stats</small></div></div>';
      return;
    }

    const pick=livePlayerToWatch(summary,game);
    if(!pick){
      node.classList.add('live-player-watch--loading');
      node.innerHTML='<div class="live-player-watch-empty"><span>PLAYER TO WATCH</span><b>Waiting for a hot stat</b><small>Live player stats will appear here as the game develops.</small></div>';
      return;
    }

    node.classList.remove('live-player-watch--loading');
    const name=liveWatchAthleteName(pick.athlete);
    const teamLabel=[pick.teamAbbr,pick.position].filter(Boolean).join(' · ');
    node.innerHTML='<div class="live-watch-top"><span>PLAYER TO WATCH</span><b><i></i> HOT NOW</b></div>'
      +'<div class="live-watch-player">'
        +liveWatchHeadshotMarkup(pick.athlete,name)
        +'<div class="live-watch-player-copy"><h3>'+esc(name)+'</h3><small>'+esc(teamLabel)+'</small></div>'
      +'</div>'
      +'<div class="live-watch-stat"><span>ON FIRE</span><strong>'+esc(pick.metric.display)+' <em>'+esc(pick.metric.label)+'</em></strong></div>'
      +(pick.mainStats?.length?'<div class="live-watch-game-stats"><span>THIS GAME</span><div class="stats-count-'+pick.mainStats.length+'">'+pick.mainStats.map(stat=>'<b><em>'+esc(stat.label)+'</em><strong>'+esc(stat.value)+'</strong></b>').join('')+'</div></div>':'')
      +'<div class="live-watch-foot">'
        +(pick.team?teamLogoMarkup(pick.team,'live-watch-team-logo'):'')
        +'<span>Selected from this game’s live box score</span>'
      +'</div>';
  }

  function liveSummaryCompetition(summary){
    return summary?.header?.competitions?.[0] || null;
  }

  function liveLatestPlay(summary){
    const plays=liveDetailPlays(summary).filter(p=>playTextValue(p));
    if(plays.length) return plays[plays.length-1];
    const current=summary?.drives?.current?.plays;
    if(Array.isArray(current)&&current.length) return current[current.length-1];
    return null;
  }

  function livePersonName(value){
    if(!value) return '';
    const person=value?.athlete||value?.player||value;
    return String(person?.shortName||person?.displayName||person?.fullName||person?.name||'').trim();
  }

  function livePersonId(value){
    if(!value) return '';
    const person=value?.athlete||value?.player||value;
    return String(person?.playerId||person?.id||person?.uid||'').trim();
  }

  function livePlayerRecordById(summary,id){
    const key=String(id||'').trim();
    if(!key) return null;

    for(const team of summary?.boxscore?.players||[]){
      for(const group of team?.statistics||[]){
        for(const row of group?.athletes||[]){
          const athlete=row?.athlete||{};
          if(String(athlete?.id||athlete?.playerId||athlete?.uid||'').trim()===key) return athlete;
        }
      }
    }

    for(const team of summary?.rosters||[]){
      for(const row of team?.roster||team?.athletes||[]){
        const athlete=row?.athlete||row;
        if(String(athlete?.id||athlete?.playerId||athlete?.uid||'').trim()===key) return athlete;
      }
    }
    return null;
  }

  function liveResolvedPersonName(summary,value){
    const direct=livePersonName(value);
    if(direct) return direct;
    const id=livePersonId(value);
    const record=livePlayerRecordById(summary,id);
    return livePersonName(record);
  }

  function liveParticipantName(summary,play,types=[]){
    const wanted=types.map(x=>String(x).toLowerCase());
    const row=(play?.participants||[]).find(p=>wanted.includes(String(p?.type||p?.role||'').toLowerCase()));
    return liveResolvedPersonName(summary,row);
  }

  function liveSituationStat(summary,game,side,key){
    const entry=boxTeamEntry(summary,game?.[side]?.abbr,side==='away'?0:1);
    const stat=teamStatMap(entry).get(key);
    return stat?.displayValue ?? stat?.value ?? '—';
  }

  function liveMetric(label,value,extraClass=''){
    return '<div class="live-situation-metric '+esc(extraClass)+'"><span>'+esc(label)+'</span><b>'+esc(value==null||value===''?'—':value)+'</b></div>';
  }

  function mlbBaseActive(situation,key){
    const aliases={
      first:['onFirst','first','runnerOnFirst'],
      second:['onSecond','second','runnerOnSecond'],
      third:['onThird','third','runnerOnThird']
    }[key]||[];
    return aliases.some(name=>{
      const value=situation?.[name];
      if(value==null) return false;
      if(typeof value==='boolean') return value;
      if(typeof value==='number') return value!==0;
      return true;
    });
  }

  function mlbSituationMarkup(summary,game){
    const comp=liveSummaryCompetition(summary);
    const latest=liveLatestPlay(summary)||{};
    const situation=summary?.situation||comp?.situation||latest?.situation||{};
    const count=situation?.count||latest?.count||latest?.end?.count||latest?.start?.count||{};
    const balls=count?.balls ?? situation?.balls;
    const strikes=count?.strikes ?? situation?.strikes;
    const outs=count?.outs ?? situation?.outs;
    const batter=liveResolvedPersonName(summary,situation?.batter||situation?.currentBatter)
      || liveParticipantName(summary,latest,['batter','hitter']);
    const pitcher=liveResolvedPersonName(summary,situation?.pitcher||situation?.currentPitcher)
      || liveParticipantName(summary,latest,['pitcher']);
    const first=mlbBaseActive(situation,'first');
    const second=mlbBaseActive(situation,'second');
    const third=mlbBaseActive(situation,'third');
    const inning=playPeriodLabel(latest,game);
    const countText=(balls!=null||strikes!=null)?String(balls??0)+'-'+String(strikes??0):'—';
    const outText=outs!=null?String(outs)+' OUT'+(Number(outs)===1?'':'S'):'—';
    return '<div class="live-situation-layout sport-mlb">'
      +'<div class="live-situation-primary"><span>AT BAT</span><b>'+esc(batter||'—')+'</b><small>'+esc(inning)+'</small></div>'
      +'<div class="live-base-state" aria-label="Base runners">'
        +'<i class="base second '+(second?'is-on':'')+'"></i>'
        +'<i class="base third '+(third?'is-on':'')+'"></i>'
        +'<i class="base first '+(first?'is-on':'')+'"></i>'
      +'</div>'
      +liveMetric('COUNT',countText)
      +liveMetric('OUTS',outText)
      +'<div class="live-situation-primary is-secondary"><span>PITCHING</span><b>'+esc(pitcher||'—')+'</b><small>'+esc(game?.away?.abbr+' @ '+game?.home?.abbr)+'</small></div>'
    +'</div>';
  }

  function nflSituationMarkup(summary,game){
    const previous=Array.isArray(summary?.drives?.previous)?summary.drives.previous:[];
    const drive=summary?.drives?.current || previous[previous.length-1] || null;
    const latest=(drive?.plays||[]).filter(p=>playTextValue(p)).slice(-1)[0] || liveLatestPlay(summary) || {};
    const spot=latest?.end||latest?.start||drive?.end||drive?.start||{};
    const down=Number(spot?.down);
    const distance=spot?.distance;
    const yard=spot?.yardLine;
    const spotTeam=spot?.team?.abbreviation||drive?.team?.abbreviation||'';
    const offense=drive?.team?.abbreviation||playTeamValue(latest)||'';
    const downText=Number.isFinite(down)&&down>0
      ? down+(down===1?'ST':down===2?'ND':down===3?'RD':'TH')+(distance!=null?' & '+distance:'')
      : '—';
    const fieldText=yard!=null ? (spotTeam?spotTeam+' '+yard:'YARD '+yard) : '—';
    const driveBits=[];
    const drivePlays=drive?.offensivePlays ?? drive?.plays?.length;
    if(drivePlays!=null) driveBits.push(drivePlays+' PLAYS');
    if(drive?.yards!=null) driveBits.push(drive.yards+' YDS');
    if(drive?.timeElapsed?.displayValue) driveBits.push(drive.timeElapsed.displayValue);
    const teamObj=playTeamObject(game,offense);
    return '<div class="live-situation-layout sport-nfl">'
      +'<div class="live-situation-team">'+(teamObj?teamLogoMarkup(teamObj,'live-situation-team-logo'):'')+'<div><span>POSSESSION</span><b>'+esc(offense||'—')+'</b><small>'+esc(drive?.displayResult||drive?.description||'Current drive')+'</small></div></div>'
      +liveMetric('DOWN',downText,'is-featured')
      +liveMetric('FIELD POSITION',fieldText)
      +liveMetric('CLOCK',String(game?.clock||'—'))
      +'<div class="live-situation-drive"><span>DRIVE</span><b>'+esc(driveBits.join(' · ')||'In progress')+'</b></div>'
    +'</div>';
  }

  function nhlSituationMarkup(summary,game){
    const comp=liveSummaryCompetition(summary);
    const competitors=comp?.competitors||[];
    const awayComp=competitors.find(x=>x?.homeAway==='away')||null;
    const homeComp=competitors.find(x=>x?.homeAway==='home')||null;
    const latest=liveLatestPlay(summary)||{};
    let strength=String(latest?.strength?.text||latest?.strength||'').trim();
    if(awayComp?.powerPlay===true) strength=(game?.away?.abbr||'AWAY')+' POWER PLAY';
    else if(homeComp?.powerPlay===true) strength=(game?.home?.abbr||'HOME')+' POWER PLAY';
    if(!strength) strength='EVEN STRENGTH';
    const awaySog=liveSituationStat(summary,game,'away','shotsTotal');
    const homeSog=liveSituationStat(summary,game,'home','shotsTotal');
    return '<div class="live-situation-layout sport-nhl">'
      +'<div class="live-situation-primary"><span>ON ICE</span><b>'+esc(strength)+'</b><small>'+esc(gameShortState(game))+'</small></div>'
      +liveMetric((game?.away?.abbr||'AWAY')+' SOG',awaySog)
      +liveMetric((game?.home?.abbr||'HOME')+' SOG',homeSog)
      +liveMetric('PERIOD',String(game?.period||'—'))
      +liveMetric('CLOCK',String(game?.clock||'—'))
    +'</div>';
  }

  function nbaPossessionAbbr(summary,game,latest){
    const comp=liveSummaryCompetition(summary);
    const situation=summary?.situation||comp?.situation||{};
    const raw=situation?.possession?.abbreviation||situation?.possession?.team?.abbreviation||situation?.possession;
    if(typeof raw==='string'&&raw.trim()) return raw.trim().toUpperCase();
    const possessed=(comp?.competitors||[]).find(x=>x?.possession===true);
    if(possessed?.team?.abbreviation) return String(possessed.team.abbreviation).toUpperCase();
    return playTeamValue(latest).toUpperCase();
  }

  function nbaSituationMarkup(summary,game){
    const latest=liveLatestPlay(summary)||{};
    const possession=nbaPossessionAbbr(summary,game,latest);
    const teamObj=playTeamObject(game,possession);
    const explicit=Boolean((summary?.situation||liveSummaryCompetition(summary)?.situation)?.possession)
      || Boolean((liveSummaryCompetition(summary)?.competitors||[]).some(x=>x?.possession===true));
    const awayFouls=liveSituationStat(summary,game,'away','fouls');
    const homeFouls=liveSituationStat(summary,game,'home','fouls');
    return '<div class="live-situation-layout sport-nba">'
      +'<div class="live-situation-team">'+(teamObj?teamLogoMarkup(teamObj,'live-situation-team-logo'):'')+'<div><span>'+esc(explicit?'POSSESSION':'LAST ACTION')+'</span><b>'+esc(possession||'—')+'</b><small>'+esc(playTypeText(latest)||'Live game')+'</small></div></div>'
      +liveMetric('QUARTER',String(game?.period||'—'),'is-featured')
      +liveMetric('CLOCK',String(game?.clock||'—'))
      +liveMetric((game?.away?.abbr||'AWAY')+' FOULS',awayFouls)
      +liveMetric((game?.home?.abbr||'HOME')+' FOULS',homeFouls)
    +'</div>';
  }

  function liveSituationMarkup(summary,game){
    const league=String(game?.league||'').toLowerCase();
    if(league==='mlb') return mlbSituationMarkup(summary,game);
    if(league==='nfl') return nflSituationMarkup(summary,game);
    if(league==='nhl') return nhlSituationMarkup(summary,game);
    if(league==='nba') return nbaSituationMarkup(summary,game);
    return '';
  }

  function renderLiveSituation(root,game,cached){
    const node=root?.querySelector('[data-live-current-situation]');
    if(!node) return;
    const show=liveDetailTab==='plays' && game?.state==='in' && cached && !cached?.error;
    if(!show){
      node.hidden=true;
      node.innerHTML='';
      return;
    }
    const markup=liveSituationMarkup(cached,game);
    node.innerHTML=markup;
    node.hidden=!markup;
  }

  function bindLiveDetailTabs(root,game){
    root.querySelectorAll('[data-live-detail-tab]').forEach(btn=>{
      const tab=btn.dataset.liveDetailTab==='box'?'box':'plays';
      const active=tab===liveDetailTab;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-selected',String(active));
      btn.onclick=()=>{
        liveDetailTab=tab;
        renderLiveGameDetail(root,game,{preserveScroll:false});
      };
    });
  }

  function bindLivePlayControls(root,game,cached,fetched){
    const controls=root?.querySelector('[data-live-play-controls]');
    if(!controls) return;
    controls.hidden=liveDetailTab!=='plays';

    const counts=cached&&!cached.error ? playCounts(cached,game) : {all:0,scoring:0};
    controls.querySelectorAll('[data-live-play-count]').forEach(node=>{
      const key=node.dataset.livePlayCount==='scoring'?'scoring':'all';
      node.textContent=counts[key] ? '('+counts[key]+')' : '';
    });

    controls.querySelectorAll('[data-live-play-filter]').forEach(btn=>{
      const filter=btn.dataset.livePlayFilter==='scoring'?'scoring':'all';
      const active=filter===livePlayFilter;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-pressed',String(active));
      btn.onclick=()=>{
        livePlayFilter=filter;
        renderLiveGameDetail(root,game,{preserveScroll:false});
      };
    });

    const freshness=controls.querySelector('[data-live-detail-freshness]');
    if(freshness){
      const live=game?.state==='in';
      freshness.classList.toggle('is-live',live);
      freshness.classList.toggle('is-final',game?.state==='post');
      const label=freshness.querySelector('b');
      const small=freshness.querySelector('small');
      if(label) label.textContent=live?'LIVE':game?.state==='post'?'FINAL':'UPCOMING';
      if(small) small.textContent=liveDetailFreshnessText(fetched);
    }
  }

  function renderLiveGameDetail(root,game,{preserveScroll=true}={}){
    const panel=root?.querySelector('[data-live-game-detail]');
    const body=panel?.querySelector('[data-live-detail-body]');
    const title=panel?.querySelector('[data-live-detail-title]');
    if(!panel || !body) return;
    const previousScroll=preserveScroll ? body.scrollTop : 0;
    const previousHeight=preserveScroll ? body.scrollHeight : 0;
    if(title) title.textContent=game ? (game.away?.abbr||'AWAY')+' @ '+(game.home?.abbr||'HOME') : 'Game detail';
    bindLiveDetailTabs(root,game);
    if(!game){
      bindLivePlayControls(root,null,null,0);
      renderLiveSituation(root,null,null);
      renderLivePlayerWatch(root,null,null);
      body.innerHTML='<div class="live-detail-empty"><b>No game selected.</b><small>Choose a game from Today’s games below.</small></div>';
      return;
    }

    const key=liveDetailKey(game);
    const cached=liveDetailCache.get(key);
    const fetched=liveDetailFetchedAt.get(key)||0;
    const stale=!cached || Date.now()-fetched >= liveDetailTtl(game);
    bindLivePlayControls(root,game,cached,fetched);
    renderLiveSituation(root,game,cached);
    renderLivePlayerWatch(root,game,cached);

    if(cached?.error){
      body.innerHTML='<div class="live-detail-empty"><b>Detailed game feed is temporarily unavailable.</b><small>The main scoreboard will keep updating automatically.</small></div>';
    }else if(cached){
      body.innerHTML=liveDetailTab==='box' ? boxScoreMarkup(cached,game) : playByPlayMarkup(cached,game);
    }else{
      body.innerHTML='<div class="live-detail-loading"><span class="live-feed-spinner"></span><div><b>Loading '+(liveDetailTab==='box'?'box score':'play by play')+'…</b><small>'+esc(game.away?.abbr)+' @ '+esc(game.home?.abbr)+'</small></div></div>';
    }

    if(preserveScroll){
      requestAnimationFrame(()=>{
        if(!body.isConnected) return;
        if(previousScroll<=20) body.scrollTop=0;
        else body.scrollTop=Math.max(0,previousScroll+(body.scrollHeight-previousHeight));
      });
    }else{
      body.scrollTop=0;
    }

    if(stale && !liveDetailInFlight.has(key)){
      ensureLiveGameDetail(game).then(()=>{
        if(currentRoute!=='live' || !panel.isConnected) return;
        const active=currentFeedGames().find(g=>String(g.id)===String(selectedLiveGameId));
        if(active && String(active.id)===String(game.id)) renderLiveGameDetail(root,active,{preserveScroll:true});
      });
    }
  }

  function refreshSelectedLiveDetail(){
    if(currentRoute!=='live' || document.hidden || liveDetailTab!=='plays') return;
    const game=currentFeedGames().find(g=>String(g.id)===String(selectedLiveGameId));
    if(!game || game.state!=='in') return;
    const root=document.querySelector('[data-page-route="live"]') || pageContent || document;
    const panel=root?.querySelector?.('[data-live-game-detail]');
    if(!panel) return;
    ensureLiveGameDetail(game,true).then(()=>{
      if(currentRoute!=='live' || !panel.isConnected || liveDetailTab!=='plays') return;
      const active=currentFeedGames().find(g=>String(g.id)===String(selectedLiveGameId));
      if(active && String(active.id)===String(game.id)) renderLiveGameDetail(root,active,{preserveScroll:true});
    });
  }

  function renderHomeLiveData(){
    if(currentRoute !== 'home' || !liveFeedCache) return;
    const games = sortedGames(liveFeedCache.games || []);
    const feature = games.find(g => g.state === 'in') || games.find(g => g.state === 'pre') || games[0];
    const hero = document.querySelector('.feature-game.concept-matchup');
    if(hero) hero.innerHTML = featureGameMarkup(feature,true);

    const kicker = document.querySelector('.broadcast-title .broadcast-kicker');
    if(kicker){
      const d = new Date();
      kicker.textContent = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(d).toUpperCase();
    }

    const board = document.querySelector('.concept-slate-board');
    if(board){
      const head = board.querySelector('.concept-slate-head')?.outerHTML || '';
      const rows = games.slice(0,8).map(game => {
        const awayScore = game.state === 'pre' ? '—' : esc(game.away?.score ?? 0);
        const homeScore = game.state === 'pre' ? '—' : esc(game.home?.score ?? 0);
        return '<button class="concept-slate-row '+(game.state==='in'?'concept-slate-row--live':'')+'" data-live-open="'+esc(game.id)+'">'
          +'<span class="slate-time '+(game.state==='in'?'live-state':'')+'">'+esc(gameShortState(game))+' · '+esc(leagueLabel(game.league))+'</span>'
          +'<span class="slate-matchup"><b class="slate-team">'+teamLogoMarkup(game.away,'slate-team-logo')+'<span>'+esc(game.away?.abbr)+'</span></b><i>'+awayScore+'</i><em>VS</em><i>'+homeScore+'</i><b class="slate-team">'+teamLogoMarkup(game.home,'slate-team-logo')+'<span>'+esc(game.home?.abbr)+'</span></b></span>'
          +'<span class="slate-signal"><small>LIVE SCOREBOARD</small><b>'+esc(game.venue || feedUpdatedText())+'</b></span>'
          +'<span class="slate-action">'+(game.state==='in'?'LIVE':'VIEW')+' →</span>'
          +'</button>';
      }).join('');
      board.innerHTML = head + (rows || '<div class="live-board-loading"><b>No games returned for today.</b></div>');
    }

    document.querySelectorAll('[data-route-jump="live"]').forEach(btn => btn.onclick=()=>setRoute('live'));
    bindLiveGeneratedActions();
  }

  function renderLiveCenter(){
    const root = document.querySelector('[data-live-route]');
    if(currentRoute !== 'live' || !root || !liveFeedCache) return;
    const games = currentFeedGames();
    const liveCount = games.filter(g => g.state === 'in').length;
    const upcomingCount = games.filter(g => g.state === 'pre').length;
    let feature = games.find(g => String(g.id) === String(selectedLiveGameId));
    if(!feature) feature = games.find(g => g.state === 'in') || games.find(g => g.state === 'pre') || games[0];
    selectedLiveGameId = feature?.id != null ? String(feature.id) : null;

    const badge = root.querySelector('[data-live-feed-badge]');
    if(badge){
      badge.innerHTML = '<i></i> LIVE SCORE FEED';
      badge.classList.add('is-connected');
    }
    const meta = root.querySelector('[data-live-filter-meta]');
    if(meta) meta.innerHTML = '<span class="live-pulse '+(liveCount?'':'is-idle')+'"></span><b>'+liveCount+' LIVE</b><span>·</span><small>'+upcomingCount+' upcoming · '+esc(feedUpdatedText())+'</small>';

    const featureNode = root.querySelector('[data-live-feature]');
    if(featureNode){
      featureNode.classList.remove('live-feed-loading');
      featureNode.innerHTML = featureGameMarkup(feature,false);
    }
    renderLiveGameDetail(root,feature);

    const board = root.querySelector('[data-live-score-board]');
    if(board){
      board.innerHTML = games.length ? games.map(game => '<button class="live-score-row '+(game.state==='in'?'is-featured':'')+'" data-live-open="'+esc(game.id)+'">'
        +'<span class="live-score-state"><i></i>'+esc(gameShortState(game))+'</span>'
        +'<span class="live-score-matchup"><b class="live-score-team">'+teamLogoMarkup(game.away,'live-score-team-logo')+'<span>'+esc(game.away?.abbr)+'</span></b><strong>'+esc(game.state==='pre'?'—':game.away?.score ?? 0)+'</strong><em>VS</em><strong>'+esc(game.state==='pre'?'—':game.home?.score ?? 0)+'</strong><b class="live-score-team">'+teamLogoMarkup(game.home,'live-score-team-logo')+'<span>'+esc(game.home?.abbr)+'</span></b></span>'
        +'<span class="live-score-context"><small>LEAGUE</small><b>'+esc(leagueLabel(game.league))+'</b></span>'
        +'<span class="live-score-context"><small>VENUE</small><b>'+esc(game.venue || '—')+'</b></span>'
        +'<span class="live-score-action">'+(game.state==='in'?'LIVE':'DETAILS')+' →</span>'
      +'</button>').join('') : '<div class="live-board-loading"><b>'+esc(currentLeague==='nfl'?'No games returned for the current NFL weekly slate.':'No games returned for this sport today.')+'</b></div>';
    }
    const title = root.querySelector('[data-live-board-title]');
    if(title) title.textContent = currentLeague === 'all' ? 'Today’s games' : currentLeague==='nfl' ? 'NFL weekly slate · Tuesday–Monday' : leagueLabel(currentLeague)+' games today';
    bindLiveGeneratedActions();
    root.querySelector('[data-live-multi]')?.addEventListener('click',openLiveMultiGame);
  }

  function closeLiveMultiGame(){
    document.querySelector('.live-multi-overlay')?.remove();
    document.body.classList.remove('live-multi-open');
  }

  function liveMultiGameCard(game){
    const awayScore=game.state==='pre'?'—':String(game.away?.score??0);
    const homeScore=game.state==='pre'?'—':String(game.home?.score??0);
    const status=game.state==='pre'?gameMarqueeStatusText(game):gameShortState(game);
    return '<button class="live-multi-card '+(game.state==='in'?'is-live':'')+'" data-live-multi-open="'+esc(game.id)+'">'
      +'<div class="live-multi-card-top"><span>'+esc(leagueLabel(game.league))+'</span><b>'+esc(status)+'</b></div>'
      +'<div class="live-multi-team"><span>'+teamLogoMarkup(game.away,'live-multi-logo')+'<b>'+esc(game.away?.abbr||'AWAY')+'</b><small>'+esc(game.away?.name||'')+'</small></span><strong>'+esc(awayScore)+'</strong></div>'
      +'<div class="live-multi-team"><span>'+teamLogoMarkup(game.home,'live-multi-logo')+'<b>'+esc(game.home?.abbr||'HOME')+'</b><small>'+esc(game.home?.name||'')+'</small></span><strong>'+esc(homeScore)+'</strong></div>'
      +'<div class="live-multi-card-foot"><span>'+esc(game.venue||'Venue pending')+'</span><b>OPEN GAME →</b></div>'
      +'</button>';
  }

  function openLiveMultiGame(){
    closeLiveMultiGame();
    const games=currentFeedGames();
    const overlay=document.createElement('div');
    overlay.className='live-multi-overlay';
    overlay.innerHTML='<section class="live-multi-shell" role="dialog" aria-modal="true" aria-label="Multi-game view">'
      +'<div class="live-multi-head"><div><span>MULTI-GAME COMMAND VIEW</span><h2>'+(currentLeague==='all'?'Today across The Outpost':esc(leagueLabel(currentLeague))+(currentLeague==='nfl'?' weekly slate':' today'))+'</h2><small>'+games.length+' game'+(games.length===1?'':'s')+' in the current filter</small></div><button type="button" data-live-multi-close aria-label="Close multi-game view">×</button></div>'
      +'<div class="live-multi-grid">'+(games.length?games.map(liveMultiGameCard).join(''):'<div class="notification-empty"><b>No games in this filter.</b><small>The live feed is connected, but nothing is scheduled here right now.</small></div>')+'</div>'
      +'</section>';
    document.body.appendChild(overlay);
    document.body.classList.add('live-multi-open');
    overlay.querySelector('[data-live-multi-close]')?.addEventListener('click',closeLiveMultiGame);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeLiveMultiGame();});
    overlay.querySelectorAll('[data-live-multi-open]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=String(btn.dataset.liveMultiOpen||'');
      if(id)selectedLiveGameId=id;
      closeLiveMultiGame();
      setRoute('live');
      renderLiveCenter();
      document.querySelector('[data-live-feature]')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
    bindMediaFallbacks();
  }

  function propsFeedIntegrityState(){
    const warnings=Array.isArray(propsFeedCache?.warnings)?propsFeedCache.warnings.filter(Boolean):[];
    const sportStates=Object.values(propsFeedCache?.sports||{});
    const fallback=String(propsFeedCache?.sourceMode||'').toLowerCase().includes('fallback')
      || String(propsFeedCache?.sourceMode||'').toLowerCase().includes('mixed')
      || sportStates.some(x=>String(x?.fetchMode||'').toLowerCase().includes('fallback'))
      || warnings.length>0;
    return {fallback,warnings};
  }

  // Existing TSO 1.0 account notifications are owned by auth.uid() under
  // Supabase RLS. They never come from client-maintained fake history.
  // Scoring alerts originate ONLY from the server's official MLB
  // play-by-play verifier. Never infer a hit from odds, models, or score alone.
  function verifiedHitEntry(row){
    return {id:'hit:'+String(row.id),verifiedHitId:Number(row.id),
      persistedRead:row.read===true,tone:'live',mark:'⚾',
      eyebrow:'OFFICIAL MLB HR · VERIFIED',
      title:String(row.player||'Saved player')+' · HOME RUN',
      copy:String(row.message||'Official MLB scoring event confirmed'),
      time:row.event_at?ageText(row.event_at)+' old':'confirmed',
      route:'profile',league:'mlb'};
  }
  async function refreshVerifiedHitAlerts(force=false){
    const userId=String(window.TSO_AUTH?.user?.id||'');
    if(userId!==verifiedHitOwnerId){
      verifiedHitOwnerId=userId;verifiedHitAlerts=[];
      verifiedHitFetchedAt=0;verifiedHitLastCheckAt=0;verifiedHitError='';
      verifiedHitRequest=null;renderNotificationCenter();
    }
    if(!userId||typeof window.TSO_AUTH?.loadVerifiedHits!=='function')return;
    if(verifiedHitRequest)return verifiedHitRequest;
    const checkDue=Date.now()-verifiedHitLastCheckAt>=VERIFIED_HIT_POLL_MS;
    if(!force&&!checkDue&&Date.now()-verifiedHitFetchedAt<ACCOUNT_NOTIFICATION_REFRESH_MS)return;
    verifiedHitRequest=(async()=>{
      if(checkDue&&typeof window.TSO_AUTH?.checkVerifiedHomeRuns==='function'){
        verifiedHitLastCheckAt=Date.now();
        try{await window.TSO_AUTH.checkVerifiedHomeRuns();}
        catch(error){
          if(String(window.TSO_AUTH?.user?.id||'')===userId)
            verifiedHitError=String(error?.message||'Official MLB verification paused');
        }
      }
      const rows=await window.TSO_AUTH.loadVerifiedHits(16);
      if(String(window.TSO_AUTH?.user?.id||'')!==userId)return;
      verifiedHitAlerts=Array.isArray(rows)?rows:[];
      verifiedHitFetchedAt=Date.now();
      renderNotificationCenter();
    })().catch(error=>{
      if(String(window.TSO_AUTH?.user?.id||'')!==userId)return;
      verifiedHitError=String(error?.message||'Verified hit inbox unavailable');
      renderNotificationCenter();
    }).finally(()=>{verifiedHitRequest=null;});
    return verifiedHitRequest;
  }
  function savedNotificationEntry(row){
    const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const name=String(payload.player_name||'Player');
    const detail=String(payload.detail||payload.result||'');
    const time=row.created_at?ageText(row.created_at)+' old':'saved';
    const common={id:'account:'+String(row.id),persistedRead:row.read===true,accountNotificationId:Number(row.id),time};
    switch(String(row.type||'')){
      case 'atbat_up':
        return {...common,tone:'live',mark:'⚾',eyebrow:'SAVED MLB ALERT',title:name+' is at bat',copy:String(payload.game||'Watchlist at-bat alert'),route:'live',league:'mlb'};
      case 'atbat_result':
        return {...common,tone:'default',mark:'⚾',eyebrow:'SAVED MLB RESULT',title:name+' · '+String(payload.result||'At-bat update'),copy:detail,route:'live',league:'mlb'};
      case 'follow':
        return {...common,tone:'default',mark:'◉',eyebrow:'COMMUNITY',title:'New follower',copy:String(payload.username||'A member')+' followed you',route:'community'};
      case 'comment':
        return {...common,tone:'default',mark:'✎',eyebrow:'COMMUNITY',title:'New comment',copy:'Someone replied to your activity',route:'community'};
      default:
        return {...common,tone:'default',mark:'◉',eyebrow:'ACCOUNT UPDATE',title:'Saved notification',copy:'Open your account activity',route:'profile'};
    }
  }
  async function refreshSavedAccountNotifications(force=false){
    void refreshVerifiedHitAlerts(force);
    const userId=String(window.TSO_AUTH?.user?.id||'');
    if(userId!==savedAccountNotificationOwnerId){
      savedAccountNotificationOwnerId=userId;
      savedAccountNotifications=[];
      savedAccountNotificationFetchedAt=0;
      savedAccountNotificationError='';
      notificationReadIds.clear();
      renderNotificationCenter();
    }
    if(!userId||typeof window.TSO_AUTH?.loadNotifications!=='function')return;
    if(savedAccountNotificationRequest)return savedAccountNotificationRequest;
    if(!force&&Date.now()-savedAccountNotificationFetchedAt<ACCOUNT_NOTIFICATION_REFRESH_MS)return;
    const requestedId=userId;
    savedAccountNotificationRequest=window.TSO_AUTH.loadNotifications(24)
      .then(rows=>{
        if(String(window.TSO_AUTH?.user?.id||'')!==requestedId)return;
        savedAccountNotifications=Array.isArray(rows)?rows:[];
        savedAccountNotificationFetchedAt=Date.now();
        savedAccountNotificationError='';
        renderNotificationCenter();
      })
      .catch(error=>{
        if(String(window.TSO_AUTH?.user?.id||'')!==requestedId)return;
        savedAccountNotificationError=String(error?.message||'Could not load saved notifications');
        renderNotificationCenter();
      }).finally(()=>{savedAccountNotificationRequest=null});
    return savedAccountNotificationRequest;
  }

  function notificationEntries(){
    const entries=[];
    const now=Date.now();

    if(savedAccountNotificationError&&window.TSO_AUTH?.user){
      entries.push({id:'system:saved-inbox',tone:'warning',mark:'!',eyebrow:'ACCOUNT INBOX',
        title:'Saved notifications unavailable',copy:savedAccountNotificationError,time:'retrying',route:'profile'});
    }
    if(liveFeedError){
      entries.push({id:'system:live-feed',tone:'warning',mark:'!',eyebrow:'SYSTEM',title:'Live score feed needs attention',copy:liveFeedError,time:'retrying',route:'live'});
    }
    if(propsFeedError){
      entries.push({id:'system:props-feed',tone:'warning',mark:'!',eyebrow:'SYSTEM',title:'Props / model feed needs attention',copy:propsFeedError,time:'retrying',route:'props'});
    }

    if(propsFeedCache){
      const integrity=propsFeedIntegrityState();
      if(integrity.fallback){
        const newest=propsNewestTimestamp(propsFeedCache.rows||[]);
        entries.push({
          id:'system:fallback-snapshot',tone:'warning',mark:'!',eyebrow:'DATA HEALTH',
          title:'Verified fallback snapshot in use',
          copy:integrity.warnings[0]||'A live source is unavailable; TSO is showing an older verified snapshot.',
          time:newest?ageText(newest)+' old':'verified cache',route:'props'
        });
      }
    }

    const liveGames=sortedGames(liveFeedCache?.games||[]).filter(game=>game.state==='in').slice(0,3);
    liveGames.forEach(game=>{
      entries.push({
        id:'live:'+String(game.league)+':'+String(game.id),tone:'live',mark:'●',eyebrow:leagueLabel(game.league)+' LIVE',
        title:String(game.away?.abbr||'AWAY')+' '+String(game.away?.score??'')+' · '+String(game.home?.abbr||'HOME')+' '+String(game.home?.score??''),
        copy:game.detail||gameShortState(game),time:'now',route:'live',league:game.league,gameId:String(game.id)
      });
    });

    const soon=sortedGames(liveFeedCache?.games||[]).filter(game=>{
      if(game.state!=='pre')return false;
      const t=Date.parse(game.startTime||'');
      return Number.isFinite(t)&&t>=now&&t-now<=90*60000;
    }).slice(0,2);
    soon.forEach(game=>{
      const mins=Math.max(0,Math.round((Date.parse(game.startTime)-now)/60000));
      entries.push({
        id:'soon:'+String(game.league)+':'+String(game.id),tone:'default',mark:'◷',eyebrow:leagueLabel(game.league)+' STARTING SOON',
        title:String(game.away?.abbr||'AWAY')+' @ '+String(game.home?.abbr||'HOME'),
        copy:(game.venue||'Venue pending')+' · opens in Live Center',time:mins+'m',route:'live',league:game.league,gameId:String(game.id)
      });
    });

    const modeled=sortPropsRows(allModeledRows()).filter(row=>Number.isFinite(Number(row?.model?.edgePct))).slice(0,3);
    modeled.forEach(row=>{
      const edge=Number(row.model.edgePct);
      entries.push({
        id:'model:'+String(row.key),tone:'model',mark:'◎',eyebrow:leagueLabel(row.sport)+' MODEL SIGNAL',
        title:String(row.player)+' · '+propSelectionText(row),
        copy:'Model '+pct1(row.model.probabilityPct)+' · edge '+edgeText(edge)+' · '+americanPrice(row.price)+' '+String(row.book||'verified book'),
        time:row.snapshotTime?ageText(row.snapshotTime)+' old':'current',route:'models',league:row.sport
      });
    });

    // Recent persisted alerts follow critical feed warnings. Keep some space
    // for live games and model alerts even when an account inbox has history.
    const officialHitEntries=verifiedHitAlerts.slice(0,4).map(verifiedHitEntry);
    entries.unshift(...officialHitEntries);
    const accountEntries=savedAccountNotifications.slice(0,4).map(savedNotificationEntry);
    entries.splice(Math.min(entries.length,Math.max(2,officialHitEntries.length)),0,...accountEntries);
    return entries.slice(0,9);
  }

  function notificationItemMarkup(entry){
    const unread=(entry.accountNotificationId||entry.verifiedHitId)?entry.persistedRead!==true:!notificationReadIds.has(entry.id);
    return '<button class="notification-item '+(unread?'is-unread ':'')+'is-'+esc(entry.tone||'default')+'" data-notification-id="'+esc(entry.id)+'" data-notification-route="'+esc(entry.route||'home')+'" data-notification-league="'+esc(entry.league||'')+'" data-notification-game="'+esc(entry.gameId||'')+'">'
      +'<span class="notification-item-mark">'+esc(entry.mark||'•')+'</span>'
      +'<span class="notification-item-copy"><span>'+esc(entry.eyebrow||'TSO')+'</span><b>'+esc(entry.title||'Notification')+'</b><small>'+esc(entry.copy||'')+'</small></span>'
      +'<span class="notification-item-time">'+esc(entry.time||'')+'</span>'
      +'</button>';
  }

  function renderNotificationCenter(){
    if(!notificationList||!notificationButton)return;
    const entries=notificationEntries();
    const unread=entries.filter(entry=>(entry.accountNotificationId||entry.verifiedHitId)?entry.persistedRead!==true:!notificationReadIds.has(entry.id)).length;
    if(notificationDot)notificationDot.hidden=unread===0;
    if(notificationCount){
      notificationCount.hidden=unread===0;
      notificationCount.textContent=unread>9?'9+':String(unread);
    }
    notificationButton.setAttribute('aria-label',unread?('Notifications · '+unread+' unread'):'Notifications');
    notificationList.innerHTML=entries.length
      ? entries.map(notificationItemMarkup).join('')
      : '<div class="notification-empty"><b>No current alerts.</b><small>Live games, model signals and system warnings will appear here automatically.</small></div>';

    notificationList.querySelectorAll('[data-notification-id]').forEach(btn=>btn.onclick=()=>{
      const id=String(btn.dataset.notificationId||'');
      if(id.startsWith('hit:')){
        const hitId=Number(id.slice(4));
        if(Number.isSafeInteger(hitId)&&hitId>0){
          void window.TSO_AUTH?.markVerifiedHitsRead?.([hitId])
            .then(()=>{
              const saved=verifiedHitAlerts.find(x=>Number(x.id)===hitId);
              if(saved)saved.read=true;
              renderNotificationCenter();
            }).catch(error=>console.warn('[TSO2 verified HR] Read acknowledgement failed',error?.message||error));
        }
      }else if(id.startsWith('account:')){
        const notificationId=Number(id.slice(8));
        if(Number.isSafeInteger(notificationId)&&notificationId>0){
          void window.TSO_AUTH?.markNotificationsRead?.([notificationId])
            .then(()=>{
              const saved=savedAccountNotifications.find(x=>Number(x.id)===notificationId);
              if(saved)saved.read=true;
              renderNotificationCenter();
            }).catch(error=>{
              console.warn('[TSO2 notifications] Could not mark saved alert read:',error?.message||error);
            });
        }
      }else if(id)notificationReadIds.add(id);
      const league=String(btn.dataset.notificationLeague||'');
      const route=String(btn.dataset.notificationRoute||'home');
      const gameId=String(btn.dataset.notificationGame||'');
      if(league&&league!==currentLeague)setLeague(league);
      if(gameId)selectedLiveGameId=gameId;
      renderNotificationCenter();
      closeNotificationCenter();
      setRoute(route);
    });
  }

  function markAllNotificationsRead(){
    notificationEntries().forEach(entry=>{
      if(!entry.accountNotificationId&&!entry.verifiedHitId)notificationReadIds.add(entry.id);
    });
    const userId=String(window.TSO_AUTH?.user?.id||'');
    if(userId&&typeof window.TSO_AUTH?.markVerifiedHitsRead==='function'){
      void window.TSO_AUTH.markVerifiedHitsRead().then(()=>{
        if(String(window.TSO_AUTH?.user?.id||'')!==userId)return;
        verifiedHitAlerts.forEach(row=>{row.read=true;});
        renderNotificationCenter();
      }).catch(error=>console.warn('[TSO2 verified HR] Mark-all failed',error?.message||error));
    }
    if(userId&&typeof window.TSO_AUTH?.markNotificationsRead==='function'){
      void window.TSO_AUTH.markNotificationsRead().then(()=>{
        if(String(window.TSO_AUTH?.user?.id||'')!==userId)return;
        savedAccountNotifications.forEach(row=>{row.read=true});
        renderNotificationCenter();
      }).catch(error=>{
        savedAccountNotificationError=String(error?.message||'Could not save read status');
        renderNotificationCenter();
      });
    }
    renderNotificationCenter();
  }

  function livePulseRows(){
    const all=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const modeled=sortPropsRows(all.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))));
    if(currentLeague!=='all') return modeled.slice(0,3);
    const selected=[];
    for(const sport of ['nhl','nfl','mlb']){
      const row=modeled.find(x=>x.sport===sport);
      if(row)selected.push(row);
    }
    if(selected.length<3){
      for(const row of modeled){
        if(selected.includes(row))continue;
        selected.push(row);
        if(selected.length===3)break;
      }
    }
    return selected;
  }

  function livePulseCardMarkup(row,index){
    const model=row?.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const tone=homeModelTone(row,index);
    const edge=hasModel?Number(model.edgePct):null;
    const selection=propSelectionText(row);
    const source=hasModel?modelSourceText(row):'VERIFIED MARKET';
    const snapshot=row?.snapshotTime?ageText(row.snapshotTime)+' old':'timestamp unavailable';
    const topTag=hasModel?modelTagText(row):'MARKET ONLY';
    const metric=hasModel?pct1(model.probabilityPct):americanPrice(row.price);
    const comparison=hasModel
      ? '<div class="live-model-shift"><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><i>→</i><span><small>MODEL</small><b>'+pct1(model.probabilityPct)+'</b></span><strong class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong></div>'
      : '<div class="live-model-shift"><span><small>SELECTION</small><b>'+esc(selection)+'</b></span><i>·</i><span><small>PRICE</small><b>'+esc(americanPrice(row.price))+'</b></span><strong>'+esc(row.book||'VERIFIED')+'</strong></div>';
    return '<article class="live-model-card live-model-card--'+tone+'">'
      +'<div class="live-model-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+esc(topTag)+'</b></div>'
      +'<div class="live-model-player">'+propHeadshotMarkup(row,'live-model-headshot')+'<div><h3>'+esc(row.player)+'</h3><small>'+esc(selection)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div><span class="live-model-badge"><small>'+(hasModel?'MODEL':'PRICE')+'</small><strong>'+esc(metric)+'</strong></span></div>'
      +comparison
      +'<div class="live-model-reason">'+esc(source)+' · '+esc(row.book||'verified book')+' · '+esc(snapshot)+'</div>'
      +'</article>';
  }

  function renderFeedIntegrity(){
    const node=document.querySelector('[data-feed-integrity]');
    if(!node)return;
    if(!propsFeedCache){node.hidden=true;node.innerHTML='';return;}
    const integrity=propsFeedIntegrityState();
    if(!integrity.fallback){node.hidden=true;node.innerHTML='';return;}
    const newest=propsNewestTimestamp(propsFeedCache.rows||[]);
    node.hidden=false;
    node.innerHTML='<span>!</span><div><b>VERIFIED FALLBACK SNAPSHOT IN USE</b><small>'+esc(integrity.warnings[0]||'One or more live sources are unavailable and TSO is using an older verified snapshot.')+(newest?' · newest row '+esc(ageText(newest))+' old':'')+'</small></div>';
  }

  function renderLiveModelPulse(){
    if(currentRoute!=='live')return;
    const root=document.querySelector('[data-live-route]');
    if(!root)return;
    const grid=root.querySelector('[data-live-model-grid]');
    const sourceNode=root.querySelector('[data-live-model-source]');
    const title=root.querySelector('[data-live-model-title]');
    if(!propsFeedCache){
      if(grid)grid.innerHTML='<div class="live-board-loading home-model-empty--wide"><span class="live-feed-spinner"></span><div><b>Loading real model signals…</b><small>No preview cards will be substituted.</small></div></div>';
      return;
    }
    const integrity=propsFeedIntegrityState();
    const rows=livePulseRows();
    const newest=propsNewestTimestamp((propsFeedCache.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague));
    if(sourceNode){
      sourceNode.classList.toggle('is-fallback',integrity.fallback);
      sourceNode.innerHTML=integrity.fallback
        ? '<span class="live-pulse is-idle"></span><div><b>FALLBACK SNAPSHOT</b><small>'+esc(integrity.warnings[0]||'A live source is unavailable; verified cached data is being shown.')+(newest?' · newest '+esc(ageText(newest))+' old':'')+'</small></div>'
        : '<span class="live-pulse"></span><div><b>VERIFIED LIVE SOURCE</b><small>'+(newest?'Newest exact snapshot '+esc(ageText(newest))+' old':'Current exact model-to-market feed')+'</small></div>';
    }
    if(title)title.textContent=currentLeague==='all'?'Current TSO model signals':leagueLabel(currentLeague)+' current model signals';
    if(grid){
      grid.innerHTML=rows.length
        ? rows.map(livePulseCardMarkup).join('')
        : '<div class="live-board-loading home-model-empty--wide"><div><b>No exact model signals for this sport right now.</b><small>TSO will not insert example probabilities or fake movement.</small></div></div>';
    }
    bindMediaFallbacks();
  }

  function renderLiveFeed(){
    if(!liveFeedCache) return;
    renderGlobalScoreStrip();
    renderHomeLiveData();
    renderLiveCenter();
    renderLiveModelPulse();
    renderNotificationCenter();
    renderProfile();
    renderResearch();
    const status = document.querySelector('.market-status');
    if(status) status.innerHTML = '<span class="status-dot"></span> LIVE SCORES CONNECTED';
    const sideStatus = document.querySelector('.tso-side-live small');
    if(sideStatus) sideStatus.textContent = 'Connected';
  }

  async function refreshNflWeeklyData(force=false){
    if(!force&&nflWeeklyFeedCache&&Date.now()-nflWeeklyFetchedAt<LIVE_FEED_TTL){
      renderLiveFeed();
      return nflWeeklyFeedCache;
    }
    if(nflWeeklyInFlight)return nflWeeklyInFlight;
    nflWeeklyInFlight=fetch(GAME_EDGE_SCOREBOARD_BASE+'?league=nfl',{cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('NFL weekly feed HTTP '+response.status);
        const payload=await response.json();
        if(!payload||!Array.isArray(payload.games))throw new Error('Invalid NFL weekly feed');
        nflWeeklyFeedCache=payload;
        nflWeeklyFetchedAt=Date.now();
        if(currentLeague==='nfl')renderLiveFeed();
        return payload;
      })
      .catch(error=>{
        console.error('TSO NFL weekly slate:',error);
        return null;
      })
      .finally(()=>{nflWeeklyInFlight=null;});
    return nflWeeklyInFlight;
  }

  async function refreshLiveData(force=false){
    if(currentLeague==='nfl') refreshNflWeeklyData(force);
    if(liveFeedInFlight) return liveFeedInFlight;
    if(!force && liveFeedCache && Date.now()-liveFeedFetchedAt < LIVE_FEED_TTL){
      renderLiveFeed();
      return liveFeedCache;
    }
    liveFeedInFlight = fetch('/api/live?league=all&date='+localDateKey(),{cache:'no-store'})
      .then(async response => {
        if(!response.ok) throw new Error('Live feed HTTP '+response.status);
        const payload = await response.json();
        if(!payload || !Array.isArray(payload.games)) throw new Error('Invalid live feed');
        liveFeedCache = payload;
        liveFeedFetchedAt = Date.now();
        liveFeedError = null;
        renderLiveFeed();
        return payload;
      })
      .catch(error => {
        console.error('TSO live feed:',error);
        liveFeedError=String(error?.message||error);
        const badge = document.querySelector('[data-live-feed-badge]');
        if(badge){ badge.textContent='SCORE FEED UNAVAILABLE'; badge.classList.add('is-error'); }
        const meta = document.querySelector('[data-live-filter-meta]');
        if(meta) meta.innerHTML='<span class="live-pulse is-idle"></span><b>FEED OFFLINE</b><span>·</span><small>Retrying automatically</small>';
        renderProfile();
        renderResearch();
        renderNotificationCenter();
        return null;
      })
      .finally(()=>{ liveFeedInFlight=null; });
    return liveFeedInFlight;
  }

  const americanPrice = value => {
    const n=Number(value);
    if(!Number.isFinite(n)) return '—';
    return n>0 ? '+'+Math.round(n) : String(Math.round(n));
  };

  const pct1 = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1)+'%' : '—';

  const ageText = value => {
    const t=Date.parse(value||'');
    if(!Number.isFinite(t)) return 'Unknown';
    const sec=Math.max(0,Math.round((Date.now()-t)/1000));
    if(sec<60) return sec+' sec';
    const min=Math.floor(sec/60);
    if(min<60) return min+' min';
    const hr=Math.floor(min/60);
    if(hr<24) return hr+'h '+(min%60)+'m';
    return Math.floor(hr/24)+'d '+(hr%24)+'h';
  };

  const freshnessLabel = value => {
    const t=Date.parse(value||'');
    if(!Number.isFinite(t)) return {label:'UNKNOWN AGE',tone:'stale'};
    const min=Math.max(0,(Date.now()-t)/60000);
    if(min<=5) return {label:'LIVE SNAPSHOT',tone:'live'};
    if(min<=30) return {label:'RECENT SNAPSHOT',tone:'recent'};
    return {label:'VERIFIED SNAPSHOT',tone:'stale'};
  };

  const playerInitials = name => String(name||'Player').split(/\s+/).filter(Boolean).map(p=>p[0]).join('').slice(0,2).toUpperCase();

  function propHeadshotMarkup(row,className=''){
    const sport=esc(row?.sport||'generic');
    const name=esc(row?.player||'Player');
    const initials=esc(playerInitials(row?.player));
    if(!row?.headshotUrl){
      return '<span class="player-headshot player-sport--'+sport+' props-feed-headshot '+esc(className)+'"><span class="player-headshot-fallback">'+initials+'</span></span>';
    }
    return '<span class="player-headshot player-sport--'+sport+' props-feed-headshot '+esc(className)+'"><span class="player-headshot-fallback">'+initials+'</span><img data-player-headshot src="'+esc(row.headshotUrl)+'" alt="'+name+'" loading="lazy" /></span>';
  }

  function propSelectionText(row){
    if(row?.selection) return row.selection;
    const market=String(row?.market||'').toLowerCase();
    if(['atd','atg','fgs','hr'].includes(market) && row.side !== 'under') return 'YES';
    const line=Number(row?.line);
    const side=row?.side==='under'?'U':'O';
    return Number.isFinite(line) ? side+' '+line : side;
  }

  function americanImpliedPct(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n===0)return null;
    return n<0?((-n)/((-n)+100))*100:(100/(n+100))*100;
  }

  function guardPublishedModelRow(row){
    if(row?.sport!=='nfl'||!row?.model)return row;
    const rawPct=Number(row.model.probabilityPct);
    if(!Number.isFinite(rawPct))return row;
    const marketPct=Number(row.impliedPct);
    const extreme=rawPct<=0.05||rawPct>=99.95;
    const divergence=Number.isFinite(marketPct)?Math.abs(rawPct-marketPct):0;
    if(extreme||divergence>35){
      return {
        ...row,
        model:null,
        modelGuardrail:{
          reason:extreme?'extreme-simulation-output':'model-market-divergence',
          rawProbabilityPct:rawPct,
          marketProbabilityPct:Number.isFinite(marketPct)?marketPct:null,
          divergencePct:Number.isFinite(marketPct)?Number(divergence.toFixed(2)):null
        }
      };
    }
    const probabilityPct=Math.max(2.5,Math.min(97.5,rawPct));
    const edgePct=Number.isFinite(marketPct)?probabilityPct-marketPct:null;
    return {
      ...row,
      model:{
        ...row.model,
        rawProbabilityPct:rawPct,
        probabilityPct:Number(probabilityPct.toFixed(2)),
        edgePct:Number.isFinite(edgePct)?Number(edgePct.toFixed(2)):row.model.edgePct,
        displayGuarded:Math.abs(probabilityPct-rawPct)>0.001
      }
    };
  }

  function guardPublishedModels(payload){
    if(!payload||!Array.isArray(payload.rows))return payload;
    return {...payload,rows:payload.rows.map(guardPublishedModelRow)};
  }

  function propsRepriceToBook(row,bookName){
    if(!bookName)return row;
    const book=(row.books||[]).find(b=>String(b?.book||'').toLowerCase()===String(bookName).toLowerCase());
    if(!book)return null;
    const implied=americanImpliedPct(book.price);
    const model=row.model&&Number.isFinite(Number(row.model.probabilityPct))
      ? {...row.model,marketProbabilityPct:implied,edgePct:Number.isFinite(implied)?Number(row.model.probabilityPct)-implied:null}
      : row.model||null;
    return {...row,book:book.book,price:book.price,link:book.link||null,sid:book.sid||null,snapshotTime:book.snapshotTime||row.snapshotTime,preserved:book.preserved===true,priceKind:book.priceKind||row.priceKind,impliedPct:implied,model};
  }

  function propsSortMode(){
    return String(propsFilterState.sort||'edge');
  }

  function sortPropsToolRows(rows,mode='edge'){
    const copy=[...rows];
    if(mode==='model')return copy.sort((a,b)=>(Number(b?.model?.probabilityPct)||-1)-(Number(a?.model?.probabilityPct)||-1));
    if(mode==='books')return copy.sort((a,b)=>(Number(b.bookCount)||0)-(Number(a.bookCount)||0)||String(a.player||'').localeCompare(String(b.player||'')));
    if(mode==='price')return copy.sort((a,b)=>(Number(b.price)||-999999)-(Number(a.price)||-999999));
    if(mode==='fresh')return copy.sort((a,b)=>(Date.parse(b.snapshotTime||'')||0)-(Date.parse(a.snapshotTime||'')||0));
    if(mode==='player')return copy.sort((a,b)=>String(a.player||'').localeCompare(String(b.player||''))||String(a.marketLabel||a.market||'').localeCompare(String(b.marketLabel||b.market||'')));
    return sortPropsRows(copy);
  }


  function currentPropsRows(){
    if(!propsFeedCache) return [];
    const search=String(propsFilterState.search||'').trim().toLowerCase();
    const market=String(propsFilterState.market||'');
    const book=String(propsFilterState.book||'').toLowerCase();
    const side=String(propsFilterState.side||'');
    const modelFilter=String(propsFilterState.model||'');
    return (propsFeedCache.rows||[]).flatMap(original => {
      if(currentLeague!=='all' && original.sport!==currentLeague) return [];
      if(market && original.market!==market) return [];
      if(side && original.side!==side) return [];
      const hasModel=Number.isFinite(Number(original?.model?.probabilityPct));
      if(modelFilter==='modeled'&&!hasModel) return [];
      if(modelFilter==='market'&&hasModel) return [];
      let row=original;
      if(book){
        row=propsRepriceToBook(original,book);
        if(!row)return [];
      }
      if(search){
        const matches=[row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,propSelectionText(row),row.line]
          .filter(v=>v!==null&&v!==undefined&&v!=='').join(' ').toLowerCase().includes(search);
        if(!matches)return [];
      }
      return [row];
    });
  }

  const edgeText = value => {
    const n=Number(value);
    if(!Number.isFinite(n)) return '—';
    return (n>0?'+':'')+n.toFixed(1)+'%';
  };

  const modelTagText = row => row?.model?.tag || row?.model?.grade || row?.model?.label || 'MODEL';

  const modelTagClass = row => {
    const tag=String(modelTagText(row)).toLowerCase();
    if(/a\+|tso pick|safest|best edge|strong/.test(tag)) return 'is-strong';
    if(/a|b\+|value|model|sim/.test(tag)) return 'is-model';
    return 'is-neutral';
  };

  function sortPropsRows(rows){
    return [...rows].sort((a,b)=>{
      const ae=Number(a?.model?.edgePct),be=Number(b?.model?.edgePct);
      const ah=Number.isFinite(ae),bh=Number.isFinite(be);
      if(ah!==bh) return bh-ah;
      if(ah&&be!==ae) return be-ae;
      const ac=Number(a.bookCount||0),bc=Number(b.bookCount||0);
      if(ac!==bc) return bc-ac;
      return (Date.parse(b.snapshotTime||'')||0)-(Date.parse(a.snapshotTime||'')||0);
    });
  }

  function propsNewestTimestamp(rows){
    let newest=0,iso=null;
    for(const row of rows){
      const t=Date.parse(row.snapshotTime||'');
      if(Number.isFinite(t)&&t>newest){newest=t;iso=row.snapshotTime}
    }
    return iso;
  }

  function allModeledRows(){
    return (propsFeedCache?.rows||[]).filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
  }

  function currentModelRows(){
    return allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  const modelSourceText = row => row?.model?.sourceLabel || row?.model?.source || 'TSO MODEL';

  function homeModeledRows(){
    return allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function homeModelTone(row,index=0){
    if(row?.sport==='nhl') return 'violet';
    if(row?.sport==='nfl') return 'gold';
    if(row?.sport==='mlb') return 'orange';
    return ['violet','gold','orange'][index%3];
  }

  function homeModelCardMarkup(row,index){
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const tone=homeModelTone(row,index);
    const source=modelSourceText(row);
    const tag=modelTagText(row);
    return '<article class="broadcast-model-card concept-model-card '+tone+'-card">'
      +'<div class="concept-card-accent"></div>'
      +'<div class="broadcast-card-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</span><b>'+esc(tag)+'</b></div>'
      +'<div class="concept-model-main"><div class="broadcast-player">'
        +propHeadshotMarkup(row,'player-number home-model-headshot')
        +'<div><h3>'+esc(row.player)+'</h3><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div>'
      +'</div><div class="model-badge model-badge--'+tone+'"><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong></div></div>'
      +'<div class="broadcast-edge concept-metrics"><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span><span><small>ODDS</small><b>'+esc(americanPrice(row.price))+'</b></span></div>'
      +'<div class="concept-confidence home-model-meta"><span>MODEL SOURCE · '+esc(source)+'</span><b>'+esc(row.book||'VERIFIED')+'</b></div>'
      +'<div class="broadcast-price concept-price"><button data-home-open-model>OPEN MODEL →</button></div>'
      +'</article>';
  }

  function renderHomeModels(){
    if(currentRoute!=='home'||!propsFeedCache) return;
    const rows=homeModeledRows();
    const sorted=sortPropsRows(rows);
    const picks=sorted.slice(0,3);
    const newest=propsNewestTimestamp(rows.length?rows:allModeledRows());
    const freshness=freshnessLabel(newest);
    const picksRoot=document.querySelector('[data-home-picks]');
    if(picksRoot){
      if(!rows.length){
        picksRoot.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS · REAL MODELS</span><h2>No exact model matches right now</h2></div><button data-route-jump="models">ALL MODELS →</button></div>'
          +'<div class="home-model-empty"><b>No sportsbook row currently passes the exact model-match rules for this filter.</b><small>Same player + market + side + exact line is required.</small></div>';
      }else{
        picksRoot.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS · REAL MODELS</span><h2>Best exact edges right now</h2></div><button data-route-jump="models">ALL PICKS →</button></div>'
          +picks.map((row,i)=>{
            const edge=Number(row.model?.edgePct);
            const rankClass=i===0?'pick-rank--gold':i===2?'pick-rank--orange':'';
            return '<button class="concept-pick-row" data-home-open-model>'
              +'<span class="pick-rank '+rankClass+'">'+(i+1)+'</span>'
              +'<span class="pick-name pick-name--with-photo">'+propHeadshotMarkup(row,'home-pick-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small></span></span>'
              +'<span class="pick-model"><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span>'
              +'<span class="pick-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</span>'
              +'</button>';
          }).join('')
          +'<div class="concept-picks-footer"><span>'+rows.length+' exact model match'+(rows.length===1?'':'es')+'</span><b>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</b></div>';
      }
    }

    const board=document.querySelector('[data-home-model-board]');
    const cards=board?.querySelector('[data-home-model-cards]');
    const title=board?.querySelector('[data-home-model-title]');
    if(cards){
      if(!rows.length){
        cards.innerHTML='<div class="home-model-empty home-model-empty--wide"><b>No exact model cards for this filter.</b><small>No fake fallback cards are displayed.</small></div>';
        if(title) title.textContent='No exact model matches';
      }else{
        let selected=[];
        if(currentLeague==='all'){
          for(const sport of ['nhl','nfl','mlb']){
            const top=sortPropsRows(rows.filter(row=>row.sport===sport))[0];
            if(top) selected.push(top);
          }
          if(selected.length<3){
            for(const row of sorted){
              if(selected.includes(row)) continue;
              selected.push(row);
              if(selected.length===3) break;
            }
          }
        }else{
          selected=sorted.slice(0,3);
        }
        cards.innerHTML=selected.map(homeModelCardMarkup).join('');
        if(title) title.textContent=currentLeague==='all'?'Top exact match from each live TSO engine':leagueLabel(currentLeague)+' · top exact model matches';
      }
    }

    document.querySelectorAll('[data-home-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    document.querySelectorAll('[data-route-jump]').forEach(btn=>{
      if(btn.dataset.routeJump) btn.onclick=()=>setRoute(btn.dataset.routeJump);
    });
    bindMediaFallbacks();
  }

  const NHL_SCORER_TEAM_COLORS={
    ANA:'#fc4c02',BOS:'#ffb81c',BUF:'#003087',CGY:'#d2001c',CAR:'#cc0000',CHI:'#cf0a2c',
    COL:'#6f263d',CBJ:'#002654',DAL:'#006847',DET:'#ce1126',EDM:'#ff4c00',FLA:'#c8102e',
    LA:'#a2aaad',MIN:'#154734',MTL:'#af1e2d',NSH:'#ffb81c',NJ:'#ce1126',NYI:'#00539b',
    NYR:'#0038a8',OTT:'#c52032',PHI:'#f74902',PIT:'#fcb514',SJ:'#006d75',SEA:'#99d9d9',
    STL:'#002f87',TB:'#002868',TOR:'#003e7e',UTA:'#69b3e7',VAN:'#00205b',VGK:'#b4975a',
    WSH:'#041e42',WPG:'#041e42'
  };

  function nhlScorerRgb(hex){
    const h=String(hex||'#7b5cff').replace('#','').padEnd(6,'0').slice(0,6);
    return [parseInt(h.slice(0,2),16)||123,parseInt(h.slice(2,4),16)||92,parseInt(h.slice(4,6),16)||255].join(',');
  }

  function nhlScorerPct(value){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    const pct=n*100;
    return pct.toFixed(pct>=10?1:2)+'%';
  }

  function nhlScorerStat(value){
    const n=Number(value);
    return Number.isFinite(n)?n.toFixed(2):'—';
  }

  function nhlScorerLine(p){
    const fgs=nhlScorerMarket==='fgs';
    const probability=fgs?p?.probability:p?.anytimeProbability;
    const odds=fgs?p?.bestOdds:p?.bestAtgOdds;
    const book=fgs?p?.bestBook:p?.bestAtgBook;
    const fair=fgs?p?.fairOdds:p?.fairAtgOdds;
    return {probability,odds,book,fair,live:Number.isFinite(Number(odds))};
  }

  function nhlScorerHeadshot(p){
    const initials=esc(playerInitials(p?.name));
    if(!p?.photo)return '<span class="nhl-scorer-photo is-missing"><span>'+initials+'</span></span>';
    return '<span class="nhl-scorer-photo"><span>'+initials+'</span><img data-player-headshot src="'+esc(p.photo)+'" alt="'+esc(p.name||'NHL player')+'" loading="lazy" /></span>';
  }

  function nhlScorerPlayerMarkup(p,team,risky=false,index=0){
    if(!p)return '';
    const line=nhlScorerLine(p);
    const matchup=p.matchup||{};
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||p.team||'').toUpperCase()]||'#7b5cff';
    const oddsShown=line.live?americanPrice(line.odds):(Number.isFinite(Number(line.fair))?americanPrice(line.fair):'—');
    const oddsLabel=line.live?(line.book?String(line.book).toUpperCase():'LIVE ODDS'):'FAIR';
    const fairNote=line.live&&Number.isFinite(Number(line.fair))?'FAIR '+americanPrice(line.fair):line.live?'VERIFIED PRICE':'MODEL PRICE';
    const rank=p.teamRank||index+1;
    const details=[
      nhlScorerStat(p.seasonGoalRate)+' G/GP',
      nhlScorerStat(p.seasonSogRate)+' SOG/GP',
      'L10 '+String(p.recentGoals??0)+' G'
    ];
    if(nhlScorerMarket==='fgs')details.push(String(p.recentFirstGoals??0)+' FIRST');
    const matchupText=matchup.detail?((matchup.label||'Neutral')+' · '+matchup.detail):(matchup.label||'Matchup context pending');
    return '<article class="nhl-scorer-player '+(risky?'is-risky':'')+'" style="--scorer-accent:'+esc(accent)+';--scorer-rgb:'+esc(nhlScorerRgb(accent))+'">'
      +'<span class="nhl-scorer-rank">'+(risky?'RISKY':'#'+esc(rank))+'</span>'
      +nhlScorerHeadshot(p)
      +'<div class="nhl-scorer-player-copy"><small>'+esc(String(p.position||'NHL'))+' · '+esc(String(p.team||team?.abbr||''))+'</small><h4>'+esc(p.name||'Player')+'</h4><p>'+esc(details.join(' · '))+'</p></div>'
      +'<div class="nhl-scorer-player-metrics"><span><small>MODEL</small><b>'+esc(nhlScorerPct(line.probability))+'</b></span><span><small>'+esc(oddsLabel)+'</small><b>'+esc(oddsShown)+'</b><em>'+esc(fairNote)+'</em></span></div>'
      +'<div class="nhl-scorer-matchup"><span>'+esc(matchupText)+'</span>'+(risky&&p.riskyReason?'<strong>'+esc(p.riskyReason)+'</strong>':'')+'</div>'
      +'</article>';
  }

  function nhlScorerTeamMarkup(team){
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff';
    const players=nhlScorerMarket==='fgs'?(team?.players||[]):(team?.atgPlayers||[]);
    const risky=nhlScorerMarket==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
    return '<section class="nhl-scorer-team" style="--scorer-accent:'+esc(accent)+';--scorer-rgb:'+esc(nhlScorerRgb(accent))+'">'
      +'<header><div>'+teamLogoMarkup(team,'nhl-scorer-team-logo')+'<span><small>'+esc(team?.abbr||'NHL')+'</small><b>'+esc(team?.name||'Team')+'</b></span></div><strong>'+esc(Number(team?.expectedGoals||0).toFixed(2))+' <small>MODEL GOALS</small></strong></header>'
      +'<div class="nhl-scorer-players">'+players.slice(0,3).map((p,i)=>nhlScorerPlayerMarkup(p,team,false,i)).join('')+(risky?nhlScorerPlayerMarkup(risky,team,true,3):'')+'</div>'
      +'</section>';
  }

  function nhlScorerGameMarkup(game){
    const when=game?.startTime?new Date(game.startTime):null;
    const time=when&&!Number.isNaN(when.getTime())?when.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Time pending';
    const status=String(game?.status||'').toUpperCase();
    const marketLabel=nhlScorerMarket==='fgs'?'FIRST GOAL':'ANYTIME GOAL';
    return '<article class="nhl-scorer-game">'
      +'<header class="nhl-scorer-game-head"><div class="nhl-scorer-matchup-title">'+teamLogoMarkup(game?.away,'nhl-scorer-matchup-logo')+'<b>'+esc(game?.away?.abbr||'AWAY')+'</b><span>@</span><b>'+esc(game?.home?.abbr||'HOME')+'</b>'+teamLogoMarkup(game?.home,'nhl-scorer-matchup-logo')+'</div><div><span>'+esc(status||'SCHEDULED')+'</span><b>'+esc(time)+'</b><small>'+esc(game?.venue||'NHL')+'</small></div></header>'
      +'<div class="nhl-scorer-team-grid">'+nhlScorerTeamMarkup(game?.away)+nhlScorerTeamMarkup(game?.home)+'</div>'
      +'<div class="nhl-scorer-game-actions"><span>'+esc(marketLabel)+' SHARE CARD</span><div><button data-nhl-scorer-game-share="'+esc(game?.gameId||'')+'">SHARE CARD</button><button data-nhl-scorer-game-download="'+esc(game?.gameId||'')+'">DOWNLOAD PNG</button></div></div>'
      +'</article>';
  }

  const nhlScorerCanvasImageCache=new Map();

  function nhlScorerCanvasImage(url){
    if(!url)return Promise.resolve(null);
    const key=String(url);
    if(nhlScorerCanvasImageCache.has(key))return nhlScorerCanvasImageCache.get(key);
    const promise=new Promise(resolve=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      let done=false;
      const finish=value=>{if(done)return;done=true;resolve(value);};
      const timer=setTimeout(()=>finish(null),8000);
      img.onload=()=>{clearTimeout(timer);finish(img);};
      img.onerror=()=>{clearTimeout(timer);finish(null);};
      img.src=key;
    });
    nhlScorerCanvasImageCache.set(key,promise);
    return promise;
  }

  function nhlScorerCanvasPath(ctx,x,y,w,h,r=12){
    const rr=Math.max(0,Math.min(r,Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
  }

  function nhlScorerCanvasBox(ctx,x,y,w,h,r,fill,stroke=null,lineWidth=1){
    nhlScorerCanvasPath(ctx,x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
  }

  function nhlScorerCanvasFit(ctx,text,maxWidth,size=28,min=12,weight=800,italic=false){
    let n=size;
    do{
      ctx.font=(italic?'italic ':'')+weight+' '+n+'px Inter, Arial, sans-serif';
      if(ctx.measureText(String(text||'')).width<=maxWidth||n<=min)break;
      n--;
    }while(n>min);
    return n;
  }

  function nhlScorerCanvasContain(ctx,img,x,y,w,h){
    if(!img)return;
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)return;
    const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }

  function nhlScorerCanvasCover(ctx,img,x,y,w,h){
    if(!img)return;
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)return;
    const scale=Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();
  }

  function nhlScorerCanvasBg(ctx,w,h){
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#030712');bg.addColorStop(.52,'#07101d');bg.addColorStop(1,'#02050a');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w*.78,80,20,w*.78,80,w*.58);
    glow.addColorStop(0,'rgba(123,92,255,.24)');glow.addColorStop(.42,'rgba(45,127,255,.08)');glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;
    for(let y=170;y<h;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  }

  function nhlScorerCanvasLine(p,market){
    const fgs=market==='fgs';
    return {
      probability:fgs?p?.probability:p?.anytimeProbability,
      odds:fgs?p?.bestOdds:p?.bestAtgOdds,
      book:fgs?p?.bestBook:p?.bestAtgBook,
      fair:fgs?p?.fairOdds:p?.fairAtgOdds
    };
  }

  function nhlScorerCanvasPrice(line){
    if(Number.isFinite(Number(line?.odds)))return {label:String(line.book||'ODDS').toUpperCase().slice(0,10),price:americanPrice(line.odds),note:Number.isFinite(Number(line.fair))?'FAIR '+americanPrice(line.fair):'VERIFIED'};
    if(Number.isFinite(Number(line?.fair)))return {label:'FAIR',price:americanPrice(line.fair),note:'MODEL PRICE'};
    return {label:'PRICE',price:'—',note:'NO LIVE PRICE'};
  }

  function nhlScorerCanvasReason(p,market){
    const m=p?.matchup||{},parts=[];
    if(Number.isFinite(Number(m.goalAllowedRank))&&Number.isFinite(Number(m.rankedTeams)))parts.push('#'+m.goalAllowedRank+'/'+m.rankedTeams+' '+String(m.position||p.position||'')+' goals allowed');
    if(Number(m.defenseRestFactor)>=1.025)parts.push('opponent B2B');
    if(Number.isFinite(Number(m.recentDefenseIndex))&&Math.abs(Number(m.recentDefenseIndex)-1)>=.035)parts.push('recent D '+(Number(m.recentDefenseIndex)>=1?'+':'')+Math.round((Number(m.recentDefenseIndex)-1)*100)+'%');
    if(m.goalie?.verified&&m.goalie?.name)parts.push('vs '+m.goalie.name);
    if(!parts.length)parts.push(nhlScorerStat(p?.seasonSogRate)+' SOG/G · L10 '+String(p?.recentGoals??0)+' G');
    if(market==='fgs'&&Number(p?.recentFirstGoals)>0)parts.push('L10 '+p.recentFirstGoals+' first goals');
    return parts.slice(0,3).join(' · ');
  }

  async function nhlScorerDrawBrand(ctx,w){
    const logo=await nhlScorerCanvasImage('/brand/approved/tso2-wordmark-horizontal-approved.webp');
    if(logo){
      nhlScorerCanvasContain(ctx,logo,42,28,560,96);
    }else{
      ctx.textAlign='left';ctx.fillStyle='#f5f8ff';ctx.font='900 36px Inter,Arial,sans-serif';ctx.fillText('THE SPORTS OUTPOST',48,82);
    }
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(42,134,w-84,1);
  }

  async function nhlScorerDrawGameTeam(ctx,team,market,x,y,w,h){
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff';
    const rgb=nhlScorerRgb(accent);
    const logo=await nhlScorerCanvasImage(team?.logo);
    nhlScorerCanvasBox(ctx,x,y,w,h,20,'rgba(4,9,16,.94)','rgba('+rgb+',.48)',2);
    const header=ctx.createLinearGradient(x,y,x+w,y);
    header.addColorStop(0,'rgba('+rgb+',.27)');header.addColorStop(.52,'rgba(8,14,23,.96)');header.addColorStop(1,'rgba(4,8,14,.98)');
    nhlScorerCanvasBox(ctx,x+1,y+1,w-2,82,18,header,'rgba('+rgb+',.18)',1);
    if(logo)nhlScorerCanvasContain(ctx,logo,x+14,y+9,66,64);
    ctx.textAlign='left';ctx.fillStyle='rgba(225,238,250,.64)';ctx.font='800 15px Inter,Arial,sans-serif';ctx.fillText(String(team?.abbr||''),94+x,y+29);
    nhlScorerCanvasFit(ctx,String(team?.name||'TEAM').toUpperCase(),w-270,29,17,900,true);
    ctx.fillStyle='#fff';ctx.fillText(String(team?.name||'TEAM').toUpperCase(),94+x,y+59);
    ctx.textAlign='right';ctx.fillStyle='#d8e7f6';ctx.font='900 27px Inter,Arial,sans-serif';ctx.fillText(Number(team?.expectedGoals||0).toFixed(2),x+w-20,y+42);
    ctx.fillStyle='#697684';ctx.font='800 11px Inter,Arial,sans-serif';ctx.fillText('MODEL GOALS',x+w-20,y+61);

    const players=market==='fgs'?(team?.players||[]):(team?.atgPlayers||[]);
    const risky=market==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
    const rows=[...players.slice(0,3),...(risky?[risky]:[])];
    const rowH=(h-96)/4;
    for(let i=0;i<rows.length;i++){
      const p=rows[i],isRisk=i===3,line=nhlScorerCanvasLine(p,market),price=nhlScorerCanvasPrice(line);
      const ry=y+91+i*rowH;
      const photo=await nhlScorerCanvasImage(p?.photo);
      nhlScorerCanvasBox(ctx,x+10,ry,w-20,rowH-7,13,isRisk?'rgba('+rgb+',.14)':'rgba(7,13,21,.92)',isRisk?'rgba(255,216,77,.28)':'rgba('+rgb+',.22)',1);
      ctx.fillStyle=isRisk?'#ffd84d':accent;ctx.fillRect(x+10,ry,4,rowH-7);
      ctx.save();ctx.beginPath();ctx.arc(x+54,ry+(rowH-7)/2,29,0,Math.PI*2);ctx.clip();
      if(photo)nhlScorerCanvasCover(ctx,photo,x+25,ry+(rowH-7)/2-29,58,58);
      else{ctx.fillStyle='#111b29';ctx.fillRect(x+25,ry+(rowH-7)/2-29,58,58);}
      ctx.restore();ctx.strokeStyle=isRisk?'#ffd84d':'rgba('+rgb+',.78)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+54,ry+(rowH-7)/2,30,0,Math.PI*2);ctx.stroke();
      ctx.textAlign='left';ctx.fillStyle=isRisk?'#ffd84d':'rgba(214,229,244,.62)';ctx.font='900 10px Inter,Arial,sans-serif';ctx.fillText(isRisk?'RISKY':'#'+String(p?.teamRank||i+1),x+94,ry+21);
      nhlScorerCanvasFit(ctx,String(p?.name||'PLAYER').toUpperCase(),270,23,15,900,true);ctx.fillStyle='#fff';ctx.fillText(String(p?.name||'PLAYER').toUpperCase(),x+94,ry+46);
      ctx.fillStyle='#7f8b98';ctx.font='700 10px Inter,Arial,sans-serif';ctx.fillText(String(p?.position||'NHL')+' · '+nhlScorerCanvasReason(p,market).toUpperCase().slice(0,72),x+94,ry+66);

      const bx=x+w-226;
      nhlScorerCanvasBox(ctx,bx,ry+12,92,rowH-31,9,'rgba(3,8,14,.95)','rgba('+rgb+',.25)',1);
      ctx.textAlign='center';ctx.fillStyle='#687584';ctx.font='800 9px Inter,Arial,sans-serif';ctx.fillText('MODEL',bx+46,ry+30);
      ctx.fillStyle='#fff';ctx.font='900 20px Inter,Arial,sans-serif';ctx.fillText(nhlScorerPct(line.probability),bx+46,ry+55);

      nhlScorerCanvasBox(ctx,bx+102,ry+12,112,rowH-31,9,'rgba(3,8,14,.95)','rgba('+rgb+',.25)',1);
      ctx.fillStyle='#687584';ctx.font='800 9px Inter,Arial,sans-serif';ctx.fillText(price.label,bx+158,ry+30);
      ctx.fillStyle=Number.isFinite(Number(line.odds))?'#70e8ab':'#edf3f9';ctx.font='900 20px Inter,Arial,sans-serif';ctx.fillText(price.price,bx+158,ry+54);
      ctx.fillStyle='#697684';ctx.font='700 8px Inter,Arial,sans-serif';ctx.fillText(price.note,bx+158,ry+68);
    }
  }

  async function nhlScorerGameCardBlob(game,market){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=940;
    const ctx=canvas.getContext('2d');
    nhlScorerCanvasBg(ctx,1600,940);
    await nhlScorerDrawBrand(ctx,1600);
    ctx.textAlign='right';ctx.fillStyle='#f4f7fb';ctx.font='900 italic 46px Inter,Arial,sans-serif';
    ctx.fillText(market==='fgs'?'FIRST GOAL SCORER':'ANYTIME GOAL SCORER',1555,71);
    ctx.fillStyle='#8878e0';ctx.font='900 14px Inter,Arial,sans-serif';ctx.fillText('TOP 3 PER TEAM + RISKY',1555,102);

    const awayLogo=await nhlScorerCanvasImage(game?.away?.logo),homeLogo=await nhlScorerCanvasImage(game?.home?.logo);
    const when=game?.startTime?new Date(game.startTime):null;
    const timeLabel=when&&!Number.isNaN(when.getTime())?when.toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'TIME PENDING';
    const venueLabel=String(game?.venue||'NHL');

    // Dedicated matchup band: logos and matchup stay on one row; time/venue sits in its own badge below.
    nhlScorerCanvasBox(ctx,420,142,760,104,18,'rgba(6,12,20,.92)','rgba(123,92,255,.22)',1.5);
    if(awayLogo)nhlScorerCanvasContain(ctx,awayLogo,454,155,78,78);
    if(homeLogo)nhlScorerCanvasContain(ctx,homeLogo,1068,155,78,78);

    ctx.textAlign='left';ctx.fillStyle='#8b98a6';ctx.font='900 13px Inter,Arial,sans-serif';
    ctx.fillText(String(game?.away?.abbr||'AWAY'),548,175);
    ctx.textAlign='right';ctx.fillText(String(game?.home?.abbr||'HOME'),1052,175);

    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 italic 37px Inter,Arial,sans-serif';
    ctx.fillText(String(game?.away?.abbr||'AWAY')+'  @  '+String(game?.home?.abbr||'HOME'),800,207);

    nhlScorerCanvasBox(ctx,560,256,480,44,12,'rgba(123,92,255,.075)','rgba(123,92,255,.18)',1);
    ctx.fillStyle='#d9d4ff';ctx.font='900 15px Inter,Arial,sans-serif';ctx.fillText(timeLabel.toUpperCase(),800,276);
    ctx.fillStyle='#798593';ctx.font='800 11px Inter,Arial,sans-serif';ctx.fillText(venueLabel.toUpperCase(),800,292);

    await Promise.all([
      nhlScorerDrawGameTeam(ctx,game?.away,market,38,320,742,540),
      nhlScorerDrawGameTeam(ctx,game?.home,market,820,320,742,540)
    ]);
    ctx.textAlign='left';ctx.fillStyle='#667383';ctx.font='700 11px Inter,Arial,sans-serif';ctx.fillText('FGS-Hazard Ensemble v3 · sportsbook markets remain the anchor',42,910);
    ctx.textAlign='right';ctx.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1558,910);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
  }

  async function nhlScorerDrawSlateTeam(ctx,team,market,x,y,w,h){
    const accent=NHL_SCORER_TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||'#7b5cff';
    const rgb=nhlScorerRgb(accent);
    const logo=await nhlScorerCanvasImage(team?.logo);
    nhlScorerCanvasBox(ctx,x,y,w,h,14,'rgba(5,10,17,.97)','rgba('+rgb+',.34)',1.4);
    const grad=ctx.createLinearGradient(x,y,x+w,y);
    grad.addColorStop(0,'rgba('+rgb+',.23)');grad.addColorStop(.55,'rgba(7,12,20,.96)');grad.addColorStop(1,'rgba(4,8,14,.98)');
    nhlScorerCanvasBox(ctx,x+1,y+1,w-2,50,13,grad,null,0);

    if(logo)nhlScorerCanvasContain(ctx,logo,x+10,y+5,44,40);
    ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='900 italic 19px Inter,Arial,sans-serif';
    ctx.fillText(String(team?.name||team?.abbr||'TEAM').toUpperCase(),x+64,y+32);
    ctx.textAlign='right';ctx.fillStyle='#dbe8f4';ctx.font='900 15px Inter,Arial,sans-serif';
    ctx.fillText(Number(team?.expectedGoals||0).toFixed(2)+' MODEL GOALS',x+w-12,y+31);

    const players=market==='fgs'?(team?.players||[]):(team?.atgPlayers||[]);
    const risky=market==='fgs'?team?.riskyFirstGoal:team?.riskyAtg;
    const entries=[...players.slice(0,3),...(risky?[risky]:[])];
    const rowH=(h-58)/4;

    for(let j=0;j<entries.length;j++){
      const p=entries[j],isRisk=j===3,line=nhlScorerCanvasLine(p,market),price=nhlScorerCanvasPrice(line);
      const ry=y+55+j*rowH;
      if(j>0){ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(x+12,ry,w-24,1);}
      ctx.textAlign='left';ctx.fillStyle=isRisk?'#ffd84d':'#738090';ctx.font='900 10px Inter,Arial,sans-serif';
      ctx.fillText(isRisk?'RISKY':'#'+String(p?.teamRank||j+1),x+14,ry+20);

      nhlScorerCanvasFit(ctx,String(p?.name||'PLAYER').toUpperCase(),286,17,12,900,true);
      ctx.fillStyle='#f6f8fb';ctx.fillText(String(p?.name||'PLAYER').toUpperCase(),x+66,ry+20);
      ctx.fillStyle='#687583';ctx.font='700 8.5px Inter,Arial,sans-serif';
      ctx.fillText(String(p?.position||'NHL')+' · '+nhlScorerCanvasReason(p,market).toUpperCase().slice(0,48),x+66,ry+37);

      ctx.textAlign='right';ctx.fillStyle='#aa9cff';ctx.font='900 16px Inter,Arial,sans-serif';
      ctx.fillText(nhlScorerPct(line.probability),x+w-142,ry+21);
      ctx.fillStyle=Number.isFinite(Number(line.odds))?'#70e8ab':'#dce5ef';
      ctx.fillText(price.price,x+w-15,ry+21);
      ctx.fillStyle='#687482';ctx.font='700 8px Inter,Arial,sans-serif';
      ctx.fillText(price.label,x+w-15,ry+37);
    }
  }

  async function nhlScorerSlateCardBlob(market){
    const games=Array.isArray(nhlScorerCache?.games)?nhlScorerCache.games:[];
    if(!games.length)throw new Error('No NHL scorer games are available.');

    // Full slate is grouped by game, not flattened by team.
    const width=1600,top=215,gameH=386,gap=18,bottom=78;
    const height=top+games.length*gameH+(games.length-1)*gap+bottom;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
    nhlScorerCanvasBg(ctx,width,height);await nhlScorerDrawBrand(ctx,width);

    ctx.textAlign='right';ctx.fillStyle='#f4f7fb';ctx.font='900 italic 44px Inter,Arial,sans-serif';
    ctx.fillText(market==='fgs'?'NHL FIRST GOAL — FULL SLATE':'NHL ANYTIME GOAL — FULL SLATE',1555,70);
    ctx.fillStyle='#8f80e4';ctx.font='900 14px Inter,Arial,sans-serif';
    ctx.fillText('GAME-BY-GAME · TOP 3 + RISKY',1555,101);

    ctx.textAlign='left';ctx.fillStyle='#788593';ctx.font='800 12px Inter,Arial,sans-serif';
    ctx.fillText((nhlScorerCache?.model||'FGS-Hazard Ensemble v3')+' · '+games.length+' games · '+(games.length*2)+' teams · generated '+ageText(nhlScorerCache?.generatedAt)+' ago',44,174);

    for(let i=0;i<games.length;i++){
      const game=games[i];
      const y=top+i*(gameH+gap),x=38,w=1524,h=gameH;
      const when=game?.startTime?new Date(game.startTime):null;
      const timeLabel=when&&!Number.isNaN(when.getTime())?when.toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'TIME PENDING';
      const awayLogo=await nhlScorerCanvasImage(game?.away?.logo);
      const homeLogo=await nhlScorerCanvasImage(game?.home?.logo);

      // Outer game section makes each matchup visually independent.
      nhlScorerCanvasBox(ctx,x,y,w,h,18,'rgba(4,8,14,.86)','rgba(255,255,255,.11)',1.5);

      const headerGrad=ctx.createLinearGradient(x,y,x+w,y);
      headerGrad.addColorStop(0,'rgba(45,127,255,.10)');
      headerGrad.addColorStop(.50,'rgba(123,92,255,.12)');
      headerGrad.addColorStop(1,'rgba(45,127,255,.06)');
      nhlScorerCanvasBox(ctx,x+1,y+1,w-2,70,17,headerGrad,'rgba(123,92,255,.15)',1);

      if(awayLogo)nhlScorerCanvasContain(ctx,awayLogo,x+18,y+10,50,50);
      if(homeLogo)nhlScorerCanvasContain(ctx,homeLogo,x+540,y+10,50,50);
      ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='900 italic 24px Inter,Arial,sans-serif';
      ctx.fillText(String(game?.away?.abbr||'AWAY')+'  @  '+String(game?.home?.abbr||'HOME'),x+82,y+43);

      nhlScorerCanvasBox(ctx,x+w-430,y+13,390,44,11,'rgba(123,92,255,.085)','rgba(123,92,255,.18)',1);
      ctx.textAlign='center';ctx.fillStyle='#ded8ff';ctx.font='900 14px Inter,Arial,sans-serif';
      ctx.fillText(timeLabel.toUpperCase(),x+w-235,y+32);
      ctx.fillStyle='#75818e';ctx.font='800 9px Inter,Arial,sans-serif';
      ctx.fillText(String(game?.venue||'NHL').toUpperCase(),x+w-235,y+49);

      await Promise.all([
        nhlScorerDrawSlateTeam(ctx,game?.away,market,x+14,y+82,738,288),
        nhlScorerDrawSlateTeam(ctx,game?.home,market,x+772,y+82,738,288)
      ]);
    }

    ctx.textAlign='left';ctx.fillStyle='#667383';ctx.font='700 11px Inter,Arial,sans-serif';
    ctx.fillText('Owner slate share · FGS-Hazard Ensemble v3 · sportsbook markets remain the anchor',42,height-31);
    ctx.textAlign='right';ctx.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1558,height-31);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
  }

  function nhlScorerDownloadBlob(blob,filename){
    if(!blob)throw new Error('Card render failed');
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1800);
  }

  async function nhlScorerShareBlob(blob,filename,title,text){
    if(!blob)throw new Error('Card render failed');
    const file=new File([blob],filename,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({title,text,files:[file]});
      return 'shared';
    }
    nhlScorerDownloadBlob(blob,filename);
    notify('Share card downloaded. Attach the PNG to your post.');
    return 'downloaded';
  }

  function nhlScorerGameById(gameId){
    return (nhlScorerCache?.games||[]).find(g=>String(g?.gameId||'')===String(gameId||''))||null;
  }

  async function runNhlScorerGameAction(button,gameId,action){
    const game=nhlScorerGameById(gameId);if(!game)return;
    const old=button.textContent;button.disabled=true;button.textContent='BUILDING CARD…';
    try{
      const blob=await nhlScorerGameCardBlob(game,nhlScorerMarket);
      const marketName=nhlScorerMarket==='fgs'?'First-Goal':'Anytime-Goal';
      const filename='TSO-NHL-'+String(game.away?.abbr||'Away')+'-'+String(game.home?.abbr||'Home')+'-'+marketName+'.png';
      if(action==='share'){
        await nhlScorerShareBlob(blob,filename,'The Sports Outpost NHL Scorer',(nhlScorerMarket==='fgs'?'NHL First Goal Scorer':'NHL Anytime Goal Scorer')+' · '+game.away?.abbr+' @ '+game.home?.abbr+' · Top 3 + Risky Value');
      }else{
        nhlScorerDownloadBlob(blob,filename);notify('Scorer card downloaded.');
      }
    }catch(error){
      console.error('NHL scorer card:',error);notify('Could not build scorer card.');
    }finally{button.disabled=false;button.textContent=old;}
  }

  async function runNhlScorerSlateShare(button,market){
    if(!isOwner()){notify('Slate share cards are available to the owner account only.');return;}
    const old=button.textContent;button.disabled=true;button.textContent='BUILDING FULL SLATE…';
    try{
      const blob=await nhlScorerSlateCardBlob(market);
      const label=market==='fgs'?'First-Goal':'Anytime-Goal';
      await nhlScorerShareBlob(blob,'TSO-NHL-Full-Slate-'+label+'.png','The Sports Outpost NHL Full Slate',(market==='fgs'?'NHL First Goal Scorer':'NHL Anytime Goal Scorer')+' · Full Slate · Top 3 + Risky Value for every team');
    }catch(error){
      console.error('NHL slate share card:',error);notify('Could not build NHL slate card.');
    }finally{button.disabled=false;button.textContent=old;}
  }

  function bindNhlScorerActions(root){
    root?.querySelectorAll('[data-nhl-scorer-market]').forEach(btn=>btn.onclick=()=>{
      const next=String(btn.dataset.nhlScorerMarket||'fgs');
      if(next===nhlScorerMarket)return;
      nhlScorerMarket=next;
      renderNhlScorerModel();
    });
    root?.querySelectorAll('[data-nhl-scorer-game-share]').forEach(btn=>btn.onclick=()=>runNhlScorerGameAction(btn,btn.dataset.nhlScorerGameShare,'share'));
    root?.querySelectorAll('[data-nhl-scorer-game-download]').forEach(btn=>btn.onclick=()=>runNhlScorerGameAction(btn,btn.dataset.nhlScorerGameDownload,'download'));
    root?.querySelectorAll('[data-nhl-scorer-slate-share]').forEach(btn=>btn.onclick=()=>runNhlScorerSlateShare(btn,btn.dataset.nhlScorerSlateShare));
  }

  function renderNhlScorerModel(){
    const root=document.querySelector('[data-nhl-scorer-shell]');
    if(!root)return;
    root.querySelectorAll('[data-nhl-scorer-market]').forEach(btn=>{
      const active=btn.dataset.nhlScorerMarket===nhlScorerMarket;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
    const body=root.querySelector('[data-nhl-scorer-body]');
    const meta=root.querySelector('[data-nhl-scorer-meta]');
    if(!body)return;
    if(!nhlScorerCache){
      body.innerHTML='<div class="live-board-loading"><span class="live-feed-spinner"></span><div><b>Loading the real NHL scorer model…</b><small>Same generated board used by TSO 1.0.</small></div></div>';
      return;
    }
    const games=Array.isArray(nhlScorerCache.games)?nhlScorerCache.games:[];
    if(meta){
      meta.innerHTML='<span><b>'+esc(nhlScorerCache.model||'FGS-Hazard Ensemble v3')+'</b><small>'+esc(nhlScorerCache.season||'NHL')+' · generated '+esc(ageText(nhlScorerCache.generatedAt))+' ago</small></span>'
        +'<span><b>TOP 3 + RISKY</b><small>per team</small></span>'
        +'<span><b>'+games.length+' MATCHUPS</b><small>'+esc(nhlScorerMarket==='fgs'?'First Goal':'Anytime Goal')+' board</small></span>'
        +'<span><b>MATCHUP ADJUSTED</b><small>form · defense · goalie · rest</small></span>';
    }
    if(!games.length){
      body.innerHTML='<div class="live-board-loading"><div><b>The scorer model is waiting for the next verified NHL slate.</b><small>No fake candidates will be shown.</small></div></div>';
      return;
    }
    body.innerHTML=games.map(nhlScorerGameMarkup).join('');
    bindNhlScorerActions(root);
    bindMediaFallbacks();
  }

  function refreshNhlScorerData(force=false){
    const root=document.querySelector('[data-nhl-scorer-shell]');
    if(!root&&!(currentRoute==='research'&&(currentLeague==='nhl'||currentLeague==='all')))return Promise.resolve(null);
    const now=Date.now();
    if(!force&&nhlScorerCache&&now-nhlScorerFetchedAt<60000){
      renderNhlScorerModel();
      return Promise.resolve(nhlScorerCache);
    }
    if(nhlScorerInFlight)return nhlScorerInFlight;
    nhlScorerInFlight=fetch('/api/nhl-scorer-model',{cache:'no-store'})
      .then(async response=>{
        const payload=await response.json();
        if(!response.ok||payload?.available===false)throw new Error(payload?.error||'NHL scorer model unavailable');
        nhlScorerCache=payload;
        nhlScorerFetchedAt=Date.now();
        renderNhlScorerModel();
        if(currentRoute==='research')renderResearch();
        return payload;
      })
      .catch(error=>{
        console.error('TSO NHL scorer model:',error);
        const body=document.querySelector('[data-nhl-scorer-body]');
        if(body)body.innerHTML='<div class="live-board-loading"><div><b>NHL scorer model feed unavailable.</b><small>TSO will not replace it with demo picks.</small></div></div>';
        return null;
      })
      .finally(()=>{nhlScorerInFlight=null;});
    return nhlScorerInFlight;
  }

  function renderModelsSportSummary(root){
    const node=root.querySelector('[data-models-sport-summary]');
    if(!node) return;
    const modeled=allModeledRows();
    const counts={nhl:0,nfl:0,mlb:0,nba:0};
    modeled.forEach(row=>{ if(Object.prototype.hasOwnProperty.call(counts,row.sport)) counts[row.sport]++; });
    const meta={
      nhl:{mark:'◎',tone:'violet',title:'NHL',copy:'First Goal · Anytime Goal'},
      nfl:{mark:'◫',tone:'blue',title:'NFL',copy:'Monte Carlo · exact-line pregame'},
      mlb:{mark:'⌁',tone:'gold',title:'MLB',copy:'Daily 10,000-run hitter model'},
      nba:{mark:'✦',tone:'orange',title:'NBA',copy:'Regression v1 · history + matchup'}
    };
    node.innerHTML=['nhl','nfl','mlb','nba'].map(sport=>{
      const item=meta[sport];
      const active=currentLeague===sport;
      const count=counts[sport]+' MATCH'+(counts[sport]===1?'':'ES');
      return '<button class="models-engine-tab '+(active?'is-active':'')+'" data-models-league="'+sport+'">'
        +'<span class="models-engine-mark models-engine-mark--'+item.tone+'">'+item.mark+'</span>'
        +'<div><b>'+item.title+'</b><small>'+item.copy+'</small></div><i>'+count+'</i></button>';
    }).join('');
    node.querySelectorAll('[data-models-league]').forEach(btn=>btn.addEventListener('click',()=>setLeague(btn.dataset.modelsLeague)));
    root.querySelectorAll('[data-model-count]').forEach(el=>{
      const sport=el.dataset.modelCount;
      el.textContent=String(counts[sport]||0);
    });
  }

  function renderModelsFeature(root,rows){
    const node=root.querySelector('[data-models-feature]');
    if(!node) return;
    node.classList.remove('live-feed-loading');
    if(!rows.length){
      node.innerHTML='<div class="live-feed-empty"><div><b>No exact model matches for this filter.</b><small>The verified odds feed is available, but no row currently passes the strict player + market + side + exact-line model match.</small></div></div>';
      return;
    }
    const row=sortPropsRows(rows)[0];
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const source=modelSourceText(row);
    const phase=String(model.phase||'').trim();
    const selection=propSelectionText(row);
    const tag=modelTagText(row);
    const updated=row.snapshotTime?ageText(row.snapshotTime)+' old':'timestamp unavailable';
    const ringValue=Math.max(0,Math.min(100,Number(model.probabilityPct)||0));
    node.innerHTML=
      '<div class="model-spotlight-glow"></div>'
      +'<div class="model-spotlight-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(selection)+'</span><b>'+esc(tag)+'</b></div>'
      +'<div class="model-spotlight-main"><div class="model-spotlight-player">'
        +propHeadshotMarkup(row,'model-player-number model-player-headshot')
        +'<div><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · <strong>'+esc(selection)+'</strong></p></div>'
      +'</div><div class="model-probability-ring" style="background:conic-gradient(#7b5cff 0 '+ringValue+'%,rgba(255,255,255,.08) '+ringValue+'% 100%)"><div><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong><span>probability</span></div></div></div>'
      +'<div class="model-score-line"><div><span>MARKET</span><b>'+pct1(row.impliedPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div><div><span>EXACT LINE</span><b>'+esc(selection)+'</b></div><div><span>BEST PRICE</span><b>'+esc(americanPrice(row.price))+' <small>'+esc(row.book||'—')+'</small></b></div></div>'
      +'<div class="model-driver-grid"><div><span>MODEL SOURCE</span><b>'+esc(source)+'</b><small>Real TSO output</small></div><div><span>PHASE</span><b>'+esc(phase?phase.toUpperCase():'MODEL OUTPUT')+'</b><small>'+(row.sport==='nfl'?'Pregame price comparison enforced':'Exact-selection match')+'</small></div><div><span>SPORTSBOOK</span><b>'+esc(row.book||'—')+'</b><small>'+esc(row.bookCount||1)+' verified book'+((row.bookCount||1)===1?'':'s')+'</small></div><div><span>UPDATED</span><b>'+esc(updated)+'</b><small>Snapshot timestamp preserved</small></div></div>'
      +'<div class="model-spotlight-footer"><div><span>OUTPOST READ</span><b>Exact model-to-market match.</b><small>Same player, market, side and threshold. No nearby-line substitution.</small></div>'
      +(row.link?'<a class="broadcast-cta props-book-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN SPORTSBOOK →</a>':'<span class="props-link-unavailable">NATIVE LINK NOT SUPPLIED</span>')+'</div>';
  }

  function renderModelsEdgeBoard(root,rows){
    const node=root.querySelector('[data-models-edge-board]');
    if(!node) return;
    const ranked=sortPropsRows(rows).slice(0,8);
    node.innerHTML='<div class="model-edge-head"><div><span class="violet-kicker">EDGE BOARD</span><h2>Best model gaps right now</h2></div><span>REAL DATA</span></div>'
      +(ranked.length?ranked.map((row,i)=>{
        const edge=Number(row.model?.edgePct);
        return '<button class="model-edge-row '+(i===0?'is-featured':'')+'"><span class="model-edge-rank">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small></div><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><strong class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong></button>';
      }).join(''):'<div class="live-feed-side-loading"><div><b>No model matches for this filter.</b><small>Only exact TSO model-to-market matches appear here.</small></div></div>')
      +'<div class="model-edge-footer"><span>'+ranked.length+' ranked · '+rows.length+' exact model matches</span><button data-route-jump="props">OPEN PROPS →</button></div>';
    node.querySelector('[data-route-jump="props"]')?.addEventListener('click',()=>setRoute('props'));
  }

  function renderModelsBoard(root,rows){
    const board=root.querySelector('[data-models-board]');
    if(!board) return;
    const visible=sortPropsRows(rows).slice(0,160);
    if(!visible.length){
      board.innerHTML='<div class="live-board-loading props-empty-board"><b>No exact model matches for this filter.</b></div>';
      return;
    }
    board.innerHTML=visible.map(row=>{
      const model=row.model||{};
      const edge=Number(model.edgePct);
      return '<div class="props-board-row props-board-row-live has-model">'
        +'<span class="props-board-player props-board-player-live">'+propHeadshotMarkup(row,'props-board-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
        +'<strong>'+esc(propSelectionText(row))+'</strong>'
        +'<strong class="props-model-prob">'+pct1(model.probabilityPct)+'</strong>'
        +'<strong>'+pct1(row.impliedPct)+'</strong>'
        +'<strong class="props-edge-value '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
        +'<span class="props-model-tag '+modelTagClass(row)+'">'+esc(modelTagText(row))+'</span>'
        +'<span class="props-price"><b>'+esc(americanPrice(row.price))+'</b><small>'+esc(row.bookCount||1)+' book'+((row.bookCount||1)===1?'':'s')+'</small></span>'
        +'<strong class="props-book-name">'+esc(row.book||'—')+'</strong>'
        +'<span class="props-snapshot-age">'+esc(ageText(row.snapshotTime))+'</span>'
        +(row.link?'<a class="props-native-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN →</a>':'<span class="props-no-link">NO LINK</span>')
      +'</div>';
    }).join('');
    bindMediaFallbacks();
  }

  function renderModelsFeed(){
    const root=document.querySelector('[data-models-route]');
    if(currentRoute!=='models'||!root||!propsFeedCache) return;
    refreshNhlScorerData(false);
    const rows=currentModelRows();
    const all=allModeledRows();
    const newest=propsNewestTimestamp(rows.length?rows:all);
    const freshness=freshnessLabel(newest);
    const sports=new Set(all.map(row=>row.sport).filter(Boolean));
    const sources=new Set(all.map(modelSourceText).filter(Boolean));
    const top=sortPropsRows(rows)[0]||null;

    const badge=root.querySelector('[data-models-feed-badge]');
    if(badge){
      badge.className='props-feed-badge is-'+freshness.tone;
      badge.innerHTML='<i></i> REAL MODEL FEED · '+esc(freshness.label);
    }

    const status=root.querySelector('[data-models-status]');
    if(status){
      status.innerHTML='<div><span class="model-live-dot"></span><b>REAL TSO MODEL FEED</b><small>Exact model matches only</small></div><span class="models-status-divider"></span><div><b>'+rows.length+'</b><small>model matches</small></div><span class="models-status-divider"></span><div><b>'+sports.size+'</b><small>modeled sports</small></div><span class="models-status-divider"></span><div><b>'+sources.size+'</b><small>model sources</small></div><span class="models-status-divider"></span><div><b>'+esc(newest?ageText(newest):'—')+'</b><small>source freshness</small></div>';
    }

    const title=root.querySelector('[data-models-board-title]');
    if(title) title.textContent=(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' exact model match'+(rows.length===1?'':'es');

    const pulseCount=root.querySelector('[data-models-pulse-count]');
    if(pulseCount) pulseCount.textContent=String(rows.length);
    const pulseEdge=root.querySelector('[data-models-pulse-edge]');
    if(pulseEdge) pulseEdge.textContent=top?edgeText(top.model?.edgePct):'—';
    const pulseAge=root.querySelector('[data-models-pulse-age]');
    if(pulseAge) pulseAge.textContent=newest?'Verified snapshot '+ageText(newest)+' old':'No modeled snapshot for this filter';

    renderModelsSportSummary(root);
    renderModelsFeature(root,rows);
    renderModelsEdgeBoard(root,rows);
    renderModelsBoard(root,rows);
  }

  const americanToDecimal = value => {
    const n=Number(value);
    if(!Number.isFinite(n)||n===0) return null;
    return n>0 ? 1+n/100 : 1+100/Math.abs(n);
  };

  const decimalToAmerican = value => {
    const d=Number(value);
    if(!Number.isFinite(d)||d<=1) return null;
    return d>=2 ? Math.round((d-1)*100) : Math.round(-100/(d-1));
  };

  function parlayRows(){
    return (propsFeedCache?.rows||[]).filter(row=>{
      if(currentLeague!=='all'&&row.sport!==currentLeague) return false;
      if(!Number.isFinite(Number(row.price))||Number(row.price)===0)return false;
      if(String(row.sourceFile||'').toLowerCase()==='nfl-live-odds.json')return false;
      const phase=String(row?.model?.phase||'pregame').toLowerCase();
      return phase==='pregame';
    });
  }

  function autoParlayRows(){
    return parlayRows().filter(row=>Number.isFinite(Number(row?.model?.probabilityPct)));
  }

  function parlayRowByKey(key){
    return parlayRows().find(row=>String(row.key)===String(key))||null;
  }

  function parlayLegRows(){
    return parlayLegKeys.map(parlayRowByKey).filter(Boolean);
  }

  function parlayEventKey(row){
    return row?.eventId ? String(row.sport||'')+'|'+String(row.eventId) : '';
  }

  function parlayCandidateRows(excludedKeys=[]){
    const excluded=new Set(excludedKeys.map(String));
    const modeled=autoParlayRows().filter(row=>!excluded.has(String(row.key)));
    const base=modeled.length?modeled:parlayRows().filter(row=>!excluded.has(String(row.key)));
    return sortPropsRows(base);
  }

  function chooseParlayRows(target=3,excludedKeys=[]){
    const candidates=parlayCandidateRows(excludedKeys);
    const chosen=[];
    const players=new Set();
    const events=new Set();
    for(const row of candidates){
      const player=String(row.player||'').toLowerCase();
      const event=parlayEventKey(row);
      if(players.has(player)||(event&&events.has(event))) continue;
      chosen.push(row);
      players.add(player);
      if(event) events.add(event);
      if(chosen.length>=target) return chosen;
    }
    for(const row of candidates){
      if(chosen.some(x=>String(x.key)===String(row.key))) continue;
      chosen.push(row);
      if(chosen.length>=target) break;
    }
    return chosen;
  }

  function resetParlayBuild(){
    parlayLegKeys=chooseParlayRows(parlayTarget).map(row=>String(row.key));
    renderParlayLab();
  }

  function fillParlayToTarget(target=parlayTarget){
    const available=parlayRows();
    const valid=new Set(available.map(row=>String(row.key)));
    parlayLegKeys=parlayLegKeys.filter(key=>valid.has(String(key)));
    if(target<5&&parlayLegKeys.length>target) parlayLegKeys=parlayLegKeys.slice(0,target);
    if(parlayLegKeys.length<target){
      const needed=target-parlayLegKeys.length;
      parlayLegKeys.push(...chooseParlayRows(needed,parlayLegKeys).map(row=>String(row.key)));
    }
  }

  function parlayOverlapInfo(rows){
    let sameEventPairs=0,samePlayerPairs=0;
    for(let i=0;i<rows.length;i++){
      for(let j=i+1;j<rows.length;j++){
        const a=rows[i],b=rows[j];
        if(parlayEventKey(a)&&parlayEventKey(a)===parlayEventKey(b)) sameEventPairs++;
        if(String(a.player||'').toLowerCase()===String(b.player||'').toLowerCase()) samePlayerPairs++;
      }
    }
    return {sameEventPairs,samePlayerPairs,hasOverlap:sameEventPairs>0||samePlayerPairs>0};
  }

  function parlayBookCoverage(rows){
    const coverage=new Map();
    for(const row of rows){
      const seen=new Set();
      for(const book of row.books||[]){
        const key=String(book?.book||'').trim().toLowerCase();
        if(!key||seen.has(key)||!Number.isFinite(Number(book.price))||Number(book.price)===0) continue;
        seen.add(key);
        let item=coverage.get(key);
        if(!item){item={key,name:String(book.book),legs:[],complete:false,combinedDecimal:null,combinedAmerican:null};coverage.set(key,item);}
        item.legs.push({row,book});
      }
    }
    const items=[...coverage.values()];
    for(const item of items){
      item.complete=rows.length>0&&item.legs.length===rows.length;
      if(item.complete){
        let decimal=1;
        for(const leg of item.legs){
          const d=americanToDecimal(leg.book.price);
          if(!d){decimal=null;break;}
          decimal*=d;
        }
        item.combinedDecimal=decimal;
        item.combinedAmerican=decimalToAmerican(decimal);
      }
    }
    return items.sort((a,b)=>{
      if(a.complete!==b.complete) return a.complete?-1:1;
      if(a.complete&&b.complete) return Number(b.combinedDecimal||0)-Number(a.combinedDecimal||0);
      return b.legs.length-a.legs.length;
    });
  }

  function parlayCombinedMath(rows){
    let model=1,market=1;
    let modelValid=rows.length>0,marketValid=rows.length>0;
    for(const row of rows){
      const mp=Number(row?.model?.probabilityPct),ip=Number(row.impliedPct);
      if(Number.isFinite(ip))market*=ip/100;else marketValid=false;
      if(Number.isFinite(mp))model*=mp/100;else modelValid=false;
    }
    const marketPct=marketValid?market*100:null;
    const modelPct=modelValid?model*100:null;
    return {modelPct,marketPct,deltaPct:Number.isFinite(modelPct)&&Number.isFinite(marketPct)?modelPct-marketPct:null};
  }

  function parlayLegMarkup(row,index,weakKey){
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const edge=hasModel?Number(model.edgePct):null;
    const weak=hasModel&&String(row.key)===String(weakKey);
    return '<div class="parlay-leg '+(weak?'parlay-leg--weak':hasModel?'parlay-leg--strong':'parlay-leg--market')+'" data-parlay-leg-key="'+esc(row.key)+'">'
      +'<div class="parlay-leg-index">'+String(index+1).padStart(2,'0')+'</div>'
      +'<div class="parlay-leg-main"><div class="parlay-leg-identity">'+propHeadshotMarkup(row,'parlay-leg-headshot')+'<div>'
        +'<div class="parlay-leg-meta"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+(weak?'WEAKEST EDGE':hasModel?esc(modelTagText(row)):'MARKET ONLY')+'</b></div>'
        +'<h3>'+esc(row.player)+' · '+esc(propSelectionText(row))+'</h3>'
        +'<small>'+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+' · exact selection</small>'
      +'</div></div>'
      +'<div class="parlay-leg-metrics">'
        +'<span><small>MODEL</small><b>'+(hasModel?pct1(model.probabilityPct):'—')+'</b></span>'
        +'<span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span>'
        +'<span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span>'
        +'<span><small>BOOKS</small><b>'+esc(row.bookCount||row.books?.length||1)+'</b></span>'
      +'</div></div>'
      +'<div class="parlay-leg-price"><span>BEST</span><strong>'+esc(americanPrice(row.price))+'</strong><small>'+esc(row.book||'BOOK')+'</small></div>'
      +'<button class="parlay-leg-remove" data-parlay-remove="'+esc(row.key)+'" aria-label="Remove '+esc(row.player)+'">×</button>'
    +'</div>';
  }

  function parlaySuggestionMarkup(row,label='COMPATIBLE'){
    const hasModel=Number.isFinite(Number(row?.model?.probabilityPct));
    const edge=hasModel?Number(row.model.edgePct):null;
    return '<button class="parlay-suggestion-card" data-parlay-suggest="'+esc(row.key)+'">'
      +'<div><span>'+esc(leagueLabel(row.sport))+'</span><b>'+esc(hasModel?label:'MARKET ONLY')+'</b></div>'
      +propHeadshotMarkup(row,'parlay-suggestion-headshot')
      +'<h3>'+esc(row.player)+' · '+esc(row.marketLabel||row.market)+' '+esc(propSelectionText(row))+'</h3>'
      +'<p>'+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+' · exact selection</p>'
      +'<section><span><small>MODEL</small><b>'+(hasModel?pct1(row.model.probabilityPct):'—')+'</b></span><span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b></span></section>'
      +'<i>＋ ADD EXACT LEG</i>'
    +'</button>';
  }

  function renderParlaySuggestions(root,rows){
    const node=root.querySelector('[data-parlay-suggestions]');
    if(!node) return;
    const selectedKeys=rows.map(row=>String(row.key));
    const selectedPlayers=new Set(rows.map(row=>String(row.player||'').toLowerCase()));
    const selectedEvents=new Set(rows.map(parlayEventKey).filter(Boolean));
    const all=parlayCandidateRows(selectedKeys);
    const safe=all.filter(row=>!selectedPlayers.has(String(row.player||'').toLowerCase())&&(!parlayEventKey(row)||!selectedEvents.has(parlayEventKey(row))));
    const visible=(safe.length?safe:all).slice(0,6);
    const modeled=visible.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))).length;
    node.innerHTML=visible.length ? visible.map(row=>parlaySuggestionMarkup(row,safe.includes(row)?'NO SAME EVENT':'REVIEW OVERLAP')).join('') : '<div class="live-board-loading home-model-empty--wide"><div><b>No additional exact selections for this filter.</b><small>Open Player Props to choose another verified leg.</small></div></div>';
    const title=root.querySelector('[data-parlay-suggestions-title]');
    if(title) title.textContent=visible.length?(modeled===visible.length?visible.length+' exact model suggestions':visible.length+' exact market suggestions'):'No exact suggestions';
  }

  function renderParlayReplacements(root,rows,weakest){
    const node=root.querySelector('[data-parlay-replacements]');
    const title=root.querySelector('[data-parlay-weakest-title]');
    if(!node) return;
    if(!weakest){
      node.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>Add at least one modeled leg to compare replacements.</b></div></div>';
      if(title) title.textContent='No leg selected';
      return;
    }
    if(title) title.textContent=weakest.player+' · '+edgeText(weakest.model?.edgePct)+' edge';
    const other=rows.filter(row=>String(row.key)!==String(weakest.key));
    const otherPlayers=new Set(other.map(row=>String(row.player||'').toLowerCase()));
    const otherEvents=new Set(other.map(parlayEventKey).filter(Boolean));
    const candidates=parlayCandidateRows(rows.map(row=>String(row.key))).filter(row=>!otherPlayers.has(String(row.player||'').toLowerCase())&&(!parlayEventKey(row)||!otherEvents.has(parlayEventKey(row))));
    const weakEdge=Number(weakest.model?.edgePct),weakProb=Number(weakest.model?.probabilityPct);
    const safer=candidates.find(row=>Number(row.model?.probabilityPct)>weakProb);
    const moreEdge=candidates.find(row=>Number(row.model?.edgePct)>weakEdge&&String(row.key)!==String(safer?.key));
    const replacements=[safer,moreEdge].filter(Boolean);
    node.innerHTML='<article class="parlay-replace-current"><div class="parlay-replace-label">CURRENT WEAKEST EDGE</div><span>'+esc(leagueLabel(weakest.sport))+' · '+esc(weakest.marketLabel||weakest.market)+'</span>'
      +propHeadshotMarkup(weakest,'parlay-card-headshot')+'<h3>'+esc(weakest.player)+'</h3><p>'+esc(propSelectionText(weakest))+' · '+esc(americanPrice(weakest.price))+' '+esc(weakest.book||'')+'</p>'
      +'<div><span>MODEL</span><b>'+pct1(weakest.model?.probabilityPct)+'</b></div><div><span>EDGE</span><b class="'+(weakEdge>=0?'positive':'negative')+'">'+edgeText(weakEdge)+'</b></div></article>'
      +'<div class="parlay-replace-arrow">→</div>'
      +(replacements.length?replacements.map((row,i)=>{
        const edge=Number(row.model?.edgePct);
        return '<button class="parlay-replacement-card" data-parlay-replace="'+esc(row.key)+'" data-parlay-replace-old="'+esc(weakest.key)+'"><span class="parlay-replacement-badge">'+(i===0?'HIGHER MODEL PROB':'MORE EDGE')+'</span><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</small>'
          +propHeadshotMarkup(row,'parlay-card-headshot')+'<h3>'+esc(row.player)+' · '+esc(propSelectionText(row))+'</h3>'
          +'<div><span>MODEL</span><b>'+pct1(row.model?.probabilityPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div>'
          +'<strong>'+esc(americanPrice(row.price))+'</strong><em>REPLACE EXACT LEG →</em></button>';
      }).join(''):'<div class="home-model-empty"><b>No cleaner replacement found.</b><small>Current filter has no unselected candidate with a higher model probability or edge.</small></div>');
  }

  function renderParlayBooks(root,rows){
    const node=root.querySelector('[data-parlay-books]');
    const title=root.querySelector('[data-parlay-book-title]');
    if(!node) return;
    if(rows.length<2){
      node.innerHTML='<div class="live-board-loading"><div><b>Add at least 2 exact legs for sportsbook comparison.</b></div></div>';
      if(title) title.textContent='Exact-leg coverage by sportsbook';
      return;
    }
    const books=parlayBookCoverage(rows);
    const complete=books.filter(x=>x.complete);
    if(title) title.textContent=complete.length ? rows.length+' exact legs · '+complete.length+' complete sportsbook'+(complete.length===1?'':'s') : rows.length+' exact legs · no common sportsbook';
    const visible=(complete.length?complete:books).slice(0,7);
    if(!visible.length){
      node.innerHTML='<div class="live-board-loading"><div><b>No sportsbook coverage returned for these legs.</b></div></div>';
      return;
    }
    node.innerHTML=visible.map((item,i)=>{
      const links=item.legs.map(x=>x.book.link).filter(Boolean);
      const initials=item.name.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
      const coverage=item.legs.length+'/'+rows.length;
      return '<div class="parlay-book-row '+(item.complete&&i===0?'is-best':'')+'"><span class="parlay-book-name">'+esc(initials)+'</span><div><b>'+esc(item.name)+'</b><small>'+coverage+' exact legs · '+links.length+' native selection link'+(links.length===1?'':'s')+'</small></div>'
        +'<strong>'+(item.complete?esc(americanPrice(item.combinedAmerican)):'—')+'</strong>'
        +'<span class="'+(item.complete&&i===0?'parlay-book-value':'')+'">'+(item.complete?(i===0?'BEST DERIVED PRICE*':'COMPLETE COVERAGE'):'PARTIAL COVERAGE')+'</span>'
        +'<button data-parlay-book-open="'+esc(item.key)+'" '+(!links.length?'disabled':'')+'>'+(links.length?'OPEN EXACT LINKS →':'NO LINKS')+'</button></div>';
    }).join('');
  }

  function bindParlayGeneratedActions(){
    document.querySelectorAll('[data-parlay-remove]').forEach(btn=>btn.onclick=()=>{
      parlayLegKeys=parlayLegKeys.filter(key=>String(key)!==String(btn.dataset.parlayRemove));
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-suggest]').forEach(btn=>btn.onclick=()=>{
      const key=String(btn.dataset.parlaySuggest||'');
      if(key&&!parlayLegKeys.includes(key)&&parlayLegKeys.length<8) parlayLegKeys.push(key);
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-replace]').forEach(btn=>btn.onclick=()=>{
      const next=String(btn.dataset.parlayReplace||''),old=String(btn.dataset.parlayReplaceOld||'');
      const i=parlayLegKeys.findIndex(key=>String(key)===old);
      if(i>=0&&next) parlayLegKeys[i]=next;
      renderParlayLab();
    });
    document.querySelectorAll('[data-parlay-book-open]').forEach(btn=>btn.onclick=()=>{
      const key=String(btn.dataset.parlayBookOpen||'');
      const item=parlayBookCoverage(parlayLegRows()).find(x=>x.key===key);
      const links=(item?.legs||[]).map(x=>x.book.link).filter(Boolean);
      if(!links.length) return;
      links.forEach(link=>window.open(link,'_blank','noopener'));
      notify('Opened '+links.length+' exact '+item.name+' selection link'+(links.length===1?'':'s')+'.');
    });
    document.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function checkpointMarketLabel(market){
    return ({
      rushYds:'Rush Yds',recYds:'Receiving Yds',passYds:'Passing Yds',receptions:'Receptions',
      passTds:'Pass TDs',completions:'Completions',atd:'Anytime TD',firstTd:'First TD'
    })[String(market||'')]||String(market||'Prop').replace(/([a-z])([A-Z])/g,'$1 $2');
  }

  function checkpointSelection(candidate){
    const market=String(candidate?.market||'');
    if(market==='atd'||market==='firstTd')return market==='firstTd'?'First TD':'Anytime TD';
    const line=Number(candidate?.line);
    const side=String(candidate?.side||'over').toLowerCase()==='under'?'Under':'Over';
    return side+(Number.isFinite(line)?' '+(Number.isInteger(line)?line:line.toFixed(1)):'')+' '+checkpointMarketLabel(market);
  }

  function checkpointSource(){
    return parlayMode==='quarter'?nflCheckpointCache?.quarter:nflCheckpointCache?.halftime;
  }

  function checkpointCandidates(){
    const source=checkpointSource();
    if(!source?.ready)return [];
    const out=[];
    if(parlayMode==='quarter'){
      for(const game of source.games||[]){
        const board=game?.periods?.[parlayQuarterPeriod];
        if(!board?.ready)continue;
        const byId=new Map((board.candidates||[]).map(c=>[String(c.id),c]));
        const ranked=(board?.rankings?.[parlayCheckpointStrategy]||board?.rankings?.tsoPick||[]).map(String);
        const ordered=[];
        const seen=new Set();
        for(const id of ranked){const c=byId.get(id);if(c&&!seen.has(id)){ordered.push(c);seen.add(id);}}
        for(const c of board.candidates||[]){const id=String(c.id);if(!seen.has(id)){ordered.push(c);seen.add(id);}}
        ordered.forEach((c,rank)=>out.push({...c,_key:'quarter|'+parlayQuarterPeriod+'|'+String(c.id),_rank:rank,_matchup:game.matchup,_period:parlayQuarterPeriod}));
      }
    }else if(parlayMode==='halftime'){
      for(const game of source.games||[]){
        const byId=new Map((game.candidates||[]).map(c=>[String(c.id),c]));
        const ranked=(game?.rankings?.[parlayCheckpointStrategy]||game?.rankings?.tsoPick||[]).map(String);
        const ordered=[];
        const seen=new Set();
        for(const id of ranked){const c=byId.get(id);if(c&&!seen.has(id)){ordered.push(c);seen.add(id);}}
        for(const c of game.candidates||[]){const id=String(c.id);if(!seen.has(id)){ordered.push(c);seen.add(id);}}
        ordered.forEach((c,rank)=>out.push({...c,_key:'halftime|'+String(c.id),_rank:rank,_matchup:game.matchup,_period:'halftime'}));
      }
    }
    return out.sort((a,b)=>Number(a._rank||0)-Number(b._rank||0)||Number(b.simProbability||0)-Number(a.simProbability||0));
  }

  function fillCheckpointToTarget(){
    const all=checkpointCandidates();
    const valid=new Set(all.map(c=>String(c._key)));
    parlayCheckpointLegKeys=parlayCheckpointLegKeys.filter(key=>valid.has(String(key)));
    if(parlayCheckpointLegKeys.length>parlayTarget)parlayCheckpointLegKeys=parlayCheckpointLegKeys.slice(0,parlayTarget);
    const selectedPlayers=new Set(parlayCheckpointLegKeys.map(key=>all.find(c=>c._key===key)?.name).filter(Boolean).map(x=>String(x).toLowerCase()));
    for(const c of all){
      if(parlayCheckpointLegKeys.length>=parlayTarget)break;
      if(parlayCheckpointLegKeys.includes(c._key))continue;
      const player=String(c.name||'').toLowerCase();
      if(player&&selectedPlayers.has(player))continue;
      parlayCheckpointLegKeys.push(c._key);
      if(player)selectedPlayers.add(player);
    }
  }

  function checkpointSelected(){
    const byKey=new Map(checkpointCandidates().map(c=>[String(c._key),c]));
    return parlayCheckpointLegKeys.map(key=>byKey.get(String(key))).filter(Boolean);
  }

  function checkpointIndependentMath(rows){
    let model=1,market=1,modelValid=rows.length>0,marketValid=rows.length>0,decimal=1,priceValid=rows.length>0;
    for(const row of rows){
      const p=Number(row.simProbability);
      if(Number.isFinite(p)&&p>0&&p<1)model*=p;else modelValid=false;
      const mp=Number(row.bookFairProbability);
      if(Number.isFinite(mp)&&mp>0&&mp<1)market*=mp;else marketValid=false;
      const d=americanToDecimal(row.price);
      if(Number.isFinite(d))decimal*=d;else priceValid=false;
    }
    const modelPct=modelValid?model*100:null,marketPct=marketValid?market*100:null;
    return {
      modelPct,marketPct,
      deltaPct:Number.isFinite(modelPct)&&Number.isFinite(marketPct)?modelPct-marketPct:null,
      derivedPrice:priceValid?decimalToAmerican(decimal):null
    };
  }

  function checkpointLegMarkup(row,index){
    const p=Number(row.simProbability)*100;
    const edge=Number(row.edge);
    const isHalf=parlayMode==='halftime';
    return '<div class="parlay-leg parlay-leg--strong checkpoint-leg" data-checkpoint-leg="'+esc(row._key)+'">'
      +'<div class="parlay-leg-index">'+String(index+1).padStart(2,'0')+'</div>'
      +'<div class="parlay-leg-main"><div class="parlay-leg-identity"><span class="checkpoint-player-mark">NFL</span><div>'
        +'<div class="parlay-leg-meta"><span>NFL · '+esc(row._period.toUpperCase())+' · '+esc(checkpointMarketLabel(row.market))+'</span><b>'+esc(row.grade||'50K MODEL')+'</b></div>'
        +'<h3>'+esc(row.name)+' · '+esc(checkpointSelection(row))+'</h3>'
        +'<small>'+esc(row._matchup||row.matchup||'NFL checkpoint')+' · '+(isHalf?'halftime checkpoint':'pregame period simulation')+'</small>'
      +'</div></div>'
      +'<div class="parlay-leg-metrics">'
        +'<span><small>50K SIM</small><b>'+pct1(p)+'</b></span>'
        +'<span><small>EDGE</small><b class="'+(Number.isFinite(edge)?(edge>=0?'positive':'negative'):'')+'">'+(Number.isFinite(edge)?(isHalf?edgeText(edge*100):(edge>=0?'+':'')+edge.toFixed(2)+'σ'):'—')+'</b></span>'
        +'<span><small>ITER</small><b>'+esc(row.iterations?Number(row.iterations).toLocaleString():'50K')+'</b></span>'
        +'<span><small>SOURCE</small><b>'+(isHalf&&row.book?esc(row.book):'TSO')+'</b></span>'
      +'</div></div>'
      +'<div class="parlay-leg-price"><span>'+(isHalf&&Number.isFinite(Number(row.price))?'BOOK':'PERIOD')+'</span><strong>'+(isHalf&&Number.isFinite(Number(row.price))?esc(americanPrice(row.price)):esc(row._period.toUpperCase()))+'</strong><small>'+(isHalf&&row.book?esc(row.book):'MODEL ONLY')+'</small></div>'
      +'<button class="parlay-leg-remove" data-checkpoint-remove="'+esc(row._key)+'" aria-label="Remove '+esc(row.name)+'">×</button>'
    +'</div>';
  }

  function checkpointSuggestionMarkup(row){
    const isHalf=parlayMode==='halftime';
    const edge=Number(row.edge);
    return '<button class="parlay-suggestion-card checkpoint-suggestion" data-checkpoint-add="'+esc(row._key)+'">'
      +'<div><span>NFL · '+esc(row._period.toUpperCase())+'</span><b>'+esc(parlayCheckpointStrategy.toUpperCase())+'</b></div>'
      +'<span class="checkpoint-player-mark">NFL</span>'
      +'<h3>'+esc(row.name)+' · '+esc(checkpointSelection(row))+'</h3>'
      +'<p>'+esc(row._matchup||row.matchup||'NFL')+'</p>'
      +'<section><span><small>50K SIM</small><b>'+pct1(Number(row.simProbability)*100)+'</b></span><span><small>EDGE</small><b class="'+(Number.isFinite(edge)?(edge>=0?'positive':'negative'):'')+'">'+(Number.isFinite(edge)?(isHalf?edgeText(edge*100):(edge>=0?'+':'')+edge.toFixed(2)+'σ'):'—')+'</b></span><span><small>'+(isHalf?'PRICE':'SOURCE')+'</small><b>'+(isHalf&&Number.isFinite(Number(row.price))?esc(americanPrice(row.price)):'TSO')+'</b></span></section>'
      +'<i>＋ ADD LEG</i>'
    +'</button>';
  }

  function setParlayMode(mode){
    if(!['pregame','quarter','halftime'].includes(mode))return;
    if(mode===parlayMode)return;
    parlayMode=mode;
    parlayCheckpointLegKeys=[];
    if(mode!=='pregame'&&currentLeague!=='nfl'){
      currentLeague='nfl';
      shell.dataset.league='nfl';
      syncNav();
      renderRoute({preserveScroll:true});
      return;
    }
    renderParlayLab();
    if(mode!=='pregame')refreshNflCheckpointData(true);
  }

  async function refreshNflCheckpointData(force=false){
    if(!force&&nflCheckpointCache&&Date.now()-nflCheckpointFetchedAt<NFL_CHECKPOINT_TTL){
      if(currentRoute==='parlays'&&parlayMode!=='pregame')renderParlayLab();
      return nflCheckpointCache;
    }
    if(nflCheckpointInFlight)return nflCheckpointInFlight;
    nflCheckpointInFlight=fetch(NFL_CHECKPOINT_BASE,{cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('NFL checkpoint HTTP '+response.status);
        const payload=await response.json();
        if(!payload||!payload.weekKey)throw new Error('Invalid NFL checkpoint payload');
        nflCheckpointCache=payload;
        nflCheckpointFetchedAt=Date.now();
        if(currentRoute==='parlays'&&parlayMode!=='pregame')renderParlayLab();
        return payload;
      })
      .catch(error=>{
        console.error('TSO NFL checkpoint:',error);
        if(currentRoute==='parlays'&&parlayMode!=='pregame'){
          const root=document.querySelector('[data-parlays-route]');
          const state=root?.querySelector('[data-parlay-checkpoint-state]');
          if(state)state.innerHTML='<span class="parlays-preview-dot is-error"></span><div><b>CHECKPOINT FEED UNAVAILABLE</b><small>'+esc(error?.message||String(error))+'</small></div>';
        }
        return null;
      })
      .finally(()=>{nflCheckpointInFlight=null;});
    return nflCheckpointInFlight;
  }

  function renderCheckpointParlayLab(root){
    const controls=root.querySelector('[data-parlay-checkpoint-controls]');
    if(controls)controls.hidden=false;
    const periodSwitch=root.querySelector('[data-parlay-period-switch]');
    if(periodSwitch)periodSwitch.hidden=parlayMode!=='quarter';
    const strategy=root.querySelector('[data-parlay-checkpoint-strategy]');
    if(strategy)strategy.value=parlayCheckpointStrategy;
    root.querySelectorAll('[data-parlay-period]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.parlayPeriod===parlayQuarterPeriod));

    const source=checkpointSource();
    const state=root.querySelector('[data-parlay-checkpoint-state]');
    if(!nflCheckpointCache){
      if(state)state.innerHTML='<span class="parlays-preview-dot"></span><div><b>CHECKING CURRENT NFL WEEK</b><small>Stale checkpoint boards are rejected automatically.</small></div>';
      refreshNflCheckpointData(false);
    }else if(!source?.available){
      if(state)state.innerHTML='<span class="parlays-preview-dot is-idle"></span><div><b>WAITING FOR CURRENT WEEK</b><small>'+esc(source?.reason||'The current NFL checkpoint board has not published yet.')+'</small></div>';
    }else if(!source?.ready){
      if(state)state.innerHTML='<span class="parlays-preview-dot is-idle"></span><div><b>'+esc(parlayMode==='halftime'?'WAITING FOR HALFTIME CHECKPOINT':'CURRENT WEEK CONNECTED')+'</b><small>'+esc(source?.reason||'No ready checkpoint board yet.')+'</small></div>';
    }else{
      if(state)state.innerHTML='<span class="parlays-preview-dot"></span><div><b>CURRENT WEEK · '+esc(String(nflCheckpointCache.weekKey).toUpperCase())+'</b><small>'+esc(parlayMode==='quarter'?'50K period simulation boards ready':'Ready halftime boards with live checkpoint context')+'</small></div>';
    }

    root.querySelectorAll('[data-parlay-mode]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.parlayMode===parlayMode));
    const status=root.querySelector('[data-parlay-status]');
    if(status)status.innerHTML='<div><span class="parlays-preview-dot"></span><b>'+esc(parlayMode==='quarter'?'NFL QUARTER MODEL':'NFL HALFTIME MODEL')+'</b><small>'+esc(nflCheckpointCache?.weekKey||'checking week')+'</small></div><span class="parlays-status-divider"></span><div><b>50,000</b><small>simulation worlds</small></div><span class="parlays-status-divider"></span><div><b>'+esc(parlayMode==='quarter'?'MODEL-ONLY PERIOD LINES':'LIVE CHECKPOINT GATED')+'</b><small>'+esc(parlayMode==='quarter'?'not sportsbook period quotes':'book context only when supplied')+'</small></div><span class="parlays-status-divider"></span><div><b>STALE BLOCKED</b><small>week key enforced</small></div>';

    const candidates=checkpointCandidates();
    fillCheckpointToTarget();
    const rows=checkpointSelected();
    const ready=Boolean(source?.ready&&candidates.length);
    const legs=root.querySelector('[data-parlay-legs]');
    if(legs)legs.innerHTML=ready
      ? (rows.length?rows.map(checkpointLegMarkup).join(''):'<div class="live-board-loading"><div><b>No checkpoint legs selected.</b><small>Add a verified 50K candidate below.</small></div></div>')
      : '<div class="live-board-loading"><div><b>'+esc(source?.available?(source?.reason||'Checkpoint not ready.'):(source?.reason||'Waiting for current-week board.'))+'</b><small>TSO will not reuse a stale NFL checkpoint slate.</small></div></div>';

    const buildTitle=root.querySelector('[data-parlay-build-title]');
    if(buildTitle)buildTitle.textContent=ready?(rows.length+'-leg '+(parlayMode==='quarter'?parlayQuarterPeriod.toUpperCase():'halftime')+' 50K build'):(parlayMode==='quarter'?'Quarter model waiting':'Halftime model waiting');
    const addButton=root.querySelector('[data-parlay-add]');
    if(addButton){
      addButton.disabled=!ready;
      const copy=addButton.querySelector('small');
      if(copy)copy.textContent=parlayMode==='quarter'?'Add another current '+parlayQuarterPeriod.toUpperCase()+' 50K candidate':'Add another ready halftime candidate';
    }

    root.querySelectorAll('[data-parlay-target]').forEach(btn=>btn.classList.toggle('is-active',Number(btn.dataset.parlayTarget)===parlayTarget));
    const math=checkpointIndependentMath(rows);
    const legTotal=root.querySelector('[data-parlay-leg-total]');
    if(legTotal)legTotal.textContent=String(rows.length);
    const ring=root.querySelector('[data-parlay-ring]');
    if(ring){const pct=rows.length?Math.min(100,rows.length/Math.max(1,parlayTarget)*100):0;ring.style.background='conic-gradient(#7b5cff 0 '+pct+'%,rgba(255,255,255,.07) '+pct+'% 100%)';}
    const combinedPrice=root.querySelector('[data-parlay-combined-price]');
    if(combinedPrice)combinedPrice.textContent=Number.isFinite(math.derivedPrice)?americanPrice(math.derivedPrice):'—';
    const modelProb=root.querySelector('[data-parlay-model-prob]');
    if(modelProb)modelProb.textContent=Number.isFinite(math.modelPct)?pct1(math.modelPct):'—';
    const marketProb=root.querySelector('[data-parlay-market-prob]');
    if(marketProb)marketProb.textContent=Number.isFinite(math.marketPct)?pct1(math.marketPct):'—';
    const combinedEdge=root.querySelector('[data-parlay-combined-edge]');
    if(combinedEdge){combinedEdge.textContent=Number.isFinite(math.deltaPct)?edgeText(math.deltaPct):'—';combinedEdge.className=Number.isFinite(math.deltaPct)?(math.deltaPct>=0?'positive':'negative'):'';}

    const healthTitle=root.querySelector('[data-parlay-health-title]');
    const healthCopy=root.querySelector('[data-parlay-health-copy]');
    if(healthTitle)healthTitle.textContent=!ready?'Checkpoint waiting':parlayMode==='quarter'?'50K period-model build':rows.some(r=>!r.book)?'Halftime model ready':'Halftime book context ready';
    if(healthCopy)healthCopy.textContent=!ready
      ? 'The current-week gate is holding this mode until its verified board is ready.'
      : parlayMode==='quarter'
        ? 'Quarter legs come from the frozen 50K pregame period simulation. They are model lines, not sportsbook period quotes, so sportsbook payout and market probability stay blank.'
        : 'Halftime candidates come from the live checkpoint board. Combined probability below is an independent-leg estimate; correlation tags are context until same-world parlay evaluation is ported into 2.0.';

    const checks=root.querySelector('[data-parlay-checks]');
    if(checks){
      const iterations=rows.map(r=>Number(r.iterations||0)).filter(Boolean);
      const all50=iterations.length?iterations.every(n=>n>=50000):false;
      const corr=rows.filter(r=>Number(r.correlationLift)>0).length;
      checks.innerHTML='<div class="'+(source?.available?'is-good':'is-warn')+'"><span>'+(source?.available?'✓':'!')+'</span><div><b>Current-week gate</b><small>'+(source?.available?'Source week matches '+esc(nflCheckpointCache?.weekKey||'current slate')+'.':'Stale source blocked.')+'</small></div></div>'
        +'<div class="'+(all50?'is-good':'is-warn')+'"><span>'+(all50?'✓':'!')+'</span><div><b>Simulation depth</b><small>'+(rows.length?(all50?'Every selected leg is from a 50K board.':'One or more selected rows report fewer than 50K iterations.'):'Waiting for selected legs.')+'</small></div></div>'
        +'<div class="'+(parlayMode==='quarter'?'is-warn':'is-good')+'"><span>'+(parlayMode==='quarter'?'!':'✓')+'</span><div><b>Sportsbook context</b><small>'+(parlayMode==='quarter'?'Quarter thresholds are TSO simulation lines; no sportsbook period price is implied.':'Halftime sportsbook fields are shown only when the checkpoint feed supplies them.')+'</small></div></div>'
        +(rows.length?'<div class="'+(corr?'is-good':'')+'"><span>'+(corr?'↗':'○')+'</span><div><b>Correlation context</b><small>'+corr+' selected leg'+(corr===1?'':'s')+' carry a positive simulation-correlation flag. Combined probability is still shown as independent in 2.0.</small></div></div>':'');
    }

    const replacement=root.querySelector('[data-parlay-replacements]');
    const replacementTitle=root.querySelector('[data-parlay-weakest-title]');
    if(replacementTitle)replacementTitle.textContent=rows.length?'Lowest selected 50K probability':'No checkpoint leg selected';
    if(replacement){
      if(!rows.length)replacement.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>No selected checkpoint leg to compare.</b></div></div>';
      else{
        const weakest=[...rows].sort((a,b)=>Number(a.simProbability)-Number(b.simProbability))[0];
        const alternate=candidates.find(c=>!parlayCheckpointLegKeys.includes(c._key)&&String(c.name||'').toLowerCase()!==String(weakest.name||'').toLowerCase());
        replacement.innerHTML='<article class="parlay-replace-current"><div class="parlay-replace-label">LOWEST 50K HIT RATE</div><span>NFL · '+esc(weakest._period.toUpperCase())+'</span><span class="checkpoint-player-mark">NFL</span><h3>'+esc(weakest.name)+'</h3><p>'+esc(checkpointSelection(weakest))+'</p><div><span>50K SIM</span><b>'+pct1(Number(weakest.simProbability)*100)+'</b></div></article>'
          +'<div class="parlay-replace-arrow">→</div>'
          +(alternate?'<button class="parlay-replacement-card checkpoint-replacement" data-checkpoint-replace="'+esc(alternate._key)+'" data-checkpoint-replace-old="'+esc(weakest._key)+'"><span class="parlay-replacement-badge">NEXT RANKED</span><small>NFL · '+esc(alternate._period.toUpperCase())+'</small><span class="checkpoint-player-mark">NFL</span><h3>'+esc(alternate.name)+' · '+esc(checkpointSelection(alternate))+'</h3><div><span>50K SIM</span><b>'+pct1(Number(alternate.simProbability)*100)+'</b></div><em>REPLACE LEG →</em></button>':'<div class="home-model-empty"><b>No alternate candidate is available.</b></div>');
      }
    }

    const suggestions=root.querySelector('[data-parlay-suggestions]');
    const suggestionsTitle=root.querySelector('[data-parlay-suggestions-title]');
    const remaining=candidates.filter(c=>!parlayCheckpointLegKeys.includes(c._key)).slice(0,6);
    if(suggestionsTitle)suggestionsTitle.textContent=remaining.length?remaining.length+' '+(parlayMode==='quarter'?parlayQuarterPeriod.toUpperCase():'halftime')+' 50K suggestions':'No additional checkpoint suggestions';
    if(suggestions)suggestions.innerHTML=remaining.length?remaining.map(checkpointSuggestionMarkup).join(''):'<div class="live-board-loading home-model-empty--wide"><div><b>No additional ready candidates.</b></div></div>';

    const books=root.querySelector('[data-parlay-books]');
    const booksTitle=root.querySelector('[data-parlay-book-title]');
    if(booksTitle)booksTitle.textContent=parlayMode==='quarter'?'Quarter model source':'Halftime sportsbook context';
    if(books){
      if(parlayMode==='quarter'){
        books.innerHTML='<div class="live-board-loading"><div><b>TSO 50K MODEL · NO PERIOD SPORTSBOOK QUOTE</b><small>These quarter thresholds come from the simulation board. TSO does not invent a book price or payout for them.</small></div></div>';
      }else{
        books.innerHTML=rows.length?rows.map(row=>'<div class="parlay-book-row '+(row.book?'is-best':'')+'"><span class="parlay-book-name">HT</span><div><b>'+esc(row.name)+' · '+esc(checkpointSelection(row))+'</b><small>'+esc(row.book||'No sportsbook attached')+' · '+esc(row._matchup||'')+'</small></div><strong>'+(Number.isFinite(Number(row.price))?esc(americanPrice(row.price)):'—')+'</strong><span>'+(row.book?'LIVE CHECKPOINT':'MODEL ONLY')+'</span>'+(row.link?'<button data-checkpoint-open="'+esc(row.link)+'">OPEN →</button>':'<button disabled>NO LINK</button>')+'</div>').join(''):'<div class="live-board-loading"><div><b>No selected halftime legs yet.</b></div></div>';
      }
    }

    root.querySelectorAll('[data-checkpoint-remove]').forEach(btn=>btn.onclick=()=>{parlayCheckpointLegKeys=parlayCheckpointLegKeys.filter(k=>k!==btn.dataset.checkpointRemove);renderParlayLab();});
    root.querySelectorAll('[data-checkpoint-add]').forEach(btn=>btn.onclick=()=>{if(parlayCheckpointLegKeys.length<8&&!parlayCheckpointLegKeys.includes(btn.dataset.checkpointAdd))parlayCheckpointLegKeys.push(btn.dataset.checkpointAdd);renderParlayLab();});
    root.querySelectorAll('[data-checkpoint-replace]').forEach(btn=>btn.onclick=()=>{const at=parlayCheckpointLegKeys.indexOf(btn.dataset.checkpointReplaceOld);if(at>=0)parlayCheckpointLegKeys[at]=btn.dataset.checkpointReplace;renderParlayLab();});
    root.querySelectorAll('[data-checkpoint-open]').forEach(btn=>btn.onclick=()=>window.open(btn.dataset.checkpointOpen,'_blank','noopener'));
  }

  function renderParlayLab(){
    const root=document.querySelector('[data-parlays-route]');
    if(currentRoute!=='parlays'||!root) return;
    if(parlayMode==='pregame'&&!propsFeedCache)return;
    root.querySelectorAll('[data-parlay-mode]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.parlayMode===parlayMode));
    const checkpointControls=root.querySelector('[data-parlay-checkpoint-controls]');
    const saveTools=root.querySelector('.parlay-save-tools');
    if(saveTools)saveTools.hidden=parlayMode!=='pregame';
    if(parlayMode!=='pregame'){
      renderCheckpointParlayLab(root);
      return;
    }
    if(checkpointControls)checkpointControls.hidden=true;
    fillParlayToTarget(parlayTarget);
    const rows=parlayLegRows();
    const sortedWeak=rows.filter(row=>Number.isFinite(Number(row?.model?.edgePct))).sort((a,b)=>Number(a.model?.edgePct)-Number(b.model?.edgePct));
    const weakest=sortedWeak[0]||null;
    const marketOnlyCount=rows.filter(row=>!Number.isFinite(Number(row?.model?.probabilityPct))).length;
    const newest=propsNewestTimestamp(parlayRows());
    const freshness=freshnessLabel(newest);
    const allBooks=new Set();
    parlayRows().forEach(row=>(row.books||[]).forEach(book=>{if(book?.book)allBooks.add(String(book.book))}));

    const status=root.querySelector('[data-parlay-status]');
    if(status) status.innerHTML='<div><span class="parlays-preview-dot"></span><b>REAL EXACT-SELECTION FEED</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="parlays-status-divider"></span><div><b>'+parlayRows().length+' EXACT</b><small>'+autoParlayRows().length+' modeled</small></div><span class="parlays-status-divider"></span><div><b>'+allBooks.size+' BOOKS</b><small>verified exact prices</small></div><span class="parlays-status-divider"></span><div><b>NO SUBSTITUTIONS</b><small>same line + side only</small></div>';

    const legs=root.querySelector('[data-parlay-legs]');
    if(legs) legs.innerHTML=rows.length ? rows.map((row,i)=>parlayLegMarkup(row,i,weakest?.key)).join('') : '<div class="live-board-loading"><div><b>No exact selections in the current build.</b><small>Add verified props from the Player Prop Tool. Model probabilities remain blank for market-only legs.</small></div></div>';
    const buildTitle=root.querySelector('[data-parlay-build-title]');
    if(buildTitle) buildTitle.textContent=rows.length+'-leg exact '+(marketOnlyCount?'selection':'model')+' parlay';

    root.querySelectorAll('[data-parlay-target]').forEach(btn=>btn.classList.toggle('is-active',Number(btn.dataset.parlayTarget)===parlayTarget));
    const saveNote=root.querySelector('[data-parlay-save-note]');
    if(saveNote)saveNote.textContent=rows.length&&!rows.every(row=>canSaveExactPick(row)||canSaveBinaryPick(row))
      ?'Some legs have no supported exact binary or Over/Under selection; nothing will be saved.'
      :'Saves exact Over/Under and YES/NO legs separately to Profile. No ticket is placed and no points are wagered.';

    const math=parlayCombinedMath(rows);
    const overlap=parlayOverlapInfo(rows);
    const coverage=parlayBookCoverage(rows);
    const bestCommon=coverage.find(x=>x.complete)||null;

    const legTotal=root.querySelector('[data-parlay-leg-total]');
    if(legTotal) legTotal.textContent=String(rows.length);
    const ring=root.querySelector('[data-parlay-ring]');
    if(ring){
      const completePct=rows.length?Math.round((rows.filter(row=>(row.books||[]).length>0).length/rows.length)*100):0;
      ring.style.background='conic-gradient(#7b5cff 0 '+completePct+'%,rgba(255,255,255,.07) '+completePct+'% 100%)';
    }
    const combinedPrice=root.querySelector('[data-parlay-combined-price]');
    if(combinedPrice) combinedPrice.textContent=bestCommon?americanPrice(bestCommon.combinedAmerican):'NO COMMON BOOK';
    const modelProb=root.querySelector('[data-parlay-model-prob]');
    if(modelProb) modelProb.textContent=Number.isFinite(math.modelPct)?pct1(math.modelPct):'—';
    const marketProb=root.querySelector('[data-parlay-market-prob]');
    if(marketProb) marketProb.textContent=Number.isFinite(math.marketPct)?pct1(math.marketPct):'—';
    const combinedEdge=root.querySelector('[data-parlay-combined-edge]');
    if(combinedEdge){
      combinedEdge.textContent=Number.isFinite(math.deltaPct)?edgeText(math.deltaPct):'—';
      combinedEdge.className=Number.isFinite(math.deltaPct)?(Number(math.deltaPct)>=0?'positive':'negative'):'';
    }

    const healthTitle=root.querySelector('[data-parlay-health-title]');
    const healthCopy=root.querySelector('[data-parlay-health-copy]');
    if(healthTitle) healthTitle.textContent=!rows.length?'No legs yet':marketOnlyCount?'Exact build · market-only leg'+(marketOnlyCount===1?'':'s'):overlap.hasOverlap?'Exact legs · review overlap':bestCommon?'Exact build ready':'Exact legs · split books';
    if(healthCopy) healthCopy.textContent=!rows.length?'Add exact selections from Player Props.':marketOnlyCount?marketOnlyCount+' leg'+(marketOnlyCount===1?' is':'s are')+' market-only, so TSO leaves combined model probability and model delta blank instead of inventing them.':overlap.hasOverlap?'Same-event or same-player overlap exists. Combined probability remains an unadjusted independent estimate.':bestCommon?'All legs exist exactly at '+bestCommon.name+'. Combined probability is still labeled as an independent-leg estimate.':'The legs are exact, but no single sportsbook currently carries every exact selection.';

    const checks=root.querySelector('[data-parlay-checks]');
    if(checks){
      const exactCount=rows.filter(row=>(row.books||[]).length>0).length;
      checks.innerHTML='<div class="'+(exactCount===rows.length&&rows.length?'is-good':'is-warn')+'"><span>'+(exactCount===rows.length&&rows.length?'✓':'!')+'</span><div><b>Exact lines verified</b><small>'+exactCount+'/'+rows.length+' legs have verified exact sportsbook selections.</small></div></div>'
        +'<div class="'+(overlap.hasOverlap?'is-warn':'is-good')+'"><span>'+(overlap.hasOverlap?'!':'✓')+'</span><div><b>Dependency check</b><small>'+(overlap.hasOverlap?(overlap.sameEventPairs+' same-event pair(s), '+overlap.samePlayerPairs+' same-player pair(s). Review correlation manually.'):'No same-event or same-player overlap detected. This is not a full correlation model.')+'</small></div></div>'
        +'<div class="'+(bestCommon?'is-good':'is-warn')+'"><span>'+(bestCommon?'✓':'!')+'</span><div><b>Common sportsbook</b><small>'+(bestCommon?bestCommon.name+' carries every exact leg at the displayed thresholds.':'No sportsbook in the feed currently carries every exact leg.')+'</small></div></div>'
        +(weakest?'<div class="is-warn"><span>↘</span><div><b>Weakest real edge</b><small>'+esc(weakest.player)+' '+esc(propSelectionText(weakest))+' · '+edgeText(weakest.model?.edgePct)+'</small></div></div>':'');
    }

    renderParlayReplacements(root,rows,weakest);
    renderParlaySuggestions(root,rows);
    renderParlayBooks(root,rows);
    bindParlayGeneratedActions();
  }

  function currentCommunityModelRows(){
    return sortPropsRows(allModeledRows().filter(row=>currentLeague==='all'||row.sport===currentLeague));
  }

  function communityPulseMarkup(row,index){
    const edge=Number(row?.model?.edgePct);
    return '<article class="post-card panel community-pulse-card" data-community-model-key="'+esc(row.key)+'">'
      +'<div class="post-head community-pulse-head"><span class="community-system-avatar">TSO</span><div><b>Outpost Model Pulse</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(ageText(row.snapshotTime))+' snapshot</small></div><span class="community-signal-rank">#'+String(index+1).padStart(2,'0')+'</span></div>'
      +'<p>'+esc(row.player)+' currently has one of the strongest exact model-to-market edges in the '+esc(currentLeague==='all'?'TSO board':leagueLabel(currentLeague)+' board')+'.</p>'
      +'<div class="shared-pick community-real-pick">'
        +'<span class="league-badge">'+esc(leagueLabel(row.sport))+'</span>'
        +'<div><b>'+esc(row.player)+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b><small>Model '+pct1(row.model?.probabilityPct)+' · Market '+pct1(row.impliedPct)+' · '+esc(row.book||'verified book')+'</small></div>'
        +'<strong class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
      +'</div>'
      +'<div class="community-pulse-meta"><span><small>BEST PRICE</small><b>'+esc(americanPrice(row.price))+'</b></span><span><small>MODEL SOURCE</small><b>'+esc(modelSourceText(row))+'</b></span><span><small>BOOKS</small><b>'+esc(row.bookCount||row.books?.length||1)+'</b></span></div>'
      +'<div class="post-actions community-pulse-actions"><button data-community-open-model>OPEN MODEL →</button><button data-community-open-prop>OPEN PROP BOARD →</button></div>'
    +'</article>';
  }

  function renderCommunity(){
    const root=document.querySelector('[data-community-route]');
    if(currentRoute!=='community'||!root||!propsFeedCache) return;
    const rows=currentCommunityModelRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const sports=new Set(rows.map(row=>row.sport));
    const status=root.querySelector('[data-community-status]');
    if(status){
      status.innerHTML='<div><span class="props-live-dot"></span><b>REAL OUTPOST MODEL PULSE</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' SIGNALS</b><small>exact model matches</small></div><span class="props-status-divider"></span><div><b>'+sports.size+' MODELED SPORTS</b><small>real feed only</small></div><span class="props-status-divider"></span><div><b>MEMBER POSTS OFFLINE</b><small>no simulated activity</small></div>';
    }
    const feed=root.querySelector('[data-community-feed]');
    if(feed){
      feed.innerHTML=rows.length
        ? rows.slice(0,6).map(communityPulseMarkup).join('')
        : '<div class="live-board-loading community-feed-loading panel"><div><b>No exact model signals for this filter.</b><small>TSO will not fill Community with fake member posts.</small></div></div>';
    }
    root.querySelectorAll('[data-community-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-community-open-prop]').forEach(btn=>btn.onclick=()=>setRoute('props'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function rankingsPodiumCard(row,rank){
    if(!row) return '';
    const edge=Number(row?.model?.edgePct);
    return '<article class="'+(rank===1?'winner':'')+'"><span>'+rank+'</span>'
      +propHeadshotMarkup(row,'rankings-podium-headshot')
      +'<b>'+esc(row.player)+'</b>'
      +'<small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</small>'
      +'<strong class="rankings-podium-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</strong>'
    +'</article>';
  }

  function renderLeaderboard(){
    const root=document.querySelector('[data-leaderboard-route]');
    if(currentRoute!=='leaderboard'||!root||!propsFeedCache) return;
    const rows=currentCommunityModelRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const status=root.querySelector('[data-rankings-status]');
    if(status){
      status.innerHTML='<div><span class="props-live-dot"></span><b>REAL MODEL RANKING</b><small>'+esc(freshness.label)+(newest?' · '+esc(ageText(newest))+' old':'')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' EXACT MATCHES</b><small>ranked by model edge</small></div><span class="props-status-divider"></span><div><b>USER STANDINGS OFFLINE</b><small>verified history required</small></div><span class="props-status-divider"></span><div><b>NO FAKE RECORDS</b><small>0 simulated users</small></div>';
    }

    const title=root.querySelector('[data-rankings-title]');
    if(title) title.textContent=rows.length?(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' exact model matches':'No modeled rows for this filter';

    const podium=root.querySelector('[data-rankings-podium]');
    if(podium){
      if(rows.length){
        const first=rows[0],second=rows[1],third=rows[2];
        podium.innerHTML=rankingsPodiumCard(second,2)+rankingsPodiumCard(first,1)+rankingsPodiumCard(third,3);
      }else{
        podium.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>No model ranking available for this filter.</b><small>User standings remain offline until real tracked-pick history exists.</small></div></div>';
      }
    }

    const board=root.querySelector('[data-rankings-board]');
    if(board){
      board.innerHTML=rows.length ? rows.slice(0,25).map((row,i)=>{
        const edge=Number(row?.model?.edgePct);
        return '<button class="leader-row rankings-model-row" data-rankings-open-model>'
          +'<b>'+String(i+1).padStart(2,'0')+'</b>'
          +'<span>'+propHeadshotMarkup(row,'rankings-row-headshot')+'<span><strong>'+esc(row.player)+'</strong><small>'+esc(row.marketLabel||row.market)+'</small></span></span>'
          +'<em>'+esc(leagueLabel(row.sport))+'</em>'
          +'<em>'+esc(propSelectionText(row))+'</em>'
          +'<strong>'+pct1(row.model?.probabilityPct)+'</strong>'
          +'<span class="rankings-edge '+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</span>'
        +'</button>';
      }).join('') : '<div class="live-board-loading"><div><b>No exact model rows for this filter.</b></div></div>';
    }
    root.querySelectorAll('[data-rankings-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    bindMediaFallbacks();
  }

  function profileRows(){
    return (propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function profileModelRows(){
    return sortPropsRows(profileRows().filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))));
  }

  function profileSignalMarkup(row,index){
    const edge=Number(row?.model?.edgePct);
    const tone=homeModelTone(row,index);
    return '<article class="profile-signal-card '+tone+'-card" data-profile-open-model>'
      +'<div class="concept-card-accent"></div>'
      +'<div class="profile-signal-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+esc(modelTagText(row))+'</b></div>'
      +'<div class="profile-signal-player">'+propHeadshotMarkup(row,'profile-signal-headshot')+'<div><h3>'+esc(row.player)+'</h3><small>'+esc(propSelectionText(row))+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div></div>'
      +'<div class="profile-signal-metrics"><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span></div>'
      +'<div class="profile-signal-footer"><span><small>BEST</small><b>'+esc(americanPrice(row.price))+' · '+esc(row.book||'—')+'</b></span><strong>OPEN MODEL →</strong></div>'
    +'</article>';
  }

  function refreshProfileActivity(force=false){
    const userId=String(window.TSO_AUTH?.user?.id||'');
    if(userId!==profileActivityOwnerId){
      profileActivityOwnerId=userId;profileActivitySnapshot=null;
      profileActivityFetchedAt=0;profileActivityRequest=null;profileActivityError='';
    }
    if(!userId||typeof window.TSO_AUTH?.loadProfileActivity!=='function')return null;
    if(profileActivityRequest)return profileActivityRequest;
    if(!force&&Date.now()-profileActivityFetchedAt<PROFILE_ACTIVITY_REFRESH_MS)return null;
    const request=Promise.resolve().then(()=>window.TSO_AUTH.loadProfileActivity());
    profileActivityRequest=request;
    request.then(data=>{
      if(String(window.TSO_AUTH?.user?.id||'')!==userId||data?.userId!==userId)return;
      profileActivitySnapshot=data;profileActivityFetchedAt=Date.now();profileActivityError='';
      if(currentRoute==='profile')renderProfile();
    }).catch(error=>{
      if(String(window.TSO_AUTH?.user?.id||'')!==userId)return;
      profileActivityFetchedAt=Date.now();
      profileActivityError=String(error?.message||'Account data unavailable');
      if(currentRoute==='profile')renderProfile();
    }).finally(()=>{if(profileActivityRequest===request)profileActivityRequest=null;});
    return request;
  }
  function profileSavedGroup(title,rows,kind){
    if(!Array.isArray(rows))return '<div class="profile-activity-group"><h3>'+esc(title)+'</h3><p>Source unavailable.</p></div>';
    const stamp=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?new Date(n).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Date unavailable';};
    return '<div class="profile-activity-group"><h3>'+esc(title)+' <small>'+rows.length+' RECENT</small></h3>'
      +(rows.length?'<div class="profile-activity-items">'+rows.map(r=>{
        const title=kind==='wager'?String(r.sport||'Sports').toUpperCase()+' point wager':
          kind==='pick'||kind==='binary'?String(r.player||'Saved player'):(r.player_name||'Saved player');
        const description=kind==='wager'?String(r.status||'Pending')+' · '+stamp(r.placed_at):
          kind==='pick'?[r.market,r.side,r.line].filter(v=>v!==null&&v!==undefined&&v!=='').join(' · '):
          kind==='binary'?[String(r.sport||'').toUpperCase(),r.market,String(r.selection||'').toUpperCase(),r.source_line?('LINE '+r.source_line):'NO THRESHOLD',r.sportsbook].filter(Boolean).join(' · '):
          [r.sport,r.team].filter(Boolean).join(' · ');
        const aside=kind==='wager'?(Number.isFinite(Number(r.stake))?Number(r.stake).toLocaleString()+' PTS':'—'):
          String(r.slate_date||stamp(r.created_at));
        return '<div class="profile-activity-item"><div><b>'+esc(title)+'</b><small>'+esc(description)+'</small></div><em>'+esc(aside)+'</em>'
          +(kind!=='wager'&&Number.isSafeInteger(Number(r.id))
            ?'<button type="button" class="profile-activity-remove" data-profile-remove-saved="'+(kind==='pick'?'picks':kind==='binary'?'tso2_saved_selections':'watchlist')+'" data-profile-remove-id="'+esc(r.id)+'" aria-label="Remove '+esc(title)+' from saved activity">REMOVE</button>':'')
          +'</div>';
      }).join('')+'</div>':'<p>No '+esc(title.toLowerCase())+' saved to this account yet.</p>')+'</div>';
  }
  function showProfileActivity(root,signedIn){
    const el=root.querySelector('[data-profile-activity]'),badge=root.querySelector('[data-profile-activity-badge]');
    const history=root.querySelector('[data-profile-history-ready]'),balance=root.querySelector('[data-profile-points-ready]');
    if(!el)return;
    const userId=String(window.TSO_AUTH?.user?.id||'');
    const data=signedIn&&profileActivitySnapshot?.userId===userId?profileActivitySnapshot:null;
    if(!signedIn){
      el.innerHTML='<span>◎</span><div><b>Sign in to view saved wagers, picks and watchlist.</b><small>Only your account records will appear.</small></div>';
      if(badge)badge.textContent='SIGN IN';if(history)history.textContent='SIGN IN';if(balance)balance.textContent='SIGN IN';
    }else if(profileActivityError){
      el.innerHTML='<span>!</span><div><b>Account activity unavailable.</b><small>'+esc(profileActivityError)+' · Try Refresh Data.</small></div>';
      if(badge)badge.textContent='RETRY';if(history)history.textContent='UNAVAILABLE';if(balance)balance.textContent='UNAVAILABLE';
    }else if(!data){
      el.innerHTML='<span>◌</span><div><b>Loading saved account history…</b><small>Checking your records securely.</small></div>';
      if(badge)badge.textContent='LOADING';if(history)history.textContent='CONNECTING';if(balance)balance.textContent='CONNECTING';
    }else{
      const points=data.points?.balance;
      const pointsText=points!==null&&points!==undefined&&Number.isFinite(Number(points))?Number(points).toLocaleString()+' POINTS':'No recorded balance';
      el.innerHTML='<div class="profile-activity-summary"><span>POINT BALANCE <strong>'+esc(pointsText)+'</strong></span>'
        +'<small>Existing Outpost records · 8 most recent per category · points have no cash value</small></div>'
        +'<div class="profile-activity-grid">'
        +profileSavedGroup('Point wagers',data.wagers,'wager')
        +profileSavedGroup('Saved picks',data.picks,'pick')
        +profileSavedGroup('YES / NO picks',data.binarySelections,'binary')
        +profileSavedGroup('Player watchlist',data.watchlist,'watch')+'</div>'
        +(data.issues?.length?'<p class="profile-activity-warning">Some records unavailable: '+esc(data.issues.join('; '))+'</p>':'');
      if(badge)badge.textContent=data.issues?.length?'PARTIAL':'CONNECTED';
      if(history)history.textContent=data.issues?.length?'PARTIAL':'CONNECTED';
      if(balance)balance.textContent=data.points===null?'UNAVAILABLE':pointsText;
    }
    el.classList.toggle('profile-activity-loaded',Boolean(data));
  }

  function renderProfile(){
    const root=document.querySelector('.profile-page[data-profile-route]');
    if(currentRoute!=='profile'||!root) return;

    const signedIn=Boolean(window.TSO_AUTH?.user);
    const handle=currentUserHandle()||'guest';
    const owner=isOwner();
    const initials=owner?'JT':handle.split(/[^a-z0-9]+/i).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'ME';
    const rows=profileRows();
    const modeled=profileModelRows();
    const books=new Set();
    rows.forEach(row=>(row.books||[{book:row.book}]).forEach(book=>{if(book?.book) books.add(String(book.book));}));
    const games=(liveFeedCache?.games||[]).filter(game=>currentLeague==='all'||game.league===currentLeague);
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);

    const avatar=root.querySelector('[data-profile-avatar]');
    if(avatar) avatar.textContent=initials;
    const role=root.querySelector('[data-profile-role]');
    if(role) role.textContent=!signedIn?'GUEST — NOT SIGNED IN':owner?'OWNER ACCOUNT':'MEMBER ACCOUNT';
    const handleNode=root.querySelector('[data-profile-handle]');
    if(handleNode) handleNode.textContent='@'+handle;
    const context=root.querySelector('[data-profile-context]');
    if(context) context.textContent=signedIn?(currentLeague==='all'?'All Sports':leagueLabel(currentLeague))+' context · account verified · linked saved history':'Guest access · sign in from the account menu to use your TSO account';

    const setText=(sel,value)=>{const node=root.querySelector(sel);if(node)node.textContent=value;};
    setText('[data-profile-props]',propsFeedCache?String(rows.length):'—');
    setText('[data-profile-models]',propsFeedCache?String(modeled.length):'—');
    setText('[data-profile-books]',propsFeedCache?String(books.size):'—');
    setText('[data-profile-games]',liveFeedCache?String(games.length):'—');
    showProfileActivity(root,signedIn);
    const account=signedIn&&profileActivitySnapshot?.userId===String(window.TSO_AUTH?.user?.id||'')?profileActivitySnapshot:null;
    const historyLabel=!signedIn?'SIGN IN FOR HISTORY':profileActivityError?'ACCOUNT DATA UNAVAILABLE':account?'SAVED HISTORY CONNECTED':'CONNECTING SAVED HISTORY';
    const pointsValue=account?.points?.balance;
    const pointsLabel=pointsValue!==null&&pointsValue!==undefined&&Number.isFinite(Number(pointsValue))?Number(pointsValue).toLocaleString()+' POINTS':'no invented points';

    const status=root.querySelector('[data-profile-status]');
    if(status){
      const feedLabel=propsFeedCache&&liveFeedCache?'SPORTS DATA CONNECTED':propsFeedCache?'PROP DATA CONNECTED':liveFeedCache?'SCORE DATA CONNECTED':'CONNECTING SPORTS DATA';
      status.innerHTML='<div><span class="props-live-dot"></span><b>'+feedLabel+'</b><small>'+(newest?esc(freshness.label)+' · '+esc(ageText(newest))+' old':'waiting for verified snapshots')+'</small></div><span class="props-status-divider"></span><div><b>'+rows.length+' VERIFIED PROPS</b><small>'+modeled.length+' exact model matches</small></div><span class="props-status-divider"></span><div><b>'+esc(historyLabel)+'</b><small>'+esc(pointsLabel)+'</small></div><span class="props-status-divider"></span><div><b>IN-APP NOTIFICATIONS ACTIVE</b><small>background push pending</small></div>';
    }

    const identityState=root.querySelector('[data-profile-identity-state]');
    if(identityState) identityState.textContent=signedIn?'VERIFIED':'SIGNED OUT';
    const feedState=root.querySelector('[data-profile-feed-state]');
    if(feedState){
      feedState.textContent=propsFeedCache&&liveFeedCache?'CONNECTED':propsFeedCache||liveFeedCache?'PARTIAL':'CONNECTING';
      feedState.classList.toggle('is-partial',Boolean((propsFeedCache||liveFeedCache)&&!(propsFeedCache&&liveFeedCache)));
    }

    const title=root.querySelector('[data-profile-signals-title]');
    if(title) title.textContent=modeled.length?(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · top current model edges':'No exact model signals for this filter';
    const signals=root.querySelector('[data-profile-signals]');
    if(signals){
      signals.innerHTML=modeled.length
        ? modeled.slice(0,3).map(profileSignalMarkup).join('')
        : '<div class="live-board-loading home-model-empty--wide"><div><b>No exact model signals for this filter.</b><small>This area does not substitute fake tracked picks.</small></div></div>';
    }
    root.querySelectorAll('[data-profile-open-model]').forEach(btn=>btn.onclick=()=>setRoute('models'));
    root.querySelectorAll('[data-route-jump]').forEach(btn=>{btn.onclick=()=>setRoute(btn.dataset.routeJump)});
    root.querySelectorAll('[data-profile-remove-saved]').forEach(btn=>btn.onclick=async()=>{
      if(!requireSignedInSave())return;
      const kind=String(btn.dataset.profileRemoveSaved||''),id=Number(btn.dataset.profileRemoveId);
      if(!['picks','watchlist','tso2_saved_selections'].includes(kind)||!Number.isSafeInteger(id)||id<=0)return;
      const owner=String(window.TSO_AUTH.user.id);
      btn.disabled=true;btn.textContent='REMOVING…';
      try{
        await window.TSO_AUTH.removeSavedActivity(kind,id);
        if(String(window.TSO_AUTH?.user?.id||'')!==owner)return;
        notify('Removed from Profile.');
        profileActivitySnapshot=null;
        profileActivityFetchedAt=0;
        renderProfile();
      }catch(error){
        btn.disabled=false;btn.textContent='REMOVE';
        notify('Could not remove item: '+String(error?.message||error));
      }
    });
    bindMediaFallbacks();
    void refreshProfileActivity(false);
  }

  function researchRowByKey(key){
    return (propsFeedCache?.rows||[]).find(row=>String(row.key)===String(key))||null;
  }

  function researchOpponentForRow(row){
    const team=String(row?.team||'').toUpperCase();
    const home=String(row?.homeTeam||'').toUpperCase();
    const away=String(row?.awayTeam||'').toUpperCase();
    if(team&&team===home)return row.awayTeam||'';
    if(team&&team===away)return row.homeTeam||'';
    return '';
  }

  function researchValue(value,digits=1,suffix=''){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    const out=digits===0?Math.round(n).toLocaleString():n.toFixed(digits).replace(/\.0$/,'');
    return out+suffix;
  }

  function researchRate(value,digits=1){
    const n=Number(value);
    return Number.isFinite(n)?researchValue(n,digits):'—';
  }

  function researchAge(value){
    return value?ageText(value)+' old':'timestamp unavailable';
  }

  function researchDetailMetric(label,value,note=''){
    return '<span><small>'+esc(label)+'</small><b>'+esc(value==null||value===''?'—':value)+'</b>'+(note?'<em>'+esc(note)+'</em>':'')+'</span>';
  }

  function nflRoleUsageVisual(p,last,snap){
    const avgPct=Number(snap?.avgOffensePct),lastPct=Number(snap?.lastOffensePct),avgSnaps=Number(snap?.avgOffenseSnaps);
    const targets=Number(last?.targets),carries=Number(last?.carries);
    const hasRing=Number.isFinite(avgPct);
    const targetValue=Number.isFinite(targets)?Math.max(0,targets):0;
    const carryValue=Number.isFinite(carries)?Math.max(0,carries):0;
    const opportunityTotal=targetValue+carryValue;
    const hasMix=opportunityTotal>0;
    if(!hasRing&&!hasMix)return '';
    const ringPct=hasRing?Math.max(0,Math.min(100,avgPct)):0;
    const targetPct=hasMix?targetValue/opportunityTotal*100:0;
    const carryPct=hasMix?carryValue/opportunityTotal*100:0;
    const roleCard=hasRing?'<div class="nfl-role-card"><div class="nfl-role-ring" style="--role-pct:'+ringPct.toFixed(1)+'%"><div><small>L5 AVG</small><strong>'+esc(researchValue(avgPct,1,'%'))+'</strong><span>SNAP SHARE</span></div></div><div class="nfl-role-notes">'
      +'<span><small>LAST GAME</small><b>'+esc(Number.isFinite(lastPct)?researchValue(lastPct,1,'%'):'—')+'</b></span>'
      +'<span><small>AVG SNAPS</small><b>'+esc(Number.isFinite(avgSnaps)?researchRate(avgSnaps):'—')+'</b></span>'
      +'<span><small>DEPTH</small><b>'+esc(p?.depth?.rank?('#'+p.depth.rank+' '+(p.depth.position||p.position||'')):(p?.depth?.position||p?.position||'—'))+'</b></span>'
      +'</div></div>':'';
    const mixCard=hasMix?'<div class="nfl-usage-mix-card"><div class="nfl-usage-mix-head"><div><small>L5 OPPORTUNITY MIX</small><b>Targets vs carries</b></div><span>'+esc(researchRate(opportunityTotal))+' combined / game</span></div>'
      +'<div class="nfl-usage-mix-track"><i class="is-target" style="width:'+targetPct.toFixed(1)+'%"></i><i class="is-carry" style="width:'+carryPct.toFixed(1)+'%"></i></div>'
      +'<div class="nfl-usage-mix-key"><span><i class="is-target"></i><b>TARGETS</b><small>'+esc(researchRate(targetValue))+' · '+targetPct.toFixed(0)+'%</small></span><span><i class="is-carry"></i><b>CARRIES</b><small>'+esc(researchRate(carryValue))+' · '+carryPct.toFixed(0)+'%</small></span></div>'
      +'<p>Mix is calculated only from verified L5 targets + carries; it is not presented as team usage share.</p></div>':'';
    return '<section class="research-detail-block nfl-role-visual"><div class="research-detail-block-head"><span>ROLE + USAGE VISUAL</span><b>Verified NFL workload context</b></div><div class="nfl-role-grid">'+roleCard+mixCard+'</div></section>';
  }

  function nflMatchupComparisonVisual(row,last,cur,allowed){
    const market=String(row?.market||'');
    const map={
      recYds:['RECEIVING YARDS','recYds'],
      rushYds:['RUSHING YARDS','rushYds'],
      passYds:['PASSING YARDS','passYds'],
      receptions:['RECEPTIONS','receptions'],
      passTds:['PASS TD','passTds'],
      atd:['TOUCHDOWNS','tds']
    };
    const spec=map[market];
    if(!spec)return '';
    const key=spec[1];
    const items=[
      {label:'L5 PLAYER AVG',value:Number(last?.[key]),note:'recent verified production'},
      {label:'SEASON AVG',value:Number(cur?.[key]),note:'current season / game'},
      {label:'OPP ALLOWED',value:Number(allowed?.[key]),note:'position group / game'},
      {label:'SPORTSBOOK LINE',value:Number(row?.line),note:'exact selected threshold'}
    ].filter(item=>Number.isFinite(item.value));
    if(items.length<2)return '';
    const max=Math.max(1,...items.map(item=>Math.max(0,item.value)));
    const bars=items.map(item=>{
      const width=Math.max(2,Math.min(100,Math.max(0,item.value)/max*100));
      const cls=item.label==='SPORTSBOOK LINE'?'is-line':item.label==='OPP ALLOWED'?'is-opponent':'is-player';
      return '<div class="nfl-matchup-bar-row '+cls+'"><div><small>'+esc(item.label)+'</small><b>'+esc(researchRate(item.value,market==='atd'||market==='passTds'?2:1))+'</b><em>'+esc(item.note)+'</em></div><span><i style="width:'+width.toFixed(1)+'%"></i></span></div>';
    }).join('');
    return '<section class="research-detail-block nfl-matchup-visual"><div class="research-detail-block-head"><span>PLAYER VS OPPONENT</span><b>'+esc(spec[0])+' · source-backed comparison</b></div><div class="nfl-matchup-bars">'+bars+'</div></section>';
  }

  function nflMatchupDriverVisual(p,row,last,cur,allowed,snap){
    const market=String(row?.market||'');
    const statMap={recYds:'recYds',rushYds:'rushYds',passYds:'passYds',receptions:'receptions',passTds:'passTds',atd:'tds'};
    const stat=statMap[market];
    const side=String(row?.side||'over').toLowerCase();
    const factors=[];
    const push=(label,detail,value,tone='neutral')=>{
      factors.push({label,detail,value,tone:['positive','negative','neutral','warning'].includes(tone)?tone:'neutral'});
    };
    const sideTone=delta=>{
      if(!Number.isFinite(delta)||Math.abs(delta)<0.01)return 'neutral';
      const supports=side==='under'?delta<0:delta>0;
      return supports?'positive':'negative';
    };

    const edge=Number(row?.model?.edgePct);
    if(Number.isFinite(edge)){
      push('MODEL VS MARKET','Exact selected side',edgeText(edge),edge>1?'positive':edge<-1?'negative':'neutral');
    }

    if(stat){
      const l5=Number(last?.[stat]),season=Number(cur?.[stat]);
      if(Number.isFinite(l5)&&Number.isFinite(season)){
        const delta=l5-season;
        push('RECENT FORM','L5 '+researchRate(l5,1)+' vs season '+researchRate(season,1),(delta>=0?'+':'')+researchRate(delta,1),sideTone(delta));
      }

      const opp=Number(allowed?.[stat]);
      if(Number.isFinite(opp)&&Number.isFinite(season)){
        const delta=opp-season;
        push('OPPONENT ALLOWANCE','Position group '+researchRate(opp,1)+' vs player season '+researchRate(season,1),(delta>=0?'+':'')+researchRate(delta,1),sideTone(delta));
      }
    }

    const lastSnap=Number(snap?.lastOffensePct),avgSnap=Number(snap?.avgOffensePct);
    if(Number.isFinite(lastSnap)&&Number.isFinite(avgSnap)){
      const delta=lastSnap-avgSnap;
      push('ROLE TREND','Last game '+researchValue(lastSnap,1,'%')+' vs L5 '+researchValue(avgSnap,1,'%'),(delta>=0?'+':'')+researchValue(delta,1,' pp'),sideTone(delta));
    }

    const depthRank=Number(p?.depth?.rank);
    if(Number.isFinite(depthRank)){
      push('DEPTH ROLE',p?.depth?.position||p?.position||'Current depth chart','#'+depthRank,depthRank===1?'positive':'neutral');
    }

    const injury=String(p?.injury?.status||p?.injury?.detail||'').trim();
    if(injury){
      push('AVAILABILITY','Current injury listing',injury,/out|doubt|question|injur/i.test(injury)?'warning':'neutral');
    }

    if(!factors.length)return '';
    const rows=factors.map(f=>'<div class="nfl-factor-row is-'+f.tone+'"><span class="nfl-factor-state">'+(f.tone==='positive'?'＋':f.tone==='negative'?'−':f.tone==='warning'?'!':'•')+'</span><div><small>'+esc(f.label)+'</small><b>'+esc(f.detail)+'</b></div><strong>'+esc(f.value)+'</strong></div>').join('');
    return '<section class="research-detail-block nfl-factor-visual"><div class="research-detail-block-head"><span>MATCHUP DRIVERS</span><b>Selected-side context · source-backed</b></div><div class="nfl-factor-ladder">'+rows+'</div><p>Driver states summarize verified context for the selected side. They are not presented as causal model weights or independent probabilities.</p></section>';
  }

  function renderModelDistribution(row,compact=false){
    const d=row?.model?.projection;
    if(!d||typeof d!=='object')return '';
    const mean=Number(d.mean),median=Number(d.median),p10=Number(d.p10),p25=Number(d.p25),p75=Number(d.p75),p90=Number(d.p90),line=Number(row?.line);
    if(![mean,median,p10,p25,p75,p90,line].every(Number.isFinite))return '';
    let lo=Math.min(0,p10,line),hi=Math.max(p90,line);
    const span=Math.max(1,hi-lo);
    lo=Math.max(0,lo-span*.08);hi=hi+span*.10;
    const pct=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
    const p10x=pct(p10),p90x=pct(p90),p25x=pct(p25),p75x=pct(p75),meanx=pct(mean),medianx=pct(median),linex=pct(line);
    const iterations=Number(row?.model?.iterations||0);
    const selectedProb=Number(row?.model?.probabilityPct);
    return '<section class="model-distribution '+(compact?'is-compact':'')+'">'
      +'<div class="model-distribution-head"><div><span>SIMULATION DISTRIBUTION</span><b>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b></div><small>'+esc(iterations?iterations.toLocaleString()+' simulations':'model distribution')+'</small></div>'
      +'<div class="model-distribution-summary">'
        +'<span><small>MODEL MEAN</small><b>'+esc(researchRate(mean,1))+'</b></span>'
        +'<span><small>MEDIAN</small><b>'+esc(researchRate(median,1))+'</b></span>'
        +'<span><small>P10 / P90</small><b>'+esc(researchRate(p10,1))+' / '+esc(researchRate(p90,1))+'</b></span>'
        +'<span><small>SELECTED SIDE</small><b>'+esc(Number.isFinite(selectedProb)?pct1(selectedProb):'—')+'</b></span>'
      +'</div>'
      +'<div class="model-distribution-axis">'
        +'<div class="model-distribution-track">'
          +'<i class="range-90" style="left:'+p10x.toFixed(2)+'%;width:'+(p90x-p10x).toFixed(2)+'%"></i>'
          +'<i class="range-50" style="left:'+p25x.toFixed(2)+'%;width:'+(p75x-p25x).toFixed(2)+'%"></i>'
          +'<span class="marker is-mean" style="left:'+meanx.toFixed(2)+'%"><em>MEAN</em></span>'
          +'<span class="marker is-median" style="left:'+medianx.toFixed(2)+'%"><em>MED</em></span>'
          +'<span class="marker is-line" style="left:'+linex.toFixed(2)+'%"><em>LINE '+esc(researchRate(line,1))+'</em></span>'
        +'</div>'
        +'<div class="model-distribution-labels"><span>'+esc(researchRate(lo,0))+'</span><span>P10 '+esc(researchRate(p10,1))+'</span><span>P25 '+esc(researchRate(p25,1))+'</span><span>P75 '+esc(researchRate(p75,1))+'</span><span>P90 '+esc(researchRate(p90,1))+'</span><span>'+esc(researchRate(hi,0))+'</span></div>'
      +'</div>'
      +'<p>The darker band is the middle 50% of simulated outcomes; the wider band spans P10–P90. The exact sportsbook threshold is overlaid as the LINE marker.</p>'
    +'</section>';
  }

  function nflResearchDetail(data,row){
    const p=data.player||{},last=p.last5?.avg||{},cur=p.currentSeason?.perGame||{},prev=p.previousSeason?.perGame||{};
    const snap=p.snapTrend||{},allowed=p.matchup?.previousSeasonAllowed?.perGame||{};
    const injury=p.injury?.status||p.injury?.detail||null;
    const metrics=[
      ['L5 TARGETS',researchRate(last.targets), 'per game'],
      ['L5 RECEPTIONS',researchRate(last.receptions),'per game'],
      ['L5 REC YDS',researchRate(last.recYds),'per game'],
      ['L5 CARRIES',researchRate(last.carries),'per game'],
      ['L5 RUSH YDS',researchRate(last.rushYds),'per game'],
      ['L5 PASS YDS',researchRate(last.passYds),'per game'],
      ['L5 TD',researchRate(last.tds,2),'per game'],
      ['SNAP SHARE',researchValue(snap.avgOffensePct,1,'%'),'L5 avg']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const season=[
      ['CUR TARGETS',researchRate(cur.targets),'per game'],
      ['CUR REC YDS',researchRate(cur.recYds),'per game'],
      ['CUR RUSH YDS',researchRate(cur.rushYds),'per game'],
      ['CUR PASS YDS',researchRate(cur.passYds),'per game'],
      ['PREV TARGETS',researchRate(prev.targets),'per game'],
      ['PREV REC YDS',researchRate(prev.recYds),'per game'],
      ['PREV RUSH YDS',researchRate(prev.rushYds),'per game'],
      ['PREV PASS YDS',researchRate(prev.passYds),'per game']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const matchup=[
      ['OPP YDS',researchRate(allowed.yards),'pos group / game'],
      ['OPP TARGETS',researchRate(allowed.targets),'pos group / game'],
      ['OPP REC YDS',researchRate(allowed.recYds),'pos group / game'],
      ['OPP RUSH YDS',researchRate(allowed.rushYds),'pos group / game'],
      ['OPP TD',researchRate(allowed.tds,2),'pos group / game'],
      ['LAST SNAP %',researchValue(snap.lastOffensePct,1,'%'),'offense'],
      ['AVG SNAPS',researchRate(snap.avgOffenseSnaps),'L5 offense'],
      ['DEPTH',p.depth?.rank?('#'+p.depth.rank+' '+(p.depth.position||p.position||'')):(p.depth?.position||p.position||'—'),'current']
    ].filter(x=>x[1]!=='—').slice(0,8);
    const games=(p.gameLog||[]).slice(0,8).map(g=>'<div class="research-detail-log-row"><span>'+esc(g.date||('W'+(g.week||'')))+'</span><b>'+esc((g.team||p.team||'')+' vs '+(g.opponent||'—'))+'</b><em>'+esc('TGT '+researchRate(g.targets)+' · REC '+researchRate(g.receptions)+' · '+researchRate(g.recYds,0)+' REC YD · '+researchRate(g.rushYds,0)+' RUSH YD')+'</em></div>').join('');
    const roleVisual=nflRoleUsageVisual(p,last,snap);
    const comparisonVisual=nflMatchupComparisonVisual(row,last,cur,allowed);
    const driverVisual=nflMatchupDriverVisual(p,row,last,cur,allowed,snap);
    return '<section class="research-detail-status"><span class="deep-source-chip">NFLVERSE + ESPN</span><b>'+esc(p.rosterStatus||'Roster status unavailable')+'</b><small>'+esc(injury?('Injury: '+injury):'No current injury status attached')+'</small></section>'
      +roleVisual
      +renderModelDistribution(row)
      +driverVisual
      +comparisonVisual
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>RECENT FORM</span><b>Last five verified games</b></div><div class="research-detail-metrics">'+metrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(season.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>SEASON PRODUCTION</span><b>Current + previous season</b></div><div class="research-detail-metrics">'+season.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(matchup.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>ROLE + MATCHUP</span><b>'+esc(p.opponent?('vs '+p.opponent):'Verified context')+'</b></div><div class="research-detail-metrics">'+matchup.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(games?'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME LOG</span><b>Most recent verified production</b></div><div class="research-detail-log">'+games+'</div></section>':'');
  }

  function nhlResearchSeriesFilter(series,row,view='all'){
    const normalized=String(view||'all').toLowerCase();
    if(normalized==='home')return series.filter(item=>String(item.homeAway||'').toLowerCase()==='home');
    if(normalized==='away')return series.filter(item=>String(item.homeAway||'').toLowerCase()==='away');
    if(normalized==='h2h'){
      const opponent=String(researchOpponentForRow(row)||'').toUpperCase();
      return opponent?series.filter(item=>String(item.opponent||'').toUpperCase()===opponent):[];
    }
    return series;
  }

  function renderNhlResearchChart(data,row,range='10',view='all'){
    const allSeries=propSeriesForRow(data,row);
    if(!allSeries.length||!Number.isFinite(Number(row?.line)))return '';
    const filtered=nhlResearchSeriesFilter(allSeries,row,view);
    const ranged=propChartRangeSeries(filtered,range);
    const stats=propWindowStats(ranged,row);
    const opponent=researchOpponentForRow(row);
    const h2hCount=opponent?allSeries.filter(item=>String(item.opponent||'').toUpperCase()===String(opponent).toUpperCase()).length:0;
    const controls=[
      ['all','ALL'],
      ['home','HOME'],
      ['away','AWAY'],
      ...(h2hCount?[['h2h','H2H '+h2hCount]]:[])
    ];
    const venueControls=controls.map(([key,label])=>'<button type="button" data-nhl-chart-view="'+key+'" class="'+(String(view)===key?'is-active':'')+'">'+esc(label)+'</button>').join('');
    const summary=stats&&ranged.length
      ?'<div class="nhl-chart-summary"><span><small>AVG</small><b>'+esc(researchRate(stats.avg,1))+'</b></span><span><small>HITS</small><b>'+stats.hits+'/'+(stats.hits+stats.losses)+'</b></span><span><small>GAMES</small><b>'+stats.games+'</b></span></div>'
      :'';
    const chart=filtered.length
      ?renderPropRecentChart(filtered,row,range)
      :'<div class="prop-intel-empty nhl-chart-empty"><b>No verified '+esc(String(view).toUpperCase())+' sample.</b><small>TSO will not backfill this filter with unrelated games.</small></div>';
    return '<section class="research-detail-block nhl-performance-visual" data-nhl-performance-chart>'
      +'<div class="research-detail-block-head nhl-performance-head"><div><span>EXACT-LINE PERFORMANCE</span><b>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b></div><div class="nhl-chart-view-tabs">'+venueControls+'</div></div>'
      +summary+chart
      +'</section>';
  }

  function bindNhlResearchChart(node,data,row,state={range:'10',view:'all'}){
    if(!node)return;
    node.querySelectorAll('[data-props-chart-range]').forEach(btn=>btn.addEventListener('click',()=>{
      state.range=String(btn.dataset.propsChartRange||'10');
      node.outerHTML=renderNhlResearchChart(data,row,state.range,state.view);
      const replacement=document.querySelector('.research-detail-content [data-nhl-performance-chart]');
      bindNhlResearchChart(replacement,data,row,state);
    }));
    node.querySelectorAll('[data-nhl-chart-view]').forEach(btn=>btn.addEventListener('click',()=>{
      state.view=String(btn.dataset.nhlChartView||'all');
      node.outerHTML=renderNhlResearchChart(data,row,state.range,state.view);
      const replacement=document.querySelector('.research-detail-content [data-nhl-performance-chart]');
      bindNhlResearchChart(replacement,data,row,state);
    }));
  }

  function nhlWindow(rows,count,key){
    const vals=(rows||[]).slice(0,count).map(g=>Number(g?.stats?.[key])).filter(Number.isFinite);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  }

  function nhlMatchupDriverVisual(data,row){
    const p=data?.player||{},games=p.recentGames||[],rates=p.rates||{},d=data?.opponentDefense||{};
    const market=String(row?.market||'');
    const side=String(row?.side||'over').toLowerCase();
    const statMap={sog:'sog',goals:'goals',atg:'goals',fgs:'goals',assists:'assists',points:'points',blocks:'blocks',saves:'saves'};
    const stat=statMap[market];
    const indexMap={sog:'recent10ShotPaceIndex',goals:'recent10OverallIndex',atg:'recent10OverallIndex',fgs:'recent10OverallIndex',assists:'recent10OverallIndex',points:'recent10OverallIndex',blocks:'recent10ShotPaceIndex',saves:'recent10OffenseIndex'};
    const factors=[];
    const push=(label,detail,value,tone='neutral')=>factors.push({label,detail,value,tone});
    const sideTone=delta=>{
      if(!Number.isFinite(delta)||Math.abs(delta)<.01)return 'neutral';
      const supports=side==='under'?delta<0:delta>0;
      return supports?'positive':'negative';
    };

    const edge=Number(row?.model?.edgePct);
    if(Number.isFinite(edge))push('MODEL VS MARKET','Exact selected side',edgeText(edge),edge>1?'positive':edge<-1?'negative':'neutral');

    if(stat){
      const l5=nhlWindow(games,5,stat),season=Number(rates?.[stat]);
      if(Number.isFinite(l5)&&Number.isFinite(season)){
        const delta=l5-season;
        push('RECENT FORM','L5 '+researchRate(l5,2)+' vs season '+researchRate(season,2),(delta>=0?'+':'')+researchRate(delta,2),sideTone(delta));
      }
    }

    const indexKey=indexMap[market];
    const oppIndex=Number(indexKey?d?.[indexKey]:null);
    if(Number.isFinite(oppIndex)){
      const delta=oppIndex-1;
      const label=market==='saves'?'OPPONENT OFFENSE':(market==='sog'||market==='blocks'?'SHOT ENVIRONMENT':'OPPONENT DEFENSE');
      push(label,'Opponent index · 1.00 = league average',researchRate(oppIndex,2),sideTone(delta));
    }

    const shotsAllowed=Number(d?.recent10ShotsAllowedPerGame);
    if(Number.isFinite(shotsAllowed)&&(market==='sog'||market==='blocks'||market==='saves')){
      push('SHOT VOLUME','Opponent recent 10 allowed',researchRate(shotsAllowed,1)+' / game','neutral');
    }

    const goalsAllowed=Number(d?.recent10GoalsAllowedPerGame);
    if(Number.isFinite(goalsAllowed)&&(market==='goals'||market==='atg'||market==='fgs'||market==='points')){
      push('GOAL ENVIRONMENT','Opponent recent 10 allowed',researchRate(goalsAllowed,2)+' / game','neutral');
    }

    if(!factors.length)return '';
    const rows=factors.map(f=>'<div class="nfl-factor-row is-'+esc(f.tone)+'"><span class="nfl-factor-state">'+(f.tone==='positive'?'＋':f.tone==='negative'?'−':'•')+'</span><div><small>'+esc(f.label)+'</small><b>'+esc(f.detail)+'</b></div><strong>'+esc(f.value)+'</strong></div>').join('');
    return '<section class="research-detail-block nfl-factor-visual nhl-factor-visual"><div class="research-detail-block-head"><span>MATCHUP DRIVERS</span><b>Selected-side context · source-backed</b></div><div class="nfl-factor-ladder">'+rows+'</div><p>Driver states summarize verified recent form and opponent context for the selected side. They are not causal model weights or standalone probabilities.</p></section>';
  }

  function nhlResearchDetail(data,row){
    const p=data.player||{},games=p.recentGames||[],rates=p.rates||{},d=data.opponentDefense||{};
    const metrics=[
      ['L5 SOG',researchRate(nhlWindow(games,5,'sog')),'per game'],
      ['L10 SOG',researchRate(nhlWindow(games,10,'sog')),'per game'],
      ['L30 SOG',researchRate(nhlWindow(games,30,'sog')),'per game'],
      ['L5 GOALS',researchRate(nhlWindow(games,5,'goals'),2),'per game'],
      ['L10 GOALS',researchRate(nhlWindow(games,10,'goals'),2),'per game'],
      ['L10 POINTS',researchRate(nhlWindow(games,10,'points'),2),'per game'],
      ['SEASON SOG',researchRate(rates.sog),'per game'],
      ['SHOOTING %',Number.isFinite(Number(p.shootingPct))?researchValue(Number(p.shootingPct)*100,1,'%'):'—','regressed rate']
    ].filter(x=>x[1]!=='—');
    const defense=[
      ['OPP GA',researchRate(d.recent10GoalsAllowedPerGame),'recent 10 / game'],
      ['OPP SHOTS',researchRate(d.recent10ShotsAllowedPerGame),'recent 10 / game'],
      ['GOAL INDEX',researchRate(d.recent10OverallIndex,2),'1.00 = league avg'],
      ['SHOT INDEX',researchRate(d.recent10ShotPaceIndex,2),'1.00 = league avg'],
      ['PP INDEX',researchRate(d.ppIndex,2),'1.00 = league avg'],
      ['OPP OFFENSE',researchRate(d.recent10OffenseIndex,2),'1.00 = league avg']
    ].filter(x=>x[1]!=='—');
    const logs=games.slice(0,10).map(g=>'<div class="research-detail-log-row"><span>'+esc(String(g.date||'').slice(0,10))+'</span><b>'+esc((g.team||'')+' '+(g.homeAway==='away'?'@':'vs')+' '+(g.opponent||'—'))+'</b><em>'+esc('SOG '+researchRate(g.stats?.sog,0)+' · G '+researchRate(g.stats?.goals,0)+' · A '+researchRate(g.stats?.assists,0)+' · PTS '+researchRate(g.stats?.points,0)+(g.firstGoal?' · FIRST GOAL':''))+'</em></div>').join('');
    const performanceVisual=renderNhlResearchChart(data,row);
    const driverVisual=nhlMatchupDriverVisual(data,row);
    return '<section class="research-detail-status"><span class="deep-source-chip">ESPN VERIFIED HISTORY</span><b>'+esc(games.length+' recent game'+(games.length===1?'':'s')+' loaded')+'</b><small>'+esc('Research snapshot '+researchAge(data.generatedAt))+'</small></section>'
      +performanceVisual
      +driverVisual
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>FORM WINDOWS</span><b>L5 · L10 · L30</b></div><div class="research-detail-metrics">'+metrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(defense.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>OPPONENT DEFENSE</span><b>'+esc(p.opponent||researchOpponentForRow(row)||'Current matchup')+'</b></div><div class="research-detail-metrics">'+defense.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(logs?'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME LOG</span><b>Verified box-score history</b></div><div class="research-detail-log">'+logs+'</div></section>':'');
  }

  function renderMlbResearchChart(data,row,range='10'){
    const series=propSeriesForRow(data,row);
    if(!series.length||!Number.isFinite(Number(row?.line)))return '';
    const selected=propChartRangeSeries(series,range);
    const stats=propWindowStats(selected,row);
    const summary=stats&&selected.length
      ?'<div class="mlb-chart-summary"><span><small>AVG</small><b>'+esc(researchRate(stats.avg,1))+'</b></span><span><small>HITS</small><b>'+stats.hits+'/'+(stats.hits+stats.losses)+'</b></span><span><small>GAMES</small><b>'+stats.games+'</b></span></div>'
      :'';
    return '<section class="research-detail-block mlb-performance-visual" data-mlb-performance-chart>'
      +'<div class="research-detail-block-head"><span>EXACT-LINE PERFORMANCE</span><b>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b></div>'
      +summary+renderPropRecentChart(series,row,range)
      +'</section>';
  }

  function bindMlbResearchChart(node,data,row,state={range:'10'}){
    if(!node)return;
    node.querySelectorAll('[data-props-chart-range]').forEach(btn=>btn.addEventListener('click',()=>{
      state.range=String(btn.dataset.propsChartRange||'10');
      node.outerHTML=renderMlbResearchChart(data,row,state.range);
      const replacement=document.querySelector('.research-detail-content [data-mlb-performance-chart]');
      bindMlbResearchChart(replacement,data,row,state);
    }));
  }

  function renderMlbBvpVisual(p,pitcher){
    const bvp=p?.vsPitcher||{};
    const pa=Number(bvp.pa);
    const avg=Number(bvp.avg),obp=Number(bvp.obp),slg=Number(bvp.slg);
    const rates=[
      ['AVG',avg,1],
      ['OBP',obp,1],
      ['SLG',slg,1.5]
    ].filter(item=>Number.isFinite(item[1]));
    const hasCounts=[bvp.h,bvp.hr,bvp.pa].some(value=>Number.isFinite(Number(value)));
    if(!rates.length&&!hasCounts)return '';
    const sampleLabel=Number.isFinite(pa)?(pa<10?'SMALL SAMPLE':pa<20?'LIMITED SAMPLE':'ESTABLISHED SAMPLE'):'SAMPLE SIZE UNKNOWN';
    const sampleTone=Number.isFinite(pa)&&pa>=20?'is-strong':Number.isFinite(pa)&&pa>=10?'is-mid':'is-small';
    const bars=rates.map(([label,value,ceiling])=>{
      const width=Math.max(2,Math.min(100,Math.max(0,value)/ceiling*100));
      return '<div class="mlb-bvp-rate"><div><small>'+label+'</small><b>'+esc(researchRate(value,3))+'</b></div><span><i style="width:'+width.toFixed(1)+'%"></i></span></div>';
    }).join('');
    return '<section class="research-detail-block mlb-bvp-visual"><div class="research-detail-block-head"><span>BATTER VS STARTER</span><b>'+esc(pitcher?.name||'Probable starter')+(pitcher?.throws?' · throws '+esc(pitcher.throws):'')+'</b></div>'
      +'<div class="mlb-bvp-sample '+sampleTone+'"><div><small>BvP SAMPLE</small><b>'+esc(Number.isFinite(pa)?String(Math.round(pa))+' PA':'PA unavailable')+'</b></div><strong>'+sampleLabel+'</strong><p>Head-to-head history is context only; small samples are never promoted as a standalone prediction.</p></div>'
      +'<div class="mlb-bvp-body"><div class="mlb-bvp-counts">'
        +'<span><small>HITS</small><b>'+esc(Number.isFinite(Number(bvp.h))?researchRate(bvp.h,0):'—')+'</b></span>'
        +'<span><small>HR</small><b>'+esc(Number.isFinite(Number(bvp.hr))?researchRate(bvp.hr,0):'—')+'</b></span>'
        +'<span><small>PA</small><b>'+esc(Number.isFinite(pa)?researchRate(pa,0):'—')+'</b></span>'
      +'</div><div class="mlb-bvp-rates">'+bars+'</div></div></section>';
  }

  function mlbNumber(value){
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function mlbMetricValue(value,digits=1,suffix=''){
    return Number.isFinite(Number(value))?researchValue(Number(value),digits,suffix):'—';
  }

  function mlbPercentileTone(value){
    const n=mlbNumber(value);
    if(n===null)return '';
    if(n>=80)return 'is-elite';
    if(n>=60)return 'is-strong';
    if(n<=20)return 'is-low';
    if(n<=40)return 'is-soft';
    return 'is-mid';
  }

  function renderMlbStatcastProfile(p){
    const sc=p?.statcast||{},l5=p?.statcastL5||{},l10=p?.statcastL10||{};
    const percentiles=[
      ['BARREL',sc.barrelPctile],
      ['EXIT VELO',sc.exitVeloPctile],
      ['xwOBA',sc.xwobaPctile]
    ].filter(([,value])=>mlbNumber(value)!==null);
    const pctMarkup=percentiles.map(([label,value])=>{
      const pct=Math.max(0,Math.min(100,Number(value)));
      return '<div class="mlb-statcast-percentile '+mlbPercentileTone(pct)+'"><div><small>'+esc(label)+' PERCENTILE</small><b>'+esc(researchRate(pct,0))+'</b></div><span><i style="width:'+pct.toFixed(1)+'%"></i></span></div>';
    }).join('');

    const rows=[
      ['BARREL %','barrelPct',1,'%'],
      ['EXIT VELO','exitVelo',1,' mph'],
      ['HARD HIT','hardHitPct',1,'%'],
      ['xwOBA','xwoba',3,''],
      ['xSLG','xslg',3,''],
      ['LAUNCH ANGLE','launchAngle',1,'°']
    ].map(([label,key,digits,suffix])=>{
      const values=[sc[key],l10[key],l5[key]];
      if(!values.some(v=>mlbNumber(v)!==null))return '';
      return '<div class="mlb-statcast-window-row"><b>'+esc(label)+'</b>'
        +'<span><small>SEASON</small><strong>'+esc(mlbMetricValue(sc[key],digits,suffix))+'</strong></span>'
        +'<span><small>L10</small><strong>'+esc(mlbMetricValue(l10[key],digits,suffix))+'</strong></span>'
        +'<span><small>L5</small><strong>'+esc(mlbMetricValue(l5[key],digits,suffix))+'</strong></span>'
        +'</div>';
    }).join('');

    const maxEv=mlbNumber(sc.maxExitVelo);
    const bbe=mlbNumber(sc.bbe);
    if(!pctMarkup&&!rows&&!Number.isFinite(maxEv)&&!Number.isFinite(bbe))return '';
    return '<section class="research-detail-block mlb-statcast-profile">'
      +'<div class="research-detail-block-head"><span>STATCAST PROFILE</span><b>Season baseline + verified recent windows</b></div>'
      +'<div class="mlb-statcast-profile-body">'
        +(pctMarkup?'<div class="mlb-statcast-percentiles">'+pctMarkup+'</div>':'')
        +(rows?'<div class="mlb-statcast-window"><div class="mlb-statcast-window-head"><span>CONTACT QUALITY</span><span>SEASON</span><span>L10</span><span>L5</span></div>'+rows+'</div>':'')
      +'</div>'
      +((maxEv!==null||bbe!==null)?'<div class="mlb-statcast-foot"><span><small>MAX EV</small><b>'+esc(maxEv!==null?researchValue(maxEv,1,' mph'):'—')+'</b></span><span><small>SEASON BBE</small><b>'+esc(bbe!==null?researchRate(bbe,0):'—')+'</b></span><em>Recent windows are sample-gated by the Statcast enrichment job.</em></div>':'')
      +'</section>';
  }

  function mlbPitchDisplayName(code,name){
    const labels={FF:'4-Seam Fastball',SI:'Sinker',SL:'Slider',FC:'Cutter',CH:'Changeup',CU:'Curveball',KC:'Knuckle Curve',ST:'Sweeper',FS:'Splitter',SV:'Slurve'};
    return name||labels[String(code||'').toUpperCase()]||code||'Pitch';
  }

  function renderMlbPitchMatchup(p,pitcher){
    const seen=p?.detail?.pitchTypes||{};
    const arsenal=Array.isArray(pitcher?.arsenal)?pitcher.arsenal.filter(x=>x&&mlbNumber(x.usagePct)!==null):[];
    let rows=[];
    let sourceLabel='';
    if(arsenal.length){
      rows=arsenal.slice(0,7).map(a=>({
        code:String(a.code||'').toUpperCase(),
        name:mlbPitchDisplayName(a.code,a.type),
        share:mlbNumber(a.usagePct),
        speed:mlbNumber(a.avgSpeed),
        batter:seen[String(a.code||'').toUpperCase()]||null,
        pitcher:true
      }));
      sourceLabel='Starter arsenal + batter results';
    }else{
      const entries=Object.entries(seen).map(([code,v])=>({code:String(code).toUpperCase(),v:v||{}})).sort((a,b)=>Number(b.v.seen||0)-Number(a.v.seen||0)).slice(0,7);
      const total=entries.reduce((sum,x)=>sum+Math.max(0,Number(x.v.seen)||0),0);
      rows=entries.map(x=>({
        code:x.code,name:mlbPitchDisplayName(x.code),share:total?100*(Number(x.v.seen)||0)/total:0,speed:null,batter:x.v,pitcher:false
      }));
      sourceLabel='Batter recent pitch-type sample';
    }
    if(!rows.length)return '';

    const markup=rows.map(item=>{
      const b=item.batter||{};
      const share=Math.max(0,Math.min(100,Number(item.share)||0));
      const seenCount=mlbNumber(b.seen);
      return '<div class="mlb-pitch-match-row">'
        +'<div class="mlb-pitch-match-name"><strong>'+esc(item.code||'—')+'</strong><span><b>'+esc(item.name)+'</b><small>'+(item.pitcher?'STARTER USAGE':'RECENT SHARE')+' · '+esc(researchValue(share,1,'%'))+(item.speed!==null?' · '+esc(researchValue(item.speed,1,' mph')):'')+'</small></span></div>'
        +'<div class="mlb-pitch-match-bar"><i style="width:'+share.toFixed(1)+'%"></i></div>'
        +'<div class="mlb-pitch-match-stats">'
          +'<span><small>SEEN</small><b>'+esc(seenCount!==null?researchRate(seenCount,0):'—')+'</b></span>'
          +'<span><small>AVG</small><b>'+esc(mlbMetricValue(b.avg,3,''))+'</b></span>'
          +'<span><small>EV</small><b>'+esc(mlbMetricValue(b.ev,1,''))+'</b></span>'
          +'<span><small>WHIFF</small><b>'+esc(mlbMetricValue(b.whiffPct,1,'%'))+'</b></span>'
          +'<span><small>HR</small><b>'+esc(mlbMetricValue(b.hr,0,''))+'</b></span>'
        +'</div>'
      +'</div>';
    }).join('');

    return '<section class="research-detail-block mlb-pitch-matchup">'
      +'<div class="research-detail-block-head"><span>PITCH MIX MATCHUP</span><b>'+esc(pitcher?.name||'Current starter')+' · '+esc(sourceLabel)+'</b></div>'
      +'<div class="mlb-pitch-match-list">'+markup+'</div>'
      +'<div class="mlb-module-source">Starter usage comes from MLB Stats API pitch arsenal when available. Batter results come from the recent Savant pitch-level window.</div>'
      +'</section>';
  }

  function mlbEffectiveBatterSide(p,pitcher){
    const bats=String(p?.bats||'').toUpperCase();
    const throws=String(pitcher?.throws||'').toUpperCase();
    if(bats==='S')return throws==='R'?'L':throws==='L'?'R':null;
    return bats==='L'||bats==='R'?bats:null;
  }

  const MLB_APPROVED_FIELD_SRC='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/field-bg.jpg';

  function mlbFieldSprayAngle(pt){
    const direct=mlbNumber(pt?.sprayAngle);
    if(direct!==null)return Math.max(-Math.PI/4.05,Math.min(Math.PI/4.05,direct));
    const x=mlbNumber(pt?.coordX),y=mlbNumber(pt?.coordY);
    if(x===null||y===null)return null;
    const dx=x-125,forward=199-y;
    if(Math.abs(dx)<=1&&Math.abs(forward)<=1)return null;
    return Math.max(-Math.PI/4.05,Math.min(Math.PI/4.05,Math.atan2(dx,Math.max(1,forward))));
  }

  function mlbFieldTrajectoryGeometry(pt){
    const distance=mlbNumber(pt?.dist);
    if(distance===null||distance<=0)return null;
    const home=[50,88.5],flightFrom=[50,86];
    const maxSpray=Math.PI/4.05;
    const rawAngle=mlbFieldSprayAngle(pt);
    const depthOnly=rawAngle===null;
    const angle=rawAngle??0;
    const t=Math.abs(angle)/maxSpray;
    const wall=angle<0
      ?[50+(12.5-50)*t,18.5+(28-18.5)*t]
      :[50+(87.5-50)*t,18.5+(28-18.5)*t];
    const fence=400+(330-400)*t;
    const result=String(pt?.result||'').toLowerCase();
    const isHr=result==='home_run';
    let scale=distance/fence;
    scale=isHr?Math.max(1.025,Math.min(1.16,scale)):Math.max(.08,Math.min(.985,scale));
    const to=[home[0]+(wall[0]-home[0])*scale,home[1]+(wall[1]-home[1])*scale];
    const la=mlbNumber(pt?.la);
    const ground=la!==null&&la<5;
    const flight=Math.hypot(to[0]-flightFrom[0],to[1]-flightFrom[1]);
    const rise=ground
      ?Math.max(1.5,Math.min(5,1.5+Math.max(0,la||0)*.12))
      :Math.max(8,Math.min(30,7+Math.max(0,la??20)*.42+flight*.035));
    const control=[(flightFrom[0]+to[0])/2,Math.max(3,Math.min(flightFrom[1],to[1])-rise)];
    return {
      from:flightFrom,to,control,depthOnly,isHr,
      d:'M '+flightFrom[0].toFixed(2)+' '+flightFrom[1].toFixed(2)+' Q '+control[0].toFixed(2)+' '+control[1].toFixed(2)+' '+to[0].toFixed(2)+' '+to[1].toFixed(2)
    };
  }

  function mlbZoneInsetData(p,pitcher){
    const detail=p?.detail||{};
    const comparison=detail.zoneComparison||{};
    const throws=String(pitcher?.throws||'').toUpperCase();
    const batterSplit=throws==='R'?'vsRHP':throws==='L'?'vsLHP':'all';
    const batterGroup=comparison[batterSplit]||comparison.all||null;
    const effectiveSide=mlbEffectiveBatterSide(p,pitcher);
    const zoneProfile=pitcher?.zoneProfile||{};
    const pitcherSplit=effectiveSide==='L'?'vsLHB':effectiveSide==='R'?'vsRHB':'all';
    const pitcherGroup=zoneProfile[pitcherSplit]||zoneProfile.all||null;
    const baseline=batterGroup?.baseline||{};
    const rawZones=detail.zones||{};
    const metricKey=mlbNumber(baseline.barrelPct)!==null?'barrelPct':mlbNumber(baseline.hardHitPct)!==null?'hardHitPct':mlbNumber(baseline.contactPct)!==null?'contactPct':null;
    const metricLabel=metricKey==='barrelPct'?'BARREL':metricKey==='hardHitPct'?'HARD HIT':metricKey==='contactPct'?'CONTACT':'AVG';
    const metricBaseline=metricKey?mlbNumber(baseline[metricKey]):null;
    const topZones=new Set((pitcherGroup?.topZones||[]).map(Number));
    const cells=Array.from({length:9},(_,i)=>i+1).map(zone=>{
      const batterZone=batterGroup?.zones?.[zone]||batterGroup?.zones?.[String(zone)]||null;
      const raw=rawZones?.[zone]||rawZones?.[String(zone)]||{};
      const pitcherZone=pitcherGroup?.zones?.[zone]||pitcherGroup?.zones?.[String(zone)]||{};
      const usage=mlbNumber(pitcherZone.usagePct);
      const value=metricKey?mlbNumber(batterZone?.[metricKey]):mlbNumber(raw.avg);
      const delta=value!==null&&metricBaseline!==null?value-metricBaseline:null;
      const threshold=metricKey==='contactPct'?5:2;
      const tone=delta===null?'':delta>=threshold?'is-hot':delta<=-threshold?'is-cold':'is-neutral';
      return {zone,usage,value,delta,tone,top:topZones.has(zone)};
    });
    return {throws,effectiveSide,pitcherGroup,metricKey,metricLabel,metricBaseline,cells};
  }

  function renderMlbFieldTrajectoryVisual(p,pitcher){
    const points=(p?.detail?.battedBalls||[])
      .filter(pt=>mlbNumber(pt?.dist)!==null&&mlbNumber(pt?.ev)!==null&&mlbNumber(pt?.la)!==null)
      .slice(-24)
      .reverse();
    const geoms=points.map(pt=>({pt,g:mlbFieldTrajectoryGeometry(pt)})).filter(x=>x.g);
    const zone=mlbZoneInsetData(p,pitcher);
    const hasZone=zone.cells.some(c=>c.value!==null||c.usage!==null);
    if(!geoms.length&&!hasZone)return '';

    const directional=geoms.filter(x=>!x.g.depthOnly);
    const latest=geoms[0]||null;
    const ghost=(directional.length?directional:geoms.slice(0,1)).slice(1,10).map(({pt,g})=>{
      const result=String(pt.result||'').toLowerCase();
      const cls=result==='home_run'?'is-hr':['single','double','triple'].includes(result)?'is-hit':'is-out';
      return '<path class="mlb-field-history-path '+cls+'" d="'+g.d+'"></path><circle class="mlb-field-history-dot '+cls+'" cx="'+g.to[0].toFixed(2)+'" cy="'+g.to[1].toFixed(2)+'" r=".72"></circle>';
    }).join('');

    const primary=latest?(()=>{
      const {pt,g}=latest;
      const title=[pt.date,pt.result,researchValue(pt.ev,1,' mph'),researchValue(pt.la,1,'°'),researchValue(pt.dist,0,' ft')].filter(Boolean).join(' · ');
      return '<path class="mlb-field-primary-glow" pathLength="1" d="'+g.d+'"></path>'
        +'<path class="mlb-field-primary-path" pathLength="1" d="'+g.d+'"><title>'+esc(title)+'</title></path>'
        +'<circle class="mlb-field-landing" cx="'+g.to[0].toFixed(2)+'" cy="'+g.to[1].toFixed(2)+'" r="1.0"></circle>'
        +'<circle class="mlb-field-flight-ball" r=".78"><animateMotion dur="2.8s" repeatCount="indefinite" path="'+g.d+'"></animateMotion></circle>';
    })():'';

    const zoneCells=zone.cells.map(c=>{
      const val=c.value===null?'—':zone.metricKey?researchValue(c.value,1,'%'):researchRate(c.value,3);
      const usage=c.usage===null?'':researchValue(c.usage,0,'%');
      return '<span class="'+c.tone+(c.top?' is-top':'')+'"><small>Z'+c.zone+'</small><b>'+esc(val)+'</b><em>'+esc(usage)+'</em></span>';
    }).join('');

    const avgEv=geoms.length?geoms.reduce((sum,x)=>sum+Number(x.pt.ev),0)/geoms.length:null;
    const avgLa=geoms.length?geoms.reduce((sum,x)=>sum+Number(x.pt.la),0)/geoms.length:null;
    const hard=geoms.filter(x=>Number(x.pt.ev)>=95).length;
    const latestPt=latest?.pt||{};
    const directionalNote=directional.length
      ?directional.length+' of '+geoms.length+' recent balls have verified spray coordinates'
      :'Depth-only fallback until the next Statcast enrichment adds hit direction';

    return '<section class="research-detail-block mlb-field-trajectory">'
      +'<div class="research-detail-block-head"><span>CONTACT FIELD</span><b>1.0 field concept · real Statcast trajectory</b></div>'
      +'<div class="mlb-field-trajectory-layout">'
        +'<div class="mlb-field-stage">'
          +'<img src="'+MLB_APPROVED_FIELD_SRC+'" alt="Approved The Sports Outpost baseball field">'
          +'<svg class="mlb-field-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Recent batted-ball trajectories on field">'
            +ghost+primary
          +'</svg>'
          +'<div class="mlb-field-hud">'
            +'<span><small>AVG EV</small><b>'+esc(avgEv!==null?researchValue(avgEv,1,' mph'):'—')+'</b></span>'
            +'<span><small>AVG LA</small><b>'+esc(avgLa!==null?researchValue(avgLa,1,'°'):'—')+'</b></span>'
            +'<span><small>95+ MPH</small><b>'+hard+'/'+geoms.length+'</b></span>'
            +'<span><small>LATEST</small><b>'+esc(mlbNumber(latestPt.dist)!==null?researchValue(latestPt.dist,0,' ft'):'—')+'</b></span>'
          +'</div>'
          +'<div class="mlb-field-truth">'+esc(directionalNote)+'</div>'
        +'</div>'
        +'<aside class="mlb-field-side">'
          +'<div class="mlb-field-latest"><small>LATEST TRACKED CONTACT</small><b>'+esc(latestPt.result?String(latestPt.result).replaceAll('_',' ').toUpperCase():'—')+'</b><span>'+esc([latestPt.date,mlbNumber(latestPt.ev)!==null?researchValue(latestPt.ev,1,' mph'):null,mlbNumber(latestPt.la)!==null?researchValue(latestPt.la,1,'°'):null].filter(Boolean).join(' · '))+'</span></div>'
          +(hasZone?'<div class="mlb-field-zone-panel"><header><div><small>ZONE MATCHUP</small><b>'+esc(zone.metricLabel)+'</b></div><span>'+esc(zone.throws?('Batter vs '+zone.throws+'HP'):'All pitchers')+'</span></header><div class="mlb-field-zone-grid">'+zoneCells+'</div><footer><span>Cell value = hitter</span><span>Yellow % = starter usage</span></footer></div>':'')
          +'<div class="mlb-field-note"><b>HOW TO READ IT</b><p>The blue flight path uses the same 1.0 home-plate-to-field trajectory geometry. Recent landing paths use actual Savant distance and spray coordinates when present. The compact zone inset keeps the matchup information without turning the modal into a spreadsheet.</p></div>'
        +'</aside>'
      +'</div>'
      +'</section>';
  }

  const MLB_CONTACT_DAYS=14;
  const MLB_CONTACT_FIELD_SRC='https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/preview-hero.jpg';
  const mlbContactCache=new Map();
  const mlbContactFeedCache=new Map();
  const MLB_CONTACT_HOME_X=125,MLB_CONTACT_HOME_Y=199;
  const MLB_CONTACT_PITCH_GROUP={
    Fastball:['FF','FT','SI','FC','FA'],
    Breaking:['SL','CU','KC','ST','CS','SC','SV'],
    Offspeed:['CH','FS','FO','KN','EP','PO','AB']
  };

  function mlbContactBarrel(ev,la){
    const e=Number(ev),a=Number(la);
    if(!Number.isFinite(e)||!Number.isFinite(a)||e<98)return false;
    const d=e-98,lo=Math.max(-9,26-d),hi=Math.min(40,30+d);
    return a>=lo&&a<=hi;
  }

  function mlbContactPitchGroup(code){
    const c=String(code||'').toUpperCase();
    for(const [group,codes] of Object.entries(MLB_CONTACT_PITCH_GROUP))if(codes.includes(c))return group;
    return null;
  }

  function mlbContactKind(outcome){
    const o=String(outcome||'').toLowerCase();
    if(o.includes('home run'))return 'hr';
    if(['single','double','triple'].some(k=>o.includes(k)))return 'hit';
    if(o.includes('error'))return 'err';
    return 'out';
  }

  function mlbContactColor(ball){
    const k=mlbContactKind(ball?.outcome);
    if(k==='hr')return '#6EDCFF';
    if(k==='hit')return '#b8c4d4';
    if(k==='err')return '#f59e0b';
    return '#5a6273';
  }

  async function fetchMlbContactBalls(playerId){
    const id=String(playerId||'');
    if(!/^\d+$/.test(id))return {balls:[],error:'no player id'};
    const cached=mlbContactCache.get(id);
    if(cached&&Date.now()-cached.fetchedAt<5*60*1000)return cached;

    const season=new Date().getFullYear();
    const glRes=await fetch('https://statsapi.mlb.com/api/v1/people/'+encodeURIComponent(id)+'/stats?stats=gameLog&group=hitting&season='+season+'&gameType=R',{cache:'no-store'});
    if(!glRes.ok)throw new Error('MLB game log fetch failed');
    const gl=await glRes.json();
    const splits=gl?.stats?.[0]?.splits||[];
    const cutoff=Date.now()-MLB_CONTACT_DAYS*864e5;
    const games=[];
    for(const split of splits){
      const time=split?.date?Date.parse(split.date):NaN;
      if(!Number.isFinite(time)||time<cutoff)continue;
      games.push({
        gamePk:split?.game?.gamePk,
        date:split?.date,
        opp:split?.opponent?.abbreviation
      });
    }
    games.reverse();

    const balls=[];
    await Promise.all(games.map(async game=>{
      if(!game.gamePk)return;
      let feed=mlbContactFeedCache.get(String(game.gamePk));
      if(!feed){
        try{
          const response=await fetch('https://statsapi.mlb.com/api/v1.1/game/'+encodeURIComponent(game.gamePk)+'/feed/live',{cache:'no-store'});
          if(!response.ok)return;
          feed=await response.json();
          mlbContactFeedCache.set(String(game.gamePk),feed);
        }catch(error){return;}
      }
      const plays=feed?.liveData?.plays?.allPlays||[];
      for(const play of plays){
        const matchup=play?.matchup||{};
        if(String(matchup?.batter?.id||'')!==id)continue;
        for(const event of play?.playEvents||[]){
          if(!event?.hitData)continue;
          const hit=event.hitData,details=event.details||{},type=details.type||{},coords=hit.coordinates||{},about=play.about||{};
          balls.push({
            ev:hit.launchSpeed!=null?Number(hit.launchSpeed):null,
            la:hit.launchAngle!=null?Number(hit.launchAngle):null,
            dist:hit.totalDistance!=null?Number(hit.totalDistance):null,
            cx:coords.coordX!=null?Number(coords.coordX):null,
            cy:coords.coordY!=null?Number(coords.coordY):null,
            traj:hit.trajectory||null,
            hard:hit.hardness||null,
            pitchCode:type.code||null,
            pitchName:type.description||null,
            pHand:matchup?.pitchHand?.code||null,
            outcome:play?.result?.event||null,
            date:game.date||null,
            opp:game.opp||null,
            inning:about.inning||null,
            gamePk:game.gamePk
          });
        }
      }
    }));
    balls.sort((a,b)=>(String(a.date)<String(b.date)?1:String(a.date)>String(b.date)?-1:0)||((b.inning||0)-(a.inning||0)));
    const result={balls,fetchedAt:Date.now(),games:games.length};
    mlbContactCache.set(id,result);
    return result;
  }

  function animateMlbContactTrajectories(host){
    if(!host)return;
    const wrap=host.querySelector('.mlb-cq-field-wrap');
    const svg=wrap?.querySelector('.mlb-cq-field');
    if(!wrap||!svg)return;

    if(host._mlbSprayObserver){
      try{host._mlbSprayObserver.disconnect()}catch(error){}
      host._mlbSprayObserver=null;
    }

    const paths=[...svg.querySelectorAll('.mlb-cq-arc')];
    const lands=[...svg.querySelectorAll('.mlb-cq-land')];
    if(!paths.length)return;
    const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    paths.forEach(path=>{
      const finalOpacity=path.getAttribute('opacity')||'1';
      path.dataset.finalOpacity=finalOpacity;
      if(reduce)return;
      let len=1;
      try{
        const userLen=Math.max(1,path.getTotalLength());
        const ctm=path.getScreenCTM();
        const sx=ctm?Math.hypot(ctm.a,ctm.b):1;
        const sy=ctm?Math.hypot(ctm.c,ctm.d):sx;
        len=Math.max(1,userLen*Math.max(.01,(sx+sy)/2));
      }catch(error){}
      path.dataset.pathLen=String(len);
      path.style.transition='none';
      path.style.strokeDasharray=len+'px '+len+'px';
      path.style.strokeDashoffset=len+'px';
      path.style.opacity='0';
    });

    lands.forEach(dot=>{
      dot.dataset.finalOpacity=dot.getAttribute('opacity')||'1';
      if(reduce)return;
      dot.style.transition='none';
      dot.style.opacity='0';
      dot.style.transform='scale(.18)';
      dot.style.transformBox='fill-box';
      dot.style.transformOrigin='center';
    });
    if(reduce)return;

    let started=false;
    const start=()=>{
      if(started)return;
      started=true;
      if(host._mlbSprayObserver){
        try{host._mlbSprayObserver.disconnect()}catch(error){}
        host._mlbSprayObserver=null;
      }
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        paths.forEach((path,index)=>{
          const len=Number(path.dataset.pathLen)||1;
          const delay=Math.min(index*48,720);
          const duration=Math.round(620+Math.min(len*.48,330));
          path.style.transition='stroke-dashoffset '+duration+'ms cubic-bezier(.22,.61,.36,1) '+delay+'ms, opacity 160ms ease '+delay+'ms';
          path.style.strokeDashoffset='0px';
          path.style.opacity=path.dataset.finalOpacity||'1';
          const finish=()=>{
            path.style.transition='none';
            path.style.strokeDasharray='none';
            path.style.strokeDashoffset='0';
            path.style.opacity=path.dataset.finalOpacity||'1';
          };
          window.setTimeout(finish,delay+duration+90);
          const dot=lands[index];
          if(dot){
            const dotDelay=delay+Math.round(duration*.78);
            dot.style.transition='transform 300ms cubic-bezier(.2,1.55,.45,1) '+dotDelay+'ms, opacity 170ms ease '+dotDelay+'ms';
            dot.style.opacity=dot.dataset.finalOpacity||'1';
            dot.style.transform='scale(1)';
            window.setTimeout(()=>{
              dot.style.transition='none';
              dot.style.opacity=dot.dataset.finalOpacity||'1';
              dot.style.transform='scale(1)';
            },dotDelay+360);
          }
        });
      }));
    };

    const rect=wrap.getBoundingClientRect();
    const visible=rect.bottom>0&&rect.top<(window.innerHeight||document.documentElement.clientHeight)*.94;
    if(visible)start();
    else if('IntersectionObserver' in window){
      host._mlbSprayObserver=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))start();
      },{threshold:.18});
      host._mlbSprayObserver.observe(wrap);
    }else start();
  }

  function renderMlbContactRecentRows(rows){
    if(!rows.length)return '<div class="mlb-cq-empty">No matching recent batted balls.</div>';
    return '<div class="mlb-cq-recent"><div class="mlb-cq-recent-head"><span>DATE / OPP</span><span>PITCH</span><span>EV</span><span>LA</span><span>DIST</span><span>RESULT</span></div>'
      +rows.slice(0,12).map(ball=>{
        const kind=mlbContactKind(ball.outcome);
        const barrel=mlbContactBarrel(ball.ev,ball.la);
        const result=kind==='hr'?'HR':kind==='hit'?'HIT':kind==='err'?'ERR':'OUT';
        return '<div class="mlb-cq-recent-row '+(barrel?'is-barrel':kind==='hr'||kind==='hit'?'is-hit':'')+'">'
          +'<span><b>'+esc(ball.date?String(ball.date).slice(5):'—')+'</b><small>'+esc(ball.opp?('vs '+ball.opp):'—')+'</small></span>'
          +'<span><b>'+esc(ball.pitchCode||'?')+'</b><small>'+esc(ball.pitchName||'Pitch')+'</small></span>'
          +'<span><b>'+esc(ball.ev!=null?researchValue(ball.ev,0,''):'—')+'</b><small>MPH</small></span>'
          +'<span><b>'+esc(ball.la!=null?researchValue(ball.la,0,'°'):'—')+'</b><small>LA</small></span>'
          +'<span><b>'+esc(ball.dist!=null?researchValue(ball.dist,0,''):'—')+'</b><small>FT</small></span>'
          +'<span class="mlb-cq-result" style="--cq-result:'+mlbContactColor(ball)+'">'+esc(result)+'</span>'
        +'</div>';
      }).join('')
    +'</div>';
  }

  function drawMlbContactQuality(host,balls,pitcher,state){
    if(!host?.isConnected)return;
    let rows=[...(balls||[])];
    if(state.hand!=='ALL')rows=rows.filter(ball=>String(ball.pHand||'').toUpperCase()===state.hand);
    if(state.contact==='BRL')rows=rows.filter(ball=>mlbContactBarrel(ball.ev,ball.la));
    else if(state.contact!=='ALL')rows=rows.filter(ball=>mlbContactPitchGroup(ball.pitchCode)===state.contact);

    const VW=400,VH=225,CX=200,HY=214,VP=90,CAMD=30,FOCAL=205;
    const proj=(fx,fy,fz=0)=>{
      const d=fy+CAMD;
      const gy=VP+(HY-VP)*CAMD/d;
      return {sx:CX+FOCAL*fx/d,sy:gy-FOCAL*fz/d};
    };
    const rf=proj(233,233),lf=proj(-233,233),cf=proj(0,400),hp=proj(0,0);

    const wallDistAt=theta=>{
      const t=Math.min(1,Math.abs(theta)/(Math.PI/4));
      const ease=(1-Math.cos(t*Math.PI))/2;
      return 400-(400-233*Math.SQRT2)*ease;
    };

    const arcs=[];
    rows.forEach((ball,index)=>{
      if(ball.cx==null||ball.cy==null||!(ball.dist>0))return;
      const theta=Math.atan2(ball.cx-MLB_CONTACT_HOME_X,MLB_CONTACT_HOME_Y-ball.cy);
      const wallDist=wallDistAt(theta);
      const isHr=mlbContactKind(ball.outcome)==='hr';
      const distance=isHr?Math.max(ball.dist,wallDist*1.04):Math.min(ball.dist,wallDist*.96);
      const lx=distance*Math.sin(theta),ly=distance*Math.cos(theta);
      const la=(ball.la==null?15:ball.la)*Math.PI/180;
      const apex=Math.max(2,Math.min(95,distance*Math.tan(la)/4));
      let path='';
      for(let k=0;k<=14;k++){
        const t=k/14,px=lx*t,py=ly*t,pz=apex*4*t*(1-t),point=proj(px,py,pz);
        path+=(k?' L ':'M ')+point.sx.toFixed(1)+' '+point.sy.toFixed(1);
      }
      arcs.push({index,path,land:proj(lx,ly,0),color:mlbContactColor(ball),kind:mlbContactKind(ball.outcome),ball});
    });

    const evs=rows.map(ball=>ball.ev).filter(Number.isFinite);
    const avgEv=evs.length?Math.round(evs.reduce((a,b)=>a+b,0)/evs.length):null;
    const barrels=rows.filter(ball=>mlbContactBarrel(ball.ev,ball.la)).length;
    const barrelPct=rows.length?Math.round(barrels/rows.length*100):null;
    const games=new Set(rows.map(ball=>ball.gamePk||[ball.date,ball.opp].join('|')).filter(Boolean)).size;
    const handLabel=state.hand==='L'?'LHP':state.hand==='R'?'RHP':'ALL HANDS';

    host.innerHTML='<div class="mlb-cq-top">'
      +'<div class="mlb-cq-stat"><span><b>'+esc(barrelPct!=null?barrelPct+'%':'—')+'</b><small>BRL</small></span><span><b>'+esc(avgEv!=null?String(avgEv):'—')+'</b><small>EV</small></span></div>'
      +'<div class="mlb-cq-badges"><span>'+games+' G · '+rows.length+' BALL'+(rows.length===1?'':'S')+' IN PLAY</span><span>'+handLabel+'</span></div>'
      +'</div>'
      +'<div class="mlb-cq-field-wrap"><svg class="mlb-cq-field" viewBox="0 0 '+VW+' '+VH+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Recent Contact Quality spray chart">'
        +'<defs><linearGradient id="mlb-cq-vign" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(6,10,15,0.55)"/><stop offset="0.5" stop-color="rgba(6,10,15,0.30)"/><stop offset="1" stop-color="rgba(6,10,15,0.18)"/></linearGradient></defs>'
        +'<image href="'+MLB_CONTACT_FIELD_SRC+'" x="0" y="0" width="'+VW+'" height="'+VH+'" preserveAspectRatio="xMidYMid slice"/>'
        +'<rect x="0" y="0" width="'+VW+'" height="'+VH+'" fill="url(#mlb-cq-vign)"/>'
        +'<circle cx="'+hp.sx+'" cy="'+hp.sy+'" r="3" fill="#fff" opacity=".5"/>'
        +arcs.map(a=>'<path class="mlb-cq-arc" data-i="'+a.index+'" d="'+a.path+'" stroke="'+a.color+'" stroke-width="'+(a.kind==='hr'?2.6:1.7)+'" fill="none" opacity="'+(a.kind==='out'?.55:.92)+'"/>').join('')
        +arcs.map(a=>'<circle class="mlb-cq-land" data-i="'+a.index+'" cx="'+a.land.sx+'" cy="'+a.land.sy+'" r="'+(a.kind==='hr'?3.8:2.6)+'" fill="'+a.color+'" opacity="'+(a.kind==='out'?.65:1)+'"/>').join('')
      +'</svg><div class="mlb-cq-scrim"></div></div>'
      +'<div class="mlb-cq-filters" aria-label="Contact filters">'
        +[['ALL','#dce8f5'],['Fastball','#2d7fff'],['Breaking','#ff9f43'],['Offspeed','#a472ff'],['BRL','#f5c842']].map(([key,color])=>{
          const label=key==='Fastball'?'FB':key==='Breaking'?'BRK':key==='Offspeed'?'OFF':key;
          return '<button class="'+(state.contact===key?'is-active':'')+'" data-mlb-cq-filter="'+esc(key)+'"><i style="background:'+color+'"></i>'+label+'</button>';
        }).join('')
      +'</div>'
      +'<div class="mlb-cq-source">Same 14-day Contact Quality trajectory system used by TSO 1.0 · actual MLB hit coordinates, distance, launch angle, pitch type and result.</div>'
      +renderMlbContactRecentRows(rows);

    animateMlbContactTrajectories(host);
    host.querySelectorAll('[data-mlb-cq-filter]').forEach(button=>button.addEventListener('click',()=>{
      state.contact=button.dataset.mlbCqFilter||'ALL';
      drawMlbContactQuality(host,balls,pitcher,state);
    }));
  }

  async function bindMlbContactQuality(host,data,row){
    if(!host)return;
    const playerId=data?.player?.id||row?.playerId;
    const pitcher=data?.opponent?.pitcher||{};
    const state={hand:['L','R'].includes(String(pitcher?.throws||'').toUpperCase())?String(pitcher.throws).toUpperCase():'ALL',contact:'ALL'};
    host.innerHTML='<div class="mlb-cq-loading"><span class="live-feed-spinner"></span><div><b>Loading 1.0 Contact Quality trajectories…</b><small>Reading the player\'s last 14 days of MLB hit coordinates.</small></div></div>';
    try{
      const result=await fetchMlbContactBalls(playerId);
      if(!host.isConnected)return;
      if(!result?.balls?.length){
        host.innerHTML='<div class="mlb-cq-empty">No verified batted-ball trajectories were returned for the last 14 days.</div>';
        return;
      }
      drawMlbContactQuality(host,result.balls,pitcher,state);
    }catch(error){
      if(host.isConnected)host.innerHTML='<div class="mlb-cq-empty">The 1.0 Contact Quality feed could not be loaded. <span>'+esc(error?.message||String(error))+'</span></div>';
    }
  }

  function renderMlbContactQualityShell(){
    return '<section class="research-detail-block mlb-contact-quality">'
      +'<div class="research-detail-block-head"><span>CONTACT QUALITY</span><b>TSO 1.0 trajectory view · last 14 days</b></div>'
      +'<div class="mlb-cq-host" data-mlb-contact-quality></div>'
      +'</section>';
  }

  function renderMlbEnvironmentVisual(game,pitcher){
    const venue=game?.venue||{},w=game?.weather||{},wind=w.wind||{};
    const pf=mlbNumber(venue.parkFactor);
    const parkPos=pf===null?50:Math.max(0,Math.min(100,(pf-80)/40*100));
    const temp=mlbNumber(w.tempF),windMph=mlbNumber(w.windMph),humidity=mlbNumber(w.humidity),precip=mlbNumber(w.precipChance);
    const indoor=Boolean(w.indoor)||String(venue.roof||'').toLowerCase()==='fixed';
    const rel=mlbNumber(wind.relativeDeg);
    const parkDelta=pf===null?'—':(pf===100?'NEUTRAL':((pf>100?'+':'')+(pf-100)+' vs 100'));
    return '<section class="research-detail-block mlb-environment-visual">'
      +'<div class="research-detail-block-head"><span>PARK + WEATHER</span><b>'+esc(venue.name||'Current park')+'</b></div>'
      +'<div class="mlb-environment-grid">'
        +'<div class="mlb-park-factor"><div><small>3-YR HR PARK FACTOR</small><b>'+esc(pf!==null?researchRate(pf,0):'—')+'</b><em>'+esc(parkDelta)+'</em></div><span class="mlb-park-track"><i class="mlb-park-neutral"></i><b style="left:'+parkPos.toFixed(1)+'%"></b></span><footer><span>80</span><span>100 NEUTRAL</span><span>120</span></footer></div>'
        +'<div class="mlb-weather-card"><small>WIND</small><div class="mlb-wind-read"><i style="--wind-angle:'+Number(rel||0).toFixed(0)+'deg">↑</i><span><b>'+esc(indoor?'INDOOR':(windMph!==null?researchValue(windMph,0,' mph'):'—'))+'</b><em>'+esc(indoor?'Wind suppressed':(wind.label||'Field-relative direction unavailable'))+'</em></span></div></div>'
        +'<div class="mlb-weather-card"><small>TEMPERATURE</small><b>'+esc(temp!==null?researchValue(temp,0,'°F'):'—')+'</b><em>'+esc(venue.roof||'roof status unavailable')+'</em></div>'
        +'<div class="mlb-weather-card"><small>ATMOSPHERE</small><b>'+esc(humidity!==null?researchValue(humidity,0,'%')+' RH':'—')+'</b><em>'+esc(precip!==null?researchValue(precip,0,'%')+' precip chance':'forecast unavailable')+'</em></div>'
        +'<div class="mlb-weather-card"><small>PROBABLE STARTER</small><b>'+esc(pitcher?.name||'—')+'</b><em>'+esc(pitcher?.throws?('Throws '+pitcher.throws):'handedness unavailable')+'</em></div>'
      +'</div><div class="mlb-module-source">Park factor: static maintained 3-year HR index · Weather: Open-Meteo · 100 park factor = league average.</div>'
      +'</section>';
  }

  function renderNbaResearchChart(data,row,range='10'){
    const series=propSeriesForRow(data,row);
    if(!series.length||!Number.isFinite(Number(row?.line)))return '';
    const selected=propChartRangeSeries(series,range);
    const stats=propWindowStats(selected,row);
    const summary=stats&&selected.length
      ?'<div class="mlb-chart-summary"><span><small>AVG</small><b>'+esc(researchRate(stats.avg,1))+'</b></span><span><small>HITS</small><b>'+stats.hits+'/'+(stats.hits+stats.losses)+'</b></span><span><small>GAMES</small><b>'+stats.games+'</b></span></div>'
      :'';
    return '<section class="research-detail-block nba-performance-visual" data-nba-performance-chart>'
      +'<div class="research-detail-block-head"><span>EXACT-LINE PERFORMANCE</span><b>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+'</b></div>'
      +summary+renderPropRecentChart(series,row,range)
      +'</section>';
  }

  function bindNbaResearchChart(node,data,row,state={range:'10'}){
    if(!node)return;
    node.querySelectorAll('[data-props-chart-range]').forEach(btn=>btn.addEventListener('click',()=>{
      state.range=String(btn.dataset.propsChartRange||'10');
      node.outerHTML=renderNbaResearchChart(data,row,state.range);
      const replacement=document.querySelector('.research-detail-content [data-nba-performance-chart]');
      bindNbaResearchChart(replacement,data,row,state);
    }));
  }

  function nbaFactorVisual(row){
    const factors=row?.model?.factors||{};
    const specs=[
      ['MINUTES','minutes'],['USAGE','usage'],['VENUE','venue'],['OPPONENT','opponent'],
      ['PACE','pace'],['REST','rest'],['INJURY','injury']
    ];
    const rows=specs.map(([label,key])=>{
      const factor=Number(factors?.[key]);
      if(!Number.isFinite(factor))return '';
      const delta=(factor-1)*100;
      const tone=delta>.15?'is-player':delta<-.15?'is-opponent':'is-line';
      const width=Math.max(4,Math.min(100,50+delta*8));
      return '<div class="nfl-matchup-bar-row '+tone+'"><div><small>'+label+'</small><b>'+(delta>0?'+':'')+delta.toFixed(1)+'%</b><em>regression adjustment</em></div><span><i style="width:'+width.toFixed(1)+'%"></i></span></div>';
    }).join('');
    return rows?'<section class="research-detail-block nfl-matchup-visual nba-factor-visual"><div class="research-detail-block-head"><span>REGRESSION DRIVERS</span><b>Source-backed model adjustments</b></div><div class="nfl-matchup-bars">'+rows+'</div></section>':'';
  }

  function nbaResearchDetail(data,row){
    const p=data.player||{},matchup=data.matchup||{},def=data.opponentDefense||{},league=data.league||{},model=row?.model||{};
    const market=String(row?.market||'');
    const injury=p?.injury?.status||p?.injury?.detail||null;
    const defenseValue=Number(def?.[market]),leagueDefense=Number(league?.allowance?.[market]);
    const expectedPace=Number(model.expectedPace),leaguePace=Number(model.leaguePace??matchup.leaguePace);
    const metrics=[
      ['PROJECTION',researchRate(model.projection,1),'vs '+researchRate(row?.line,1)+' line'],
      ['L5 AVG',researchRate(model.last5,1),market],
      ['L10 AVG',researchRate(model.last10,1),market],
      ['SEASON BASE',researchRate(model.seasonBaseline,1),'weighted history'],
      ['AVG MIN',researchRate(model.averageMinutes,1),'projection sample'],
      ['RECENT MIN',researchRate(model.recentMinutes,1),'current role'],
      ['USAGE PROXY',researchRate(model.recentUsageProxy,1),'recent opportunity'],
      ['REST',Number.isFinite(Number(model.restDays))?String(model.restDays)+' day'+(Number(model.restDays)===1?'':'s'):'—','before game']
    ].filter(x=>x[1]!=='—');
    const matchupMetrics=[
      ['OPP ALLOWED',Number.isFinite(defenseValue)?researchRate(defenseValue,1):'—',p.position||matchup.positionGroup||'position group'],
      ['LEAGUE ALLOWED',Number.isFinite(leagueDefense)?researchRate(leagueDefense,1):'—','same position group'],
      ['EXPECTED PACE',Number.isFinite(expectedPace)?researchRate(expectedPace,1):'—','possessions estimate'],
      ['LEAGUE PACE',Number.isFinite(leaguePace)?researchRate(leaguePace,1):'—','baseline'],
      ['VENUE',String(model.venue||'—').toUpperCase(),'player team'],
      ['INJURY',injury||'No current tag','ESPN injury feed']
    ].filter(x=>x[1]!=='—');
    const logs=(p.recentGames||[]).slice(0,10).map(g=>{
      const stats=g.stats||{};
      return '<div class="research-detail-log-row"><span>'+esc(String(g.date||'').slice(0,10))+'</span><b>'+esc((g.homeAway==='away'?'@ ':'vs ')+(g.opponent||'—'))+'</b><em>'+esc('MIN '+researchRate(g.minutes,0)+' · PTS '+researchRate(stats.points,0)+' · REB '+researchRate(stats.rebounds,0)+' · AST '+researchRate(stats.assists,0)+' · PRA '+researchRate(stats.pra,0))+'</em></div>';
    }).join('');
    return '<section class="research-detail-status"><span class="deep-source-chip">ESPN NBA HISTORY + REGRESSION v1</span><b>'+esc((p.team||'NBA')+' · '+(p.position||'Player'))+'</b><small>'+esc('Research snapshot '+researchAge(data.generatedAt)+(injury?' · '+injury:''))+'</small></section>'
      +renderNbaResearchChart(data,row)
      +nbaFactorVisual(row)
      +'<section class="research-detail-block"><div class="research-detail-block-head"><span>MODEL CONTEXT</span><b>Minutes · usage · recent production</b></div><div class="research-detail-metrics">'+metrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>'
      +(matchupMetrics.length?'<section class="research-detail-block"><div class="research-detail-block-head"><span>MATCHUP CONTEXT</span><b>'+esc(model.opponent||matchup.opponent?.name||researchOpponentForRow(row)||'Current opponent')+'</b></div><div class="research-detail-metrics">'+matchupMetrics.map(x=>researchDetailMetric(...x)).join('')+'</div></section>':'')
      +(logs?'<section class="research-detail-block"><div class="research-detail-block-head"><span>GAME LOG</span><b>Verified recent NBA box scores</b></div><div class="research-detail-log">'+logs+'</div></section>':'');
  }

  function mlbResearchDetail(data,row){
    const p=data.player||{},game=data.game||{},opp=data.opponent||{},pitcher=opp.pitcher||{};
    const performanceVisual=renderMlbResearchChart(data,row);
    const environmentVisual=renderMlbEnvironmentVisual(game,pitcher);
    const statcastVisual=renderMlbStatcastProfile(p);
    const bvpVisual=renderMlbBvpVisual(p,pitcher);
    const pitchVisual=renderMlbPitchMatchup(p,pitcher);
    const contactQualityVisual=renderMlbContactQualityShell();
    return '<section class="research-detail-status"><span class="deep-source-chip">MLB STATS + SAVANT + OPEN-METEO</span><b>'+esc((p.team||'MLB')+' · '+(p.position||'Player')+(p.battingOrder?' · batting #'+p.battingOrder:''))+'</b><small>'+esc('Slate '+researchAge(data.generatedAt)+(data.statcastEnrichedAt?' · Statcast '+researchAge(data.statcastEnrichedAt):''))+'</small></section>'
      +performanceVisual
      +environmentVisual
      +statcastVisual
      +bvpVisual
      +pitchVisual
      +contactQualityVisual;
  }

  function researchDetailBody(data,row){
    if(!data?.available)return '<div class="research-detail-empty"><b>Deep research not available for this player yet.</b><small>'+esc(data?.reason||data?.error||'No verified detail source returned.')+'</small></div>';
    if(data.sport==='nfl')return nflResearchDetail(data,row);
    if(data.sport==='nhl')return nhlResearchDetail(data,row);
    if(data.sport==='mlb')return mlbResearchDetail(data,row);
    if(data.sport==='nba')return nbaResearchDetail(data,row);
    return '<div class="research-detail-empty"><b>Deep research source is not connected for '+esc(String(data.sport||row?.sport||'this sport').toUpperCase())+'.</b></div>';
  }

  function closeResearchDetail(){
    document.querySelector('.research-detail-overlay')?.remove();
    document.body.classList.remove('research-detail-open');
  }

  async function openResearchDetail(row){
    if(!row)return;
    closeResearchDetail();
    const opponent=researchOpponentForRow(row);
    const key=[row.sport,row.playerId||'',row.player,row.team||'',opponent].join('|');
    const overlay=document.createElement('div');
    overlay.className='research-detail-overlay';
    overlay.innerHTML='<div class="research-detail-shell" role="dialog" aria-modal="true">'
      +'<div class="research-detail-hero"><button class="research-detail-close" data-research-detail-close aria-label="Close">×</button>'
      +'<div class="research-detail-player">'+propHeadshotMarkup(row,'research-detail-headshot')+'<div><span>'+esc(leagueLabel(row.sport))+' DEEP RESEARCH</span><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · '+esc(propSelectionText(row))+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</p></div></div>'
      +'<div class="research-detail-market"><span><small>MODEL</small><b>'+pct1(row.model?.probabilityPct)+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b><em>'+esc(row.book||'—')+'</em></span></div>'
      +'</div><div class="research-detail-content" data-research-detail-content><div class="live-board-loading research-detail-loading"><span class="live-feed-spinner"></span><div><b>Loading verified deep research…</b><small>TSO is reading the existing sport research feed for this player.</small></div></div></div>'
      +'<div class="research-detail-footer"><span>NO INVENTED CONTEXT · SOURCE-BACKED FIELDS ONLY</span><button data-research-detail-props>OPEN PROP BOARD →</button></div></div>';
    document.body.appendChild(overlay);
    document.body.classList.add('research-detail-open');
    overlay.querySelector('[data-research-detail-close]')?.addEventListener('click',closeResearchDetail);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeResearchDetail();});
    overlay.querySelector('[data-research-detail-props]')?.addEventListener('click',()=>{closeResearchDetail();setRoute('props');});
    bindMediaFallbacks();

    const content=overlay.querySelector('[data-research-detail-content]');
    try{
      let payload=deepResearchCache.get(key);
      if(!payload){
        const qs=new URLSearchParams({sport:String(row.sport||''),playerId:String(row.playerId||''),name:String(row.player||''),team:String(row.team||''),opponent:String(opponent||''),eventId:String(row.eventId||'')});
        const response=await fetch('/api/research-detail?'+qs.toString(),{cache:'no-store'});
        payload=await response.json();
        if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('Research HTTP '+response.status));
        deepResearchCache.set(key,payload);
      }
      if(content){
        content.innerHTML=researchDetailBody(payload,row);
        if(payload?.sport==='nhl'){
          const chartNode=content.querySelector('[data-nhl-performance-chart]');
          bindNhlResearchChart(chartNode,payload,row,{range:'10',view:'all'});
        }
        if(payload?.sport==='mlb'){
          const chartNode=content.querySelector('[data-mlb-performance-chart]');
          bindMlbResearchChart(chartNode,payload,row,{range:'10'});
          bindMlbContactQuality(content.querySelector('[data-mlb-contact-quality]'),payload,row);
        }
        if(payload?.sport==='nba'){
          const chartNode=content.querySelector('[data-nba-performance-chart]');
          bindNbaResearchChart(chartNode,payload,row,{range:'10'});
        }
      }
    }catch(error){
      if(content)content.innerHTML='<div class="research-detail-empty"><b>Verified deep research could not be loaded.</b><small>'+esc(error?.message||String(error))+'</small></div>';
    }
  }

  function researchPropsRows(){
    return (propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
  }

  function researchGames(){
    return (liveFeedCache?.games||[]).filter(game=>currentLeague==='all'||game.league===currentLeague);
  }

  function researchSearchMatch(row,query){
    if(!query) return true;
    const haystack=[
      row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,
      propSelectionText(row),leagueLabel(row.sport)
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function researchGameMatch(game,query){
    if(!query) return true;
    const haystack=[
      game.league,game.away?.abbr,game.away?.name,game.home?.abbr,game.home?.name,
      (game.away?.abbr||'')+' @ '+(game.home?.abbr||''),game.venue
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function researchPlayerGroups(rows){
    const groups=new Map();
    for(const row of rows){
      const key=String(row.sport)+'|'+String(row.player||'').toLowerCase();
      let g=groups.get(key);
      if(!g){
        g={key,sport:row.sport,player:row.player,headshotUrl:row.headshotUrl,playerId:row.playerId,team:row.team,rows:[],modeled:0,bestEdge:null,books:new Set()};
        groups.set(key,g);
      }
      g.rows.push(row);
      if(Number.isFinite(Number(row?.model?.probabilityPct))){
        g.modeled++;
        const edge=Number(row.model?.edgePct);
        if(Number.isFinite(edge)&&(g.bestEdge===null||edge>g.bestEdge)) g.bestEdge=edge;
      }
      for(const book of row.books||[{book:row.book}]) if(book?.book) g.books.add(String(book.book));
    }
    return [...groups.values()].sort((a,b)=>{
      if(b.modeled!==a.modeled) return b.modeled-a.modeled;
      if((b.bestEdge??-999)!==(a.bestEdge??-999)) return (b.bestEdge??-999)-(a.bestEdge??-999);
      if(b.rows.length!==a.rows.length) return b.rows.length-a.rows.length;
      return String(a.player).localeCompare(String(b.player));
    });
  }

  function researchPlayerMarkup(group,index){
    const row=sortPropsRows(group.rows)[0]||group.rows[0]||{};
    const edge=group.bestEdge;
    return '<button class="research-player-row research-player-row--live" data-research-detail-key="'+esc(row.key||'')+'">'
      +'<span class="research-player-rank">'+String(index+1).padStart(2,'0')+'</span>'
      +propHeadshotMarkup(row,'research-avatar')
      +'<div><b>'+esc(group.player)+'</b><small>'+esc(leagueLabel(group.sport))+' · '+group.rows.length+' exact selection'+(group.rows.length===1?'':'s')+' · '+group.modeled+' modeled</small></div>'
      +'<span class="research-opens research-depth-value">'+(Number.isFinite(edge)?edgeText(edge):group.books.size+' BOOK'+(group.books.size===1?'':'S'))+'</span>'
    +'</button>';
  }

  function researchGameMarkup(game){
    const state=gameShortState(game);
    const live=game.state==='in';
    const awayScore=game.state==='pre'?'—':esc(game.away?.score??0);
    const homeScore=game.state==='pre'?'—':esc(game.home?.score??0);
    return '<button class="research-radar-row research-game-row" data-research-game>'
      +'<span class="radar-tag '+(live?'radar-tag--usage':'radar-tag--pace')+'">'+esc(leagueLabel(game.league))+'</span>'
      +'<div class="research-game-teams"><b>'+teamLogoMarkup(game.away,'research-game-logo')+esc(game.away?.abbr||'AWAY')+' @ '+teamLogoMarkup(game.home,'research-game-logo')+esc(game.home?.abbr||'HOME')+'</b><small>'+esc(state)+' · '+esc(game.venue||'Venue pending')+'</small></div>'
      +'<span class="radar-value"><strong>'+awayScore+'–'+homeScore+'</strong><small>'+esc(gameStatusText(game))+'</small></span>'
      +'<span class="radar-arrow">↗</span>'
    +'</button>';
  }

  function researchResultMarkup(row){
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const edge=hasModel?Number(model.edgePct):null;
    return '<button class="research-result-row '+(hasModel?'has-model':'is-market-only')+'" data-research-detail-key="'+esc(row.key)+'">'
      +'<span class="research-result-player">'+propHeadshotMarkup(row,'research-result-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
      +'<strong>'+esc(propSelectionText(row))+'</strong>'
      +'<span><small>MODEL</small><b>'+ (hasModel?pct1(model.probabilityPct):'—') +'</b></span>'
      +'<span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span>'
      +'<span><small>EDGE</small><b class="'+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</b></span>'
      +'<span><small>BEST</small><b>'+esc(americanPrice(row.price))+'</b><em>'+esc(row.book||'—')+'</em></span>'
    +'</button>';
  }

  function researchSignalMarkup(row,index){
    const model=row.model||{};
    const edge=Number(model.edgePct);
    const tone=row.sport==='nhl'?'blue':row.sport==='nfl'?'gold':'orange';
    return '<article class="research-signal-card research-signal-card--'+tone+' research-signal-card--real">'
      +'<div class="research-signal-top"><span>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+'</span><b>'+esc(modelTagText(row))+'</b></div>'
      +'<div class="research-signal-player">'+propHeadshotMarkup(row,'research-signal-headshot')+'<div><h3>'+esc(row.player)+'</h3><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></div><span class="research-score-badge"><small>MODEL</small><strong>'+pct1(model.probabilityPct)+'</strong></span></div>'
      +'<div class="research-stat-grid research-stat-grid--real"><span><small>EXACT</small><b>'+esc(propSelectionText(row))+'</b></span><span><small>MARKET</small><b>'+pct1(row.impliedPct)+'</b></span><span><small>EDGE</small><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></span></div>'
      +'<div class="research-insight"><span>VERIFIED MARKET</span><b>'+esc(americanPrice(row.price))+' · '+esc(row.book||'Sportsbook')+'</b><small>'+esc(modelSourceText(row))+' · '+esc(row.bookCount||row.books?.length||1)+' sportsbook'+((row.bookCount||row.books?.length||1)===1?'':'s')+' on this exact selection.</small></div>'
      +'<button class="research-open-btn" data-research-detail-key="'+esc(row.key)+'">OPEN DEEP RESEARCH →</button>'
    +'</article>';
  }

  // Separate, read-only odds context for the Research game cards. The
  // scoreboard and book feeds are independently verified and never synthesized.
  const researchMarketCache=new Map();
  const researchMarketPending=new Map();
  const RESEARCH_MARKET_TTL=60000;
  function researchMarketGames(){
    const all=liveFeedCache?.games||[];
    const nflWeek=nflWeeklyFeedCache?.games||[];
    const extra=[...researchMarketCache.values()].flatMap(item=>item.payload?.games||[]);
    let candidates=currentLeague==='nfl'
      ? [...nflWeek,...extra.filter(g=>g.league==='nfl'),...all.filter(g=>g.league==='nfl')]
      :currentLeague==='all'
      ? [...nflWeek,...all,...extra]
      : [...all.filter(g=>g.league===currentLeague),...extra.filter(g=>g.league===currentLeague)];
    const seen=new Set();
    return candidates.filter(g=>{
      if(!g?.league||!g?.away?.abbr||!g?.home?.abbr)return false;
      const key=[g.league,String(g.id||''),String(g.away.abbr),String(g.home.abbr),String(g.startTime||'')].join('|');
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  function researchLineFor(game){
    const cache=researchMarketCache.get(game.league)?.payload;
    const matches=cache?.games?.find(g=>
      (g.id!=null&&game.id!=null&&String(g.id)===String(game.id))||
      (String(g.away?.abbr)===String(game.away?.abbr)&&
       String(g.home?.abbr)===String(game.home?.abbr)&&
       Math.abs(Date.parse(g.startTime||'')-Date.parse(game.startTime||''))<36*60*60*1000));
    return matches?.gameLines||game.gameLines||gameEdgeCache.get(game.league)?.linesById?.[String(game.id)]||null;
  }
  function requestResearchMarkets(force=false){
    if(currentRoute!=='research')return;
    const required=currentLeague==='all'?['nfl','nba','mlb','nhl']:[currentLeague];
    for(const league of required){
      const last=researchMarketCache.get(league);
      if(!force&&last&&Date.now()-last.time<RESEARCH_MARKET_TTL)continue;
      if(researchMarketPending.has(league))continue;
      const task=gameEdgeScoreboard(league).then(payload=>{
        researchMarketCache.set(league,{payload,time:Date.now()});
        if(currentRoute==='research')renderResearch();
      }).catch(error=>console.warn('Research game lines '+league+':',error))
        .finally(()=>researchMarketPending.delete(league));
      researchMarketPending.set(league,task);
    }
  }

  function renderResearch(){
    const root=document.querySelector('[data-research-route]');
    if(currentRoute!=='research'||!root)return;
    window.TSO2ResearchGameFlow?.render(root,{
      league:currentLeague,
      games:researchMarketGames(),
      rows:researchPropsRows(),
      scorerGames:nhlScorerCache?.games||[],
      lineFor:researchLineFor,
      openDetail:row=>row&&openResearchDetail(row),
      addSelection:row=>row&&addPropToParlay(row),
      changeLeague:league=>setLeague(league),
      refresh:()=>{refreshLiveData(true);refreshPropsData(true);requestResearchMarkets(true)}
    });
    bindMediaFallbacks();
  }

  function renderPropsMarketRail(root,rows){
    const rail=root.querySelector('[data-props-market-rail]');
    if(!rail)return;
    const all=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const counts=new Map();
    for(const row of all){
      const key=String(row.market||'');
      if(!key)continue;
      const item=counts.get(key)||{key,label:row.marketLabel||row.market,count:0,modeled:0};
      item.count++;
      if(Number.isFinite(Number(row?.model?.probabilityPct)))item.modeled++;
      counts.set(key,item);
    }
    const active=String(propsFilterState.market||'');
    const items=[...counts.values()].sort((a,b)=>b.count-a.count||String(a.label).localeCompare(String(b.label)));
    rail.innerHTML='<button class="props-market-chip '+(!active?'is-active':'')+'" data-props-market-chip=""><b>ALL MARKETS</b><span>'+all.length+'</span><small>'+all.filter(r=>Number.isFinite(Number(r?.model?.probabilityPct))).length+' modeled</small></button>'
      +items.map(item=>'<button class="props-market-chip '+(active===item.key?'is-active':'')+'" data-props-market-chip="'+esc(item.key)+'"><b>'+esc(String(item.label).toUpperCase())+'</b><span>'+item.count+'</span><small>'+item.modeled+' modeled</small></button>').join('');
    rail.querySelectorAll('[data-props-market-chip]').forEach(btn=>btn.onclick=()=>{
      propsFilterState.market=String(btn.dataset.propsMarketChip||'');
      renderPropsFeed();
    });
    const summary=root.querySelector('[data-props-filter-summary]');
    if(summary){
      const players=new Set(rows.map(r=>String(r.player||'').toLowerCase())).size;
      summary.textContent=rows.length+' selections · '+players+' players · '+items.length+' market'+(items.length===1?'':'s');
    }
  }

  function renderPropsFeature(root,rows){
    const node=root.querySelector('[data-props-feature]');
    if(!node) return;
    if(!rows.length){
      node.classList.remove('live-feed-loading');
      node.innerHTML='<div class="live-feed-empty"><div><b>No verified sportsbook rows for this filter.</b><small>The source may be empty, between refresh windows, or have no current player props.</small></div></div>';
      return;
    }
    const row=sortPropsRows(rows)[0];
    const model=row.model||null;
    const hasModel=Number.isFinite(Number(model?.probabilityPct));
    const ringValue=Math.max(0,Math.min(100,hasModel?Number(model.probabilityPct):Number(row.impliedPct)||0));
    const books=Array.isArray(row.books)?row.books.slice(0,4):[];
    const tag=hasModel?modelTagText(row):'MARKET ONLY';
    const edge=hasModel?Number(model.edgePct):null;
    node.classList.remove('live-feed-loading');
    node.innerHTML=
      '<div class="prop-spotlight-glow"></div>'
      +'<div class="prop-spotlight-top"><span>FEATURED PROP · '+esc(leagueLabel(row.sport))+' '+esc(row.marketLabel||row.market)+'</span><b>'+(hasModel?'EXACT MODEL MATCH':'VERIFIED PRICE')+'</b></div>'
      +'<div class="prop-spotlight-main"><div class="prop-spotlight-player">'
        +propHeadshotMarkup(row,'prop-player-number prop-player-headshot')
        +'<div><small>'+esc(row.team||'PLAYER')+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small><h2>'+esc(row.player)+'</h2><p>'+esc(row.marketLabel||row.market)+' · <strong>'+esc(propSelectionText(row))+'</strong></p></div>'
      +'</div><div class="prop-edge-ring '+(hasModel?'has-model':'')+'" style="background:conic-gradient(var(--prop-gold) 0 '+ringValue+'%,rgba(255,255,255,.08) '+ringValue+'% 100%)"><div><small>'+(hasModel?'MODEL':'IMPLIED')+'</small><strong>'+pct1(hasModel?model.probabilityPct:row.impliedPct)+'</strong><span>'+(hasModel?'probability':'best price')+'</span></div></div></div>'
      +(hasModel
        ?'<div class="prop-score-line"><div><span>MODEL</span><b>'+pct1(model.probabilityPct)+'</b></div><div><span>MARKET</span><b>'+pct1(row.impliedPct)+'</b></div><div><span>EDGE</span><b class="'+(edge>=0?'positive':'negative')+'">'+edgeText(edge)+'</b></div><div><span>MODEL TAG</span><b>'+esc(tag)+'</b></div></div>'
        :'<div class="prop-score-line"><div><span>EXACT</span><b>'+esc(propSelectionText(row))+'</b></div><div><span>BEST PRICE</span><b>'+esc(americanPrice(row.price))+'</b></div><div><span>BOOKS</span><b>'+esc(row.bookCount||books.length||1)+'</b></div><div><span>MODEL</span><b>MARKET ONLY</b></div></div>')
      +'<div class="prop-best-price"><div><span>BEST VERIFIED PRICE</span><strong>'+esc(americanPrice(row.price))+'</strong><small>'+esc(row.book||'Sportsbook')+' · '+esc(propSelectionText(row))+'</small></div><div class="prop-line-lock"><i>✓</i><span><b>EXACT LINE LOCKED</b><small>No nearby-line substitution</small></span></div></div>'
      +(books.length?'<div class="prop-book-strip">'+books.map((book,i)=>'<div class="'+(i===0?'is-best':'')+'"><span>'+esc(book.book)+'</span><b>'+esc(americanPrice(book.price))+'</b><small>'+(i===0?'BEST':esc(propSelectionText(row)))+'</small></div>').join('')+'</div>':'')
      +'<div class="prop-spotlight-footer"><div><span>'+(hasModel?'MODEL SOURCE':'SNAPSHOT INTEGRITY')+'</span><b>'+esc(hasModel?(model.sourceLabel||model.source||'TSO model'):(row.priceKind||'verified-snapshot'))+'</b><small>'+esc(hasModel?((model.phase?String(model.phase).toUpperCase()+' · ':'')+(model.generatedAt?'model '+ageText(model.generatedAt)+' old':'exact model match')):(row.preserved?'Preserved verified pregame price':'Current verified snapshot row'))+'</small></div>'
      +(row.link?'<a class="broadcast-cta props-book-link" href="'+esc(row.link)+'" target="_blank" rel="noopener">OPEN SPORTSBOOK →</a>':'<span class="props-link-unavailable">NATIVE LINK NOT SUPPLIED</span>')+'</div>';
  }

  function renderPropsBooks(root,rows){
    const node=root.querySelector('[data-props-books]');
    if(!node) return;
    const counts=new Map();
    for(const row of rows){
      for(const book of row.books||[{book:row.book}]){
        if(!book?.book) continue;
        counts.set(book.book,(counts.get(book.book)||0)+1);
      }
    }
    const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    const newest=propsNewestTimestamp(rows);
    node.innerHTML='<div class="props-movers-head"><div><span class="orange-kicker">SPORTSBOOK COVERAGE</span><h2>Exact-line books</h2></div><span>REAL DATA</span></div>'
      +(ranked.length?ranked.map(([book,count],i)=>'<div class="props-mover-row props-book-coverage-row"><span class="signal-rank">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(book)+'</b><small>exact selections currently represented</small></div><span><small>ROWS</small><b>'+count+'</b></span><strong>'+Math.round((count/Math.max(1,rows.length))*100)+'%</strong></div>').join(''):'<div class="live-feed-side-loading"><div><b>No book coverage for this filter.</b><small>The source returned no exact selections.</small></div></div>')
      +'<div class="props-movers-footer"><span>'+rows.length+' exact selections</span><b>'+esc(newest?ageText(newest)+' old':'No timestamp')+'</b></div>';
  }

  // Existing saved-picks storage supports exact Over/Under props, not binary
  // Yes/No touchdown, goal, or HR selections. Never recode a Yes as an Over.
  function canSaveExactPick(row){
    return !!row&&['nfl','nba','nhl','mlb'].includes(row.sport)
      &&['over','under'].includes(row.side)
      &&!['atd','atg','fgs','hr'].includes(String(row.market||'').toLowerCase())
      &&String(row.selection||'').toUpperCase()!=='YES'
      &&Number.isFinite(Number(row.line))&&!!row.key&&!!row.player&&!!row.market;
  }
  // The source itself must label a binary outcome as YES or NO. A U 0.5
  // selection is NOT reinterpreted as "NO" without an explicit source label.
  function exactBinaryDecision(row){
    const market=String(row?.market||'').toLowerCase();
    const side=String(row?.side||'').toLowerCase();
    if(!['atd','atg','fgs','hr'].includes(market)
      ||!['over','under','yes','no'].includes(side))return null;
    const text=String(row?.selection||propSelectionText(row)||'').trim().toUpperCase();
    if(text==='YES'&&['over','yes'].includes(side))return 'yes';
    if(text==='NO'&&['under','no'].includes(side))return 'no';
    return null;
  }
  function canSaveBinaryPick(row){
    return !!row&&['nfl','nhl','nba','mlb'].includes(String(row.sport||'').toLowerCase())
      &&!!row.key&&!!row.player&&!!exactBinaryDecision(row);
  }
  function binaryPickInput(row){
    const date=savedActivityDate(row);
    return {sport:row.sport,key:row.key,player:row.player,market:row.market,
      selection:exactBinaryDecision(row),sourceSide:row.side,
      line:row.line,team:row.team,book:row.book,eventId:row.eventId,
      price:row.price,slateDate:date.date,dateSource:date.source};
  }
  async function persistExactSavedPick(row){
    if(canSaveBinaryPick(row)){
      if(typeof window.TSO_AUTH?.saveBinarySelection!=='function')throw new Error('Yes/No storage is unavailable.');
      return window.TSO_AUTH.saveBinarySelection(binaryPickInput(row));
    }
    if(canSaveExactPick(row))return window.TSO_AUTH.savePickSelection(exactPickInput(row));
    throw new Error('This selection cannot be saved without changing its exact meaning.');
  }
  function canWatchPlayer(row){
    const id=Number(row?.playerId);
    return !!row&&['nfl','nba','nhl','mlb'].includes(row.sport)
      &&Number.isSafeInteger(id)&&id>0&&!!row.player;
  }
  function savedActivityDate(row){
    const chicagoDate=value=>{
      const raw=String(value||'');
      if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
      const dt=new Date(value);
      if(!Number.isFinite(dt.valueOf()))return '';
      const dateParts=new Intl.DateTimeFormat('en-US',{
        timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'
      }).formatToParts(dt);
      const part=name=>dateParts.find(p=>p.type===name)?.value||'';
      return [part('year'),part('month'),part('day')].join('-');
    };
    for(const k of ['slateDate','gameDate','eventDate','eventStart','startTime','startsAt','commenceTime']){
      const date=chicagoDate(row?.[k]);
      if(date)return {date,source:'event'};
    }
    return {date:chicagoDate(new Date()),source:'saved'};
  }
  function exactPickInput(row){
    const date=savedActivityDate(row);
    return {sport:row.sport,key:row.key,player:row.player,market:row.market,
      line:row.line,side:row.side,price:row.price,selection:propSelectionText(row),
      slateDate:date.date,dateSource:date.source,book:row.book,eventId:row.eventId};
  }
  function requireSignedInSave(){
    if(window.TSO_AUTH?.user?.id)return true;
    window.TSO_AUTH?.openSignIn?.();
    notify('Sign in to save your Outpost selections.');
    return false;
  }
  function staleProfileAfterSave(){
    profileActivitySnapshot=null;
    profileActivityFetchedAt=0;
    if(currentRoute==='profile')renderProfile();
  }
  async function savePropsPick(row,button){
    if(!requireSignedInSave())return;
    if(!canSaveExactPick(row)&&!canSaveBinaryPick(row)){
      notify('This exact selection is not supported for saving yet.');
      return;
    }
    const owner=String(window.TSO_AUTH.user.id);
    button.disabled=true;button.textContent='SAVING…';
    try{
      const answer=await persistExactSavedPick(row);
      if(String(window.TSO_AUTH?.user?.id)!==owner)return;
      button.textContent='✓ SAVED';button.classList.add('is-saved');
      notify(answer.alreadySaved?'This pick is already saved.':'Pick saved to Profile.');
      staleProfileAfterSave();
    }catch(error){
      button.disabled=false;button.textContent='SAVE';
      notify('Save failed: '+String(error?.message||error));
    }
  }
  async function watchPropsPlayer(row,button){
    if(!requireSignedInSave())return;
    if(!canWatchPlayer(row)){notify('A verified numeric player ID is required.');return;}
    const owner=String(window.TSO_AUTH.user.id);
    button.disabled=true;button.textContent='SAVING…';
    try{
      const answer=await window.TSO_AUTH.saveWatchlistPlayer({
        sport:row.sport,playerId:row.playerId,player:row.player,team:row.team,
        slateDate:savedActivityDate(row).date
      });
      if(String(window.TSO_AUTH?.user?.id)!==owner)return;
      button.textContent='✓ WATCHING';button.classList.add('is-saved');
      notify(answer.alreadySaved?'Player is already on your watchlist.':'Player added to watchlist.');
      staleProfileAfterSave();
    }catch(error){
      button.disabled=false;button.textContent='+ WATCH';
      notify('Watchlist save failed: '+String(error?.message||error));
    }
  }

  async function savePregameParlayLegs(button){
    if(!requireSignedInSave())return;
    if(parlayMode!=='pregame'){
      notify('Quarter and halftime model-only selections cannot be saved as pregame props.');
      return;
    }
    const rows=parlayLegRows();
    if(!rows.length){notify('Add legs before saving.');return;}
    // Each leg must have a supported, exact source meaning. Never coerce
    // a touchdown YES into Over, or silently skip an unsupported leg.
    if(!rows.every(row=>canSaveExactPick(row)||canSaveBinaryPick(row))){
      notify('One or more legs cannot be saved without changing the source selection.');
      return;
    }
    const owner=String(window.TSO_AUTH.user.id);
    button.disabled=true;button.textContent='SAVING…';
    let saved=0,duplicate=0,failed=0;
    try{
      for(const row of rows){
        if(String(window.TSO_AUTH?.user?.id||'')!==owner)break;
        try{
          const res=await persistExactSavedPick(row);
          if(res?.alreadySaved)duplicate++;else saved++;
        }catch(error){
          failed++;console.warn('[TSO2 save build]',error?.message||error);
        }
      }
      if(String(window.TSO_AUTH?.user?.id||'')===owner){
        staleProfileAfterSave();
        notify(saved+' leg'+(saved===1?'':'s')+' saved · '+duplicate+' already saved'+(failed?' · '+failed+' failed':'')+'. No wager placed.');
      }
    }finally{button.disabled=false;button.textContent='SAVE EXACT LEGS';}
  }

  function renderPropsBoard(root,rows){
    const board=root.querySelector('[data-props-board]');
    if(!board) return;
    const visible=sortPropsToolRows(rows,propsSortMode(root)).slice(0,200);
    if(!visible.length){
      board.innerHTML='<div class="live-board-loading props-empty-board"><b>No verified sportsbook selections for '+esc(currentLeague==='all'?'this filter':leagueLabel(currentLeague))+'.</b></div>';
      return;
    }
    board.innerHTML=visible.map(row => {
      const model=row.model||null;
      const hasModel=Number.isFinite(Number(model?.probabilityPct));
      const edge=hasModel?Number(model.edgePct):null;
      const hasResearch=['nhl','nfl','mlb','nba'].includes(String(row.sport));
      return '<div class="props-board-row props-board-row-live props-board-row-pro '+(hasModel?'has-model':'is-market-only')+'" data-props-row-key="'+esc(row.key)+'">'
        +'<span class="props-board-player props-board-player-live">'+propHeadshotMarkup(row,'props-board-headshot')+'<span><b>'+esc(row.player)+'</b><small>'+esc(leagueLabel(row.sport))+' · '+esc(row.marketLabel||row.market)+' · '+esc(row.awayTeam||'')+' @ '+esc(row.homeTeam||'')+'</small></span></span>'
        +'<strong>'+esc(propSelectionText(row))+'</strong>'
        +'<strong class="'+(hasModel?'props-model-prob':'props-model-empty')+'">'+(hasModel?pct1(model.probabilityPct):'—')+'</strong>'
        +'<strong>'+esc(pct1(row.impliedPct))+'</strong>'
        +'<strong class="props-edge-value '+(hasModel?(edge>=0?'positive':'negative'):'')+'">'+(hasModel?edgeText(edge):'—')+'</strong>'
        +'<span class="props-model-tag '+(hasModel?modelTagClass(row):'is-market-only')+'">'+esc(hasModel?modelTagText(row):'MARKET ONLY')+'</span>'
        +'<span class="props-price"><b>'+esc(americanPrice(row.price))+'</b><small>'+esc(row.bookCount||row.books?.length||1)+' book'+((row.bookCount||row.books?.length||1)===1?'':'s')+'</small></span>'
        +'<strong class="props-book-name">'+esc(row.book||'—')+'</strong>'
        +'<span class="props-snapshot-age">'+esc(ageText(row.snapshotTime))+'</span>'
        +'<span class="props-row-actions">'
          +'<button data-props-compare="'+esc(row.key)+'">INTEL</button>'
          +'<button '+(hasResearch?'':'disabled')+' data-props-research="'+esc(row.key)+'">RESEARCH</button>'
          +'<button class="is-primary" data-props-parlay="'+esc(row.key)+'">+ PARLAY</button>'
          +(canSaveExactPick(row)||canSaveBinaryPick(row)
            ?'<button class="props-save-action" data-props-save="'+esc(row.key)+'" title="Save exact sportsbook selection">'
             +(canSaveBinaryPick(row)?'SAVE '+exactBinaryDecision(row).toUpperCase():'SAVE PICK')+'</button>':'')
          +(canWatchPlayer(row)?'<button class="props-watch-action" data-props-watch="'+esc(row.key)+'">+ WATCH</button>':'')
        +'</span>'
      +'</div>';
    }).join('');
    bindPropsGeneratedActions();
    bindMediaFallbacks();
  }

  function syncPropsFilterOptions(root){
    const leagueRows=(propsFeedCache?.rows||[]).filter(row=>currentLeague==='all'||row.sport===currentLeague);
    const marketSelect=root.querySelector('[data-props-market-filter]');
    const bookSelect=root.querySelector('[data-props-book-filter]');
    const sideSelect=root.querySelector('[data-props-side-filter]');
    const modelSelect=root.querySelector('[data-props-model-filter]');
    const sortSelect=root.querySelector('[data-props-sort]');
    const searchInput=root.querySelector('[data-props-search]');

    const markets=[...new Map(leagueRows.map(r=>[String(r.market||''),r.marketLabel||r.market])).entries()]
      .filter(([value])=>value)
      .sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
    const books=[...new Set(leagueRows.flatMap(row=>(row.books||[{book:row.book}]).map(b=>String(b?.book||'')).filter(Boolean)))]
      .sort((a,b)=>a.localeCompare(b));

    if(propsFilterState.market && !markets.some(([value])=>value===propsFilterState.market)) propsFilterState.market='';
    if(propsFilterState.book && !books.some(book=>book.toLowerCase()===propsFilterState.book)) propsFilterState.book='';

    if(marketSelect){
      marketSelect.innerHTML='<option value="">MARKET: ALL</option>'+markets.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(String(label).toUpperCase())+'</option>').join('');
      marketSelect.value=propsFilterState.market;
    }
    if(bookSelect){
      bookSelect.innerHTML='<option value="">BOOK: ALL</option>'+books.map(book=>'<option value="'+esc(book.toLowerCase())+'">'+esc(book.toUpperCase())+'</option>').join('');
      bookSelect.value=propsFilterState.book;
    }
    if(sideSelect) sideSelect.value=propsFilterState.side;
    if(modelSelect) modelSelect.value=propsFilterState.model;
    if(sortSelect) sortSelect.value=propsFilterState.sort;
    if(searchInput && searchInput.value!==propsFilterState.search) searchInput.value=propsFilterState.search;
  }

  async function propResearchPayload(row){
    if(!row||!['nfl','nhl','mlb','nba'].includes(String(row.sport)))return {available:false,sport:row?.sport||'',reason:'Verified game-log research is not connected for this sport yet'};
    const opponent=researchOpponentForRow(row);
    const key=['prop-rate',row.sport,row.playerId||'',row.player,row.team||'',opponent].join('|');
    if(deepResearchCache.has(key))return deepResearchCache.get(key);
    const qs=new URLSearchParams({sport:String(row.sport||''),playerId:String(row.playerId||''),name:String(row.player||''),team:String(row.team||''),opponent:String(opponent||''),eventId:String(row.eventId||'')});
    const response=await fetch('/api/research-detail?'+qs.toString(),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('Research HTTP '+response.status));
    deepResearchCache.set(key,payload);
    return payload;
  }

  async function propHistoryPayload(row,book){
    const key=['prop-history',row?.sport,row?.eventId,row?.player,row?.market,row?.line,row?.side,book||''].join('|');
    if(propHistoryCache.has(key))return propHistoryCache.get(key);
    const qs=new URLSearchParams({
      sport:String(row?.sport||''),eventId:String(row?.eventId||''),player:String(row?.player||''),
      market:String(row?.market||''),line:String(row?.line??''),side:String(row?.side||'over'),book:String(book||'')
    });
    const response=await fetch('/api/prop-history?'+qs.toString(),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok&&!payload?.reason)throw new Error(payload?.error||('History HTTP '+response.status));
    propHistoryCache.set(key,payload);
    return payload;
  }

  function propSeriesForRow(data,row){
    if(!data?.available||!row)return [];
    const sport=String(row.sport||'').toLowerCase(),market=String(row.market||'');
    const out=[];
    if(sport==='nfl'){
      const p=data.player||{};
      if(market==='firstTd'){
        for(const g of p.periodGameLog||[])out.push({date:g.date||null,season:g.season??null,value:Number(g.firstTd||0),source:g.source||'ESPN play-by-play'});
        return out.filter(x=>Number.isFinite(x.value));
      }
      const field={rushYds:'rushYds',recYds:'recYds',receptions:'receptions',passYds:'passYds',passTds:'passTds',completions:'completions',atd:'tds'}[market];
      if(!field)return [];
      for(const g of p.gameLog||[]){
        const value=Number(g?.[field]);
        if(Number.isFinite(value))out.push({date:g.date||null,season:g.season??null,value,source:'nflverse game log'});
      }
      return out;
    }
    if(sport==='nhl'){
      const p=data.player||{};
      for(const g of p.recentGames||[]){
        let value=null;
        if(market==='atg'||market==='goals')value=Number(g?.stats?.goals);
        else if(market==='fgs')value=g?.firstGoal?1:0;
        else if(market==='sog')value=Number(g?.stats?.sog);
        else if(market==='assists')value=Number(g?.stats?.assists);
        else if(market==='points')value=Number(g?.stats?.points);
        else if(market==='blocks')value=Number(g?.stats?.blocks);
        else if(market==='saves')value=Number(g?.stats?.saves);
        if(Number.isFinite(value))out.push({date:g.date||null,season:g.season??null,value,opponent:g.opponent||null,homeAway:g.homeAway||null,source:g.source||'ESPN game summary'});
      }
      return out;
    }
    if(sport==='nba'){
      const p=data.player||{};
      for(const g of p.recentGames||[]){
        const value=Number(g?.stats?.[market]);
        if(Number.isFinite(value))out.push({
          date:g.date||null,season:g.season??null,value,
          opponent:g.opponent||null,homeAway:g.homeAway||null,
          minutes:Number.isFinite(Number(g.minutes))?Number(g.minutes):null,
          pace:Number.isFinite(Number(g.pace))?Number(g.pace):null,
          seasonType:g.seasonType??null,
          usedInProjection:g.usedInProjection!==false,
          source:'ESPN verified NBA box score'
        });
      }
      return out;
    }
    if(sport==='mlb'){
      const p=data.player||{};
      for(const g of p.gameLog||[]){
        let value=null;
        if(market==='homeRun'||market==='hr')value=Number(g.hr);
        else if(market==='hits')value=Number(g.h);
        else if(market==='totalBases')value=Number(g.totalBases);
        else if(market==='rbi')value=Number(g.rbi);
        else if(market==='runs')value=Number(g.r);
        else if(market==='hrr')value=Number(g.h)+Number(g.r)+Number(g.rbi);
        else if(market==='singles')value=Number(g.singles);
        else if(market==='doubles')value=Number(g.doubles);
        else if(market==='triples')value=Number(g.triples);
        else if(market==='walks')value=Number(g.walks);
        else if(market==='batterStrikeouts')value=Number(g.strikeouts);
        else if(market==='stolenBases')value=Number(g.stolenBases);
        if(Number.isFinite(value))out.push({date:g.date||null,season:data?.player?.gameLogCoverage?.season??null,value,source:g.source||data?.player?.gameLogCoverage?.source||'MLB Stats API'});
      }
      return out;
    }
    return [];
  }

  function propWindowStats(series,row,count=null){
    const rows=count?series.slice(0,count):series;
    const line=Number(row?.line);
    if(!rows.length||!Number.isFinite(line))return null;
    let hits=0,losses=0,pushes=0,sum=0;
    for(const item of rows){
      const v=Number(item.value);if(!Number.isFinite(v))continue;
      sum+=v;
      if(Math.abs(v-line)<1e-9){pushes++;continue;}
      const hit=row.side==='under'?v<line:v>line;
      if(hit)hits++;else losses++;
    }
    const decisions=hits+losses;
    return {games:rows.length,hits,losses,pushes,rate:decisions?hits/decisions*100:null,avg:rows.length?sum/rows.length:null};
  }

  function propSeasonSeries(series){
    const seasons=series.map(x=>Number(x.season)).filter(Number.isFinite);
    if(!seasons.length)return series;
    const latest=Math.max(...seasons);
    return series.filter(x=>Number(x.season)===latest);
  }

  function propRateCard(label,stats){
    if(!stats||!Number.isFinite(stats.rate))return '<span><small>'+esc(label)+'</small><b>—</b><em>verified sample unavailable</em></span>';
    return '<span><small>'+esc(label)+'</small><b>'+stats.rate.toFixed(0)+'%</b><em>'+stats.hits+'-'+stats.losses+(stats.pushes?' · '+stats.pushes+' push'+(stats.pushes===1?'':'es'):'')+' · avg '+researchRate(stats.avg,1)+'</em></span>';
  }

  function propChartRangeSeries(series,range='10'){
    if(range==='season')return propSeasonSeries(series);
    const count=Math.max(1,Number(range)||10);
    return series.slice(0,count);
  }

  function propChartDateLabel(value){
    if(!value)return '—';
    const raw=String(value);
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+'T12:00:00'):new Date(raw);
    if(Number.isNaN(parsed.getTime()))return raw.slice(5,10).replace('-','/');
    return new Intl.DateTimeFormat(undefined,{month:'numeric',day:'numeric'}).format(parsed);
  }

  function renderPropRecentChart(series,row,range='10'){
    const line=Number(row?.line);
    const selected=propChartRangeSeries(series,range);
    if(!selected.length||!Number.isFinite(line))return '';
    const chronological=[...selected].reverse();
    const values=chronological.map(item=>Number(item.value)).filter(Number.isFinite);
    if(!values.length)return '';
    const maxValue=Math.max(1,line,...values);
    const ceiling=maxValue*1.12;
    const trackHeight=112;
    const thresholdPx=32+Math.max(0,Math.min(trackHeight,(line/ceiling)*trackHeight));
    const ranges=[
      ['5','L5'],['10','L10'],['15','L15'],['30','L30'],['season','SEASON']
    ].filter(([key])=>key==='season'||series.length>=Number(key));
    const chips=ranges.map(([key,label])=>'<button type="button" data-props-chart-range="'+key+'" class="'+(String(range)===key?'is-active':'')+'">'+label+'</button>').join('');
    const bars=chronological.map(item=>{
      const value=Number(item.value);
      if(!Number.isFinite(value))return '';
      const push=Math.abs(value-line)<1e-9;
      const hit=!push&&(row.side==='under'?value<line:value>line);
      const height=Math.max(4,Math.min(trackHeight,(value/ceiling)*trackHeight));
      const state=push?'PUSH':hit?'HIT':'MISS';
      return '<span class="prop-game-chart-cell '+(push?'is-push':hit?'is-hit':'is-miss')+'" title="'+esc(String(item.date||''))+' · '+esc(researchRate(value,1))+' · '+state+'">'
        +'<span class="prop-game-chart-track"><i class="prop-game-chart-bar" style="--bar-h:'+height.toFixed(1)+'px"></i><b>'+esc(researchRate(value,1))+'</b></span>'
        +'<small>'+esc(propChartDateLabel(item.date))+'</small>'+(item.opponent?'<em>'+esc((item.homeAway==='away'?'@ ':'vs ')+item.opponent)+'</em>':'')+'</span>';
    }).join('');
    return '<section class="prop-game-chart">'
      +'<div class="prop-game-chart-head"><div><b>RECENT GAME PERFORMANCE</b><small>verified result vs exact '+esc(propSelectionText(row))+' threshold</small></div><div class="prop-game-chart-ranges">'+chips+'</div></div>'
      +'<div class="prop-game-chart-scroll"><div class="prop-game-chart-bars" style="--threshold-y:'+thresholdPx.toFixed(1)+'px"><span class="prop-game-chart-threshold"><em>LINE '+esc(researchRate(line,1))+'</em></span>'+bars+'</div></div>'
      +'<div class="prop-game-chart-key"><span><i class="is-hit"></i>HIT</span><span><i class="is-miss"></i>MISS</span><span><i class="is-push"></i>PUSH</span></div>'
      +'</section>';
  }

  function renderPropHitRate(data,row,range='10'){
    const series=propSeriesForRow(data,row);
    if(!series.length){
      return '<div class="prop-intel-empty"><b>Exact-line hit rate unavailable.</b><small>'+esc(data?.reason||'The verified game log does not expose this market yet. TSO will not infer it from season totals.')+'</small></div>';
    }
    const l5=propWindowStats(series,row,5),l10=propWindowStats(series,row,10),season=propWindowStats(propSeasonSeries(series),row);
    const recent=series.slice(0,10);
    const dots=recent.map(item=>{
      const line=Number(row.line),v=Number(item.value);
      const push=Math.abs(v-line)<1e-9,hit=!push&&(row.side==='under'?v<line:v>line);
      return '<span class="'+(push?'is-push':hit?'is-hit':'is-miss')+'" title="'+esc(String(item.date||''))+' · '+esc(researchRate(v,1))+'">'+esc(researchRate(v,1))+'</span>';
    }).join('');
    const source=series[0]?.source||'verified game log';
    return '<div class="prop-intel-metrics">'+propRateCard('L5',l5)+propRateCard('L10',l10)+propRateCard('SEASON',season)+'</div>'
      +renderPropRecentChart(series,row,range)
      +'<div class="prop-hit-sequence"><div><b>LAST '+recent.length+'</b><small>'+esc(propSelectionText(row))+' · exact threshold</small></div><div>'+dots+'</div></div>'
      +'<div class="prop-intel-source">SOURCE · '+esc(source)+' · pushes excluded from hit-rate denominator</div>';
  }

  function bindPropRecentChart(node,data,row){
    if(!node||!data?.available)return;
    node.querySelectorAll('[data-props-chart-range]').forEach(btn=>btn.addEventListener('click',()=>{
      const range=String(btn.dataset.propsChartRange||'10');
      node.innerHTML=renderPropHitRate(data,row,range);
      bindPropRecentChart(node,data,row);
    }));
  }

  function renderPropPriceHistory(data,row,book){
    if(!data?.available||!data.current){
      return '<div class="prop-intel-empty"><b>No committed movement history found.</b><small>'+esc(data?.reason||data?.error||'This exact selection has not appeared in the recent committed snapshot window.')+'</small></div>';
    }
    const open=data.open,current=data.current;
    const oi=americanImpliedPct(open.price),ci=americanImpliedPct(current.price);
    const move=Number.isFinite(oi)&&Number.isFinite(ci)?ci-oi:null;
    const tone=Number.isFinite(move)?(move>.15?'is-shorter':move<-.15?'is-drifter':'is-flat'):'is-flat';
    const label=Number.isFinite(move)?(move>.15?'SHORTENED':move<-.15?'DRIFTED':'UNCHANGED'):'OBSERVED';
    const points=(data.points||[]).slice(-12);
    const timeline=points.map((p,index)=>{
      const implied=americanImpliedPct(p.price);
      return '<span class="'+(index===0?'is-open ':'')+(index===points.length-1?'is-current':'')+'"><small>'+esc(new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(p.snapshotTime||p.commitTime)))+'</small><b>'+esc(americanPrice(p.price))+'</b><em>'+pct1(implied)+'</em></span>';
    }).join('');
    return '<div class="prop-move-summary '+tone+'">'
      +'<span><small>TSO OPEN</small><b>'+esc(americanPrice(open.price))+'</b><em>'+pct1(oi)+'</em></span>'
      +'<span><small>CURRENT</small><b>'+esc(americanPrice(current.price))+'</b><em>'+pct1(ci)+'</em></span>'
      +'<span><small>IMPLIED MOVE</small><b>'+(Number.isFinite(move)?((move>0?'+':'')+move.toFixed(1)+' pp'):'—')+'</b><em>'+label+'</em></span>'
      +'<span><small>SNAPSHOTS</small><b>'+String(data.points?.length||0)+'</b><em>'+esc(book||current.book||'best exact')+'</em></span>'
      +'</div><div class="prop-price-timeline">'+timeline+'</div>'
      +'<div class="prop-intel-source">TSO OPEN = earliest exact quote found in the recent committed TSO snapshot window · '+esc(String(data.commitsChecked||0))+' commits checked</div>';
  }

  async function loadPropIntel(row,overlay,book){
    const rateNode=overlay.querySelector('[data-props-hit-rate]');
    const historyNode=overlay.querySelector('[data-props-price-history]');
    if(rateNode)rateNode.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Calculating exact-line hit rates…</b></div>';
    if(historyNode)historyNode.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Reconstructing committed price history…</b></div>';
    const [researchResult,historyResult]=await Promise.allSettled([propResearchPayload(row),propHistoryPayload(row,book)]);
    if(rateNode){
      rateNode.innerHTML=researchResult.status==='fulfilled'?renderPropHitRate(researchResult.value,row):'<div class="prop-intel-empty"><b>Hit-rate research unavailable.</b><small>'+esc(researchResult.reason?.message||String(researchResult.reason||''))+'</small></div>';
      if(researchResult.status==='fulfilled')bindPropRecentChart(rateNode,researchResult.value,row);
    }
    if(historyNode){
      historyNode.innerHTML=historyResult.status==='fulfilled'?renderPropPriceHistory(historyResult.value,row,book):'<div class="prop-intel-empty"><b>Price history unavailable.</b><small>'+esc(historyResult.reason?.message||String(historyResult.reason||''))+'</small></div>';
    }
  }

  function closePropsCompare(){
    document.querySelector('.props-compare-overlay')?.remove();
    document.body.classList.remove('props-compare-open');
  }

  function addPropToParlay(row){
    if(!row)return;
    const key=String(row.key||'');
    if(!key)return;
    if(!parlayLegKeys.includes(key)){
      if(parlayLegKeys.length>=8){notify('Parlay Lab supports up to 8 exact selections.');return;}
      parlayLegKeys.push(key);
    }
    parlayTarget=Math.max(2,Math.min(5,parlayLegKeys.length));
    closePropsCompare();
    setRoute('parlays');
    notify(row.player+' '+propSelectionText(row)+' added to Parlay Lab.');
  }

  function openPropsCompare(row){
    if(!row)return;
    closePropsCompare();
    const original=(propsFeedCache?.rows||[]).find(x=>String(x.key)===String(row.key))||row;
    const books=[...(original.books||[])].filter(b=>Number.isFinite(Number(b?.price))).sort((a,b)=>Number(b.price)-Number(a.price));
    const hasModel=Number.isFinite(Number(original?.model?.probabilityPct));
    const defaultBook=original.book||books[0]?.book||'';
    const overlay=document.createElement('div');
    overlay.className='props-compare-overlay';
    overlay.innerHTML='<div class="props-compare-shell" role="dialog" aria-modal="true">'
      +'<div class="props-compare-hero"><button class="props-compare-close" data-props-compare-close aria-label="Close">×</button>'
      +'<div class="props-compare-player">'+propHeadshotMarkup(original,'props-compare-headshot')+'<div><span>'+esc(leagueLabel(original.sport))+' · PROP INTELLIGENCE</span><h2>'+esc(original.player)+'</h2><p>'+esc(original.marketLabel||original.market)+' · '+esc(propSelectionText(original))+' · '+esc(original.awayTeam||'')+' @ '+esc(original.homeTeam||'')+'</p></div></div>'
      +'<div class="props-compare-summary"><span><small>BOOKS</small><b>'+books.length+'</b></span><span><small>MODEL</small><b>'+(hasModel?pct1(original.model.probabilityPct):'—')+'</b></span><span><small>BEST</small><b>'+esc(americanPrice(original.price))+'</b></span></div></div>'
      +'<div class="props-compare-table"><div class="props-compare-head"><span>SPORTSBOOK</span><span>PRICE</span><span>IMPLIED</span><span>MODEL EDGE</span><span>UPDATED</span><span>ACTION</span></div>'
      +(books.length?books.map((book,index)=>{
        const implied=americanImpliedPct(book.price);
        const edge=hasModel&&Number.isFinite(implied)?Number(original.model.probabilityPct)-implied:null;
        return '<div class="props-compare-row '+(index===0?'is-best':'')+'"><span><b>'+esc(book.book||'Sportsbook')+'</b><small>'+(index===0?'BEST VERIFIED PRICE':'exact selection')+'</small></span><strong>'+esc(americanPrice(book.price))+'</strong><strong>'+pct1(implied)+'</strong><strong class="'+(Number.isFinite(edge)?(edge>=0?'positive':'negative'):'')+'">'+(Number.isFinite(edge)?edgeText(edge):'—')+'</strong><span>'+esc(ageText(book.snapshotTime||original.snapshotTime))+'</span>'+(book.link?'<a href="'+esc(book.link)+'" target="_blank" rel="noopener">OPEN →</a>':'<em>NO LINK</em>')+'</div>';
      }).join(''):'<div class="research-detail-empty"><b>No exact sportsbook rows are attached to this selection.</b></div>')+'</div>'
      +renderModelDistribution(original,true)
      +'<div class="prop-intel-duo">'
        +'<article class="prop-intel-panel"><div class="prop-intel-panel-head"><div><span class="gold-kicker">EXACT-LINE PERFORMANCE</span><h3>How often has this exact side hit?</h3></div><b>'+esc(propSelectionText(original))+'</b></div><div data-props-hit-rate></div></article>'
        +'<article class="prop-intel-panel"><div class="prop-intel-panel-head"><div><span class="violet-kicker">PRICE MOVEMENT</span><h3>TSO open → current</h3></div><select data-props-history-book aria-label="Sportsbook history">'+books.map(b=>'<option value="'+esc(b.book)+'" '+(String(b.book)===String(defaultBook)?'selected':'')+'>'+esc(String(b.book).toUpperCase())+'</option>').join('')+'</select></div><div data-props-price-history></div></article>'
      +'</div>'
      +'<div class="props-compare-footer"><div><span>EXACT PLAYER + MARKET + SIDE + LINE</span><small>'+(hasModel?'Edge recalculated independently for every sportsbook price.':'Market-only selection · no model probability invented.')+'</small></div><div><button data-props-compare-research '+(['nhl','nfl','mlb','nba'].includes(String(original.sport))?'':'disabled')+'>DEEP RESEARCH</button><button class="is-primary" data-props-compare-parlay>+ PARLAY LAB</button></div></div>'
      +'</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('props-compare-open');
    overlay.querySelector('[data-props-compare-close]')?.addEventListener('click',closePropsCompare);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closePropsCompare();});
    overlay.querySelector('[data-props-compare-research]')?.addEventListener('click',()=>{closePropsCompare();openResearchDetail(original);});
    overlay.querySelector('[data-props-compare-parlay]')?.addEventListener('click',()=>addPropToParlay(original));
    const historySelect=overlay.querySelector('[data-props-history-book]');
    historySelect?.addEventListener('change',()=>{
      const node=overlay.querySelector('[data-props-price-history]');
      if(node)node.innerHTML='<div class="prop-intel-loading"><span class="live-feed-spinner"></span><b>Loading '+esc(historySelect.value)+' history…</b></div>';
      propHistoryPayload(original,historySelect.value).then(payload=>{if(node)node.innerHTML=renderPropPriceHistory(payload,original,historySelect.value);}).catch(error=>{if(node)node.innerHTML='<div class="prop-intel-empty"><b>Price history unavailable.</b><small>'+esc(error?.message||String(error))+'</small></div>';});
    });
    bindMediaFallbacks();
    loadPropIntel(original,overlay,defaultBook);
  }

  function bindPropsGeneratedActions(){
    document.querySelectorAll('[data-props-compare]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      openPropsCompare(researchRowByKey(btn.dataset.propsCompare));
    });
    document.querySelectorAll('[data-props-research]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      const row=researchRowByKey(btn.dataset.propsResearch);
      if(row)openResearchDetail(row);
    });
    document.querySelectorAll('[data-props-parlay]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();
      addPropToParlay(researchRowByKey(btn.dataset.propsParlay));
    });
    document.querySelectorAll('[data-props-save]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();void savePropsPick(currentPropsRows().find(row=>String(row.key)===String(btn.dataset.propsSave)),btn);
    });
    document.querySelectorAll('[data-props-watch]').forEach(btn=>btn.onclick=event=>{
      event.stopPropagation();void watchPropsPlayer(currentPropsRows().find(row=>String(row.key)===String(btn.dataset.propsWatch)),btn);
    });
  }

  function renderPropsFeed(){
    const root=document.querySelector('[data-props-route]');
    if(currentRoute!=='props' || !root || !propsFeedCache) return;
    syncPropsFilterOptions(root);
    const rows=currentPropsRows();
    const newest=propsNewestTimestamp(rows);
    const freshness=freshnessLabel(newest);
    const books=new Set();
    rows.forEach(row=>(row.books||[{book:row.book}]).forEach(b=>{if(b?.book)books.add(b.book)}));
    const preserved=rows.filter(row=>row.preserved).length;

    const badge=root.querySelector('[data-props-feed-badge]');
    if(badge){
      badge.className='props-feed-badge is-'+freshness.tone;
      badge.innerHTML='<i></i> '+esc(freshness.label);
    }
    const modelMatched=rows.filter(row=>Number.isFinite(Number(row?.model?.probabilityPct))).length;
    const status=root.querySelector('[data-props-status]');
    if(status){
      const players=new Set(rows.map(row=>String(row.player||'').toLowerCase())).size;
      status.innerHTML='<div><span class="props-live-dot"></span><b>UNIVERSAL PROP ENGINE</b><small>exact sportsbook selections</small></div><span class="props-status-divider"></span><div><b>'+rows.length+'</b><small>exact selections</small></div><span class="props-status-divider"></span><div><b>'+players+'</b><small>players</small></div><span class="props-status-divider"></span><div><b>'+modelMatched+'</b><small>model matched</small></div><span class="props-status-divider"></span><div><b>'+books.size+'</b><small>sportsbooks</small></div><span class="props-status-divider"></span><div><b>'+esc(newest?ageText(newest):'—')+'</b><small>source freshness</small></div>';
    }
    const title=root.querySelector('[data-props-board-title]');
    if(title) title.textContent=(currentLeague==='all'?'All sports':leagueLabel(currentLeague))+' · '+rows.length+' verified · '+modelMatched+' exact model matches';
    const modelTitle=root.querySelector('[data-props-model-title]');
    if(modelTitle) modelTitle.textContent=modelMatched+' exact model match'+(modelMatched===1?'':'es');
    const modelCoverage=root.querySelector('[data-props-model-coverage]');
    if(modelCoverage) modelCoverage.textContent=rows.length?Math.round(modelMatched/rows.length*100)+'% OF FILTER':'0%';
    const freshTitle=root.querySelector('[data-props-freshness-title]');
    if(freshTitle) freshTitle.textContent=freshness.label;
    const freshCopy=root.querySelector('[data-props-freshness-copy]');
    if(freshCopy) freshCopy.textContent=newest?'Newest exact-selection snapshot is '+ageText(newest)+' old. TSO keeps the timestamp visible instead of relabeling an older quote as live.':'No verified timestamp is available for this filter.';
    const preservedNode=root.querySelector('[data-props-preserved]');
    if(preservedNode) preservedNode.textContent=String(preserved);

    renderPropsMarketRail(root,rows);
    renderPropsFeature(root,sortPropsToolRows(rows,propsSortMode(root)));
    renderPropsBooks(root,rows);
    renderPropsBoard(root,rows);
  }

  function nbaModelKey(row){
    const player=String(row?.player||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
    return [String(row?.eventId||''),player,String(row?.market||''),Number(row?.line)].join('|');
  }

  function mergeNbaModels(payload,nbaDoc){
    if(!payload||!Array.isArray(payload.rows)||!Array.isArray(nbaDoc?.models))return payload;
    const byKey=new Map(nbaDoc.models.map(model=>[String(model.key||''),model]));
    const rows=payload.rows.map(row=>{
      if(String(row?.sport||'').toLowerCase()!=='nba')return row;
      const modelRow=byKey.get(nbaModelKey(row));
      if(!modelRow)return row;
      const base={
        ...row,
        playerId:modelRow.playerId||row.playerId||null,
        team:modelRow.team||row.team||null,
        headshotUrl:modelRow.headshot||row.headshotUrl||null
      };
      if(modelRow.available===false)return base;
      const side=String(row.side||'over').toLowerCase();
      const probability=(side==='under'?Number(modelRow.underProbability):Number(modelRow.overProbability))*100;
      if(!Number.isFinite(probability))return base;
      const implied=Number(row.impliedPct);
      const edge=Number.isFinite(implied)?probability-implied:null;
      return {
        ...base,
        model:{
          source:'nba-regression-v1',
          sourceLabel:'NBA REGRESSION v1',
          phase:'pregame',
          probabilityPct:probability,
          marketProbabilityPct:Number.isFinite(implied)?implied:null,
          edgePct:edge,
          projection:modelRow.projection,
          sigma:modelRow.sigma,
          grade:modelRow.grade,
          tag:modelRow.grade,
          confidencePct:Number(modelRow.confidence)*100,
          sampleGames:modelRow.sampleGames,
          last5:modelRow.last5,
          last10:modelRow.last10,
          seasonBaseline:modelRow.seasonBaseline,
          averageMinutes:modelRow.averageMinutes,
          recentMinutes:modelRow.recentMinutes,
          usageProxy:modelRow.usageProxy,
          recentUsageProxy:modelRow.recentUsageProxy,
          restDays:modelRow.restDays,
          injury:modelRow.injury||null,
          opponent:modelRow.opponent||null,
          venue:modelRow.venue||null,
          opponentAllowance:modelRow.opponentAllowance,
          leaguePositionAllowance:modelRow.leaguePositionAllowance,
          expectedPace:modelRow.expectedPace,
          leaguePace:modelRow.leaguePace,
          factors:modelRow.factors||null,
          generatedAt:modelRow.researchGeneratedAt||nbaDoc.researchGeneratedAt||nbaDoc.generatedAt||null,
          version:modelRow.version||'nba-regression-v1'
        }
      };
    });
    return {...payload,rows,nbaModel:{source:nbaDoc.source||'tso-nba-regression-v1',generatedAt:nbaDoc.generatedAt||null,count:nbaDoc.models.length}};
  }

  async function fetchNbaModels(){
    try{
      const response=await fetch(NBA_MODEL_BASE,{cache:'no-store'});
      if(!response.ok)throw new Error('NBA model HTTP '+response.status);
      const payload=await response.json();
      if(!payload||!Array.isArray(payload.models))throw new Error('Invalid NBA model payload');
      return payload;
    }catch(error){
      console.error('TSO NBA model:',error);
      return null;
    }
  }

  async function refreshPropsData(force=false){
    if(propsFeedInFlight) return propsFeedInFlight;
    if(!force && propsFeedCache && Date.now()-propsFeedFetchedAt < PROPS_FEED_TTL){
      renderPropsFeed();
      renderFeedIntegrity();
      propsFeedError=null;
      renderNotificationCenter();
      renderModelsFeed();
      renderHomeModels();
      renderLiveModelPulse();
      renderParlayLab();
      renderCommunity();
      renderLeaderboard();
      renderProfile();
      renderResearch();
      return propsFeedCache;
    }
    propsFeedInFlight=Promise.all([
      fetch('/api/props?league=all',{cache:'no-store'}).then(async response=>{
        if(!response.ok) throw new Error('Props feed HTTP '+response.status);
        const payload=await response.json();
        if(!payload || !Array.isArray(payload.rows)) throw new Error('Invalid props feed');
        return payload;
      }),
      fetchNbaModels()
    ])
      .then(([payload,nbaModels])=>{
        const merged=guardPublishedModels(mergeNbaModels(payload,nbaModels));
        propsFeedCache=merged;
        propsFeedFetchedAt=Date.now();
        renderPropsFeed();
        renderFeedIntegrity();
        propsFeedError=null;
        renderNotificationCenter();
        renderModelsFeed();
        renderHomeModels();
        renderLiveModelPulse();
        renderParlayLab();
        renderCommunity();
        renderLeaderboard();
        renderProfile();
        renderResearch();
        return merged;
      })
      .catch(error=>{
        console.error('TSO props feed:',error);
        propsFeedError=String(error?.message||error);
        const integrityNode=document.querySelector('[data-feed-integrity]');
        if(integrityNode){integrityNode.hidden=false;integrityNode.innerHTML='<span>!</span><div><b>VERIFIED PROPS / MODEL FEED OFFLINE</b><small>TSO is not substituting example data. Automatic retry remains active.</small></div>';}
        const root=document.querySelector('[data-props-route]');
        const badge=root?.querySelector('[data-props-feed-badge]');
        if(badge){badge.className='props-feed-badge is-error';badge.innerHTML='<i></i> ODDS FEED UNAVAILABLE';}
        const board=root?.querySelector('[data-props-board]');
        if(board) board.innerHTML='<div class="live-board-loading props-empty-board"><b>Verified sportsbook feed unavailable. Retrying automatically.</b></div>';
        const modelsRoot=document.querySelector('[data-models-route]');
        const modelsBadge=modelsRoot?.querySelector('[data-models-feed-badge]');
        if(modelsBadge){modelsBadge.className='props-feed-badge is-error';modelsBadge.innerHTML='<i></i> MODEL FEED UNAVAILABLE';}
        const modelsBoard=modelsRoot?.querySelector('[data-models-board]');
        if(modelsBoard) modelsBoard.innerHTML='<div class="live-board-loading props-empty-board"><b>Real model feed unavailable because the verified Props source could not be loaded. Retrying automatically.</b></div>';
        const modelsFeature=modelsRoot?.querySelector('[data-models-feature]');
        if(modelsFeature){modelsFeature.classList.remove('live-feed-loading');modelsFeature.innerHTML='<div class="live-feed-empty"><div><b>Model feed unavailable.</b><small>TSO will not substitute preview values while the real source is unavailable.</small></div></div>';}
        const homePicks=document.querySelector('[data-home-picks]');
        if(currentRoute==='home'&&homePicks) homePicks.innerHTML='<div class="concept-picks-head"><div><span class="gold-kicker">♛ TOP OUTPOST PICKS</span><h2>Model feed unavailable</h2></div></div><div class="home-model-empty"><b>Real model data could not be loaded.</b><small>TSO will not fall back to preview picks.</small></div>';
        const homeCards=document.querySelector('[data-home-model-cards]');
        if(currentRoute==='home'&&homeCards) homeCards.innerHTML='<div class="home-model-empty home-model-empty--wide"><b>Real model cards unavailable.</b><small>Retrying automatically.</small></div>';
        const parlayRoot=document.querySelector('[data-parlays-route]');
        if(currentRoute==='parlays'&&parlayRoot){
          const parlayStatus=parlayRoot.querySelector('[data-parlay-status]');
          if(parlayStatus) parlayStatus.innerHTML='<div><span class="parlays-preview-dot"></span><b>PARLAY FEED UNAVAILABLE</b><small>TSO will not substitute demo legs.</small></div>';
          const parlayLegs=parlayRoot.querySelector('[data-parlay-legs]');
          if(parlayLegs) parlayLegs.innerHTML='<div class="live-board-loading"><div><b>Verified Props/model feed unavailable.</b><small>Retrying automatically. No preview parlay is being shown.</small></div></div>';
        }
        const communityFeed=document.querySelector('[data-community-feed]');
        if(currentRoute==='community'&&communityFeed) communityFeed.innerHTML='<div class="live-board-loading panel"><div><b>Model Pulse unavailable.</b><small>No fake Community activity will be substituted.</small></div></div>';
        const rankingsBoard=document.querySelector('[data-rankings-board]');
        if(currentRoute==='leaderboard'&&rankingsBoard) rankingsBoard.innerHTML='<div class="live-board-loading"><div><b>Real model ranking unavailable.</b><small>User standings remain offline.</small></div></div>';
        const profileSignals=document.querySelector('.profile-page [data-profile-signals]');
        if(currentRoute==='profile'&&profileSignals) profileSignals.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>Verified model feed unavailable.</b><small>Profile will not substitute fake tracked picks or performance history.</small></div></div>';
        const researchResults=document.querySelector('[data-research-results]');
        if(currentRoute==='research'&&researchResults) researchResults.innerHTML='<div class="live-board-loading"><div><b>Verified prop/model feed unavailable.</b><small>Research will not substitute preview statistics.</small></div></div>';
        if(currentRoute==='live'){
          const liveGrid=document.querySelector('[data-live-model-grid]');
          const liveSource=document.querySelector('[data-live-model-source]');
          if(liveSource){liveSource.classList.add('is-fallback');liveSource.innerHTML='<span class="live-pulse is-idle"></span><div><b>MODEL / MARKET FEED UNAVAILABLE</b><small>TSO will not substitute example cards.</small></div>';}
          if(liveGrid)liveGrid.innerHTML='<div class="live-board-loading home-model-empty--wide"><div><b>Verified model signals unavailable.</b><small>Retrying automatically. No preview data is shown.</small></div></div>';
        }
        renderProfile();
        renderResearch();
        renderNotificationCenter();
        return null;
      })
      .finally(()=>{propsFeedInFlight=null});
    return propsFeedInFlight;
  }


  function gameEdgeAmericanImplied(price){
    const n=Number(price);
    if(!Number.isFinite(n)||Math.abs(n)<100)return null;
    return n>0?100/(n+100):(-n)/((-n)+100);
  }

  function gameEdgeFairPair({leftPrice=null,rightPrice=null,leftProbability=null,rightProbability=null}={}){
    let left=Number(leftProbability),right=Number(rightProbability);
    if(!(Number.isFinite(left)&&Number.isFinite(right)&&left>=0&&right>=0&&left+right>0)){
      left=gameEdgeAmericanImplied(leftPrice);
      right=gameEdgeAmericanImplied(rightPrice);
    }
    if(!(Number.isFinite(left)&&Number.isFinite(right)&&left>=0&&right>=0&&left+right>0))return null;
    const total=left+right;
    return {left:left/total,right:right/total};
  }

  function gameEdgePercentages(pair){
    if(!pair)return {left:50,right:50,available:false};
    const left=Math.max(0,Math.min(1,Number(pair.left)||0));
    return {left:left*100,right:(1-left)*100,available:true};
  }

  function gameEdgeAmerican(price){
    const n=Number(price);
    if(!Number.isFinite(n))return '—';
    return n>0?'+'+Math.round(n):String(Math.round(n));
  }

  function gameEdgeLineNumber(value,signed=false){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    const out=Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,'');
    return signed&&n>0?'+'+out:out;
  }

  function gameEdgeGameStatus(game){
    const state=String(game?.status||game?.state||'').toLowerCase();
    if(state==='post')return 'FINAL';
    if(state==='in')return game?.detail||('P'+(game?.period||'—')+' '+(game?.clock||''));
    const t=Date.parse(game?.startTime||game?.startDateUTC||'');
    return Number.isFinite(t)?new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'SCHEDULED';
  }

  function gameEdgeMarketMarkup({title,lineText,leftLabel,leftSub,rightLabel,rightSub,pair,total=false,reason}){
    const p=gameEdgePercentages(pair);
    const leader=!p.available?'none':Math.abs(p.left-p.right)<2?'even':(p.left>p.right?'left':'right');
    const leaderLabel=leader==='left'?leftLabel:leader==='right'?rightLabel:'EVEN';
    const leaderPct=p.available?Math.max(p.left,p.right).toFixed(0)+'%':'—';
    const tone=String(title||'').toLowerCase()==='spread'?'spread':String(title||'').toLowerCase()==='moneyline'?'moneyline':'total';
    return '<section class="edge2-market edge2-market--'+tone+'">'
      +'<div class="edge2-market-head"><div><span>CORE MARKET</span><b>'+esc(title)+'</b></div><strong>'+esc(lineText)+'</strong></div>'
      +'<div class="edge2-market-sides">'
        +'<span class="'+(leader==='left'?'is-leader':'')+'"><small>'+esc(leftSub)+'</small><b>'+esc(leftLabel)+'</b><strong>'+(p.available?p.left.toFixed(0)+'%':'—')+'</strong></span>'
        +'<em>VS</em>'
        +'<span class="'+(leader==='right'?'is-leader':'')+'"><small>'+esc(rightSub)+'</small><b>'+esc(rightLabel)+'</b><strong>'+(p.available?p.right.toFixed(0)+'%':'—')+'</strong></span>'
      +'</div>'
      +'<div class="edge2-bar '+(total?'is-total':'')+'"><i style="width:'+p.left.toFixed(1)+'%"></i><i style="width:'+p.right.toFixed(1)+'%"></i></div>'
      +'<div class="edge2-call"><span>EDGE CALL</span><b>'+esc(leaderLabel)+' · '+esc(leaderPct)+'</b></div>'
      +'<p class="edge2-reason">'+reason+'</p>'
    +'</section>';
  }

  function gameEdgeTeamLabel(team){
    return String(team?.name||team?.abbr||'Team');
  }

  function gameEdgeRecordText(team,side){
    const name=gameEdgeTeamLabel(team);
    const overall=String(team?.record||'').trim();
    const split=String(side==='home'?(team?.homeRecord||''):(team?.awayRecord||'')).trim();
    if(overall&&split&&split!==overall)return name+' is '+overall+' overall and '+split+' '+(side==='home'?'at home':'on the road');
    if(overall)return name+' is '+overall+' overall';
    if(split)return name+' is '+split+' '+(side==='home'?'at home':'on the road');
    return name+' is '+(side==='home'?'at home':'on the road');
  }

  function gameEdgeSpreadReason(game,leanSide,lineValue,lineName){
    const side=leanSide==='away'?'away':'home';
    const team=game?.[side]||{};
    const oppSide=side==='away'?'home':'away';
    const opp=game?.[oppSide]||{};
    const teamName=gameEdgeTeamLabel(team);
    const oppName=gameEdgeTeamLabel(opp);
    const signed=gameEdgeLineNumber(lineValue,true);
    const n=Number(lineValue);
    const unit=currentLeague==='mlb'?'runs':currentLeague==='nhl'?'goals':'points';
    const location=side==='home'?'has home-field advantage':'is being trusted on the road';
    const lineRead=Number.isFinite(n)
      ? (n<0
          ? 'the line asks '+teamName+' to clear a '+gameEdgeLineNumber(Math.abs(n))+'-'+unit+' margin'
          : n>0
            ? teamName+' gets a '+gameEdgeLineNumber(Math.abs(n))+'-'+unit+' cushion even if the game stays tight'
            : 'the matchup is effectively priced as a pick’em')
      : 'the current spread still leans to '+teamName;
    const oppRecord=String(opp?.record||'').trim();
    return '<strong>'+esc(teamName+' '+signed)+'</strong> is the '+esc(lineName.toLowerCase())+' lean because '+esc(gameEdgeRecordText(team,side))+', '+esc(location)+', and '+esc(lineRead)+' against '+esc(oppName)+(oppRecord?' ('+esc(oppRecord)+' overall)':'')+'.';
  }

  function gameEdgeMoneylineReason(game,leanSide,leanPrice,otherPrice){
    const side=leanSide==='away'?'away':'home';
    const team=game?.[side]||{};
    const oppSide=side==='away'?'home':'away';
    const opp=game?.[oppSide]||{};
    const teamName=gameEdgeTeamLabel(team);
    const oppName=gameEdgeTeamLabel(opp);
    const location=side==='home'?'gets the home-field edge':'is favored despite playing on the road';
    const oppRecord=String(opp?.record||'').trim();
    const prices=Number.isFinite(Number(leanPrice))&&Number.isFinite(Number(otherPrice))
      ? ', and its '+gameEdgeAmerican(leanPrice)+' moneyline is shorter than '+oppName+' at '+gameEdgeAmerican(otherPrice)
      : '';
    return '<strong>'+esc(teamName+' to win')+'</strong> is the outright lean because '+esc(gameEdgeRecordText(team,side))+', '+esc(location)+prices+(oppRecord?', while '+esc(oppName)+' enters '+esc(oppRecord)+' overall':'')+'.';
  }

  function gameEdgeTotalReason(game,lean,line){
    const away=gameEdgeTeamLabel(game?.away);
    const home=gameEdgeTeamLabel(game?.home);
    const n=Number(line);
    const unit=currentLeague==='mlb'?'runs':currentLeague==='nhl'?'goals':'points';
    const lineLabel=gameEdgeLineNumber(line);
    if(!Number.isFinite(n))return 'The total is not fully posted yet, so there is not enough verified information to explain a scoring lean.';
    const perTeam=(n/2).toFixed(1).replace(/\.0$/,'');
    if(lean==='Under'){
      const extra=(currentLeague==='nfl'||currentLeague==='nba')
        ? ' — roughly '+perTeam+' '+unit+' per team if scoring is split evenly'
        : '';
      return '<strong>Under '+esc(lineLabel)+'</strong> is the scoring lean because the current total price is shaded toward '+esc(away)+' and '+esc(home)+' staying below '+esc(lineLabel)+' combined '+unit+extra+'.';
    }
    const extra=(currentLeague==='nfl'||currentLeague==='nba')
      ? ' — roughly '+perTeam+' '+unit+' per team if scoring is split evenly'
      : '';
    return '<strong>Over '+esc(lineLabel)+'</strong> is the scoring lean because the current total price is shaded toward '+esc(away)+' and '+esc(home)+' clearing '+esc(lineLabel)+' combined '+unit+extra+'.';
  }

  function gameEdgeSpread(game,lineRow){
    if(currentLeague==='nhl'){
      const s=lineRow?.puckLine;
      if(!s)return gameEdgeMarketMarkup({
        title:'Spread',lineText:'Puck Line',leftLabel:game?.away?.abbr||'AWAY',leftSub:'—',
        rightLabel:game?.home?.abbr||'HOME',rightSub:'—',pair:null,
        reason:'No verified two-sided puck-line market is available yet.'
      });
      const favAway=String(s.favoriteAbbr||'')===String(game?.away?.abbr||'');
      const favoritePair=gameEdgeFairPair({leftPrice:s.price,rightPrice:s.underdogPrice});
      const pair=favoritePair?(favAway?favoritePair:{left:favoritePair.right,right:favoritePair.left}):null;
      const awayLine=favAway?s.line:s.underdogLine;
      const homeLine=favAway?s.underdogLine:s.line;
      const p=gameEdgePercentages(pair);
      const lean=p.left>p.right
        ? String(game?.away?.abbr||'AWAY')+' '+gameEdgeLineNumber(awayLine,true)
        : String(game?.home?.abbr||'HOME')+' '+gameEdgeLineNumber(homeLine,true);
      const leanSide=p.left>p.right?'away':'home';
      const reason=pair
        ? gameEdgeSpreadReason(game,leanSide,leanSide==='away'?awayLine:homeLine,'Puck Line')
        : 'The puck line is posted, but both side prices are not available yet.';
      return gameEdgeMarketMarkup({
        title:'Spread',lineText:'Puck Line',
        leftLabel:String(game?.away?.abbr||'AWAY')+' '+gameEdgeLineNumber(awayLine,true),
        leftSub:favAway?gameEdgeAmerican(s.price):gameEdgeAmerican(s.underdogPrice),
        rightLabel:String(game?.home?.abbr||'HOME')+' '+gameEdgeLineNumber(homeLine,true),
        rightSub:favAway?gameEdgeAmerican(s.underdogPrice):gameEdgeAmerican(s.price),
        pair,reason
      });
    }

    const s=lineRow?.spread;
    const awayLine=s?.away?.point;
    const homeLine=s?.home?.point;
    const awayPrice=s?.away?.price;
    const homePrice=s?.home?.price;
    const pair=s?gameEdgeFairPair({leftPrice:awayPrice,rightPrice:homePrice}):null;
    const p=gameEdgePercentages(pair);
    const lineName=currentLeague==='mlb'?'Run Line':'Point Spread';
    const lean=p.left>p.right
      ? String(game?.away?.abbr||'AWAY')+' '+gameEdgeLineNumber(awayLine,true)
      : String(game?.home?.abbr||'HOME')+' '+gameEdgeLineNumber(homeLine,true);
    const leanSide=p.left>p.right?'away':'home';
    const reason=pair
      ? gameEdgeSpreadReason(game,leanSide,leanSide==='away'?awayLine:homeLine,lineName)
      : 'No verified two-sided '+lineName.toLowerCase()+' is posted yet.';
    return gameEdgeMarketMarkup({
      title:'Spread',lineText:lineName,
      leftLabel:String(game?.away?.abbr||'AWAY')+' '+gameEdgeLineNumber(awayLine,true),leftSub:gameEdgeAmerican(awayPrice),
      rightLabel:String(game?.home?.abbr||'HOME')+' '+gameEdgeLineNumber(homeLine,true),rightSub:gameEdgeAmerican(homePrice),
      pair,reason
    });
  }

  function gameEdgeMoneyline(game,lineRow){
    const m=lineRow?.moneyline;
    const awayPrice=m?.awayBest ?? m?.away?.price;
    const homePrice=m?.homeBest ?? m?.home?.price;
    const pair=m?gameEdgeFairPair({
      leftProbability:m.awayFair,
      rightProbability:m.homeFair,
      leftPrice:awayPrice,
      rightPrice:homePrice
    }):null;
    const p=gameEdgePercentages(pair);
    const lean=p.left>p.right?String(game?.away?.abbr||'AWAY'):String(game?.home?.abbr||'HOME');
    const leanSide=p.left>p.right?'away':'home';
    const reason=pair
      ? gameEdgeMoneylineReason(game,leanSide,leanSide==='away'?awayPrice:homePrice,leanSide==='away'?homePrice:awayPrice)
      : 'No verified two-sided moneyline is available yet.';
    return gameEdgeMarketMarkup({
      title:'Moneyline',lineText:'Win outright',
      leftLabel:game?.away?.abbr||'AWAY',leftSub:gameEdgeAmerican(awayPrice),
      rightLabel:game?.home?.abbr||'HOME',rightSub:gameEdgeAmerican(homePrice),
      pair,reason
    });
  }

  function gameEdgeTotal(game,lineRow){
    const t=lineRow?.total;
    const line=t?.line;
    const underPrice=t?.underPrice ?? t?.under?.price;
    const overPrice=t?.overPrice ?? t?.over?.price;
    const pair=t?gameEdgeFairPair({leftPrice:underPrice,rightPrice:overPrice}):null;
    const p=gameEdgePercentages(pair);
    const lean=p.left>p.right?'Under':'Over';
    const reason=pair
      ? gameEdgeTotalReason(game,lean,line)
      : 'The total is '+esc(gameEdgeLineNumber(line))+', but there is not enough verified two-sided price data for a lean yet.';
    return gameEdgeMarketMarkup({
      title:'Total',lineText:line!=null?'O/U '+gameEdgeLineNumber(line):'No total',
      leftLabel:'Under '+gameEdgeLineNumber(line),leftSub:gameEdgeAmerican(underPrice),
      rightLabel:'Over '+gameEdgeLineNumber(line),rightSub:gameEdgeAmerican(overPrice),
      pair,total:true,reason
    });
  }

  function gameEdgeCard(game,lineRow){
    const status=gameEdgeGameStatus(game);
    const venue=String(game?.venue||leagueLabel(currentLeague));
    return '<article class="edge2-game">'
      +'<header class="edge2-game-head">'
        +'<div class="edge2-game-context"><span>'+esc(String(currentLeague).toUpperCase())+' GAME EDGE</span><b>'+esc(status)+'</b><small>'+esc(venue)+'</small></div>'
        +'<div class="edge2-matchup">'
          +'<div class="edge2-team"><span class="edge2-team-logo"><img data-team-logo src="'+esc(game?.away?.logo||'')+'" alt="" /></span><div><b>'+esc(game?.away?.abbr||'AWAY')+'</b><small>'+esc(game?.away?.name||'Away')+'</small></div></div>'
          +'<span class="edge2-at">@</span>'
          +'<div class="edge2-team is-home"><div><b>'+esc(game?.home?.abbr||'HOME')+'</b><small>'+esc(game?.home?.name||'Home')+'</small></div><span class="edge2-team-logo"><img data-team-logo src="'+esc(game?.home?.logo||'')+'" alt="" /></span></div>'
        +'</div>'
        +'<div class="edge2-game-mode"><span>DECISION VIEW</span><b>SPREAD · ML · TOTAL</b><small>'+(lineRow?'Current verified market':'Lines pending')+'</small></div>'
      +'</header>'
      +'<div class="edge2-markets">'+gameEdgeSpread(game,lineRow)+gameEdgeMoneyline(game,lineRow)+gameEdgeTotal(game,lineRow)+'</div>'
    +'</article>';
  }

  function renderGameEdge(){
    const root=document.querySelector('[data-game-edge-route]');
    if(!root)return;
    const league=currentLeague;
    const cache=gameEdgeCache.get(league);
    if(!cache)return;
    const board=root.querySelector('[data-game-edge-board]');
    const badge=root.querySelector('[data-game-edge-feed-badge]');
    const status=root.querySelector('[data-game-edge-status]');
    const count=root.querySelector('[data-game-edge-game-count]');
    const fresh=root.querySelector('[data-game-edge-freshness]');
    const title=root.querySelector('[data-game-edge-market-title]');
    const games=Array.isArray(cache.games)?cache.games:[];
    const lineFor=game=>league==='nhl'?(cache.linesById?.[String(game.id)]||null):(game?.gameLines||null);
    const marketGames=games.filter(game=>lineFor(game)).length;
    if(title)title.textContent=leagueLabel(league)+' Game Edge';
    if(status)status.textContent=marketGames?leagueLabel(league).toUpperCase()+' MARKET CONNECTED':leagueLabel(league).toUpperCase()+' LINES PENDING';
    if(count)count.textContent=String(games.length);
    if(fresh)fresh.textContent='Updated '+ageText(cache.generatedAt)+' ago · '+marketGames+'/'+games.length+' games with verified markets';
    if(badge){
      badge.className='edge2-feed-badge '+(marketGames?'is-live':'is-idle');
      badge.innerHTML='<i></i> '+(marketGames?'LIVE '+leagueLabel(league).toUpperCase()+' MARKET':leagueLabel(league).toUpperCase()+' LINES PENDING');
    }
    if(board){
      board.innerHTML=games.length
        ? games.map(game=>gameEdgeCard(game,lineFor(game))).join('')
        : '<div class="edge2-empty"><span>◎</span><div><b>No '+esc(leagueLabel(league))+' games on the current slate.</b><p>Game Edge will populate automatically when the next scheduled game and verified market are posted.</p></div></div>';
    }
    bindMediaFallbacks();
  }

  async function gameEdgeJson(file){
    const response=await fetch(GAME_EDGE_RAW_BASE+file+'?v='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('Game Edge data HTTP '+response.status);
    return response.json();
  }

  async function gameEdgeScoreboard(league){
    const datePart=league==='nfl'?'':'&date='+encodeURIComponent(localDateKey());
    const response=await fetch(GAME_EDGE_SCOREBOARD_BASE+'?league='+encodeURIComponent(league)+datePart,{cache:'no-store'});
    if(!response.ok)throw new Error('Game Edge scoreboard HTTP '+response.status);
    const payload=await response.json();
    if(!payload||!Array.isArray(payload.games))throw new Error('Invalid Game Edge scoreboard payload');
    return payload;
  }

  function refreshGameEdgeData(force=false){
    const root=document.querySelector('[data-game-edge-route]');
    if(!root)return Promise.resolve(null);
    const league=currentLeague==='all'?'nhl':currentLeague;
    if(league!==currentLeague){currentLeague=league;}
    const cached=gameEdgeCache.get(league);
    const fetchedAt=gameEdgeFetchedAt.get(league)||0;
    if(!force&&cached&&Date.now()-fetchedAt<GAME_EDGE_TTL){
      renderGameEdge();return Promise.resolve(cached);
    }
    if(gameEdgeInFlight.has(league))return gameEdgeInFlight.get(league);
    const badge=root.querySelector('[data-game-edge-feed-badge]');
    if(badge){badge.className='edge2-feed-badge';badge.innerHTML='<i></i> CONNECTING '+leagueLabel(league).toUpperCase()+' MARKET';}
    const task=(league==='nhl'
      ? Promise.all([
          gameEdgeJson('nhl.json'),
          gameEdgeJson('nhl-puck-lines.json'),
          gameEdgeScoreboard('nhl').catch(()=>({games:[]}))
        ]).then(([slate,lines,context])=>{
          const byId=new Map((context.games||[]).map(game=>[String(game.id),game]));
          const byTeams=new Map((context.games||[]).map(game=>[
            String(game?.away?.abbr||'')+'@'+String(game?.home?.abbr||''),game
          ]));
          const games=(Array.isArray(slate.games)?slate.games:[]).map(game=>{
            const ctx=byId.get(String(game.id))||byTeams.get(String(game?.away?.abbr||'')+'@'+String(game?.home?.abbr||''));
            if(!ctx)return game;
            return {
              ...game,
              away:{...game.away,record:ctx.away?.record||game.away?.record||null,awayRecord:ctx.away?.awayRecord||game.away?.awayRecord||null},
              home:{...game.home,record:ctx.home?.record||game.home?.record||null,homeRecord:ctx.home?.homeRecord||game.home?.homeRecord||null}
            };
          });
          return {
            league,
            generatedAt:lines.generatedAt||slate.generatedAt||new Date().toISOString(),
            games,
            linesById:Object.fromEntries((lines.games||[]).map(row=>[String(row.gameId),row]))
          };
        })
      : gameEdgeScoreboard(league).then(payload=>({
          league,
          generatedAt:payload.generatedAt||new Date().toISOString(),
          games:payload.games||[],
          marketGames:Number(payload.marketGames||0),
          source:payload.source||'espn-scoreboard'
        }))
    ).then(cache=>{
      gameEdgeCache.set(league,cache);
      gameEdgeFetchedAt.set(league,Date.now());
      if(currentRoute==='gameedge'&&currentLeague===league)renderGameEdge();
      return cache;
    }).catch(error=>{
      console.error('TSO Game Edge:',error);
      if(currentRoute==='gameedge'&&currentLeague===league){
        const board=root.querySelector('[data-game-edge-board]');
        const status=root.querySelector('[data-game-edge-status]');
        if(status)status.textContent='MARKET FEED OFFLINE';
        if(badge){badge.className='edge2-feed-badge is-error';badge.innerHTML='<i></i> MARKET FEED UNAVAILABLE';}
        if(board)board.innerHTML='<div class="edge2-empty is-error"><span>!</span><div><b>'+esc(leagueLabel(league))+' Game Edge feed is unavailable.</b><p>'+esc(error?.message||error)+'</p></div></div>';
      }
      return null;
    }).finally(()=>{gameEdgeInFlight.delete(league);});
    gameEdgeInFlight.set(league,task);
    return task;
  }

  function closeGlobalSearch(){
    document.querySelector('.global-search-overlay')?.remove();
    document.body.classList.remove('global-search-open');
  }

  function globalSearchResults(query){
    const q=String(query||'').trim().toLowerCase();
    if(!q)return [];
    const out=[];
    for(const game of sortedGames(liveFeedCache?.games||[])){
      const hay=[game?.away?.name,game?.away?.abbr,game?.home?.name,game?.home?.abbr,game?.venue,leagueLabel(game?.league)].filter(Boolean).join(' ').toLowerCase();
      if(hay.includes(q)){
        out.push({type:'game',key:'game|'+game.league+'|'+game.id,league:game.league,title:(game.away?.abbr||'AWAY')+' @ '+(game.home?.abbr||'HOME'),sub:leagueLabel(game.league)+' · '+gameStatusText(game),game});
      }
    }
    const seenPlayers=new Set();
    for(const row of propsFeedCache?.rows||[]){
      const hay=[row.player,row.team,row.market,row.marketLabel,row.homeTeam,row.awayTeam,row.book,propSelectionText(row),leagueLabel(row.sport)].filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(q))continue;
      const model=Number.isFinite(Number(row?.model?.probabilityPct));
      const pk=[row.sport,String(row.player||'').toLowerCase()].join('|');
      if(!seenPlayers.has(pk)){
        seenPlayers.add(pk);
        out.push({type:'player',key:'player|'+pk,league:row.sport,title:row.player,sub:leagueLabel(row.sport)+' · '+(row.team||((row.awayTeam||'')+' @ '+(row.homeTeam||''))),row});
      }
      out.push({type:model?'model':'prop',key:'prop|'+row.key,league:row.sport,title:row.player+' · '+(row.marketLabel||row.market)+' · '+propSelectionText(row),sub:(model?'MODEL '+pct1(row.model.probabilityPct)+' · ':'')+americanPrice(row.price)+' '+(row.book||'verified book'),row});
      if(out.length>=40)break;
    }
    const rank={game:0,player:1,model:2,prop:3};
    return out.sort((a,b)=>(rank[a.type]??9)-(rank[b.type]??9)||String(a.title).localeCompare(String(b.title))).slice(0,24);
  }

  function globalSearchResultMarkup(result){
    const icon=result.type==='game'?'▣':result.type==='model'?'◎':result.type==='player'?'◉':'↗';
    const label=result.type==='game'?'GAME':result.type==='model'?'MODEL':result.type==='player'?'PLAYER':'PROP';
    return '<button class="global-search-result" data-global-search-result="'+esc(result.key)+'"><span class="global-search-result-icon">'+icon+'</span><div><small>'+esc(label)+' · '+esc(leagueLabel(result.league))+'</small><b>'+esc(result.title)+'</b><em>'+esc(result.sub||'')+'</em></div><strong>OPEN →</strong></button>';
  }

  function renderGlobalSearchResults(overlay,query){
    const host=overlay?.querySelector('[data-global-search-results]');
    if(!host)return;
    const results=globalSearchResults(query);
    overlay.__tsoResults=results;
    host.innerHTML=query
      ? (results.length?results.map(globalSearchResultMarkup).join(''):'<div class="global-search-empty"><b>No verified TSO result matches that search.</b><small>Try a player, team, matchup, market or sportsbook.</small></div>')
      : '<div class="global-search-empty"><b>Search the current Outpost.</b><small>Games, players, props and exact model rows are indexed from the feeds already loaded in 2.0.</small></div>';
    host.querySelectorAll('[data-global-search-result]').forEach(btn=>btn.addEventListener('click',()=>{
      const result=(overlay.__tsoResults||[]).find(x=>x.key===btn.dataset.globalSearchResult);
      if(!result)return;
      closeGlobalSearch();
      if(result.type==='game'){
        currentLeague=result.league||'all';
        shell.dataset.league=currentLeague;
        selectedLiveGameId=String(result.game?.id||'');
        syncNav();
        setRoute('live');
        return;
      }
      currentLeague=result.league||'all';
      shell.dataset.league=currentLeague;
      propsFilterState.search=String(result.row?.player||'');
      syncNav();
      setRoute(result.type==='model'?'models':result.type==='player'?'research':'props');
      if(result.type==='player'){
        researchQuery=String(result.row?.player||'');
        renderResearch();
      }
    }));
  }

  function openGlobalSearch(){
    closeGlobalSearch();
    const overlay=document.createElement('div');
    overlay.className='global-search-overlay';
    overlay.innerHTML='<section class="global-search-shell" role="dialog" aria-modal="true" aria-label="Search The Sports Outpost">'
      +'<div class="global-search-head"><span>⌕</span><input data-global-search-input type="search" autocomplete="off" placeholder="Search players, teams, games, props, models…" /><button data-global-search-close aria-label="Close search">×</button></div>'
      +'<div class="global-search-meta"><span>LIVE GAMES</span><span>VERIFIED PROPS</span><span>EXACT MODELS</span></div>'
      +'<div class="global-search-results" data-global-search-results></div>'
      +'</section>';
    document.body.appendChild(overlay);
    document.body.classList.add('global-search-open');
    const input=overlay.querySelector('[data-global-search-input]');
    renderGlobalSearchResults(overlay,'');
    input?.addEventListener('input',()=>renderGlobalSearchResults(overlay,input.value));
    overlay.querySelector('[data-global-search-close]')?.addEventListener('click',closeGlobalSearch);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeGlobalSearch();});
    requestAnimationFrame(()=>input?.focus());
  }

  const labels = {
    home:'Home', live:'Live Center', research:'Research', models:'Models',
    gameedge:'Game Edge', props:'Player Props', parlays:'Parlay Ping', community:'Community',
    leaderboard:'Leaderboard', profile:'Profile', admin:'Admin Control Room'
  };

  function notify(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__tso2Toast);
    window.__tso2Toast = setTimeout(() => toast.classList.remove('show'), 1700);
  }

  function bindMediaFallbacks(){
    document.querySelectorAll('img[data-player-headshot],img[data-team-logo]').forEach(img => {
      if(img.dataset.mediaBound) return;
      img.dataset.mediaBound='1';
      img.addEventListener('error',() => {
        img.style.display='none';
        img.parentElement?.classList.add('is-missing');
      });
    });
  }

  function bindDynamic(){
    document.querySelectorAll('[data-route-jump]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.routeJump)));
    document.querySelectorAll('[data-inline-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.inlineLeague)));
    document.querySelector('[data-game-edge-refresh]')?.addEventListener('click', () => refreshGameEdgeData(true));
    document.querySelectorAll('[data-parlay-refresh]').forEach(btn => btn.addEventListener('click', () => {
      refreshPropsData(true);
      if(parlayMode!=='pregame')refreshNflCheckpointData(true);
    }));
    document.querySelectorAll('[data-community-refresh],[data-rankings-refresh]').forEach(btn => btn.addEventListener('click', () => refreshPropsData(true)));
    document.querySelector('[data-profile-refresh]')?.addEventListener('click', () => {
      refreshLiveData(true);
      refreshPropsData(true);
      void refreshProfileActivity(true);
    });
    document.querySelector('[data-research-refresh]')?.addEventListener('click', () => {
      refreshLiveData(true);
      refreshPropsData(true);
    });
    document.querySelector('[data-research-search]')?.addEventListener('input', event => {
      researchQuery=event.target.value;
      renderResearch();
    });
    document.querySelector('[data-research-clear]')?.addEventListener('click', () => {
      researchQuery='';
      renderResearch();
    });
    document.querySelector('[data-parlay-new]')?.addEventListener('click', () => {
      if(parlayMode==='pregame')resetParlayBuild();
      else {parlayCheckpointLegKeys=[];fillCheckpointToTarget();renderParlayLab();}
    });
    document.querySelector('[data-parlay-save-legs]')?.addEventListener('click',e=>{void savePregameParlayLegs(e.currentTarget);});
    document.querySelector('[data-parlay-add]')?.addEventListener('click', () => {
      if(parlayMode!=='pregame'){
        const next=checkpointCandidates().find(c=>!parlayCheckpointLegKeys.includes(c._key));
        if(next&&parlayCheckpointLegKeys.length<8){parlayCheckpointLegKeys.push(next._key);renderParlayLab();}
        else notify('No additional ready checkpoint candidate is available.');
        return;
      }
      const next=chooseParlayRows(1,parlayLegKeys)[0];
      if(next&&parlayLegKeys.length<8){
        parlayLegKeys.push(String(next.key));
        if(parlayLegKeys.length>parlayTarget) parlayTarget=Math.min(5,parlayLegKeys.length);
        renderParlayLab();
      }else notify('No additional exact modeled selection is available for this filter.');
    });
    document.querySelectorAll('[data-parlay-target]').forEach(btn => btn.addEventListener('click', () => {
      parlayTarget=Math.max(2,Math.min(5,Number(btn.dataset.parlayTarget)||3));
      if(parlayMode==='pregame')fillParlayToTarget(parlayTarget);
      else fillCheckpointToTarget();
      renderParlayLab();
    }));
    document.querySelectorAll('[data-parlay-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.disabled)return;
      setParlayMode(String(btn.dataset.parlayMode||'pregame'));
    }));
    document.querySelectorAll('[data-parlay-period]').forEach(btn=>btn.addEventListener('click',()=>{
      const next=String(btn.dataset.parlayPeriod||'q1');
      if(!['q1','q2','q3','q4','1h','2h'].includes(next)||next===parlayQuarterPeriod)return;
      parlayQuarterPeriod=next;
      parlayCheckpointLegKeys=[];
      fillCheckpointToTarget();
      renderParlayLab();
    }));
    document.querySelector('[data-parlay-checkpoint-strategy]')?.addEventListener('change',event=>{
      parlayCheckpointStrategy=String(event.target.value||'tsoPick');
      parlayCheckpointLegKeys=[];
      fillCheckpointToTarget();
      renderParlayLab();
    });
    document.querySelector('[data-props-refresh]')?.addEventListener('click', () => refreshPropsData(true));
    document.querySelector('[data-models-refresh]')?.addEventListener('click', () => { refreshPropsData(true); refreshNhlScorerData(true); });
    document.querySelectorAll('[data-models-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.modelsLeague)));
    document.querySelector('[data-props-search]')?.addEventListener('input', event => {
      propsFilterState.search=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-market-filter]')?.addEventListener('change', event => {
      propsFilterState.market=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-book-filter]')?.addEventListener('change', event => {
      propsFilterState.book=String(event.target.value||'').toLowerCase();
      renderPropsFeed();
    });
    document.querySelector('[data-props-side-filter]')?.addEventListener('change', event => {
      propsFilterState.side=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-model-filter]')?.addEventListener('change', event => {
      propsFilterState.model=event.target.value;
      renderPropsFeed();
    });
    document.querySelector('[data-props-sort]')?.addEventListener('change', event => {
      propsFilterState.sort=event.target.value||'edge';
      renderPropsFeed();
    });
    bindMediaFallbacks();
  }

  // TSO navigation stays in charge; each Parlay Ping feature opens INSIDE the
  // workspace rather than leaving TSO or opening an external landing site.
  const PARLAYPING_ORIGIN='https://parlayping.thesportsoutpost.com';
  let parlayPingPath='/';
  function mountParlayPingWorkspace(){
    const root=document.querySelector('[data-parlayping-workspace]');
    const frame=root?.querySelector('[data-parlayping-frame]');
    if(!root||!frame)return;
    const buttons=[...root.querySelectorAll('[data-parlayping-page]')];
    const setActive=path=>{
      buttons.forEach(b=>{
        const isCurrent=b.dataset.parlaypingPage===path;
        b.classList.toggle('is-active',isCurrent);
        if(isCurrent)b.setAttribute('aria-current','page');
        else b.removeAttribute('aria-current');
      });
    };
    const navigate=path=>{
      if(!buttons.some(b=>b.dataset.parlaypingPage===path))return;
      parlayPingPath=path;
      const url=new URL(path,PARLAYPING_ORIGIN);
      url.searchParams.set('tso_embed','1');
      frame.src=url.toString();
      const loading=root.querySelector('[data-parlayping-loading]');
      if(loading){loading.hidden=false;loading.textContent='Loading '+(buttons.find(b=>b.dataset.parlaypingPage===path)?.textContent||'Parlay Ping')+'…';}
      setActive(path);
    };
    buttons.forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.parlaypingPage)));
    frame.addEventListener('load',()=>{
      const loading=root.querySelector('[data-parlayping-loading]');
      if(loading)loading.hidden=true;
    });
    // Preserve last open Parlay Ping section while switching TSO sports and back.
    setActive(parlayPingPath);
    if(parlayPingPath!=='/')navigate(parlayPingPath);
  }

  function renderRoute({scrollToTop=false,preserveScroll=false}={}){
    const previousScroll=window.scrollY||document.documentElement.scrollTop||0;
    if(currentRoute === 'home') pageContent.innerHTML = homeHTML;
    else if(window.TSO2Pages?.[currentRoute]) pageContent.innerHTML = window.TSO2Pages[currentRoute](currentLeague);
    bindDynamic();
    if(currentRoute==='parlays')mountParlayPingWorkspace();
    syncOwnerTools();
    if(currentRoute==='admin') window.TSO2Admin?.mount?.();
    bindNhlScorerActions(document.querySelector('[data-nhl-scorer-shell]'));
    refreshNhlScorerData(false);
    refreshLiveData(false);
    refreshPropsData(false);
    if(currentRoute==='research')requestResearchMarkets(false);
    // The legacy TSO parlay builder is no longer mounted on this route.
    refreshGameEdgeData(false);
    if(scrollToTop){
      window.scrollTo({top:0,behavior:'instant'});
    }else if(preserveScroll){
      requestAnimationFrame(()=>window.scrollTo({top:previousScroll,behavior:'instant'}));
    }
  }

  function syncNav(){
    document.querySelectorAll('[data-route]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === currentRoute));
    document.querySelectorAll('[data-league]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.league === currentLeague));
    if(navCurrentLabel) navCurrentLabel.textContent = String(labels[currentRoute] || currentRoute || 'Home').toUpperCase();
  }

  function setRoute(route){
    if(!labels[route]) return;
    if(route==='admin'&&!isOwner()){ notify('Owner access required.'); return; }
    closeProfileMenu();
    if(route==='gameedge'&&currentLeague==='all'){
      currentLeague='nhl';
      shell.dataset.league='nhl';
    }
    const routeChanged=route!==currentRoute;
    currentRoute = route;
    syncNav();
    renderRoute({scrollToTop:routeChanged});
    history.replaceState(null, '', '#' + route);
    if(window.innerWidth <= 900) closeSideNav();
  }

  function setLeague(league){
    closeProfileMenu();
    if(currentRoute==='gameedge'&&league==='all') league='nhl';
    if(league===currentLeague)return;
    currentLeague = league;
    shell.dataset.league = league;
    syncNav();
    renderRoute({preserveScroll:true});
    if(window.innerWidth <= 900) closeSideNav();
  }

  document.querySelectorAll('[data-route]').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
  document.querySelectorAll('[data-league]').forEach(btn => btn.addEventListener('click', () => setLeague(btn.dataset.league)));

  sideNavToggle?.addEventListener('click', () => setSideNavOpen(!shell?.classList.contains('is-side-nav-open')));
  sideNavClose?.addEventListener('click', closeSideNav);
  sideNavBackdrop?.addEventListener('click', closeSideNav);

  // Keep swipe-anywhere navigation, but never steal a horizontal table,
  // card rail or chart swipe. A deliberate nav gesture is now longer and much
  // more horizontal than vertical; buttons/backdrop remain unchanged.
  const SIDE_SWIPE_OPEN_MIN_PX = 120;
  const SIDE_SWIPE_CLOSE_MIN_PX = 90;
  const SIDE_SWIPE_DIRECTION_RATIO = 1.8;
  function isHorizontalScrollGestureTarget(node){
    for(let el=node?.nodeType===1?node:node?.parentElement;
        el&&el!==document.body&&el!==document.documentElement;
        el=el.parentElement){
      if(el.matches?.('input[type="range"],[role="slider"],[data-horizontal-scroll]'))return true;
      const overflow=getComputedStyle(el).overflowX;
      if((overflow==='auto'||overflow==='scroll'||overflow==='overlay')
        &&el.scrollWidth>el.clientWidth+10)return true;
    }
    return false;
  }
  function mobileSideSwipeDecision(start,end,elapsed,navWasOpen){
    if(!start||!end||elapsed>900||elapsed<0)return '';
    const dx=end.x-start.x,dy=end.y-start.y;
    if(Math.abs(dx)<Math.abs(dy)*SIDE_SWIPE_DIRECTION_RATIO)return '';
    if(navWasOpen)return dx<=-SIDE_SWIPE_CLOSE_MIN_PX?'close':'';
    return !start.horizontalScroll&&dx>=SIDE_SWIPE_OPEN_MIN_PX?'open':'';
  }
  let sideSwipeStart = null;
  document.addEventListener('touchstart', event => {
    sideSwipeStart=null;
    if(window.innerWidth>900||event.touches.length!==1)return;
    const touch=event.touches[0];
    sideSwipeStart={
      x:touch.clientX,y:touch.clientY,time:Date.now(),id:touch.identifier,
      horizontalScroll:isHorizontalScrollGestureTarget(event.target),
      navWasOpen:!!shell?.classList.contains('is-side-nav-open')
    };
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(event.touches.length!==1)sideSwipeStart=null;
  },{passive:true});
  document.addEventListener('touchcancel',()=>{sideSwipeStart=null;},{passive:true});
  document.addEventListener('touchend',event=>{
    const start=sideSwipeStart;
    sideSwipeStart=null;
    if(window.innerWidth>900||!start||event.touches.length>0)return;
    const touch=Array.from(event.changedTouches).find(t=>t.identifier===start.id);
    if(!touch)return;
    const action=mobileSideSwipeDecision(start,{
      x:touch.clientX,y:touch.clientY
    },Date.now()-start.time,start.navWasOpen);
    if(action==='open')setSideNavOpen(true);
    else if(action==='close')closeSideNav();
  },{passive:true});

  window.addEventListener('resize', () => {
    if(window.innerWidth > 900) closeSideNav();
  });

  document.querySelector('.search-trigger')?.addEventListener('click', openGlobalSearch);

  profileButton?.addEventListener('click', event => {
    event.stopPropagation();
    toggleProfileMenu();
  });

  notificationButton?.addEventListener('click', event=>{
    event.stopPropagation();
    toggleNotificationCenter();
  });
  notificationPanel?.addEventListener('click',event=>event.stopPropagation());
  document.querySelector('[data-notification-read-all]')?.addEventListener('click',markAllNotificationsRead);

  profileDropdown?.addEventListener('click', event => event.stopPropagation());

  document.querySelector('[data-profile-route="profile"]')?.addEventListener('click', () => {
    closeProfileMenu();
    setRoute('profile');
  });
  document.querySelector('[data-admin-open]')?.addEventListener('click', () => {
    closeProfileMenu();
    if(isOwner()) setRoute('admin');
  });

  document.querySelectorAll('[data-owner-only]').forEach(item => {
    item.addEventListener('click', event => {
      if(isOwner()) return;
      event.preventDefault();
      closeProfileMenu();
      notify('Brand Lab is available to the owner account only.');
    });
  });

  document.addEventListener('click', event => {
    if(profileMenu && !profileMenu.contains(event.target)) closeProfileMenu();
    if(notificationMenu && !notificationMenu.contains(event.target)) closeNotificationCenter();
  });

  document.addEventListener('keydown', event => {
    if(event.key === 'Escape'){ closeProfileMenu(); closeGlobalSearch(); closeResearchDetail(); closePropsCompare(); closeSideNav(); }
  });

  // Supabase auth loads asynchronously. Refresh owner/menu-dependent UI
  // only after the login service verifies (or clears) the session.
  window.addEventListener('tso2-auth-changed', () => {
    closeProfileMenu();
    syncOwnerTools();
    profileActivityOwnerId='';
    profileActivitySnapshot=null;
    profileActivityFetchedAt=0;
    if(currentRoute==='profile') renderProfile();
    void refreshSavedAccountNotifications(true);
    if(currentRoute==='admin'){
      if(!isOwner()) setRoute('home');
      else renderRoute();
    }
  });

  syncOwnerTools();
  renderNotificationCenter();

  const initialRoute = location.hash.replace('#','');
  currentRoute = labels[initialRoute] ? initialRoute : 'home';
  if(currentRoute==='gameedge'&&currentLeague==='all'){
    currentLeague='nhl';
    shell.dataset.league='nhl';
  }
  syncNav();
  renderRoute();
  refreshLiveData(true);
  refreshPropsData(true);
  window.setInterval(() => refreshLiveData(true), LIVE_POLL_MS);
  window.setInterval(() => { void refreshSavedAccountNotifications(false); }, ACCOUNT_NOTIFICATION_REFRESH_MS);
  window.setInterval(() => refreshSelectedLiveDetail(), LIVE_DETAIL_POLL_MS);
  window.setInterval(() => refreshPropsData(true), PROPS_POLL_MS);
  window.setInterval(() => refreshGameEdgeData(true), GAME_EDGE_POLL_MS);
})();