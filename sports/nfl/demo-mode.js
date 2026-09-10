const VALID_MODES=new Set(['gamecast','halftime','all']);

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const escNum=v=>Number.isFinite(Number(v))?Number(v):0;

function packMaskBase64(hits,n=100){
  const bytes=new Uint8Array(Math.ceil(n/8));
  for(const i of hits){
    if(i<0||i>=n) continue;
    bytes[i>>3]|=1<<(i&7);
  }
  let bin='';
  for(const b of bytes) bin+=String.fromCharCode(b);
  return btoa(bin);
}

function buildDemoCandidates(gameId,team='SEA'){
  const n=100;
  const mk=(id,name,market,line,price,prob,edge,grade,hits,position='WR')=>({
    id,gameId,playerId:id,name,team,position,
    market,side:'over',line,book:'TSO Demo Book',price,
    simProbability:prob,bookFairProbability:Math.max(0.01,prob-edge),edge,grade,
    worldMaskB64:packMaskBase64(hits,n),worldMaskIterations:n,
  });
  return [
    mk(`${gameId}-1`,'Jaxon Smith-Njigba','recYds',58.5,-110,.67,.09,'A',Array.from({length:67},(_,i)=>i),'WR'),
    mk(`${gameId}-2`,'Kenneth Walker III','rushYds',39.5,-105,.63,.08,'A-',Array.from({length:63},(_,i)=>i),'RB'),
    mk(`${gameId}-3`,'DK Metcalf','longestRec',21.5,+105,.57,.05,'B+',Array.from({length:57},(_,i)=>i+18),'WR'),
    mk(`${gameId}-4`,'Hunter Henry','recYds',24.5,-115,.61,.07,'A-',Array.from({length:61},(_,i)=>i),'TE'),
    mk(`${gameId}-5`,'Rhamondre Stevenson','rushYds',36.5,-110,.56,.04,'B',Array.from({length:56},(_,i)=>i+7),'RB'),
  ];
}

function buildDemoHalftimeDoc(){
  const game1='demo-sea-ne';
  const game2='demo-bal-ind';
  const cand1=buildDemoCandidates(game1,'SEA');
  const cand2=[
    ...buildDemoCandidates(game2,'BAL').slice(0,3),
    {
      id:`${game2}-4`,gameId:game2,playerId:`${game2}-4`,name:'Michael Pittman Jr.',team:'IND',position:'WR',
      market:'recYds',side:'over',line:41.5,book:'TSO Demo Book',price:+105,
      simProbability:.58,bookFairProbability:.53,edge:.05,grade:'B+',
      worldMaskB64:packMaskBase64(Array.from({length:58},(_,i)=>i+12),100),worldMaskIterations:100,
    }
  ];
  return {
    generatedAt:'2026-09-09T17:30:00Z',
    demo:true,
    games:[
      {
        gameId:game1,
        matchup:'SEA @ NE',
        ready:true,
        iterations:50000,
        state:{statusDetail:'Halftime',period:2,clockMin:0},
        candidates:cand1,
        rankings:{
          tsoPick:cand1.map(x=>x.id),
          safest:cand1.map(x=>x.id),
          bestEdge:[cand1[0].id,cand1[1].id,cand1[3].id,cand1[2].id,cand1[4].id],
          balanced:[cand1[0].id,cand1[3].id,cand1[1].id,cand1[4].id,cand1[2].id],
          longshot:[cand1[2].id,cand1[0].id,cand1[1].id,cand1[3].id,cand1[4].id],
          correlated:[cand1[0].id,cand1[1].id,cand1[3].id,cand1[2].id,cand1[4].id],
        },
        correlations:{
          positive:[{a:cand1[0].id,b:cand1[1].id,lift:.042},{a:cand1[1].id,b:cand1[2].id,lift:.018}],
          conflicts:[{a:cand1[2].id,b:cand1[4].id,lift:-.028}],
        }
      },
      {
        gameId:game2,
        matchup:'BAL @ IND',
        ready:true,
        iterations:50000,
        state:{statusDetail:'Halftime',period:2,clockMin:0},
        candidates:cand2,
        rankings:{
          tsoPick:cand2.map(x=>x.id),
          safest:cand2.map(x=>x.id),
          bestEdge:[cand2[0].id,cand2[1].id,cand2[3].id,cand2[2].id],
          balanced:[cand2[0].id,cand2[3].id,cand2[1].id,cand2[2].id],
          longshot:[cand2[2].id,cand2[0].id,cand2[1].id,cand2[3].id],
          correlated:[cand2[0].id,cand2[1].id,cand2[3].id,cand2[2].id],
        },
        correlations:{
          positive:[{a:cand2[0].id,b:cand2[1].id,lift:.021}],
          conflicts:[],
        }
      }
    ]
  };
}

