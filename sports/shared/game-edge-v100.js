export const GAME_EDGE_VERSION='1.0';

export function americanImplied(price){
  const n=Number(price);
  if(!Number.isFinite(n)||Math.abs(n)<100)return null;
  return n>0?100/(n+100):(-n)/((-n)+100);
}

export function fairPair({leftPrice=null,rightPrice=null,leftProbability=null,rightProbability=null}={}){
  let left=Number(leftProbability),right=Number(rightProbability);
  if(!(Number.isFinite(left)&&Number.isFinite(right)&&left>=0&&right>=0&&left+right>0)){
    left=americanImplied(leftPrice);
    right=americanImplied(rightPrice);
  }
  if(!(Number.isFinite(left)&&Number.isFinite(right)&&left>=0&&right>=0&&left+right>0))return null;
  const total=left+right;
  return {left:left/total,right:right/total};
}

export function edgePercentages(pair){
  if(!pair)return {left:50,right:50,available:false};
  const left=Math.max(0,Math.min(1,Number(pair.left)||0));
  return {left:left*100,right:(1-left)*100,available:true};
}

export function edgeLeader(pair,{neutralBand=.01}={}){
  if(!pair)return {side:'none',strength:0};
  const diff=Number(pair.left)-Number(pair.right);
  if(Math.abs(diff)<neutralBand)return {side:'even',strength:Math.abs(diff)};
  return {side:diff>0?'left':'right',strength:Math.abs(diff)};
}

export function formatAmerican(price){
  const n=Number(price);
  if(!Number.isFinite(n))return '—';
  return n>0?`+${Math.round(n)}`:`${Math.round(n)}`;
}

export function pct(value,digits=0){
  const n=Number(value);
  return Number.isFinite(n)?`${(n*100).toFixed(digits)}%`:'—';
}

export function lineNumber(value,{signed=false,digits=1}={}){
  const n=Number(value);
  if(!Number.isFinite(n))return '—';
  const str=Number.isInteger(n)?String(n):n.toFixed(digits).replace(/\.0$/,'');
  return signed&&n>0?`+${str}`:str;
}
