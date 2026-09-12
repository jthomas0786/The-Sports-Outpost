// Event-specific evidence only: a season roster is not a game lineup.
export const rosterURL=(game,team)=>`https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/events/${game.id}/competitions/${game.id}/competitors/${team.id}/roster?limit=100`;
export function applyLineups(game,documents={},now=Date.now()){
 const players=game.players.map(p=>({...p,rosterActive:p.rosterActive??p.active,rosterAvailability:p.rosterAvailability??p.availability,active:p.rosterActive??p.active,availability:p.rosterAvailability??p.availability,confirmedStarter:false,currentGoalie:false,lineupConfirmed:false}));
 const teams=[game.away,game.home].map(team=>{
  const document=documents[team.id],entries=document?.entries||[];
  const ids=new Set(entries.map(e=>String(e.playerId)));
  const unique=ids.size===entries.length;
  for(const p of players.filter(p=>p.team===team.abbr)){
   const e=unique?entries.find(e=>String(e.playerId)===p.id):null;
   p.lineupConfirmed=!!e&&e.scratched===false&&p.active!==false;
   if(e?.scratched===true){p.active=false;p.availability='Scratched';}
   else if(p.active===false){/* Retain injury/availability evidence. */}
   else p.availability=p.lineupConfirmed?'In game roster':'Lineup unconfirmed';
   if(p.position==='G'){
    p.confirmedStarter=p.lineupConfirmed&&e?.starter===true;
    p.currentGoalie=game.status==='in'&&p.active!==false&&(game.onIce||[]).some(t=>String(t.teamId)===team.id&&(t.entries||[]).some(x=>String(x.athleteid)===p.id&&String(x.whereabouts?.id)==='1'));
    if(p.currentGoalie)p.availability='In net now';
    else if(p.confirmedStarter)p.availability='Confirmed starter';
    else if(p.lineupConfirmed)p.availability='In game roster · starter unconfirmed';
   }
  }
  const active=entries.filter(e=>e.scratched===false);
  const complete=unique&&active.length>=18&&active.length<=23&&entries.every(e=>typeof e.scratched==='boolean')&&active.every(e=>players.some(p=>p.team===team.abbr&&p.id===String(e.playerId)&&p.lineupConfirmed));
  const goalies=players.filter(p=>p.team===team.abbr&&p.active!==false&&(game.status==='in'?p.currentGoalie:p.confirmedStarter));
  return {team:team.abbr,confirmed:complete,goalieId:goalies.length===1?goalies[0].id:null,goalieName:goalies.length===1?goalies[0].name:null};
 });
 return {...game,players,lineupsConfirmed:teams.every(t=>t.confirmed),lineupEvidence:{gameId:game.id,checkedAt:now,source:'ESPN event roster / on-ice feed',teams}};
}
export function lineupReady(game,now=Date.now()){
 const e=game.lineupEvidence,age=now-e?.checkedAt;
 return !!e&&e.gameId===game.id&&Number.isFinite(age)&&age>=-60000&&age<=(game.status==='in'?120000:600000)&&game.lineupsConfirmed===true&&e.teams.length===2&&e.teams.every(t=>t.confirmed&&t.goalieId);
}
export function lineupLabel(game,now=Date.now()){
 const e=game.lineupEvidence;if(!e||now-e.checkedAt>(game.status==='in'?120000:600000))return 'Lineups and goalies awaiting confirmation';
 return e.teams.map(t=>`${t.team}: ${t.confirmed?'roster confirmed':'lineup pending'} · ${t.goalieName?`${game.status==='in'?'in net':'starter'} ${t.goalieName}`:'goalie pending'}`).join(' | ');
}
export const lineupState=g=>JSON.stringify({status:g.status,period:g.period,clock:g.clock,away:g.away.score,home:g.home.score,lineups:g.lineupsConfirmed,players:g.players.map(p=>[p.id,p.current,p.active,p.lineupConfirmed,p.confirmedStarter,p.currentGoalie])});
