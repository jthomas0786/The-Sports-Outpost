// Shared NHL grade/ring behavior intentionally mirrors the NFL product.
// Keep thresholds, colors, circumference and sizes in lockstep with NFL.
if(typeof document!=='undefined'&&!document.getElementById('nhl-grade-rings-v904')){
 const link=document.createElement('link');link.id='nhl-grade-rings-v904';link.rel='stylesheet';link.href='./sports/nhl/grade.css?v=90.4';document.head.appendChild(link);
}
export const NHL_RING_C=326.7;

export function gradeForLean(probability){
 const p=Number(probability);
 if(!Number.isFinite(p))return '—';
 return p>=.70?'A+':p>=.65?'A':p>=.61?'A-':p>=.57?'B+':p>=.54?'B':p>=.51?'B-':p>=.48?'C+':'C';
}

export function gradeColor(grade){
 const u=String(grade||'').toUpperCase();
 return u.startsWith('A')?'#22c55e':u.startsWith('B')?'#f4c430':u.startsWith('C')?'#ff9f43':'#8b95a8';
}

export function overProbability(metric,line){
 const threshold=Number(line);
 if(!metric||!Number.isFinite(threshold))return null;
 if(Array.isArray(metric.distribution)&&metric.distribution.length){
  const p=metric.distribution.reduce((sum,row)=>{
   const value=Number(row?.[0]),prob=Number(row?.[1]);
   return Number.isFinite(value)&&Number.isFinite(prob)&&value>threshold?sum+prob:sum;
  },0);
  return Math.max(0,Math.min(1,p));
 }
 if(threshold===.5&&Number.isFinite(Number(metric.atLeastOne)))return Math.max(0,Math.min(1,Number(metric.atLeastOne)));
 return null;
}

export function gradeRingHTML(probability,grade=gradeForLean(probability),size='md'){
 const raw=Number(probability),has=Number.isFinite(raw),pct=Math.max(0,Math.min(100,(has?raw:0)*100));
 const off=(NHL_RING_C*(1-pct/100)).toFixed(1),disp=has?(pct<10?pct.toFixed(1):Math.round(pct)):'—';
 const shownGrade=has?grade:'—';
 return `<span class="sgr sgr-pct hk-grade-ring hk-grade-ring-${size}" style="color:${gradeColor(shownGrade)}"><svg viewBox="0 0 120 120" class="sgr-svg" aria-hidden="true"><circle class="sgr-rt" cx="60" cy="60" r="52"/><circle class="sgr-rf" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" stroke-dasharray="${NHL_RING_C}" stroke-dashoffset="${off}"/></svg><span class="sgr-l"><b class="sgr-gd2">${shownGrade}</b><span class="sgr-pv">${disp}${has?'%':''}</span></span></span>`;
}
