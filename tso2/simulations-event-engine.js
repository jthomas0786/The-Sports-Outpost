/* TSO Simulations v3 event ledger.
 * This is ONE conditioned illustrative game scenario, NOT a sampled Monte Carlo
 * world. Every scoreboard/team/player statistic is derived from its own events.
 * Verified 2026 DvP is used as a bounded adjustment; coverage schemes are
 * explicitly unknown unless sourced separately.
 */
(function(global){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(+v)?+v:null;
 const hash=s=>{let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
 const rngFrom=seed=>{let x=seed||1;return()=>{x=(x+0x6d2b79f5)|0;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296}};
 const pos=p=>String(p||'').toUpperCase(),norm=t=>String(t||'').toUpperCase().replace(/^JAC$/,'JAX').replace(/^GNB$/,'GB').replace(/^LAR$/,'LA');
 const roles={RB:[21,8,2.1,.2],WR:[.9,.4,.2],QB:[2.2,.2],FB:[.03],TE:[.05]};
 const targets={WR:[8.1,5.8,3.2,1.2],TE:[5.3,2.1,1],RB:[3.6,1.6,.5],FB:[.12]};
 const roleIndex=(p,team,position)=>team.filter(x=>pos(x.position)===position).sort((a,b)=>(finite(a.depthRank)??99)-(finite(b.depthRank)??99)).findIndex(x=>x===p);
 const roleWeight=(p,team,type)=>{
  const role=pos(p.position),idx=Math.max(0,roleIndex(p,team,role));
  const observed=finite(type==='rush'?p.carries:p.targets);
  const list=(type==='rush'?roles:targets)[role]||[.02];
  const prior=list[Math.min(idx,list.length-1)]*(idx>=list.length?Math.pow(.25,idx-list.length+1):1);
  if(role==='FB')return clamp(observed===null?prior:observed*.4+prior*.6,0,type==='rush'?.2:.35);
  if(type==='rush'&&role==='TE')return .015;
  if(type==='rush'&&role==='WR')return clamp(observed??prior,0,2);
  if(type==='rush'&&role==='QB')return clamp(observed===null?prior:observed*.5+prior*.5,0,5);
  if(observed===null)return prior;
  return clamp(prior*.35+observed*.65,0,role==='RB'?27:role==='WR'?13:10);
 };
 const maxUses=(p,team,type)=>{
  const role=pos(p.position),idx=Math.max(0,roleIndex(p,team,role)),proj=finite(type==='rush'?p.carries:p.targets);
  if(type==='rush'){
   if(role==='FB')return proj!==null&&proj>=2?2:1;
   if(role==='QB')return Math.max(2,Math.ceil((proj??2)*1.7));
   if(role==='WR')return Math.max(1,Math.ceil((proj??.5)*1.8));
   if(role==='TE')return 1;
   if(role==='RB')return idx===0?clamp(Math.ceil((proj??18)*1.3),16,30):idx===1?clamp(Math.ceil((proj??6)*1.45),5,15):Math.max(2,Math.ceil((proj??2)*1.3));
  }
  if(role==='FB')return 1;
  return clamp(Math.ceil((proj??roleWeight(p,team,'pass'))*1.5)+1,1,18);
 };
 function sampleTeam(players,rng,type,counts){
  const pool=players.filter(p=>type==='rush'?['RB','FB','HB','QB','WR','TE'].includes(pos(p.position)):
    ['WR','TE','RB','FB'].includes(pos(p.position)));
  const weights=pool.map(p=>{
   const used=counts.get(p.name)||0,limit=maxUses(p,players,type);
   return Math.max(0,used>=limit?0:roleWeight(p,players,type)*clamp(1-used/(limit+1),.24,1));
  });
  const sum=weights.reduce((a,b)=>a+b,0);
  if(sum<=0)return null;
  let draw=rng()*sum;
  for(let i=0;i<pool.length;i++){draw-=weights[i];if(draw<=0)return pool[i]}
  return pool[pool.length-1]||null;
 }
 function defenseStats(defense,opponent,position,key){
  if(defense?.season!==2026)return null;
  const p=defense?.teams?.[norm(opponent)]?.byPosition?.[position],base=defense?.league?.byPosition?.[position];
  if(!p||!base||Number(p.games)<3||Number(base.games)<10)return null;
  const own=finite(p.perGame?.[key]),avg=finite(base.perGame?.[key]);
  return own!==null&&avg!==null&&avg>0?clamp(own/avg,.76,1.24):null;
 }
 function matchup(game,defense,side,type,position){
  const opponent=norm(side===game.away.abbr?game.home.abbr:game.away.abbr);
  const key=type==='rush'?'rushYds':'recYds';
  return defenseStats(defense,opponent,type==='rush'?'RB':position||'WR',key)??1;
 }
 function defensiveTendency(game,defense,side){
  const opp=side===game.away.abbr?game.home.abbr:game.away.abbr;
  const pass=defenseStats(defense,opp,'QB','passYds'),run=defenseStats(defense,opp,'RB','rushYds');
  if(pass===null||run===null)return {passShift:0,kind:'Coverage scheme not verified'};
  const shift=clamp((pass-run)*.24,-.065,.065);
  const kind=shift>.025?'2026 passing allowance comparatively softer':shift<-.025?'2026 rushing allowance comparatively softer':'2026 positional allowances relatively balanced';
  return {passShift:shift,kind};
 }
 const quarterClock=t=>Math.max(0,Math.floor(t/60))+':'+String(Math.max(0,Math.floor(t%60))).padStart(2,'0');
 const routeNames=['SLANT','OUT','POST','GO','CROSS','CURL','CORNER','FLAT'];
 function build(game,defense){
  const roster=(game.players||[]).filter(p=>p.name&&p.team),sides=[norm(game.away.abbr),norm(game.home.abbr)];
  const groups=Object.fromEntries(sides.map(side=>[side,roster.filter(p=>norm(p.team)===side)]));
  if(sides.some(s=>!groups[s].some(p=>pos(p.position)==='QB')))return [];
  const r=rngFrom(hash(game.gameId+'|realistic-ledger-v3|'+(game.availability?.rosterCheckedAt||'')));
  let seq=0,score={[sides[0]]:0,[sides[1]]:0},possession=sides[r()<.5?0:1],yard=23+Math.floor(r()*14),down=1,distance=10;
  const events=[],uses={};
  for(const side of sides)uses[side]={rush:new Map(),pass:new Map()};
  let fieldSec=900;let driveId=1;
  function record(item){
   const q=item.quarter,sec=item.second,side=item.side,other=side===sides[0]?sides[1]:sides[0];
   const beforeAway=score[sides[0]],beforeHome=score[sides[1]];
   if(item.points)score[side]+=item.points;
   const row={index:seq++,quarter:q,clock:quarterClock(sec),second:sec,
    side,opponent:other,down:item.down??down,first:item.first??distance,yard:item.yard??yard,
    gain:item.gain??0,kind:item.kind,player:item.player||'',passer:item.passer||'',
    carrier:item.carrier||null,receiver:item.receiver||null,complete:Boolean(item.complete),
    route:item.route||null,targetSlot:item.targetSlot??1,
    beforeAway,beforeHome,scoreAway:score[sides[0]],scoreHome:score[sides[1]],
    td:item.points===7,points:item.points||0,interception:Boolean(item.interception),sack:Boolean(item.sack),
    commentary:item.commentary||'',driveId,defenseTendency:item.defenseTendency||''};
   events.push(row);
  }
  function switchPossession(fromYard){
   possession=possession===sides[0]?sides[1]:sides[0];
   yard=clamp(100-fromYard,5,95);down=1;distance=Math.min(10,100-yard);driveId++;
  }
  // Advance a single coherent possession through downs, scoring, and clock.
  for(let q=1;q<=4;q++){
   let playCount=0;
   while(fieldSec>15&&playCount<42){
    playCount++;
    const side=possession,other=side===sides[0]?sides[1]:sides[0];
    const team=groups[side],qb=team.filter(p=>pos(p.position)==='QB').sort((a,b)=>(finite(a.depthRank)??99)-(finite(b.depthRank)??99))[0];
    const tendency=defensiveTendency(game,defense,side);
    const qbPass=finite(qb.passYds),teamCarries=team.filter(p=>pos(p.position)==='RB').reduce((n,p)=>n+(finite(p.carries)||0),0);
    const passPrior=qbPass!==null?clamp(qbPass/7.2,22,43):32;
    const rushPrior=teamCarries>3?clamp(teamCarries+4,17,37):27;
    const passRate=clamp(passPrior/(passPrior+rushPrior)+tendency.passShift+(down===3?.17:0)+(distance>=9?.025:0),.38,.80);
    const secBefore=fieldSec;
    const fgDistance=100-yard+17;
    // Fourth down must resolve a drive, rather than producing impossible 4th-and-20 run loops.
    if(down===4){
     const canKick=fgDistance<=57&&fgDistance>=17;
     if(canKick&&r()<clamp(.93-(fgDistance-28)*.011,.46,.94)){
      record({quarter:q,second:secBefore,side,yard,down,first:distance,gain:0,kind:'FIELD GOAL',player:'Kicking unit',points:3,
       commentary:side+' converts a '+fgDistance+'-yard field goal (illustrative).'});
      fieldSec=Math.max(0,fieldSec-10);switchPossession(75);continue;
     }
     record({quarter:q,second:secBefore,side,yard,down,first:distance,gain:0,kind:'PUNT',player:'Punting unit',
      commentary:side+' punts on fourth down (illustrative).'});
     fieldSec=Math.max(0,fieldSec-14);switchPossession(65+Math.floor(r()*20));continue;
    }
    const pass=r()<passRate;
    const kind=pass?'PASS':'RUSH',counts=uses[side][pass?'pass':'rush'];
    const actor=sampleTeam(team,r,pass?'pass':'rush',counts);
    if(!actor){
     // Do not make up an off-roster player if a positional group is empty.
     record({quarter:q,second:secBefore,side,yard,kind:'PUNT',player:'Punting unit',commentary:'Insufficient verified '+side+' offensive roster for another play; possession ends.'});
     switchPossession(70);fieldSec=Math.max(0,fieldSec-28);continue;
    }
    counts.set(actor.name,(counts.get(actor.name)||0)+1);
    const role=pos(actor.position)==='FB'?'RB':pos(actor.position);
    const ratio=matchup(game,defense,side,pass?'pass':'rush',pass?role==='TE'?'TE':role==='RB'?'RB':'WR':role);
    let gain,complete=false,interception=false,sack=false;
    const route=pass?routeNames[Math.floor(r()*routeNames.length)]:null,targetSlot=pass?r()<.15?2:Math.floor(r()*4):2;
    if(pass){
     const comp=clamp((finite(actor.receptions)!==null&&finite(actor.targets)>0?actor.receptions/actor.targets:.66)*(.92+.08*ratio),.42,.80);
     interception=r()<.019;
     sack=!interception&&r()<.046;
     complete=!interception&&!sack&&r()<comp;
     const ypr=finite(actor.recYds)!==null&&finite(actor.receptions)>1?clamp(actor.recYds/actor.receptions,5,22):11;
     gain=interception?0:sack?-(3+Math.floor(r()*7)):complete?Math.max(1,Math.round((ypr*.65+(-Math.log(Math.max(.01,r())))*ypr*.45)*ratio)):0;
    }else{
     const ypc=finite(actor.rushYds)!==null&&finite(actor.carries)>1?clamp(actor.rushYds/actor.carries,2.7,6.5):4.2;
     gain=Math.round((ypc*.50+(-Math.log(Math.max(.02,r())))*ypc*.48)*ratio)-(r()<.09?5:0);
    }
    gain=clamp(gain,-10,100-yard);
    const touchdown=!interception&&!sack&&gain>0&&yard+gain>=100;
    const player=actor.name,passer=qb.name;
    let commentary;
    if(interception)commentary=passer+' intercepted while targeting '+player+' against '+other+'.';
    else if(sack)commentary=passer+' sacked by '+other+' for '+Math.abs(gain)+' yards.';
    else if(pass)commentary=complete?passer+' to '+player+' for '+gain+' yards'+(touchdown?' — TOUCHDOWN!':'.'):
     passer+' pass intended for '+player+' incomplete.';
    else commentary=passer+' hands off to '+player+' for '+gain+' yards'+(touchdown?' — TOUCHDOWN!':'.');
    record({quarter:q,second:secBefore,side,yard,kind,down,first:distance,gain,player,passer,
     receiver:pass?player:null,carrier:pass?null:player,complete,route,targetSlot,interception,sack,
     points:touchdown?7:0,defenseTendency:tendency.kind,commentary:commentary+' (illustrative)'});
    const oldYard=yard;yard=clamp(yard+gain,1,100);
    fieldSec=Math.max(0,fieldSec-(pass&&!complete?9:24+Math.round(r()*14)));
    if(interception){switchPossession(55+Math.floor(r()*24));continue}
    if(touchdown){switchPossession(75);continue}
    if(gain>=distance){down=1;distance=Math.min(10,100-yard)}
    else{down++;distance=Math.max(1,distance-gain)}
    if(oldYard===yard&&gain===0&&down>4){down=4}
   }
   fieldSec=900;
  }
  return events;
 }
 function blankPlayer(p){return{name:p.name,team:norm(p.team),position:pos(p.position),passAtt:0,passComp:0,passYds:0,passTd:0,int:0,sacks:0,
  carries:0,rushYds:0,rushTd:0,targets:0,receptions:0,recYds:0,recTd:0}}
 function snapshot(game,events,endIndex){
  const teams=[norm(game.away.abbr),norm(game.home.abbr)],agg={},players={};
  for(const t of teams){agg[t]={team:t,points:0,plays:0,passing:0,rushing:0,totalYds:0,firstDowns:0,passAtt:0,passComp:0,passTd:0,
   interceptions:0,sacksAllowed:0,rushAtt:0,rushTd:0,targets:0,receptions:0,punts:0,fieldGoals:0,quarter:[0,0,0,0]};
   players[t]={}}
  const touch=(team,name,role)=>{if(!name)return null;return players[team][name] ||=blankPlayer({name,team,position:role})};
  const limit=Math.min(events.length,Math.max(0,endIndex));
  for(let i=0;i<limit;i++){
   const e=events[i],t=norm(e.side),row=agg[t];if(!row)continue;
   row.points+=e.points||0;row.quarter[e.quarter-1]+=e.points||0;
   if(e.kind==='PUNT'){row.punts++;continue}
   if(e.kind==='FIELD GOAL'){row.fieldGoals++;continue}
   if(e.kind!=='PASS'&&e.kind!=='RUSH')continue;
   row.plays++;
   if(e.gain>=e.first&&e.gain>0)row.firstDowns++;
   if(e.kind==='PASS'){
    row.passAtt++;row.targets++;
    const qb=touch(t,e.passer,'QB');if(qb){qb.passAtt++;if(e.complete){qb.passComp++;qb.passYds+=e.gain;qb.passTd+=e.td?1:0}if(e.interception)qb.int++;if(e.sack)qb.sacks++}
    const rec=touch(t,e.receiver,'REC');if(rec){rec.targets++;if(e.complete){rec.receptions++;rec.recYds+=e.gain;rec.recTd+=e.td?1:0}}
    if(e.complete){row.passComp++;row.passing+=e.gain;row.receptions++;row.passTd+=e.td?1:0}
    if(e.interception)row.interceptions++;
    if(e.sack){row.sacksAllowed++;row.passAtt--;row.targets--;if(qb)qb.passAtt--;if(rec)rec.targets--}
   }else{
    const runner=touch(t,e.carrier,'RB');if(runner){runner.carries++;runner.rushYds+=e.gain;runner.rushTd+=e.td?1:0}
    row.rushAtt++;row.rushing+=e.gain;row.rushTd+=e.td?1:0;
   }
   row.totalYds=row.passing+row.rushing;
  }
  // active roster contributes identity / role, not fabricated statistics.
  for(const p of game.players||[]){
   const t=norm(p.team);if(players[t]&&!players[t][p.name])players[t][p.name]=blankPlayer(p);
   else if(players[t]&&players[t][p.name])players[t][p.name].position=pos(p.position);
  }
  return{teams:agg,players,away:agg[teams[0]],home:agg[teams[1]],count:limit};
 }
 global.TSO2SimEngine={build,snapshot,roleWeight,maxUses,defensiveTendency};
})(typeof window!=='undefined'?window:globalThis);