function hasReadyBoards(doc){
  return !!(doc&&Array.isArray(doc.games)&&doc.games.some(g=>g?.ready&&Array.isArray(g?.candidates)&&g.candidates.length>=2));
}

function baseGamesFrom(data){
  if(Array.isArray(data?.games)&&data.games.length) return {holder:data,key:'games',games:clone(data.games)};
  if(data?.slate&&Array.isArray(data.slate.games)&&data.slate.games.length) return {holder:data.slate,key:'games',games:clone(data.slate.games)};
  return {holder:data,key:'games',games:[]};
}

function gameIdOf(game,index=0){
  return String(game?.gameId||game?.id||game?.eventId||game?.uid||`demo-game-${index+1}`);
}

function liveTeams(index){
  const presets=[
    {
      away:{abbr:'NE',name:'New England Patriots',score:14,record:'0-0'},
      home:{abbr:'SEA',name:'Seattle Seahawks',score:10,record:'0-0'},
      weather:{temp:67,summary:'Partly Cloudy · 6 mph W'},
      state:{period:3,clock:'09:21',clockMin:9.35,down:1,distance:10,downDistanceText:'1st & 10',yardLine:'SEA 42',yardFromOwn:58,statusDetail:'Q3 · 9:21',possessionSide:'away',possessionAbbr:'NE'},
      drive:{start:'NE 31',plays:8,yards:54,time:'4:12',result:'1st & 10 at SEA 42'},
      play:{id:'demo-ne-sea-play-1',title:'Pass Play',text:'Drake Maye drops back, looking right for Hunter Henry. Pressure coming from the left edge.',playerName:'Drake Maye',playerPos:'QB',playerNumber:'10',startYardLine:52},
      featured:{name:'Drake Maye',position:'QB',number:'10',stats:{compAtt:'8/10',yards:'96',td:'0',qbr:'118.3'}},
      winProbability:{away:0.68,home:0.32}
    },
    {
      away:{abbr:'BAL',name:'Baltimore Ravens',score:17,record:'0-0'},
      home:{abbr:'IND',name:'Indianapolis Colts',score:14,record:'0-0'},
      weather:{temp:72,summary:'Indoor'},
      state:{period:2,clock:'01:42',clockMin:1.7,down:2,distance:4,downDistanceText:'2nd & 4',yardLine:'IND 28',yardFromOwn:72,statusDetail:'Q2 · 1:42',possessionSide:'away',possessionAbbr:'BAL'},
      drive:{start:'BAL 34',plays:9,yards:38,time:'3:48',result:'2nd & 4 at IND 28'},
      play:{id:'demo-bal-ind-play-1',title:'Run Play',text:'Lamar Jackson keeps it on the read option and cuts outside for six yards.',playerName:'Lamar Jackson',playerPos:'QB',playerNumber:'8',startYardLine:66},
      featured:{name:'Lamar Jackson',position:'QB',number:'8',stats:{compAtt:'10/14',yards:'121',td:'1',qbr:'109.7'}},
      winProbability:{away:0.59,home:0.41}
    }
  ];
  return presets[index%presets.length];
}

