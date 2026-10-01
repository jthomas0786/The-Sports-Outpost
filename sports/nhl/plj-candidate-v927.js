const num=v=>Number.isFinite(Number(v))?Number(v):null;

export const PLJ_CANDIDATE_ORDER={A:0,B:1,C:2};


export const DOG_COVER_GRADE_ORDER={'A+':0,A:1,'B+':2,B:3,'C+':4,C:5,D:6};

const implied=p=>{
 const n=num(p);if(n==null||n===0)return null;
 return n<0?(-n)/((-n)+100):100/(n+100);
};

export function gradePuckLineDog(line){
 const l=line?.puckLine;
 if(!l?.underdogAbbr||Number(l.underdogLine??1.5)!==1.5)return null;
 const favoritePrice=num(l.price),dogPrice=num(l.underdogPrice);
 if(favoritePrice==null||dogPrice==null)return null;
 const favoriteRaw=implied(favoritePrice),dogRaw=implied(dogPrice);
 if(favoriteRaw==null||dogRaw==null||favoriteRaw+dogRaw<=0)return null;
 const coverProbability=dogRaw/(favoriteRaw+dogRaw);
 const coverPct=Number((coverProbability*100).toFixed(1));
 const grade=coverPct>=70?'A+':coverPct>=67?'A':coverPct>=64?'B+':coverPct>=61?'B':coverPct>=58?'C+':coverPct>=55?'C':'D';
 const label=grade==='A+'?'Elite +1.5 resistance':grade==='A'?'Strong +1.5 resistance':grade==='B+'?'Above-average cover profile':grade==='B'?'Solid cover profile':grade==='C+'?'Slight cover lean':grade==='C'?'Average cover profile':'Weak +1.5 resistance';
 const books=Math.max(0,Math.round(num(l.sportsbookCount)||0));
 const confidence=books>=7?'High':books>=5?'Medium':'Low';
 return {grade,label,coverProbability,coverPct,confidence,books,dogAbbr:l.underdogAbbr,dogTeam:l.underdogTeam||l.underdogAbbr,dogPrice,dogBook:l.underdogBook||'',favoritePrice};
}

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
