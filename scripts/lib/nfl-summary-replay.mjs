const number=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const norm=t=>({LAR:'LA',JAC:'JAX',WAS:'WSH'}[String(t||'').toUpperCase()]||String(t||'').toUpperCase());
export function summaryPlays(summary){
  const out=[],seen=new Set(),drives=summary.drives||{};
  const groups=[...(drives.previous||[]),...(drives.current?[drives.current]:[])];
  if(!groups.length)groups.push({plays:summary.plays||[]});
  for(const drive of groups)for(const raw of drive.plays||[]){
    const key=String(raw.id||raw.sequenceNumber||JSON.stringify([raw.period,raw.clock,raw.text]));
    if(seen.has(key))continue;seen.add(key);
    const end=raw.end||{};
    out.push({id:key,text:raw.text||raw.shortText||'',period:number(raw.period?.number??raw.period),clock:raw.clock?.displayValue||null,
      homeScore:number(raw.homeScore),awayScore:number(raw.awayScore),team:norm(raw.team?.abbreviation||raw.start?.team?.abbreviation||drive.team?.abbreviation),
      endTeam:norm(end.team?.abbreviation),yardFromOwn:end.yardsToEndzone==null?null:100-number(end.yardsToEndzone),
      down:number(end.down),distance:number(end.distance),downDistanceText:end.shortDownDistanceText||null,
      type:raw.type?.text||'',scoring:!!raw.scoringPlay,driveId:String(drive.id||''),driveTeam:norm(drive.team?.abbreviation)});
  }
  return out;
}
export function summaryReplayFrame(summary,index,now=Date.now()){
  const c=summary.header?.competitions?.[0];
  if(!c)throw new Error('No competition in summary');
  const team=side=>norm(c.competitors?.find(t=>t.homeAway===side)?.team?.abbreviation);
  const plays=summaryPlays(summary),p=plays[index];if(!p)throw new Error('Replay play not found');
  const prefix=plays.slice(0,index+1),drivePlays=prefix.filter(x=>x.driveId===p.driveId);
  const clock=p.clock?.split(':').map(Number),clockMin=clock?.length===2?clock[0]+clock[1]/60:null;
  const final=/^(?:end game|end of game)$/i.test(p.type)||/^(?:END GAME|END OF GAME)[.!]?$/i.test(p.text);
  const half=p.period===2&&clockMin===0;
  const possession=p.endTeam===team('home')?'home':p.endTeam===team('away')?'away':null;
  const score=side=>prefix.findLast(x=>x[`${side}Score`]!=null)?.[`${side}Score`]??0;
  const live={status:final?'post':'in',statusDetail:final?'Final':half?'Halftime':`Q${p.period||'?'} ${p.clock||''}`.trim(),period:p.period,clockMin,
    homeAbbr:team('home'),awayAbbr:team('away'),homeScore:score('home'),awayScore:score('away'),possession,
    yardFromOwn:possession?p.yardFromOwn:null,isRedZone:!!possession&&p.yardFromOwn>=80&&p.yardFromOwn<100,
    down:p.down,distance:p.distance,downDistanceText:p.downDistanceText,lastPlayText:p.text,
    currentDrive:p.driveId?{id:p.driveId,team:p.driveTeam,description:null,result:null,playCount:drivePlays.length,yards:null,elapsedDisplay:null,plays:drivePlays}:null,
    plays:prefix.slice(-30),scoringPlays:prefix.filter(x=>x.scoring),playerStats:null,teamStats:null,boxScore:null,
    replayStatsComplete:false,lastFetchedAt:now};
  return {schemaVersion:4,replay:true,replayMode:'visual-only',replayIndex:index,lastFetchedAt:now,games:{[String(summary.header.id||c.id)]:live}};
}
