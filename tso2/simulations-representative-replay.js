/* Representative NFL replay, v1.
 * A game's scoreboard is conditioned to an ACTUAL correlated sample from its
 * 50K Monte Carlo run. Animated snap details are a plausible, deterministic
 * reconstruction (the Monte Carlo engine does not track actual snaps).
 */
(function(global){
'use strict';
const norm=s=>String(s||'').toUpperCase().replace(/^JAC$/,'JAX').replace(/^GNB$/,'GB');
const h32=s=>{let v=2166136261;for(const c of String(s)){v=Math.imul(v^c.charCodeAt(0),16777619)}return v>>>0};
const makeRng=seed=>{let x=seed||1;return()=>{x=(x+0x6d2b79f5)|0;let k=Math.imul(x^(x>>>15),1|x);k^=k+Math.imul(k^(k>>>7),61|k);return((k^(k>>>14))>>>0)/4294967296}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const n=v=>v==null?0:Number(v)||0;
const roundClock=sec=>String(Math.floor(sec/60))+':'+String(Math.floor(sec%60)).padStart(2,'0');
const routes=['SLANT','CROSS','POST','OUT','GO','CURL','CORNER','FLAT'];
function scorePlan(points){
 const score=Math.max(0,Math.round(n(points)));
 let best=null;
 for(let td=0;td<=7;td++)for(let fg=0;fg<=8;fg++)for(let plus=0;plus<=Math.min(2,td);plus++)for(let missed=0;missed<=Math.min(2,td-plus);missed++){
  const count=7*td+3*fg+plus-missed;
  if(count!==score||td+fg>10)continue;
  const expectedTd=score*.70/7,expectedFg=score*.26/3;
  const cost=Math.abs(td-expectedTd)*.5+Math.abs(fg-expectedFg)*.4+
   plus*.75+missed*1.2+(td+fg>6?8:0);
  if(!best||cost<best.cost)best={cost,td,fg,plus,missed};
 }
 if(!best)return null;
 const result=[];
 for(let i=0;i<best.td;i++)result.push({kind:'TD',points:i<best.plus?8:i<best.plus+best.missed?6:7});
 for(let i=0;i<best.fg;i++)result.push({kind:'FG',points:3});
 return result;
}
function selectedPlayer(team,type,world,rng,counts){
 const players=team.filter(p=>p.name&&(type==='rush'?['RB','FB','QB','WR','TE'].includes(p.position):['WR','TE','RB','FB'].includes(p.position)));
 const engine=global.TSO2SimEngine;
 let weights=players.map(p=>{
  if(type==='rush'&&p.position==='QB'&&(p.depthRank??99)>1)return 0;
  const key=norm(p.team)+'|'+p.name.toLowerCase();
  const sample=world.get(key)?.stats||{};
  const quota=n(type==='rush'?sample.carries:sample.targets);
  const used=counts.get(key)||0;
  const base=engine?.roleWeight?.(p,team,type)||.01;
  const lowRole=p.position==='FB'? .03:1;
  const cap=engine?.maxUses?.(p,team,type)??30;
  if(p.position==='FB'&&used>=1)return 0;
  // Once a smaller-than-expected candidate roster exhausts its target quotas,
  // prefer regular receivers rather than inventing an unavailable player.
  if(used>=cap)return type==='pass'&&['WR','TE','RB'].includes(p.position)?base*.025*lowRole:0;
  return (quota>used?2.0+Math.min(25,quota-used)*base:.04*base)*lowRole;
 });
 const sum=weights.reduce((a,b)=>a+b,0);
 if(sum<=0)return null;
 let v=rng()*sum;
 for(let i=0;i<players.length;i++){
  v-=weights[i];
  if(v<=0){const p=players[i],key=norm(p.team)+'|'+p.name.toLowerCase();counts.set(key,(counts.get(key)||0)+1);return p}
 }
 const p=players[players.length-1],key=norm(p.team)+'|'+p.name.toLowerCase();counts.set(key,(counts.get(key)||0)+1);return p;
}
function buildOne(game,defense,variant=0){
 const selected=game?.representativeWorld;
 if(!selected||selected.selection!=='central-correlated-sampled-world'||!Number.isInteger(selected.sampledIndex)||selected.iterations<100)return [];
 const away=norm(game.away.abbr),home=norm(game.home.abbr),sides=[away,home];
 const desired={[away]:Math.round(n(selected.awayScore)),[home]:Math.round(n(selected.homeScore))};
 const plans={};for(const side of sides){plans[side]=scorePlan(desired[side]);if(!plans[side])return []}
 const roster={};for(const side of sides)roster[side]=(game.players||[]).filter(p=>norm(p.team)===side);
 if(sides.some(t=>!roster[t].some(p=>p.position==='QB')))return [];
 const raw=(selected.players||[]).map(p=>[norm(p.team)+'|'+String(p.name||'').toLowerCase(),p]);
 const world=new Map(raw),rng=makeRng(h32(game.gameId+'|sample-world-'+selected.sampledIndex+'|candidate-'+variant)),counts=new Map(),scores={[away]:0,[home]:0},events=[];
 const driveSlots=10;const scoring={};
 for(const side of sides){
  const drives=Array.from({length:driveSlots},()=>({kind:'PUNT',points:0}));
  // Spread scoring drives across the game, not all in Q4.
  const slots=[1,3,5,7,9,0,2,4,6,8];
  const plan=plans[side].slice();
  for(let i=plan.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[plan[i],plan[j]]=[plan[j],plan[i]]}
  plan.forEach((p,i)=>{drives[slots[i]]=p});
  scoring[side]=drives;
 }
 const usedTds=new Map();let seq=0,driveId=0;
 function touchdownPlayer(team,preferred){
  const candidates=team.filter(p=>p.position==='RB'||p.position==='WR'||p.position==='TE'||p.position==='FB');
  const stats=p=>world.get(norm(p.team)+'|'+p.name.toLowerCase())?.stats||{};
  const key=p=>norm(p.team)+'|'+p.name.toLowerCase()+'|TD';
  const capable=candidates.filter(p=>n(preferred==='RUSH'?stats(p).rushTds:stats(p).recTds)>(usedTds.get(key(p))||0));
  if(!capable.length)return null;
  return capable[Math.floor(rng()*capable.length)];
 }
 for(let quarter=1;quarter<=4;quarter++){
  for(let d=0;d<5;d++){
   const globalDrive=(quarter-1)*5+d,side=sides[globalDrive%2],opp=sides[(globalDrive+1)%2],
    team=roster[side],teamDrive=Math.floor(globalDrive/2),planned=scoring[side][teamDrive]||{kind:'PUNT',points:0};
   const qb=team.filter(p=>p.position==='QB').sort((a,b)=>(a.depthRank??99)-(b.depthRank??99))[0];
   const tendency=global.TSO2SimEngine?.defensiveTendency(game,defense,side)||{passShift:0,kind:'Coverage scheme not verified'};
   const totalPlays=planned.kind==='TD'?9+Math.floor(rng()*2):planned.kind==='FG'?7+Math.floor(rng()*2):4+Math.floor(rng()*2);
   const offensivePlays=totalPlays-(planned.kind==='FG'||planned.kind==='PUNT'?1:0);
   const yStart=22+Math.floor(rng()*15);
   let yard=yStart,down=1,distance=10;
   const goal=planned.kind==='TD'?100:planned.kind==='FG'?71:yStart+10+Math.floor(rng()*21);
   driveId++;
   for(let playIndex=0;playIndex<totalPlays;playIndex++){
    const remaining=offensivePlays-playIndex;
    const clock=Math.max(2,Math.round(900-d*180-(playIndex/totalPlays)*175));
    const beforeAway=scores[away],beforeHome=scores[home];
    const end=playIndex>=offensivePlays;
    const isFinalTd=planned.kind==='TD'&&playIndex===offensivePlays-1;
    const special=end?(planned.kind==='FG'?'FIELD GOAL':'PUNT'):null;
    let kind=special,player='',passer='',carrier=null,receiver=null,
     complete=false,gain=0,points=0,route=null,interception=false,sack=false;
    const oldYard=yard,oldDown=down,oldDistance=distance;
    if(special){
      player=planned.kind==='FG'?'Kicking unit':'Punting unit';
      points=planned.kind==='FG'?planned.points:0;
    }else{
      const maxNeed=goal-yard,progress=Math.max(0,maxNeed/Math.max(1,remaining));
      const rushWorld=team.reduce((acc,p)=>acc+n(world.get(side+'|'+p.name.toLowerCase())?.stats?.carries),0);
      const passWorld=team.reduce((acc,p)=>acc+n(world.get(side+'|'+p.name.toLowerCase())?.stats?.targets),0);
      const passRate=clamp((passWorld/(passWorld+rushWorld||1))+(tendency.passShift||0)+(oldDown===3?.05:0),.39,.75);
      const finalPreference=isFinalTd?touchdownPlayer(team,'PASS')?'PASS':touchdownPlayer(team,'RUSH')?'RUSH':null:null;
      kind=isFinalTd&&finalPreference?finalPreference:rng()<passRate?'PASS':'RUSH';
      let actor=selectedPlayer(team,kind==='PASS'?'pass':'rush',world,rng,counts);
      if(!actor){kind=kind==='PASS'?'RUSH':'PASS';actor=selectedPlayer(team,kind==='PASS'?'pass':'rush',world,rng,counts)}
      if(!actor) return [];
      // For forced scoring play, prefer the sampled world's actual TD scorer.
      const tdActor=isFinalTd?touchdownPlayer(team,kind):null;
      if(tdActor)actor=tdActor;
      player=actor.name;passer=qb.name;
      route=kind==='PASS'?routes[Math.floor(rng()*routes.length)]:null;
      if(kind==='PASS'){
       receiver=player;
       const needed=maxNeed;
       complete=isFinalTd||progress>12||rng()<.72;
       const qbSample=world.get(side+'|'+qb.name.toLowerCase())?.stats||{};
       const yardsPerCompletion=clamp(n(qbSample.passYds)/Math.max(1,n(qbSample.completions)),8,17);
       gain=complete?Math.round(clamp(Math.max(progress*(.78+rng()*.58),yardsPerCompletion*(.72+rng()*.55)),1,30)):0;
      }else{
       carrier=player;
       gain=Math.round(clamp(progress*(.65+rng()*.70),1,17));
      }
      if(!isFinalTd)gain=Math.min(gain,Math.max(0,goal-yard-1));
      if(isFinalTd){gain=100-yard;complete=kind==='PASS'||complete;points=planned.points}
      if(!isFinalTd&&planned.kind==='PUNT'){gain=Math.min(gain,Math.max(0,goal-yard))}
      if(!isFinalTd&&remaining<=2&&planned.kind!=='PUNT'){
       gain=Math.max(gain,Math.ceil((goal-yard)/remaining)-3);
      }
      // Continue moving downfield naturally without oversized penalty-yard gains.
      gain=clamp(gain,0,100-yard);
      yard=clamp(yard+gain,1,100);
      if(isFinalTd)yard=100;
      if(gain>=distance){down=1;distance=Math.min(10,100-yard)}
      else{down=Math.min(3,down+1);distance=Math.max(1,distance-gain)}
      if(points){const key=side+'|'+player.toLowerCase()+'|TD';usedTds.set(key,(usedTds.get(key)||0)+1)}
    }
    if(points)scores[side]+=points;
    let commentary='';
    if(kind==='PUNT')commentary=side+' punts after the drive stalls.';
    else if(kind==='FIELD GOAL')commentary=side+' converts a '+(100-yard+17)+'-yard field goal.';
    else if(kind==='PASS')commentary=complete?passer+' completes to '+receiver+' for '+gain+' yards'+(points?' — TOUCHDOWN!':''):
      passer+' pass intended for '+receiver+' is incomplete.';
    else if(kind==='RUSH')commentary=player===passer?passer+' scrambles for '+gain+' yards':passer+' hands off to '+carrier+' for '+gain+' yards'+(points?' — TOUCHDOWN!':'');
    if(points===8)commentary+=' Two-point conversion good.';
    if(points===6)commentary+=' Extra point missed.';
    if(points===7)commentary+=' Extra point good.';
    const event={index:seq++,quarter,clock:roundClock(clock),second:clock,side,opponent:opp,driveId,
     down:oldDown,first:oldDistance,yard:oldYard,gain,kind,player,passer,carrier,receiver,complete,route,targetSlot:Math.floor(rng()*4),
     beforeAway,beforeHome,scoreAway:scores[away],scoreHome:scores[home],td:points>=6,points,interception,sack,
     defenseTendency:tendency.kind,commentary:commentary+' (illustrated interpretation of a sampled model world)'};
    events.push(event);
   }
  }
 }
 if(scores[away]!==desired[away]||scores[home]!==desired[home])return [];
 return events;
}
function replayFit(game,events){
 const snapshot=global.TSO2SimEngine?.snapshot(game,events,events.length);
 if(!snapshot)return Infinity;
 const world=game.representativeWorld;
 const teams=[norm(game.away.abbr),norm(game.home.abbr)];
 let loss=0;
 for(const side of teams){
  const stats=snapshot.teams[side];
  const worlds=(world.players||[]).filter(p=>norm(p.team)===side);
  // Major volume stats are the highest-weight criteria. A box score is
  // reconstructed, but should follow a genuine sampled world's game script.
  let worldPass=0,worldRush=0;
  for(const p of worlds){
   if(p.position==='QB')worldPass+=n(p.stats?.attempts);
   worldRush+=n(p.stats?.carries);
   const own=snapshot.players[side]?.[p.name];
   if(!own)continue;
   const factor=p.position==='QB'?.28:p.position==='FB'?.17:p.position==='RB'?.16:.14;
   const actual=p.position==='QB'?own.passAtt:p.position==='RB'||p.position==='FB'?own.carries:own.targets;
   const expected=p.position==='QB'?n(p.stats?.attempts):p.position==='RB'||p.position==='FB'?n(p.stats?.carries):n(p.stats?.targets);
   loss+=factor*Math.pow((actual-expected)/Math.max(3,Math.sqrt(expected+1)*1.7),2);
  }
  loss+=.22*Math.pow((stats.passAtt-worldPass)/Math.max(9,worldPass*.35),2);
  loss+=.22*Math.pow((stats.rushAtt-worldRush)/Math.max(9,worldRush*.35),2);
  const pQBs=worlds.filter(p=>p.position==='QB');
  const expectedPassing=pQBs.reduce((v,p)=>v+n(p.stats?.passYds),0);
  const expectedRushing=worlds.reduce((v,p)=>v+n(p.stats?.rushYds),0);
  loss+=.28*Math.pow((stats.passing-expectedPassing)/Math.max(55,expectedPassing*.26),2);
  loss+=.18*Math.pow((stats.rushing-expectedRushing)/Math.max(35,expectedRushing*.3),2);
  if(stats.plays<40||stats.plays>82)loss+=8;
 }
 return loss;
}
function build(game,defense){
 if(!game?.representativeWorld)return [];
 let best=null;
 for(let i=0;i<48;i++){
  const candidate=buildOne(game,defense,i);
  if(!candidate.length)continue;
  const grade=replayFit(game,candidate);
  if(!best||grade<best.grade)best={events:candidate,grade};
 }
 return best?.events||[];
}
global.TSO2RepresentativeReplay={build,scorePlan};
})(typeof window!=='undefined'?window:globalThis);
