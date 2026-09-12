import { normTeam } from './sim/utils.js';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const withoutSuffix=s=>norm(s).replace(/\s+(?:jr|sr|ii|iii|iv)$/,'');
export function touchdownScorer(game,play,players=[]){
  const raw=String(play?.text||play?.shortText||'').trim(),team=normTeam(play?.team||'');
  const gameId=String(game?.id||game?.gameId||'');
  // ESPN scoring summaries lead with the scorer: "Mike Evans 2 Yd pass from ...".
  // Never search the passer/kicker portions for a fallback player match.
  const leading=raw.match(/^(.+?)\s+-?\d+\s*(?:yd|yard)s?\b/i);
  const summary=leading&&!/\b(?:pass|complete|for|to|rush)\b/i.test(leading[1])?leading:null;
  const receiver=raw.match(/\b(?:pass|complete|completed)\b.*?\bto\s+(.+?)(?=\s+(?:for|at|to)\b|\s*\(|,|$)/i);
  let scorerText=summary?.[1]||receiver?.[1]||'';
  if(!scorerText&&!/\bpass\b/i.test(raw))scorerText=raw.replace(/^\([^)]*\)\s*/,'').split(/\s+(?:left|right|up the middle|rush(?:es)?|run(?:s)?|scrambl\w*|return\w*)\b/i)[0];
  if(!scorerText)return null;
  const wanted=withoutSuffix(scorerText);
  const pool=players.filter(p=>String(p.gameId||'')===gameId&&(!team||normTeam(p.team)===team));
  const liveRows=Object.values(game?.liveScore?.playerStats?.byId||{}).filter(p=>!team||normTeam(p.team)===team);
  const candidates=[...pool,...liveRows];
  let found=candidates.find(p=>withoutSuffix(p.name)===wanted);
  if(!found){
    const parts=wanted.split(' '),last=parts.at(-1),initial=parts[0];
    if(initial?.length===1&&last){
      const matches=candidates.filter(p=>{const name=withoutSuffix(p.name).split(' ');return name[0]?.startsWith(initial)&&name.at(-1)===last;});
      if(new Set(matches.map(p=>withoutSuffix(p.name))).size===1)found=matches[0];
    }
  }
  if(found)return found;
  // A confidently parsed summary can still name a scorer absent from the roster.
  // Leave their photo/odds unavailable instead of borrowing the quarterback's.
  return summary||receiver?{name:scorerText.trim(),team}:null;
}
