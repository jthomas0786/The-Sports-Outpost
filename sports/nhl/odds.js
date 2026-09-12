import {num} from './data.js';
export const MARKET_MAP={player_anytime_goal:'atg',player_anytime_goal_scorer:'atg',player_shots_on_goal:'sog',player_points_nhl:'points',player_assists:'assists',player_blocked_shots:'blocks',player_saves:'saves',player_total_saves:'saves'};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const BOOKS=['draftkings','fanduel','betmgm','caesars','fanatics','pinnacle','bet365','betrivers'];
export function normalizeOdds(rows,slate,now=Date.now()){
 const quotes=[];
 for(const r of rows||[]){
  const market=MARKET_MAP[r.market_key],book=String(r.bookmaker||'').toLowerCase();if(!market||!BOOKS.includes(book))continue;
  const time=Date.parse(r.commence_time||'');if(!Number.isFinite(time))continue;
  const matches=slate.games.filter(g=>norm(g.home.name)===norm(r.home_team)&&norm(g.away.name)===norm(r.away_team)&&Math.abs(Date.parse(g.startTime)-time)<=1800000);if(matches.length!==1)continue;
  const game=matches[0],name=String(r.player||r.player_name||'').replace(/\s*\([A-Z]{2,4}\)\s*$/,'');const players=game.players.filter(p=>norm(p.name)===norm(name));if(players.length!==1)continue;
  let ts=num(r.last_update??r.last_update_ms);if(ts!=null&&ts<1e12)ts*=1000;
  const age=num(r.age_seconds);if(ts==null&&age!=null&&age>=0)ts=now-age*1000;
  if(ts==null||now-ts>3600000||ts>now+60000||(age!=null&&(age<0||age>3600)))continue;
  const line=market==='atg'?.5:num(r.line);if(line==null||line<0)continue;
  const price=v=>{const n=num(v);return n!=null&&Math.abs(n)>=100?n:null;};const over=price(r.over_price),under=price(r.under_price);if(over==null&&under==null)continue;
  quotes.push({gameId:game.id,playerId:players[0].id,market,line,over,under,book,ts});
 }
 return {source:'parlayapi',generatedAt:new Date(now).toISOString(),quotes};
}
export function quoteFor(doc,gameId,playerId,market,now=Date.now()){
 return (doc?.quotes||[]).filter(q=>q.gameId===gameId&&q.playerId===playerId&&q.market===market&&now-q.ts<=3600000&&q.ts<=now+60000).sort((a,b)=>b.ts-a.ts)[0]||null;
}