function decorateGameForDemo(game,index=0){
  const preset=liveTeams(index);
  const id=gameIdOf(game,index);
  const out=clone(game)||{};
  const awayExisting=clone(out.away)||{};
  const homeExisting=clone(out.home)||{};
  out.id=id;
  out.gameId=id;
  out.matchup=`${preset.away.abbr} @ ${preset.home.abbr}`;
  out.awayTeam=preset.away.abbr;
  out.homeTeam=preset.home.abbr;
  out.awayName=preset.away.name;
  out.homeName=preset.home.name;
  out.awayScore=escNum(preset.away.score);
  out.homeScore=escNum(preset.home.score);
  out.status='in';
  out.statusText='LIVE';
  out.statusDetail=preset.state.statusDetail;
  out.status_detail=preset.state.statusDetail;
  out.kickoff='8:20 PM';

  out.away={
    ...awayExisting,
    abbr:preset.away.abbr,
    name:preset.away.name.replace(/^New England /,'').replace(/^Baltimore /,''),
    fullName:preset.away.name,
    score:preset.away.score,
    record:preset.away.record,
  };
  out.home={
    ...homeExisting,
    abbr:preset.home.abbr,
    name:preset.home.name.replace(/^Seattle /,'').replace(/^Indianapolis /,''),
    fullName:preset.home.name,
    score:preset.home.score,
    record:preset.home.record,
  };
  out.score={...(out.score||{}),home:preset.home.score,away:preset.away.score};
  out.weather={...(out.weather||{}),...preset.weather,wind:preset.weather.summary};
  out.venue=out.venue||{name:index===0?'Lumen Field':'Lucas Oil Stadium',city:index===0?'Seattle':'Indianapolis'};

  out.state={
    ...(out.state||{}),
    ...preset.state,
    isLive:true,
    status:'in',
    possession:preset.state.possessionAbbr
  };
  out.live={
    ...(out.live||{}),
    ...preset.state,
    homeScore:preset.home.score,
    awayScore:preset.away.score,
    isLive:true,
    possession:preset.state.possessionAbbr,
    drive:preset.drive
  };
  out.liveScore={
    ...(out.liveScore||{}),
    period:preset.state.period,
    clockMin:preset.state.clockMin,
    possession:preset.state.possessionSide,
    yardFromOwn:preset.state.yardFromOwn,
    isRedZone:preset.state.yardFromOwn>=80,
    down:preset.state.down,
    distance:preset.state.distance,
    downDistanceText:preset.state.downDistanceText,
    lastPlayText:preset.play.text,
    winProbability:preset.winProbability,
    currentDrive:{
      id:`${id}-drive`,
      playCount:preset.drive.plays,
      plays:preset.drive.plays,
      yards:preset.drive.yards,
      elapsedDisplay:preset.drive.time,
      time:preset.drive.time,
      result:preset.drive.result
    },
    plays:[
      {
        id:preset.play.id,
        text:preset.play.text,
        shortText:preset.play.title,
        type:preset.play.title,
        period:preset.state.period,
        clock:preset.state.clock
      }
    ],
    playerStats:{byId:{}},
    scoringPlays:[],
    lastFetchedAt:Date.now(),
  };

  out.period=preset.state.period;
  out.displayClock=preset.state.clock;
  out.clockDisplay=preset.state.clock;
  out.down=preset.state.down;
  out.distance=preset.state.distance;
  out.downDistance=preset.state.downDistanceText;
  out.fieldPosition=preset.state.yardLine;
  out.yardLine=preset.state.yardFromOwn;
  out.possession=preset.state.possessionAbbr;
  out.situation={
    ...(out.situation||{}),
    possession:preset.state.possessionAbbr,
    downDistanceText:preset.state.downDistanceText,
    shortText:preset.state.yardLine,
    yardLine:preset.state.yardFromOwn,
    distance:preset.state.distance,
  };
  out.currentPlay={
    title:preset.play.title,
    typeText:preset.play.title,
    shortText:preset.play.title,
    description:preset.play.text,
    text:preset.play.text,
    playerName:preset.play.playerName,
    playerPos:preset.play.playerPos,
    playerNumber:preset.play.playerNumber,
    startYardLine:preset.play.startYardLine,
  };
  out.featuredPlayer={...(out.featuredPlayer||{}),...preset.featured};
  out.winProb={away:preset.winProbability.away*100,home:preset.winProbability.home*100,history:[52,54,55,57,56,60,61,64,66,preset.winProbability.away*100]};

  out.teams={
    away:{...(out.teams?.away||{}),abbr:preset.away.abbr,name:preset.away.name,score:preset.away.score,record:preset.away.record,logo:out.away.logo||out.away.logoUrl||null},
    home:{...(out.teams?.home||{}),abbr:preset.home.abbr,name:preset.home.name,score:preset.home.score,record:preset.home.record,logo:out.home.logo||out.home.logoUrl||null},
  };
  out.drive={
    ...(out.drive||{}),
    ...preset.drive,
    possession:preset.state.possessionAbbr,
    summary:index===0?[
      {text:'6-yd rush',dd:'1st & 10',fp:'NE 14'},
      {text:'12-yd pass',dd:'1st & 10',fp:'NE 26'},
      {text:'4-yd rush',dd:'1st & 10',fp:'NE 30'},
      {text:'Current Play',dd:preset.state.downDistanceText,fp:preset.state.yardLine,current:true},
    ]:[
      {text:'8-yd pass',dd:'1st & 10',fp:'BAL 42'},
      {text:'11-yd run',dd:'1st & 10',fp:'IND 47'},
      {text:'9-yd pass',dd:'2nd & 4',fp:'IND 28'},
      {text:'Current Play',dd:preset.state.downDistanceText,fp:preset.state.yardLine,current:true},
    ]
  };
  out.qbName=preset.play.playerName;
  out.targetName=index===0?'Hunter Henry':'Zay Flowers';
  out.halftimeState=preset.state.period===2 && preset.state.clockMin<=2 ? 'warming' : '';

  out.watchlist=Array.isArray(out.watchlist)&&out.watchlist.length?out.watchlist:[
    {label:'ATD Leader',value:index===0?'Rhamondre Stevenson 27%':'Derrick Henry 31%'},
    {label:'Pass Leader',value:preset.play.playerName+' 164 yds'},
    {label:'Rush Leader',value:index===0?'R. Stevenson 48 yds':'D. Henry 61 yds'},
  ];
  out.intel=out.intel||{
    pressure:index===0?'SEA +6%':'BAL +8%',
    explosive:'3 plays 15+',
    rz:index===0?'2 NE RZ trips':'2 BAL RZ trips',
  };
  return out;
}

