/* TSO3 official, sport-independent player research.
   A verified base feed is not a claim of specialized pitch tracking, CB matching,
   calibrated projections, lineup certainty or independent model accuracy. */
(function(){
'use strict';
const tools={
 mlb:{
 'home-run-matchups':['home runs','homers','home runs hit','homeruns'],
 'enhanced-home-run-matchups':['home runs','homers','homeruns'],
 'strikeout-matchups':['strikeouts','pitcher strikeouts'],
 'stolen-bases':['stolen bases','stolenbases'],
 'pitcher-summary':['strikeouts','innings pitched','earned runs','walks'],
 'bullpen-usage':['innings pitched','pitches','strikeouts'],
 },
 wnba:{
 'player-trends':['points','rebounds','assists','three pointers made'],
 'minutes-usage':['minutes','points','assists','field goals attempted'],
 'team-statistics':['points','rebounds','assists'],
 },
 cfb:{
 'player-trends':['passing yards','rushing yards','receiving yards','receptions'],
 'quarterback-rankings':['passing yards','passing touchdowns','completions','passing attempts'],
 'rushing-matchups':['rushing yards','rushing attempts'],
 'receiving-matchups':['receiving yards','receptions'],
 'touchdown-matchups':['rushing touchdowns','receiving touchdowns'],
 },
 nhl:{
 'skater-statistics':['shots','goals','assists','time on ice'],
 'goalie-matchups':['saves','goals against','save percentage'],
 'power-play-analysis':['power play goals','power play points','power play assists'],
 'special-teams-matchups':['power play goals','power play points','short handed goals'],
 },
 nfl:{
 'explosive-plays':['longest reception','longest rush','receiving yards','rushing yards'],
 'team-share':['receptions','rushing attempts','receiving yards'],
 },
};
const leagueSeason={nfl:2026,nba:2027,mlb:2026,nhl:2027,wnba:2026,cfb:2026};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canon=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const numeric=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const date=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'};
const chosen=new Map(),cache=new Map();
let sequence=0;
const slug=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
const supports=(sport,tool)=>Array.isArray(tools[sport]?.[tool]);
function gamesFor(ctx){return (ctx.games||[]).filter(g=>g.league===ctx.sport&&/^\d{6,14}$/.test(String(g.id||''))).slice(0,24)}
function render(ctx,tool){
 const options=gamesFor(ctx),id=ctx.sport+'|'+tool;
 const selected=chosen.get(id),game=options.find(g=>String(g.id)===String(selected))||options[0];
 if(game)chosen.set(id,String(game.id));
 const title=(ctx.title||tool.replace(/-/g,' ')),metrics=tools[ctx.sport]?.[tool]||[];
 return '<section class="tool-panel tso-verified-research" id="tsoObservedResearch" data-observed-sport="'+esc(ctx.sport)+'" data-observed-tool="'+esc(tool)+'">'+
  '<h3>'+esc(title)+' · Official Player Research</h3>'+
  '<p><b>ESPN player-history integration connected.</b> Browse official matchup rosters and select a player to inspect dated game-by-game observations. The specific advanced category is <b>not fully integrated</b> unless separately sourced. No invented pitcher-vs-batter grade, coverage assignment, usage rate, or forecast is implied.</p>'+
  '<p class="nba-footnote">Research focus: '+metrics.map(esc).join(' · ')+'. Actual ESPN statistical field names and their available sample control what appears; unavailable metrics stay blank.</p>'+
  '<label class="tso-observed-select">OFFICIAL MATCHUP <select data-observed-game>'+
   (options.map(g=>'<option value="'+esc(g.id)+'" '+(game&&g.id===game.id?'selected':'')+'>'+esc(g.away?.abbr||'Away')+' @ '+esc(g.home?.abbr||'Home')+' · '+esc(date(g.startTime))+'</option>').join(''))+
  '</select></label>'+
  (game?'<div id="tsoObservedResult">Loading ESPN verified rosters and player history…</div>':
   '<div class="page-note">No current verified ESPN fixture in the displayed schedule window for this league. The historical athlete endpoint remains connected, but there is no current matchup roster to attach safely. No hypothetical lineup has been generated.</div>')+
 '</section>';
}
async function hydrate(ctx,tool){
 const root=document.getElementById('tsoObservedResearch'),games=gamesFor(ctx);
 if(!root||root.dataset.observedSport!==ctx.sport||root.dataset.observedTool!==tool||!games.length)return;
 const unique=++sequence,session=ctx.sport+'|'+tool;
 const panel=()=>{const node=document.getElementById('tsoObservedResearch');return node&&node.dataset.observedSport===ctx.sport&&node.dataset.observedTool===tool&&unique===sequence?node:null};
 const holder=()=>panel()?.querySelector('#tsoObservedResult');
 function show(html){const target=holder();if(target)target.innerHTML=html}
 async function roster(gameId){
  const key=ctx.sport+'|'+gameId;
  if(cache.has(key)&&Date.now()-cache.get(key).time<180000)return cache.get(key).data;
  const response=await fetch('/api/game-roster?'+new URLSearchParams({league:ctx.sport,gameId}),{cache:'default'});
  const doc=await response.json();
  if(!response.ok||!doc?.available)throw Error(doc?.reason||'Official ESPN rosters unavailable for this fixture');
  if(doc.league!==ctx.sport||String(doc.gameId)!==gameId)throw Error('Verified roster did not match selected official fixture');
  cache.set(key,{time:Date.now(),data:doc});
  return doc;
 }
 async function loadRosters(gameId){
  show('<p class="page-note">Checking official ESPN game identity and both team rosters…</p>');
  try{
   const data=await roster(gameId);if(!panel())return;
   const teams=data.teams||[];
   show('<p class="nba-footnote">Official ESPN fixture '+esc(data.away)+' @ '+esc(data.home)+' · roster snapshot '+esc(date(data.checkedAt))+
    ' · team rosters do not prove game-day starters or athlete availability.</p>'+
    teams.map(t=>'<section><h4>'+esc(t.abbr||t.name)+' · '+(t.available?t.players.length+' rostered players':'Roster source unavailable')+'</h4>'+
     (t.available?'<div class="tso-observed-players">'+t.players.filter(p=>/^\d{3,12}$/.test(String(p.id||''))).slice(0,75).map(p=>
      '<button class="btn subtle" type="button" data-observed-player="'+esc(p.id)+'" data-observed-name="'+esc(p.name)+'"><b>'+esc(p.name)+'</b> <small>'+esc(p.position||'')+'</small></button>').join('')+'</div>':
      '<p>'+esc(t.reason||'Verified team roster unavailable')+'</p>')+'</section>').join('')+
     '<div id="tsoObservedStats"><p class="page-note">Choose an athlete to read verified season and game logs without needing sportsbook odds.</p></div>');
  }catch(e){show('<p class="page-note">Official roster source unavailable: '+esc(e?.message||'Provider error')+'. No players or stats have been inferred.</p>')}
 }
 root.addEventListener('change',e=>{
  const select=e.target.closest('[data-observed-game]');if(!select)return;
  if(!games.some(g=>String(g.id)===select.value))return;
  chosen.set(session,select.value);void loadRosters(select.value);
 });
 root.addEventListener('click',async e=>{
  const button=e.target.closest('[data-observed-player]');if(!button)return;
  const athlete=button.dataset.observedPlayer;
  if(!/^\d{3,12}$/.test(athlete))return;
  const name=button.dataset.observedName,area=panel()?.querySelector('#tsoObservedStats');
  if(!area)return;area.innerHTML='<p class="page-note">Fetching dated ESPN athlete game logs…</p>';
  try{
   const q=new URLSearchParams({league:ctx.sport,playerId:athlete,season:String(leagueSeason[ctx.sport]||2026)});
   const response=await fetch('/api/athlete-depth?'+q,{cache:'default'}),data=await response.json();
   const here=panel()?.querySelector('#tsoObservedStats');if(!here)return;
   if(!response.ok||!data.available||String(data.athleteId)!==athlete
    ||data.athleteName&&canon(data.athleteName)!==canon(name)){
    here.innerHTML='<p class="page-note">Verified athlete ID, season, or history unavailable. No records have been substituted.</p>';return;
   }
   const metrics=tools[ctx.sport]?.[tool]||[];
   const ranked=new Map();
   for(const ev of data.events||[])for(const st of ev.stats||[]){
    if(numeric(st.numeric)===null)continue;
    const key=canon(st.name||st.label);
    if(!key)continue;
    const m=ranked.get(key)||{name:st.name,label:st.label||st.name,n:0};
    m.n++;ranked.set(key,m);
   }
   const matches=[...ranked.values()].filter(x=>metrics.some(term=>canon(x.name).includes(canon(term))||canon(x.label).includes(canon(term))))
    .sort((a,b)=>b.n-a.n).slice(0,8);
   const selection=matches.length?matches:[...ranked.values()].sort((a,b)=>b.n-a.n).slice(0,4);
   const dated=(data.events||[]).filter(g=>Number.isFinite(Date.parse(g.date||'')))
    .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,10);
   const statistics=selection.map(stat=>{
    const vals=dated.map(g=>({g,record:(g.stats||[]).find(x=>canon(x.name)===canon(stat.name))}))
     .filter(x=>numeric(x.record?.numeric)!==null);
    const l5=vals.slice(0,5),avg=l5.length?l5.reduce((n,x)=>n+x.record.numeric,0)/l5.length:null;
    return '<tr><td>'+esc(stat.label)+'</td><td>'+esc(l5.length?avg.toFixed(1):'—')+'</td>'+
     '<td>'+esc(vals.length)+'</td><td>'+esc(vals.slice(0,5).map(x=>x.record.numeric).join(' / ')||'—')+'</td></tr>';
   }).join('');
   here.innerHTML='<div class="tool-panel"><h4>'+esc(name)+' · '+esc(data.season||leagueSeason[ctx.sport])+' Official ESPN Logs</h4>'+
    '<p class="nba-footnote">Observed completed games only. L5 is the average of up to five verified records for each statistic; no missing game is treated as zero. Metric labels are supplied by ESPN, not simulated.</p>'+
    (statistics?'<div class="table-scroller"><table class="data-table"><thead><tr><th>OBSERVED STAT</th><th>L5 AVG</th><th>GAMES IN L10</th><th>LAST 5 VALUES</th></tr></thead><tbody>'+statistics+'</tbody></table></div>':
     '<p class="page-note">No matching statistics in available ESPN game records.</p>')+
    '<p><a href="#/'+esc(ctx.sport)+'/player/'+esc(athlete)+'">Open full verified player dashboard →</a></p></div>';
  }catch(_){const here=panel()?.querySelector('#tsoObservedStats');if(here)here.innerHTML='<p class="page-note">Official ESPN player history request failed; no statistical values have been substituted.</p>'}
 });
 const initial=games.find(g=>String(g.id)===String(chosen.get(session)))||games[0];
 await loadRosters(String(initial.id));
}
window.TSO3ObservedResearch={supports,render,hydrate,tools};
})();
