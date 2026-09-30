const WNBA_TEAM_ALIASES = new Map([
  ['ATL',['atl','atlanta','atlanta dream','dream']],
  ['CHI',['chi','chicago','chicago sky','sky']],
  ['CON',['con','ct','connecticut','connecticut sun','sun']],
  ['DAL',['dal','dallas','dallas wings','wings']],
  ['GSV',['gsv','gs','golden state','golden state valkyries','valkyries']],
  ['IND',['ind','indiana','indiana fever','fever']],
  ['LAS',['las','la sparks','los angeles sparks','sparks']],
  ['LVA',['lva','lv','las vegas','las vegas aces','aces']],
  ['MIN',['min','minnesota','minnesota lynx','lynx']],
  ['NYL',['nyl','ny','new york','new york liberty','liberty']],
  ['PHX',['phx','phoenix','phoenix mercury','mercury']],
  ['POR',['por','portland','portland fire','fire']],
  ['SEA',['sea','seattle','seattle storm','storm']],
  ['TOR',['tor','toronto','toronto tempo','tempo']],
  ['WAS',['was','wsh','washington','washington mystics','mystics']]
]);

const ALIAS_TO_WNBA = new Map();
for (const [code,aliases] of WNBA_TEAM_ALIASES) {
  ALIAS_TO_WNBA.set(code.toLowerCase(),code);
  for (const alias of aliases) ALIAS_TO_WNBA.set(alias,code);
}

function norm(value){
  return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

export function canonicalWnbaTeam(value){
  const normalized=norm(value);
  if(!normalized)return null;
  const exact=ALIAS_TO_WNBA.get(normalized);
  if(exact)return exact;
  for(const [alias,code] of ALIAS_TO_WNBA){
    if(alias.length>=5&&(normalized===alias||normalized.endsWith(` ${alias}`)))return code;
  }
  return null;
}

export function normalizeBasketballPlayerIdentity(sport,rawPlayer,explicitTeam){
  let player=String(rawPlayer||'').trim();
  const explicit=String(explicitTeam||'').trim();
  let suffixTeam=null, strippedTeamSuffix=false;
  if(String(sport||'').toUpperCase()==='WNBA'){
    const match=player.match(/^(.*?)\s*\(([A-Za-z]{2,4})\)\s*$/);
    const canonical=match?canonicalWnbaTeam(match[2]):null;
    if(match&&canonical){
      player=match[1].trim();
      suffixTeam=canonical;
      strippedTeamSuffix=true;
    }
  }
  const explicitCanonical=String(sport||'').toUpperCase()==='WNBA'?canonicalWnbaTeam(explicit):null;
  return {
    player,
    team:explicit||suffixTeam||null,
    teamHint:explicitCanonical||suffixTeam||null,
    suffixTeam,
    strippedTeamSuffix
  };
}

function eventId(event){return String(event?.canonical_event_id||event?.event_id||event?.id||'').trim();}
function eventTeamCodes(event){
  return new Set([canonicalWnbaTeam(event?.home_team),canonicalWnbaTeam(event?.away_team)].filter(Boolean));
}
function eventContext(event){
  return {
    eventId:eventId(event),
    commenceTime:event?.commence_time||null,
    homeTeam:String(event?.home_team||'').trim()||null,
    awayTeam:String(event?.away_team||'').trim()||null
  };
}

export function resolveWnbaQuoteEvent(row,relevantEvents,teamHint){
  const events=Array.isArray(relevantEvents)?relevantEvents:[];
  const hint=canonicalWnbaTeam(teamHint)||teamHint||null;
  const rawId=String(row?.canonical_event_id||row?.event_id||'').trim();
  if(rawId){
    const direct=events.find(event=>eventId(event)===rawId);
    if(direct){
      if(hint&&!eventTeamCodes(direct).has(hint))return null;
      return eventContext(direct);
    }
  }

  const rowHome=canonicalWnbaTeam(row?.home_team);
  const rowAway=canonicalWnbaTeam(row?.away_team);
  if(rowHome&&rowAway){
    const matchup=events.filter(event=>canonicalWnbaTeam(event?.home_team)===rowHome&&canonicalWnbaTeam(event?.away_team)===rowAway);
    if(matchup.length===1){
      if(hint&&!eventTeamCodes(matchup[0]).has(hint))return null;
      return eventContext(matchup[0]);
    }
  }

  if(hint){
    const matches=events.filter(event=>eventTeamCodes(event).has(hint));
    if(matches.length===1)return eventContext(matches[0]);
  }
  return null;
}
