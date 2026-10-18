// Read-only live feed diagnostics, print no user data or secrets.
const api='https://staging.thesportsoutpost.com';
(async()=>{
 const endpoints=['/api/props?league=all','/api/live?league=all&date=2026-10-12',
 'https://tso2-game-edge.jthomas0786-tso.workers.dev/?league=nfl',
 'https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl-odds.json',
 'https://raw.githubusercontent.com/jthomas0786/The-Sports-Outpost/main/slates/nfl.json'];
 for(const endpoint of endpoints){
  try{
   const url=endpoint.startsWith('http')?endpoint:api+endpoint;
   const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{accept:'application/json'}});
   const txt=await r.text(); let doc;
   try{doc=JSON.parse(txt);}catch{console.log(endpoint,r.status,'non-JSON',txt.slice(0,75));continue;}
   const rows=doc.rows||[],games=doc.games||[];
   const nfl=rows.filter(x=>String(x.sport||x.league).toLowerCase()==='nfl');
   const sports={};for(const x of rows){const key=x.sport||x.league||'?';sports[key]=(sports[key]||0)+1;}
   console.log(JSON.stringify({endpoint,status:r.status,generatedAt:doc.generatedAt||doc.meta?.fetchedAt,rows:rows.length,games:games.length,sports,
    rowKeys:Object.keys(rows[0]||{}),sampleRow:rows[0]?{sport:rows[0].sport,eventId:rows[0].eventId,gameId:rows[0].gameId,awayTeam:rows[0].awayTeam,homeTeam:rows[0].homeTeam,startTime:rows[0].startTime,player:rows[0].player,market:rows[0].market}:null,
    nflRows:nfl.length,bufLarMatches:nfl.filter(x=>(/BUF|Bills/i.test(x.awayTeam||''))&&(/LAR|Rams|Los Angeles/i.test(x.homeTeam||''))).length,
    firstNflRows:nfl.slice(0,2).map(x=>({eventId:x.eventId,awayTeam:x.awayTeam,homeTeam:x.homeTeam,startTime:x.startTime,player:x.player,market:x.market})),
    firstGame:games[0]?{id:games[0].id,startTime:games[0].startTime,state:games[0].state,league:games[0].league,away:games[0].away?.abbr,home:games[0].home?.abbr,players:Array.isArray(games[0].players)?games[0].players.length:null,keys:Object.keys(games[0])}:null,
    bufLarGame:games.filter(g=>(String(g.away?.abbr||g.awayTeam||'').includes('BUF')&&String(g.home?.abbr||g.homeTeam||'').includes('LAR'))).map(g=>({id:g.id,startTime:g.startTime,players:g.players?.length,playerKeys:Object.keys(g.players?.[0]||{})})).slice(0,2)
   }));
  }catch(e){console.error(endpoint,'ERROR',String(e).slice(0,200))}
 }
})().catch(e=>{console.error(e);process.exitCode=1});