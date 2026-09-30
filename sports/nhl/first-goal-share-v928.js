const W=1600,H=900,BLUE='#2d7fff',INK='#f7fbff',MUTED='#8fa9c6',RISK='#f7b84b';
const price=v=>v==null?'ODDS PENDING':`${Number(v)>0?'+':''}${Number(v)}`;
const pct=v=>Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(Number(v)>=.1?1:2)}%`:'—';
const stat=v=>Number.isFinite(Number(v))?Number(v).toFixed(2):'—';
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function fit(c,text,max,widthStart=30){let s=widthStart;c.font=`800 ${s}px Inter,Arial,sans-serif`;while(s>16&&c.measureText(text).width>max){s--;c.font=`800 ${s}px Inter,Arial,sans-serif`;}return s;}
function initials(name){return String(name||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
async function image(url){if(!url)return null;return new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});}
function drawAspectImage(c,img,x,y,w,h,mode='cover'){
 const iw=Number(img?.naturalWidth||img?.width||0),ih=Number(img?.naturalHeight||img?.height||0);if(!iw||!ih)return;
 const scale=mode==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
 c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function circleImage(c,img,x,y,r,label,mode='cover'){
 c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
 if(img){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';drawAspectImage(c,img,x-r,y-r,r*2,r*2,mode);}
 else{c.fillStyle='#14253a';c.fillRect(x-r,y-r,r*2,r*2);c.fillStyle='#d9e9ff';c.font='900 28px Inter,Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(label,x,y);}
 c.restore();c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
}
function playerLine(market,p){const isFgs=market==='fgs';return {prob:isFgs?p.probability:p.anytimeProbability,odds:isFgs?p.bestOdds:p.bestAtgOdds,book:isFgs?p.bestBook:p.bestAtgBook,fair:isFgs?p.fairOdds:p.fairAtgOdds};}
function statsText(p,market){const base=`${stat(p.seasonGoalRate)} G/GP  ·  ${stat(p.seasonSogRate)} SOG/GP  ·  L10 ${p.recentGoals??0} G`;return market==='fgs'?`${base}  ·  L10 ${p.recentFirstGoals??0} first`:`${base}  ·  ${p.anytimeBooks??0} ATG books`;}
async function drawPlayer(c,p,market,x,y,w,risky=false){
 const h=142;c.fillStyle=risky?'rgba(247,184,75,.085)':'rgba(8,22,39,.80)';roundRect(c,x,y,w,h,22);c.strokeStyle=risky?'rgba(247,184,75,.58)':'rgba(91,153,235,.18)';c.lineWidth=1.5;c.strokeRect(x+.75,y+.75,w-1.5,h-1.5);
 const im=await image(p.photo);circleImage(c,im,x+70,y+70,47,initials(p.name),'cover');
 c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=risky?RISK:INK;c.font='900 15px Inter,Arial';c.fillText(risky?'⚡ RISKY VALUE':`#${p.teamRank||''} ${p.position||'SKATER'}`,x+132,y+31);
 c.fillStyle=INK;fit(c,p.name,w-330,29);c.fillText(p.name,x+132,y+65);
 c.fillStyle=MUTED;c.font='600 17px Inter,Arial';c.fillText(statsText(p,market),x+132,y+101);
 const m=playerLine(market,p);c.textAlign='right';c.fillStyle=BLUE;c.font='950 38px Inter,Arial';c.fillText(pct(m.prob),x+w-24,y+57);
 c.fillStyle=INK;c.font='900 22px Inter,Arial';c.fillText(price(m.odds),x+w-24,y+91);c.fillStyle=MUTED;c.font='700 13px Inter,Arial';c.fillText(m.book?`${String(m.book).toUpperCase()} · fair ${price(m.fair)}`:`MODEL FAIR ${price(m.fair)}`,x+w-24,y+116);
}
function teamHeader(c,team,img,x,y,w){c.fillStyle='rgba(45,127,255,.10)';roundRect(c,x,y,w,76,18);circleImage(c,img,x+45,y+38,27,team.abbr,'contain');c.fillStyle=INK;c.textAlign='left';c.font='950 29px Inter,Arial';c.fillText(team.name,x+85,y+35);c.fillStyle=MUTED;c.font='700 15px Inter,Arial';c.fillText(`${team.abbr} · ${Number(team.expectedGoals||0).toFixed(2)} model goals`,x+85,y+59);}
export async function scorerCardBlob(game,market='fgs'){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
 const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#06101e');grad.addColorStop(.5,'#09192d');grad.addColorStop(1,'#030a13');c.fillStyle=grad;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W/2,260,20,W/2,260,680);glow.addColorStop(0,'rgba(45,127,255,.18)');glow.addColorStop(1,'rgba(45,127,255,0)');c.fillStyle=glow;c.fillRect(0,0,W,H);
 c.strokeStyle='rgba(120,185,255,.055)';c.lineWidth=2;for(let y=110;y<H;y+=76){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}c.strokeStyle='rgba(255,80,80,.10)';c.beginPath();c.moveTo(W/2,120);c.lineTo(W/2,H);c.stroke();
 const title=market==='fgs'?'FIRST GOAL SCORER MODEL':'ANYTIME GOAL SCORER MODEL';c.textAlign='left';c.fillStyle=BLUE;c.font='900 18px Inter,Arial';c.fillText('THE SPORTS OUTPOST · NHL',56,48);c.fillStyle=INK;c.font='950 46px Inter,Arial';c.fillText(title,56,96);
 c.textAlign='right';c.fillStyle=MUTED;c.font='700 16px Inter,Arial';c.fillText(new Date(game.startTime).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}),1544,51);c.fillStyle=INK;c.font='900 26px Inter,Arial';c.fillText(`${game.away.abbr} @ ${game.home.abbr}`,1544,86);
 const [awayLogo,homeLogo]=await Promise.all([image(game.away.logo),image(game.home.logo)]);teamHeader(c,game.away,awayLogo,56,126,710);teamHeader(c,game.home,homeLogo,834,126,710);
 const a=market==='fgs'?game.away.players:game.away.atgPlayers,h=market==='fgs'?game.home.players:game.home.atgPlayers,ar=market==='fgs'?game.away.riskyFirstGoal:game.away.riskyAtg,hr=market==='fgs'?game.home.riskyFirstGoal:game.home.riskyAtg;
 for(let i=0;i<3;i++){await drawPlayer(c,a[i],market,56,218+i*151,710,false);await drawPlayer(c,h[i],market,834,218+i*151,710,false);}await drawPlayer(c,ar,market,56,681,710,true);await drawPlayer(c,hr,market,834,681,710,true);
 c.textAlign='left';c.fillStyle='#a9bfd8';c.font='650 13px Inter,Arial';c.fillText(market==='fgs'?`Competing-hazard ensemble · ${game.directFirstGoalBooks||0} direct FGS books · game total ${Number(game.expectedGoals||0).toFixed(2)}`:`ATG probability from calibrated scoring hazard + multi-book anytime market`,56,853);c.textAlign='right';c.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1544,853);
 return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
}
function filename(game,market){return `TSO-NHL-${game.away.abbr}-${game.home.abbr}-${market==='fgs'?'First-Goal':'Anytime-Goal'}.png`;}
function shareText(game,market){return `${market==='fgs'?'🏒 NHL First Goal Scorer Model':'🚨 NHL Anytime Goal Scorer Model'}\n${game.away.abbr} @ ${game.home.abbr}\nTop 3 from each team + TSO Risky Value picks\n\nthesportsoutpost.com`}
export async function downloadScorerCard(game,market='fgs'){const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return blob;}
export async function shareScorerCard(game,market='fgs'){
 const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const file=new File([blob],filename(game,market),{type:'image/png'}),text=shareText(game,market);
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'The Sports Outpost NHL Scorer Model',text,files:[file]});return 'shared';}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+'\n\nCard downloaded — attach the PNG to this post.')}`,'_blank','noopener,noreferrer');return 'downloaded';
}

export const __SCORER_CARD_TEST__={drawAspectImage};
