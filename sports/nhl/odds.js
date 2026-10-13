import {num} from './data.js';
export const MARKET_MAP={player_goals:'atg',player_anytime_goal:'atg',player_anytime_goal_scorer:'atg',player_first_goal_scorer:'fgs',player_shots_on_goal:'sog',player_points_nhl:'points',player_assists:'assists',player_blocked_shots:'blocks',player_saves:'saves',player_total_saves:'saves'};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const BOOKS=['draftkings','fanduel','betmgm','caesars','fanatics','pinnacle','bet365','betrivers'];
function sideLink(row,side){
 const upper=side[0].toUpperCase()+side.slice(1);
 const values=[row?.[`${side}_link`],row?.[`${side}Link`],row?.[`${side}_url`],row?.[`${side}Url`],row?.[`link${upper}`],row?.[`url${upper}`]];
 return values.find(v=>typeof v==='string'&&/^https:\/\//i.test(v))||null;
}
function sideSid(row,side){
 const upper=side[0].toUpperCase()+side.slice(1);
 const values=[row?.[`${side}_sid`],row?.[`${side}Sid`],row?.[`sid${upper}`],row?.[`${side}_selection_id`],row?.[`${side}SelectionId`]];
 const value=values.find(v=>v!==null&&v!==undefined&&String(v).trim());return value==null?null:String(value);
}
export function normalizeOdds(rows,slate,now=Date.now(),audit=null){
 const quotes=[];
 const reject=(reason,r)=>{
  if(!audit)return;
  audit.counts??={};audit.counts[reason]=(audit.counts[reason]||0)+1;
  audit.examples??={};
  const samples=audit.examples[reason]??=[];
  if(samples.length<2)samples.push({
   market:r?.market_key||null,book:r?.bookmaker||null,
   home:r?.home_team||null,away:r?.away_team||null,
   start:r?.commence_time||null,player:r?.player||r?.player_name||null,
   lastUpdate:r?.last_update??r?.last_update_ms??null,
   ageSeconds:r?.age_seconds??null,line:r?.line??null,
   overPrice:r?.over_price??null,underPrice:r?.under_price??null,
   keys:Object.keys(r||{}).slice(0,22)
  });
 };
 for(const r of rows||[]){
  const market=MARKET_MAP[r.market_key],book=String(r.bookmaker||'').toLowerCase().replace(/[^a-z0-9]/g,'');if(!market){reject('market_unrecognized',r);continue;}if(!BOOKS.includes(book)){reject('book_not_allowed',r);continue;}
  const time=Date.parse(r.commence_time||'');if(!Number.isFinite(time)){reject('event_start_missing',r);continue;}
  const matches=slate.games.filter(g=>norm(g.home.name)===norm(r.home_team)&&norm(g.away.name)===norm(r.away_team)&&Math.abs(Date.parse(g.startTime)-time)<=1800000);if(matches.length!==1){reject('game_match_failed',r);continue;}
  const game=matches[0],name=String(r.player||r.player_name||'').replace(/\s*\([A-Z]{2,4}\)\s*$/,'');const players=game.players.filter(p=>norm(p.name)===norm(name));if(players.length!==1){reject('player_match_failed',r);continue;}
  let ts=num(r.last_update??r.last_update_ms);if(ts!=null&&ts<1e12)ts*=1000;
  const age=num(r.age_seconds);if(ts==null&&age!=null&&age>=0)ts=now-age*1000;
  if(ts==null||now-ts>3600000||ts>now+60000||(age!=null&&(age<0||age>3600))){reject('quote_timestamp_invalid_or_stale',r);continue;}
  const rawLine=num(r.line);let line=rawLine;if(['player_anytime_goal','player_anytime_goal_scorer','player_first_goal_scorer'].includes(r.market_key)&&line==null)line=.5;if(line==null||line<0){reject('line_missing',r);continue;}if(r.market_key==='player_goals'&&Math.abs(line-.5)>.001){reject('not_anytime_goal_line',r);continue;}if(['atg','fgs'].includes(market)&&Math.abs(line-.5)>.001){reject('not_half_goal_line',r);continue;}
  const price=v=>{const n=num(v);return n!=null&&Math.abs(n)>=100?n:null;};const over=price(r.over_price),under=price(r.under_price);if(over==null&&under==null){reject('price_missing_or_non_american',r);continue;}
  quotes.push({gameId:game.id,playerId:players[0].id,player:players[0].name,market,line,over,under,book,ts,homeTeam:game.home.name,awayTeam:game.away.name,commenceTime:game.startTime,overLink:sideLink(r,'over'),underLink:sideLink(r,'under'),overSid:sideSid(r,'over'),underSid:sideSid(r,'under')});if(audit)audit.accepted=(audit.accepted||0)+1;
 }
 const rowsOut=quotes.map(q=>({eventId:q.gameId,gameId:q.gameId,player:q.player,market:q.market,line:q.line,book:q.book,bookKey:q.book,overPrice:q.over,underPrice:q.under,homeTeam:q.homeTeam,awayTeam:q.awayTeam,commenceTime:q.commenceTime,snapshotTime:new Date(q.ts).toISOString(),overLink:q.overLink,underLink:q.underLink,overSid:q.overSid,underSid:q.underSid,preserved:false,priceKind:'verified-snapshot'}));
 return {source:'parlayapi',meta:{source:'parlayapi',sample:false,sport:'NHL',fetchedAt:new Date(now).toISOString(),nativeLinkRows:rowsOut.filter(r=>r.overLink||r.underLink).length,nativeSidRows:rowsOut.filter(r=>r.overSid||r.underSid).length},generatedAt:new Date(now).toISOString(),quotes,rows:rowsOut};
}
export function quoteFor(doc,gameId,playerId,market,now=Date.now()){
 return (doc?.quotes||[]).filter(q=>q.gameId===gameId&&q.playerId===playerId&&q.market===market&&now-q.ts<=3600000&&q.ts<=now+60000).sort((a,b)=>b.ts-a.ts)[0]||null;
}
