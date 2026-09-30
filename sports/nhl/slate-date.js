const TIME_ZONE='America/Chicago';
const ROLLOVER_MINUTE=7;

const parts=value=>{
  const date=value instanceof Date?value:new Date(value);
  const safe=Number.isNaN(date.getTime())?new Date():date;
  const out={};
  for(const part of new Intl.DateTimeFormat('en-CA',{
    timeZone:TIME_ZONE,
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
    hourCycle:'h23',
  }).formatToParts(safe)) out[part.type]=part.value;
  return out;
};

export function nhlSlateDate(value=Date.now()){
  const p=parts(value);
  const current=`${p.year}-${p.month}-${p.day}`;
  const minutes=Number(p.hour)*60+Number(p.minute);
  if(minutes>=ROLLOVER_MINUTE) return current;

  // During the 12:00-12:06 AM Central grace window, keep serving yesterday's
  // slate. Formatting an instant eight minutes earlier in America/Chicago is
  // DST-safe and guarantees we land on the prior Central calendar date.
  const instant=value instanceof Date?value:new Date(value);
  const safe=Number.isNaN(instant.getTime())?new Date():instant;
  const prior=parts(new Date(safe.getTime()-8*60*1000));
  return `${prior.year}-${prior.month}-${prior.day}`;
}

export const NHL_SLATE_TIME_ZONE=TIME_ZONE;
export const NHL_SLATE_ROLLOVER_MINUTE=ROLLOVER_MINUTE;
