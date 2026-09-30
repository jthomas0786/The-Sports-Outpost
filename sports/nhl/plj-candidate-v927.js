const num=v=>Number.isFinite(Number(v))?Number(v):null;

export const PLJ_CANDIDATE_ORDER={A:0,B:1,C:2};

export function gradePljCandidate(line){
 const l=line?.puckLine;
 if(!l?.favoriteAbbr||Number(l.line)!==-1.5)return null;
 const spreadPrice=num(l.price),dogPrice=num(l.underdogPrice),books=Math.max(0,Math.round(num(l.sportsbookCount)||0));
 if(spreadPrice==null)return null;
 let score=0;const reasons=[];
 if(spreadPrice>=135&&spreadPrice<=225){score+=3;reasons.push('Favorite -1.5 is plus money in the close-cover sweet spot');}
 else if(spreadPrice>=100&&spreadPrice<=250){score+=2;reasons.push('Favorite -1.5 remains plus money, keeping a one-goal finish in play');}
 else if(spreadPrice>=-110&&spreadPrice<100){score+=1;reasons.push('Market leans more toward a multi-goal cover than a classic PLJ sweat');}
 else if(spreadPrice>250){score+=1;reasons.push('Two-goal cover is priced as difficult, but favorite strength is less certain');}
 else reasons.push('Heavy -1.5 pricing points more toward a clean multi-goal cover than a PLJ sweat');
 if(dogPrice!=null){
  if(dogPrice<=-150){score+=2;reasons.push('Underdog +1.5 is strongly juiced, a tight-margin signal');}
  else if(dogPrice<=-115){score+=1;reasons.push('Underdog +1.5 is shaded toward a tight finish');}
 }
 if(books>=7){score+=2;reasons.push(`${books} books are tracking the same -1.5 side`);}
 else if(books>=5){score+=1;reasons.push(`${books} books provide solid market breadth`);}
 else reasons.push(`${books||'Few'} books are available, so the market-shape read is thinner`);
 const grade=score>=6?'A':score>=4?'B':'C';
 const label=grade==='A'?'Prime PLJ setup':grade==='B'?'Watch-list setup':'Lower-priority setup';
 return {grade,score,label,detail:reasons.slice(0,3).join(' · '),spreadPrice,dogPrice,books};
}
