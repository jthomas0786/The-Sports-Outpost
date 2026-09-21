const VERSION='2.1';
const STYLE_ID='pp-betslip-v2-css';
const ROOT_ID='ppSlipShell';
const MAX_LEGS=25;
let installed=false;
let selectedBook='';
let bookMenuOpen=true;
let tuneActive=false;
let showAllBooks=false;
let offers=[];
const oddsCache=new Map();

const BOOKS=[
  {name:'FanDuel',domain:'fanduel.com'},
  {name:'DraftKings',domain:'draftkings.com'},
  {name:'BetMGM',domain:'betmgm.com'},
  {name:'Caesars',domain:'caesars.com'},
  {name:'ESPN BET',domain:'espnbet.com'},
  {name:'Fanatics',domain:'fanatics.com'},
  {name:'Hard Rock Bet',domain:'hardrock.bet'},
  {name:'bet365',domain:'bet365.com'},
  {name:'BetRivers',domain:'betrivers.com'},
  {name:'Bovada',domain:'bovada.lv'},
  {name:'Pinnacle',domain:'pinnacle.com'},
];
const BOOK_ALIASES=new Map([
  ['fanduel','FanDuel'],['draftkings','DraftKings'],['betmgm','BetMGM'],['caesars','Caesars'],
  ['espn bet','ESPN BET'],['espnbet','ESPN BET'],['fanatics','Fanatics'],['hard rock','Hard Rock Bet'],
  ['hard rock bet','Hard Rock Bet'],['bet365','bet365'],['betrivers','BetRivers'],['rushbet','BetRivers'],
  ['bovada','Bovada'],['pinnacle','Pinnacle'],
]);
const MARKET_ALIASES=new Map([
  ['atd','atd'],['anytime td','atd'],['anytime touchdown','atd'],['anytime td scorer','atd'],
  ['rec yds','recyds'],['receiving yards','recyds'],['recyds','recyds'],
  ['rush yds','rushyds'],['rushing yards','rushyds'],['rushyds','rushyds'],
  ['pass yds','passyds'],['passing yards','passyds'],['passyds','passyds'],
  ['pass tds','passtds'],['passing tds','passtds'],['passing touchdowns','passtds'],['passtds','passtds'],
  ['receptions','receptions'],['completions','completions'],['points','points'],['rebounds','rebounds'],
  ['assists','assists'],['shots on goal','sog'],['sog','sog'],['hits','hits'],['total bases','totalbases'],
]);
const NFL_NAMES={ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',JAC:'Jacksonville Jaguars',KC:'Kansas City Chiefs',LV:'Las Vegas Raiders',LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NE:'New England Patriots',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SEA:'Seattle Seahawks',SF:'San Francisco 49ers',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders',WSH:'Washington Commanders'};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLowerCase().replace(/[.’']/g,'').replace(/\s+(jr|sr|ii|iii|iv|v)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const lineKey=v=>{const n=num(v);return n==null?'':String(Number(n.toFixed(4)));};
function canonBook(v){const n=norm(v);return BOOK_ALIASES.get(n)||BOOKS.find(x=>norm(x.name)===n)?.name||String(v||'').trim();}
function canonMarket(v){const n=norm(v);return MARKET_ALIASES.get(n)||n.replace(/\s+/g,'');}
function canonSide(v,market=''){if(canonMarket(market)==='atd')return'over';return norm(v)==='under'?'under':'over';}
function priceText(v){const n=num(v);return n==null?'—':n>0?`+${Math.round(n)}`:`${Math.round(n)}`;}
function priceToDecimal(v){const n=num(v);if(n==null||n===0)return null;return n>0?1+n/100:1+100/Math.abs(n);}
function decimalToAmerican(v){const d=num(v);if(d==null||d<=1)return null;return d>=2?Math.round((d-1)*100):Math.round(-100/(d-1));}
function impliedProbability(v){const n=num(v);if(n==null||n===0)return null;return n>0?100/(n+100):Math.abs(n)/(Math.abs(n)+100);}
function formatPct(v){const n=num(v);if(n==null)return'—';const p=n<=1?n*100:n;return `${p.toFixed(1)}%`;}
function readSlip(){try{const rows=JSON.parse(localStorage.getItem('dw_betslip')||'[]');return Array.isArray(rows)?rows.slice(0,MAX_LEGS):[];}catch{return[];}}
function writeSlip(rows){localStorage.setItem('dw_betslip',JSON.stringify(rows.slice(0,MAX_LEGS)));window.renderBetslipBar?.();window.syncAddButtons?.();}
function sportOf(row){return String(row?.sport||window.DW_SPORT||'nfl').toLowerCase().replace(/[^a-z0-9]/g,'');}
function gameIdOf(row){return String(row?.gameId??row?.event_id??row?.eventId??row?.game_pk??row?.gamePk??'');}
function playerOf(row){return String(row?.player??row?.player_name??row?.name??'').trim();}
function marketOf(row){return row?.market??row?.prop_key??row?.prop??'';}
function sideOf(row){return row?.side??'over';}
function bookLogo(book){const b=BOOKS.find(x=>canonBook(x.name)===canonBook(book));return b?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(b.domain)}&sz=64`:'';}
function ppLogo(){return `<svg class="pps-mark" viewBox="0 0 64 64" role="img" aria-label="ParlayPing"><defs><linearGradient id="ppSlipGrad" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#49f59f"/><stop offset="1" stop-color="#24d9ff"/></linearGradient></defs><path d="M13 8h24c12 0 20 8 20 19 0 10-7 18-18 19H28v10H13V8Z" fill="#0b1f31" stroke="url(#ppSlipGrad)" stroke-width="3"/><path d="M16 15h19c8 0 13 5 13 12 0 6-5 11-12 11H28V25H16V15Z" fill="none" stroke="url(#ppSlipGrad)" stroke-width="4" stroke-linecap="round"/><path d="M16 18h16v29H16z" fill="#f7fbff"/><path d="M16 45l3 3 3-3 3 3 3-3 3 3 1-1V18H16v27Z" fill="#f7fbff"/><circle cx="21" cy="25" r="3.5" fill="#24dfa3"/><path d="m19.6 25 1.1 1.2 2.1-2.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="34" r="3.5" fill="#24dfa3"/><path d="m19.6 34 1.1 1.2 2.1-2.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 24h6M27 33h6" stroke="#8295a8" stroke-width="2.2" stroke-linecap="round"/><circle cx="38" cy="28" r="3" fill="url(#ppSlipGrad)"/><path d="M42 22c3 2 4 4 4 6s-1 4-4 6M45 18c5 3 7 6 7 10s-2 8-7 11" fill="none" stroke="url(#ppSlipGrad)" stroke-width="3" stroke-linecap="round"/></svg>`;}
function ensureStyle(){if(document.getElementById(STYLE_ID))return;const link=document.createElement('link');link.id=STYLE_ID;link.rel='stylesheet';link.href=`./sports/parlayping-betslip-v2.css?v=${VERSION}`;document.head.appendChild(link);}
function getJson(path,force=false){const key=path;if(!force&&oddsCache.has(key))return oddsCache.get(key);const promise=fetch(`${path}?v=${VERSION}-${force?Date.now():'snapshot'}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);oddsCache.set(key,promise);return promise;}
function addOffer(target,{sport,game,player,market,side,line,raw}){
  if(!raw||typeof raw!=='object')return;
  const book=canonBook(raw.book??raw.sportsbook??raw.bookmaker??raw.source);
  const price=num(raw.price??raw.odds??raw.americanOdds??raw.american);
  if(!book||price==null)return;
  const canonicalMarket=canonMarket(market);
  const offerLine=num(raw.line??raw.point??raw.threshold??line??(canonicalMarket==='atd'?0.5:null));
  target.push({
    sport:String(sport||'').toLowerCase(),
    gameId:String(game?.gameId??game?.id??game?.eventId??game?.fixtureId??''),
    gameText:String(game?.game??game?.matchup??''),away:game?.away?.abbr??game?.away??null,home:game?.home?.abbr??game?.home??null,
    startTime:game?.startTimeUTC??game?.startTime??game?.date??null,
    player:String(player?.name??player?.player??player?.player_name??player??''),playerId:String(player?.espnId??player?.playerId??player?.player_id??''),
    market:canonicalMarket,side:canonSide(raw.side??side,market),line:offerLine,book,price,
    link:String(raw.link??raw.deepLink??raw.deeplink??raw.url??''),
    probability:num(raw.probability??raw.modelProbability??raw.fairProbability??raw.impliedProbability??raw.prob),
  });
}
function collectSlot(target,ctx,slot,side){
  if(!slot||typeof slot!=='object')return;
  if(slot.best)addOffer(target,{...ctx,side,line:slot.line,raw:slot.best});
  if(Array.isArray(slot.all))for(const raw of slot.all)addOffer(target,{...ctx,side,line:slot.line,raw});
  if(Array.isArray(slot.offers))for(const raw of slot.offers)addOffer(target,{...ctx,side,line:slot.line,raw});
}
function flattenOdds(doc,sport){
  const out=[];
  for(const game of doc?.games||[])for(const player of game?.players||[])for(const [market,slot] of Object.entries(player?.odds||{})){
    const ctx={sport,game,player,market,line:slot?.line};
    collectSlot(out,ctx,slot,canonMarket(market)==='atd'?'over':slot?.side);
    collectSlot(out,ctx,slot?.over,'over');collectSlot(out,ctx,slot?.under,'under');
  }
  return out;
}
function offersFromLeg(row){
  const out=[];
  const common={sport:sportOf(row),game:{gameId:gameIdOf(row),game:row?.game,startTimeUTC:row?.startTimeUTC??row?.kickoff,away:row?.away,home:row?.home},player:{name:playerOf(row),playerId:row?.player_id??row?.playerId??row?.espnId},market:marketOf(row),side:sideOf(row),line:row?.line};
  if(row?.book&&row?.price!=null)addOffer(out,{...common,raw:{book:row.book,price:row.price,link:row.link,line:row.line,probability:row.pct??row.probability}});
  for(const arr of [row?.offers,row?.sportsbooks,row?.bookmakers,row?.allOdds,row?.odds])if(Array.isArray(arr))for(const raw of arr)addOffer(out,{...common,raw});
  return out;
}
async function hydrateOdds(force=false){
  const legs=readSlip(),sports=[...new Set(legs.map(sportOf))];
  const docs=await Promise.all(sports.map(async sport=>[sport,await getJson(`./slates/${sport}-odds.json`,force)]));
  const next=legs.flatMap(offersFromLeg);for(const [sport,doc] of docs)if(doc)next.push(...flattenOdds(doc,sport));offers=dedupeOffers(next);return offers;
}
function dedupeOffers(rows){const map=new Map();for(const o of rows){const key=[o.sport,o.gameId,norm(o.player),o.market,o.side,lineKey(o.line),canonBook(o.book),o.price,o.link].join('|');if(!map.has(key))map.set(key,o);}return[...map.values()];}
function gameMatch(leg,o){const a=gameIdOf(leg),b=String(o.gameId||'');if(a&&b)return a===b;const g=norm(leg?.game);return !g||!o.gameText||norm(o.gameText)===g;}
function baseOfferMatch(leg,o){return sportOf(leg)===String(o.sport||'').toLowerCase()&&norm(playerOf(leg))===norm(o.player)&&canonMarket(marketOf(leg))===o.market&&canonSide(sideOf(leg),marketOf(leg))===o.side&&gameMatch(leg,o);}
function exactOffer(leg,book){const target=lineKey(leg?.line);return offers.filter(o=>canonBook(o.book)===canonBook(book)&&baseOfferMatch(leg,o)&&lineKey(o.line)===target).sort((a,b)=>b.price-a.price)[0]||null;}
function altOffers(leg,book){const map=new Map();for(const o of offers.filter(o=>canonBook(o.book)===canonBook(book)&&baseOfferMatch(leg,o)&&o.line!=null)){const key=lineKey(o.line),cur=map.get(key);if(!cur||o.price>cur.price)map.set(key,o);}const list=[...map.values()].sort((a,b)=>a.line-b.line);if(!list.length){const fallback=offersFromLeg(leg).find(o=>canonBook(o.book)===canonBook(book));if(fallback)list.push(fallback);}return list;}
function explicitBookValue(container,book){
  if(container==null)return null;
  if(typeof container==='number'||typeof container==='string')return num(container);
  if(Array.isArray(container)){const hit=container.find(x=>canonBook(x?.book??x?.sportsbook)===canonBook(book));return num(hit?.price??hit?.odds??hit?.americanOdds);}
  if(typeof container==='object'){for(const [k,v] of Object.entries(container))if(canonBook(k)===canonBook(book))return num(v?.price??v?.odds??v);}
  return null;
}
function explicitParlayPrice(legs,book){for(const leg of legs){for(const value of [leg?.parlayOdds,leg?.parlay_odds,leg?.bookParlayOdds,leg?.parlayPrices]){const found=explicitBookValue(value,book);if(found!=null)return found;}}return null;}
function explicitParlayLink(legs,book){for(const leg of legs){for(const value of [leg?.parlayLinks,leg?.parlay_links,leg?.bookParlayLinks]){if(Array.isArray(value)){const hit=value.find(x=>canonBook(x?.book??x?.sportsbook)===canonBook(book));if(hit?.link||hit?.url)return String(hit.link||hit.url);}else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value))if(canonBook(k)===canonBook(book)){const link=typeof v==='string'?v:v?.link??v?.url;if(link)return String(link);}}}}return'';}
function hasRepeatedGame(legs){const seen=new Set();for(const leg of legs){const id=gameIdOf(leg)||norm(leg?.game);if(!id)continue;if(seen.has(id))return true;seen.add(id);}return false;}
function bookSummary(legs,book){
  const exact=legs.map(l=>exactOffer(l,book)),found=exact.filter(Boolean),complete=found.length===legs.length;
  let parlay=complete?explicitParlayPrice(legs,book):null;
  if(parlay==null&&complete&&!hasRepeatedGame(legs)){const decimal=found.reduce((total,o)=>{const d=priceToDecimal(o.price);return d?total*d:total;},1);parlay=decimalToAmerican(decimal);}
  return{book:canonBook(book),available:found.length,total:legs.length,parlay,offers:found,complete};
}
function summaries(legs){const names=[...new Set([...BOOKS.map(x=>x.name),...offers.map(x=>canonBook(x.book))])];return names.map(b=>bookSummary(legs,b)).filter(x=>x.available>0).sort((a,b)=>Number(b.complete)-Number(a.complete)+0||Number(b.parlay!=null)-Number(a.parlay!=null)+0||(b.parlay??-999999)-(a.parlay??-999999)||b.available-a.available);}
function bestSelected(legs){const rows=summaries(legs);return rows.find(x=>x.complete&&x.parlay!=null)?.book||rows.find(x=>x.complete)?.book||canonBook(legs.find(x=>x.book)?.book)||rows[0]?.book||'FanDuel';}
function probabilityFor(leg,offer){const p=num(offer?.probability);if(p!=null)return p;const original=lineKey(leg?._ppOriginalLine??leg?.line);if(lineKey(offer?.line)===original){const raw=num(leg?.pct??leg?.probabilityPct??leg?.probability??leg?.prob);if(raw!=null)return raw>1?raw/100:raw;}return impliedProbability(offer?.price);}
function headshot(leg){const id=leg?.player_id??leg?.playerId??leg?.espnId;if(!id)return'';const sport=sportOf(leg),league={nfl:'nfl',nba:'nba',wnba:'wnba',nhl:'nhl',mlb:'mlb'}[sport]||sport;return `https://a.espncdn.com/i/headshots/${league}/players/full/${encodeURIComponent(id)}.png`;}
function teamLogo(sport,abbr){if(!abbr)return'';const league={nfl:'nfl',nba:'nba',wnba:'wnba',nhl:'nhl',mlb:'mlb'}[sport]||sport;return `https://a.espncdn.com/i/teamlogos/${league}/500/${encodeURIComponent(String(abbr).toLowerCase())}.png`;}
function marketLabel(leg){const key=canonMarket(marketOf(leg));return{atd:'Anytime TD Scorer',recyds:'Receiving Yards',rushyds:'Rushing Yards',passyds:'Passing Yards',passtds:'Passing TDs',receptions:'Receptions',completions:'Completions',sog:'Shots on Goal',totalbases:'Total Bases'}[key]||String(marketOf(leg)||'Player Prop');}
function displayLine(leg){const market=canonMarket(marketOf(leg)),line=num(leg?.line);if(line==null)return playerOf(leg);if(market==='atd')return `${playerOf(leg)} Over ${line}`;return `${playerOf(leg)} ${canonSide(sideOf(leg),marketOf(leg))==='under'?'Under':'Over'} ${line}`;}
function parseGame(leg,offer){
  const sport=sportOf(leg);let away=offer?.away??leg?.away?.abbr??leg?.away??null,home=offer?.home??leg?.home?.abbr??leg?.home??null;const raw=String(leg?.game||offer?.gameText||'');
  if((!away||!home)&&raw){const parts=raw.split(/\s+(?:@|vs\.?|v\.)\s+/i);if(parts.length>=2){away=away||parts[0].trim();home=home||parts[1].trim();}}
  const full=x=>sport==='nfl'?(NFL_NAMES[String(x||'').toUpperCase()]||x):x;
  return{sport,away,home,title:away&&home?`${full(away)} vs ${full(home)}`:(raw||sport.toUpperCase()),start:offer?.startTime??leg?.startTimeUTC??leg?.kickoff??leg?.startTime??null};
}
function timeLabel(value,sport){if(!value)return sport.toUpperCase();const d=new Date(value);if(!Number.isFinite(d.getTime()))return sport.toUpperCase();const same=d.toDateString()===new Date().toDateString();return `${same?'Today':d.toLocaleDateString([],{month:'short',day:'numeric'})} at ${d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} • ${sport.toUpperCase()}`;}
function gameGroups(legs){const map=new Map();legs.forEach((leg,index)=>{const offer=exactOffer(leg,selectedBook)||offers.find(o=>baseOfferMatch(leg,o)),meta=parseGame(leg,offer),key=gameIdOf(leg)||norm(meta.title)||`game-${index}`;if(!map.has(key))map.set(key,{key,meta,items:[]});map.get(key).items.push({leg,index});});return[...map.values()];}
function selectedOfferForLeg(leg){return exactOffer(leg,selectedBook)||offersFromLeg(leg).find(o=>canonBook(o.book)===canonBook(selectedBook))||null;}
function bookRowsHtml(legs){let rows=summaries(legs);if(!rows.length)rows=[bookSummary(legs,selectedBook||'FanDuel')];const visible=showAllBooks?rows:rows.slice(0,7);return visible.map(s=>`<div class="pps-book-row" data-book="${esc(s.book)}"><div class="pps-book-main"><img src="${esc(bookLogo(s.book))}" alt=""><strong>${esc(s.book)}</strong></div><div class="pps-available">${s.available}/${s.total} bets</div><div class="pps-parlay-odds">${s.parlay!=null?priceText(s.parlay):'—'}</div><div class="${canonBook(s.book)===canonBook(selectedBook)?'pps-check':'pps-chevron'}">${canonBook(s.book)===canonBook(selectedBook)?'✓':'⌄'}</div></div>`).join('')+`<div class="pps-book-row" data-compare="1"><div class="pps-book-main"><span style="font-size:25px;color:#8feaff">▦</span><strong>Compare All Books</strong></div><div class="pps-available">--</div><div class="pps-parlay-odds" style="font-size:14px;font-weight:500;color:#9cc9e3">${showAllBooks?'Top books':'See all odds'}</div><div class="pps-chevron">›</div></div>`;}
function selectedBookHtml(legs){const s=bookSummary(legs,selectedBook);return `<div class="pps-selected-book" id="ppBookToggle"><div class="pps-book-row"><div class="pps-book-main"><img src="${esc(bookLogo(selectedBook))}" alt=""><strong>${esc(selectedBook)}</strong></div><div class="pps-available">${s.available}/${s.total} bets</div><div class="pps-parlay-odds">${s.parlay!=null?priceText(s.parlay):'—'}</div><div class="pps-chevron">${bookMenuOpen?'⌃':'⌄'}</div></div></div><div class="pps-book-drop" id="ppBookDrop" ${bookMenuOpen?'':'hidden'}>${bookRowsHtml(legs)}</div>`;}
function altHtml(leg,index){const list=altOffers(leg,selectedBook);if(!list.length)return'';const current=lineKey(leg?.line);return `<div class="pps-alt-wrap"><button class="pps-scroll-arrow" data-scroll="left" data-leg="${index}">‹</button><div class="pps-alt-scroll" id="ppAlt-${index}">${list.map(o=>`<button class="pps-alt-chip ${lineKey(o.line)===current?'selected':''}" data-leg="${index}" data-line="${esc(lineKey(o.line))}"><span>${esc(o.line)}</span><b>${priceText(o.price)}</b></button>`).join('')}</div><button class="pps-scroll-arrow" data-scroll="right" data-leg="${index}">›</button></div>`;}
function legHtml(leg,index){const selected=selectedOfferForLeg(leg),price=selected?.price??leg?.price,prob=probabilityFor(leg,selected),shot=headshot(leg);return `<div class="pps-leg"><div class="pps-leg-main"><img class="pps-headshot" src="${esc(shot)}" alt="" onerror="this.style.visibility='hidden'"><div class="pps-leg-copy"><div class="pps-leg-name">${esc(displayLine(leg))}</div><div class="pps-leg-market">${esc(marketLabel(leg))}</div>${tuneActive?`<div class="pps-book-label"><img src="${esc(bookLogo(selectedBook))}" alt=""><span>${esc(selectedBook)} odds</span></div>`:''}</div><div class="pps-leg-price"><strong>${priceText(price)}</strong><span>${formatPct(prob)}</span></div><div class="pps-more">⋮</div></div>${tuneActive?altHtml(leg,index):''}</div>`;}
function gamesHtml(legs){return gameGroups(legs).map(group=>{const {sport,away,home,title,start}=group.meta,html=group.items.map(({leg,index})=>legHtml(leg,index)).join('');return `<section class="pps-game"><div class="pps-game-head"><div class="pps-team-logos">${away?`<img src="${esc(teamLogo(sport,away))}" alt="">`:''}<span class="pps-vs">VS</span>${home?`<img src="${esc(teamLogo(sport,home))}" alt="">`:''}</div><div class="pps-game-title"><strong>${esc(title)}</strong><span>${esc(timeLabel(start,sport))}</span></div><div class="pps-game-count">${group.items.length} bet${group.items.length===1?'':'s'} &nbsp;⌃</div></div>${html}</section>`;}).join('');}
function placeTargets(legs){const parlay=explicitParlayLink(legs,selectedBook);if(parlay)return[parlay];return legs.map(l=>exactOffer(l,selectedBook)?.link||((canonBook(l?.book)===canonBook(selectedBook))?String(l?.link||''):'')).filter(Boolean);}
function bellIcon(){return `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`;}
function profileIcon(){return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;}
function render(){
  const root=ensureRoot(),legs=readSlip();
  if(!legs.length){root.innerHTML=`<div class="pps-wrap"><header class="pps-topbar"><button class="pps-menu" id="ppClose"><span></span></button><div class="pps-brand">${ppLogo()}<div><div class="pps-wordmark">Parlay<b>Ping</b></div><span class="pps-tagline">BET SMARTER TOGETHER</span></div></div></header><div class="pps-empty"><strong>Your betslip is empty.</strong>Add a pick on The Sports Outpost, then open ParlayPing again.</div></div>`;root.querySelector('#ppClose')?.addEventListener('click',close);return;}
  if(!selectedBook)selectedBook=bestSelected(legs);
  const targets=placeTargets(legs),summary=bookSummary(legs,selectedBook),parlayLink=explicitParlayLink(legs,selectedBook),canPlace=summary.complete&&(parlayLink||targets.length===legs.length);
  root.classList.toggle('pps-tune-off',!tuneActive);
  root.innerHTML=`<div class="pps-wrap"><header class="pps-topbar"><button class="pps-menu" id="ppClose" aria-label="Close ParlayPing"><span></span></button><div class="pps-brand">${ppLogo()}<div><div class="pps-wordmark">Parlay<b>Ping</b></div><span class="pps-tagline">BET SMARTER TOGETHER</span></div></div><div class="pps-top-actions"><button aria-label="Notifications">${bellIcon()}</button><button aria-label="Profile">${profileIcon()}</button></div></header><section class="pps-panel pps-book-panel"><div class="pps-book-heading"><div><h2>Best Book for This Parlay</h2><p>Compare your full slip across top books</p></div><div class="pps-cap">⚡ Supports up to 25 legs</div></div><div class="pps-book-head"><span>SPORTSBOOK</span><span style="text-align:center">AVAILABLE BETS</span><span style="text-align:right">PARLAY ODDS</span><span></span></div>${selectedBookHtml(legs)}<button class="pps-place" id="ppPlace" ${canPlace?'':'disabled'}><span class="pps-place-bolt">ϟ</span><span class="pps-place-copy"><strong>PLACE ALL ${legs.length} BET${legs.length===1?'':'S'}</strong><span>Open in ${esc(selectedBook)}</span></span><span class="pps-place-arrow">›</span></button></section><section><div class="pps-slip-head"><div><h2>Your ${legs.length}-Bet Parlay</h2><p>Grouped by game for a cleaner view</p></div><div class="pps-tools"><button class="pps-tool ${tuneActive?'active':''}" id="ppTune"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="9" cy="17" r="2"/></svg><span><strong>Tune Parlay</strong>${tuneActive?'<small>ACTIVE</small>':''}</span></button><button class="pps-tool" id="ppLineCheck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m8 12 2.5 2.5L16 9"/></svg><span><strong>Line Check</strong><small>VALIDATE ODDS</small></span></button></div></div><div class="pps-games">${gamesHtml(legs)}</div></section><footer class="pps-footer"><div class="pps-share-title">SHARE YOUR BETSLIP</div><div class="pps-share-row"><button class="pps-share" data-share="copy"><i>↗</i><span>Copy Link</span></button><button class="pps-share" data-share="x"><i>𝕏</i><span>X (Twitter)</span></button><button class="pps-share" data-share="messages"><i>≡</i><span>Messages</span></button><button class="pps-share" data-share="sms"><i>●</i><span>SMS</span></button><button class="pps-share" data-share="more"><i>•••</i><span>More</span></button></div></footer></div>`;
  bind(root,legs);
}
function bind(root,legs){
  root.querySelector('#ppClose')?.addEventListener('click',close);
  root.querySelector('#ppBookToggle')?.addEventListener('click',()=>{bookMenuOpen=!bookMenuOpen;render();});
  root.querySelectorAll('[data-book]').forEach(el=>el.addEventListener('click',()=>{selectedBook=el.dataset.book||selectedBook;bookMenuOpen=false;render();}));
  root.querySelector('[data-compare]')?.addEventListener('click',()=>{showAllBooks=!showAllBooks;bookMenuOpen=true;render();});
  root.querySelector('#ppTune')?.addEventListener('click',()=>{tuneActive=!tuneActive;render();});
  root.querySelector('#ppLineCheck')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;await hydrateOdds(true);btn.disabled=false;toast('Sportsbook lines refreshed.');render();});
  root.querySelector('#ppPlace')?.addEventListener('click',()=>placeAll(legs));
  root.querySelectorAll('.pps-alt-chip').forEach(el=>el.addEventListener('click',()=>selectAlt(Number(el.dataset.leg),el.dataset.line,selectedBook)));
  root.querySelectorAll('[data-scroll]').forEach(el=>el.addEventListener('click',()=>document.getElementById(`ppAlt-${el.dataset.leg}`)?.scrollBy({left:(el.dataset.scroll==='left'?-1:1)*260,behavior:'smooth'})));
  root.querySelectorAll('[data-share]').forEach(el=>el.addEventListener('click',()=>share(el.dataset.share,legs)));
}
function selectAlt(index,line,book){
  const rows=readSlip(),leg=rows[index];if(!leg)return;
  const alt=altOffers(leg,book).find(o=>lineKey(o.line)===String(line));if(!alt)return;
  leg._ppOriginalLine=leg._ppOriginalLine??leg.line;leg._ppOriginalId=leg._ppOriginalId??leg.id;
  leg.line=alt.line;leg.price=alt.price;leg.book=alt.book;leg.link=alt.link||leg.link;
  leg.id=`${playerOf(leg)}|${canonMarket(marketOf(leg))}|${canonSide(sideOf(leg),marketOf(leg))}|${lineKey(alt.line)}`;
  rows[index]=leg;writeSlip(rows);render();
}
function placeAll(legs){
  const targets=placeTargets(legs),parlayLink=explicitParlayLink(legs,selectedBook);
  if(!targets.length||(!parlayLink&&targets.length!==legs.length))return toast(`${selectedBook} does not have a complete direct betslip link for this parlay.`);
  for(const link of targets)try{window.open(link,'_blank','noopener');}catch{}
  toast(`Opening this parlay in ${selectedBook}.`);
}
function shareText(legs){return `ParlayPing ${legs.length}-leg parlay\n`+legs.map(l=>`• ${displayLine(l)} (${priceText(selectedOfferForLeg(l)?.price??l.price)})`).join('\n');}
async function share(kind,legs){const text=shareText(legs),url=location.href;if(kind==='copy'){try{await navigator.clipboard.writeText(`${text}\n${url}`);toast('Betslip copied.');}catch{}return;}if(kind==='x'){window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank','noopener');return;}if(kind==='sms'){location.href=`sms:?&body=${encodeURIComponent(`${text}\n${url}`)}`;return;}if(navigator.share){try{await navigator.share({title:'ParlayPing Betslip',text,url});}catch{}}else try{await navigator.clipboard.writeText(`${text}\n${url}`);toast('Betslip copied.');}catch{}}
function toast(text){document.querySelector('.pps-toast')?.remove();const t=document.createElement('div');t.className='pps-toast';t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),2400);}
function ensureRoot(){ensureStyle();let root=document.getElementById(ROOT_ID);if(!root){root=document.createElement('div');root.id=ROOT_ID;root.hidden=true;document.body.appendChild(root);}return root;}
async function open(){
  const legs=readSlip();if(!legs.length){const note=document.getElementById('bsNote');if(note)note.textContent='Add at least one pick before opening ParlayPing.';}
  const root=ensureRoot();root.hidden=false;document.documentElement.style.overflow='hidden';offers=legs.flatMap(offersFromLeg);bookMenuOpen=true;tuneActive=false;selectedBook=bestSelected(legs);render();
  await hydrateOdds(false);selectedBook=bestSelected(readSlip());render();
}
function close(){const root=document.getElementById(ROOT_ID);if(root)root.hidden=true;document.documentElement.style.overflow='';}
function renameLegacyButton(){const btn=document.getElementById('bsText');if(!btn)return false;if(btn.tagName==='INPUT')btn.value='Open ParlayPing';else btn.textContent='Open ParlayPing';btn.setAttribute('aria-label','Open this betslip in ParlayPing');return true;}
export function installParlayPingBetslipV2(){if(installed||typeof document==='undefined')return;installed=true;renameLegacyButton();requestAnimationFrame(renameLegacyButton);document.addEventListener('click',e=>{const btn=e.target?.closest?.('#bsText');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();open();},true);window.addEventListener('keydown',e=>{if(e.key==='Escape')close();});}
export const __PARLAYPING_BETSLIP_V2_TEST__={readSlip,flattenOdds,exactOffer,altOffers,bookSummary,priceToDecimal,decimalToAmerican,MAX_LEGS,canonBook,canonMarket,gameGroups};
