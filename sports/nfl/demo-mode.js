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
      away:{abbr:'SEA',name:'Seattle Seahawks',score:17,record:'0-0'},
      home:{abbr:'NE',name:'New England Patriots',score:13,record:'0-0'},
      weather:{temp:67,summary:'Cloudy · 8 mph W'},
      state:{period:2,clock:'06:42',clockMin:6.7,down:'3rd & 6',yardLine:'NE 41',statusDetail:'Q2 · 6:42',possession:'SEA'},
      drive:{start:'SEA 25',plays:7,yards:34,result:'3rd & 6 at NE 41'}
    },
    {
      away:{abbr:'BAL',name:'Baltimore Ravens',score:10,record:'0-0'},
      home:{abbr:'IND',name:'Indianapolis Colts',score:7,record:'0-0'},
      weather:{temp:72,summary:'Indoor'},
      state:{period:2,clock:'02:18',clockMin:2.3,down:'2nd & 4',yardLine:'IND 28',statusDetail:'Q2 · 2:18',possession:'BAL'},
      drive:{start:'BAL 34',plays:9,yards:38,result:'2nd & 4 at IND 28'}
    }
  ];
  return presets[index%presets.length];
}

function decorateGameForDemo(game,index=0){
  const preset=liveTeams(index);
  const id=gameIdOf(game,index);
  const out=clone(game)||{};
  out.id=id;
  out.gameId=id;
  out.matchup=`${preset.away.abbr} @ ${preset.home.abbr}`;
  out.awayTeam=preset.away.abbr;
  out.homeTeam=preset.home.abbr;
  out.awayName=preset.away.name;
  out.homeName=preset.home.name;
  out.awayScore=escNum(preset.away.score);
  out.homeScore=escNum(preset.home.score);
  out.status='Live';
  out.statusText='LIVE';
  out.status_detail=preset.state.statusDetail;
  out.kickoff='7:20 PM';
  out.weather={...(out.weather||{}),...preset.weather,wind:preset.weather.summary};
  out.state={...(out.state||{}),...preset.state,isLive:true,status:'Live'};
  out.live={...(out.live||{}),...preset.state,homeScore:preset.home.score,awayScore:preset.away.score,isLive:true,drive:preset.drive};
  out.score={...(out.score||{}),home:preset.home.score,away:preset.away.score};
  out.teams={
    away:{...(out.teams?.away||{}),abbr:preset.away.abbr,name:preset.away.name,score:preset.away.score,record:preset.away.record},
    home:{...(out.teams?.home||{}),abbr:preset.home.abbr,name:preset.home.name,score:preset.home.score,record:preset.home.record},
  };
  out.drive={...(out.drive||{}),...preset.drive,possession:preset.state.possession};
  out.watchlist=Array.isArray(out.watchlist)&&out.watchlist.length?out.watchlist:[
    {label:'ATD Leader',value:'J. Smith-Njigba 21%'},
    {label:'Pass Leader',value:'Drake Maye 164 yds'},
    {label:'Rush Leader',value:'K. Walker III 48 yds'},
  ];
  out.intel=out.intel||{
    pressure:'SEA +6%',
    explosive:'3 plays 15+',
    rz:'2 SEA RZ trips',
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
