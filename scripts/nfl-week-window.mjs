/**
 * v88.1 — NFL weekly odds window + refresh cadence.
 * NFL product week rolls Tuesday at 3:00 AM America/Chicago.
 */

const DAY=86400000;
const TZ='America/Chicago';

function partsAt(ms,timeZone=TZ){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date(ms));
  const get=t=>Number(parts.find(p=>p.type===t)?.value);
  return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute'),second:get('second')};
}
function zoneOffsetMs(ms,timeZone=TZ){
  const p=partsAt(ms,timeZone);
  const asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  return asUtc-Math.floor(ms/1000)*1000;
}
function localPartsToUtc({year,month,day,hour=0,minute=0,second=0},timeZone=TZ){
  const target=Date.UTC(year,month-1,day,hour,minute,second);
  let guess=target;
  for(let i=0;i<3;i++) guess=target-zoneOffsetMs(guess,timeZone);
  return guess;
}
function pseudoParts(ms){
  const d=new Date(ms);
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),second:d.getUTCSeconds()};
}

export function activeNflWeekWindow(nowMs=Date.now()){
  const p=partsAt(nowMs,TZ);
  const localPseudo=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  const dow=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay(); // Sun=0, Tue=2
  let daysSinceTuesday=(dow-2+7)%7;
  if(dow===2 && p.hour<3) daysSinceTuesday=7;

  const startLocalPseudo=Date.UTC(p.year,p.month-1,p.day,3,0,0)-daysSinceTuesday*DAY;
  const endLocalPseudo=startLocalPseudo+7*DAY;
  const startMs=localPartsToUtc(pseudoParts(startLocalPseudo),TZ);
  const endMs=localPartsToUtc(pseudoParts(endLocalPseudo),TZ);
  const startDate=pseudoParts(startLocalPseudo),endDate=pseudoParts(endLocalPseudo);

  return {
    mode:'nfl-week-tue-mon',
    timeZone:TZ,
    rolloverHourLocal:3,
    startMs,endMs,
    startIso:new Date(startMs).toISOString(),
    endIso:new Date(endMs).toISOString(),
    startLocal:`${startDate.year}-${String(startDate.month).padStart(2,'0')}-${String(startDate.day).padStart(2,'0')} 03:00`,
    endLocal:`${endDate.year}-${String(endDate.month).padStart(2,'0')}-${String(endDate.day).padStart(2,'0')} 03:00`,
  };
}

export function weeklyPaidRefreshMs(hoursToNextKick){
  const h=Number(hoursToNextKick);
  if(!Number.isFinite(h)) return 4*3600000;
  if(h<=1.5) return 20*60000;
  if(h<=3) return 30*60000;
  if(h<=12) return 60*60000;
  return 4*3600000;
}