function buildFallbackData(){
  return {
    games:[decorateGameForDemo({},0),decorateGameForDemo({},1)],
  };
}

export function getNflDemoMode(){
  if(typeof window==='undefined') return '';
  const raw=new URLSearchParams(window.location.search).get('nflDemo');
  const mode=String(raw||'').trim().toLowerCase();
  return VALID_MODES.has(mode)?mode:'';
}

export function hydrateNflDemoState(state,{data=null,research=null,odds=null,sim=null,halftime=null}={}){
  const mode=getNflDemoMode();
  if(!mode||!state) return state;
  const base=clone(data)||buildFallbackData();
  const holderInfo=baseGamesFrom(base);
  const games=(holderInfo.games.length?holderInfo.games:[{},{}]).map((g,i)=>decorateGameForDemo(g,i));
  holderInfo.holder[holderInfo.key]=games;
  const firstId=gameIdOf(games[0],0);
  const halftimeDoc=hasReadyBoards(halftime)?clone(halftime):buildDemoHalftimeDoc();

  state._demoMode=mode;
  state._demoHydrated=true;
  state._demoOpened=false;
  state.data=base;
  state.research=research||state.research;
  state.odds=odds||state.odds;
  state.sim=sim||state.sim;
  state.halftime=halftimeDoc;
  state.tab='live';
  state.game=firstId;
  state.player=null;
  state.gamecastTab='game';
  if(state.expandedSlate?.add) state.expandedSlate.add(firstId);
  if(state.intelTabs&&firstId&&!state.intelTabs[firstId]) state.intelTabs[firstId]='overview';

  const snapshot={mode,data:base,halftime:halftimeDoc,defaultGameId:firstId};
  state._demoSnapshot=snapshot;
  if(typeof window!=='undefined') window.__TSO_NFL_DEMO=snapshot;
  return state;
}

export function postRenderNflDemoSync(state,{openHalftimeParlayLab}={}){
  const mode=state?._demoMode||getNflDemoMode();
  if(!mode) return;
  if(typeof document!=='undefined'){
    document.body?.setAttribute('data-tso-nfl-demo',mode);
    const root=document.getElementById('nflView');
    root?.setAttribute('data-tso-nfl-demo',mode);
  }
  if((mode==='halftime'||mode==='all') && !(state?._demoOpened)){
    state._demoOpened=true;
    setTimeout(()=>openHalftimeParlayLab?.({halftimeDoc:state?.halftime||buildDemoHalftimeDoc()}),60);
  }
}
