const W=1600,H=900,BLUE='#2d7fff',INK='#f7fbff',MUTED='#9ab2cf',RISK='#ffd45c';
const BRAND_BG='./logo-outpost-primary.png',BRAND_WORDMARK='./logo-outpost.png';
const TEAM_COLORS={ANA:'#fc4c02',BOS:'#ffb81c',BUF:'#003087',CGY:'#d2001c',CAR:'#cc0000',CHI:'#cf0a2c',COL:'#6f263d',CBJ:'#002654',DAL:'#006847',DET:'#ce1126',EDM:'#ff4c00',FLA:'#c8102e',LA:'#a2aaad',MIN:'#154734',MTL:'#af1e2d',NSH:'#ffb81c',NJ:'#ce1126',NYI:'#00539b',NYR:'#0038a8',OTT:'#c52032',PHI:'#f74902',PIT:'#fcb514',SJ:'#006d75',SEA:'#99d9d9',STL:'#002f87',TB:'#002868',TOR:'#003e7e',UTA:'#69b3e7',VAN:'#00205b',VGK:'#b4975a',WSH:'#041e42',WPG:'#041e42'};
const price=v=>v==null?'—':`${Number(v)>0?'+':''}${Number(v)}`;
const pct=v=>Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(Number(v)>=.1?1:2)}%`:'—';
const stat=v=>Number.isFinite(Number(v))?Number(v).toFixed(2):'—';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function strokeRoundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.stroke();}
function fit(c,text,max,widthStart=30,min=15,weight=900){let s=widthStart;c.font=`${weight} ${s}px Inter,Arial,sans-serif`;while(s>min&&c.measureText(text).width>max){s--;c.font=`${weight} ${s}px Inter,Arial,sans-serif`;}return s;}
function initials(name){return String(name||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
async function image(url){if(!url)return null;return new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});}
function aspectBox(iw,ih,w,h,mode='cover'){
 iw=Number(iw)||0;ih=Number(ih)||0;if(!iw||!ih)return null;
 const scale=mode==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
 return {dx:(w-dw)/2,dy:(h-dh)/2,dw,dh};
}
function drawAspectImage(c,img,x,y,w,h,mode='cover'){
 const box=aspectBox(img?.naturalWidth||img?.width,img?.naturalHeight||img?.height,w,h,mode);if(!box)return;
 c.drawImage(img,x+box.dx,y+box.dy,box.dw,box.dh);
}
function hexRgb(hex){const h=String(hex||'#2d7fff').replace('#','').padEnd(6,'0').slice(0,6);return [parseInt(h.slice(0,2),16)||45,parseInt(h.slice(2,4),16)||127,parseInt(h.slice(4,6),16)||255];}
function rgba(hex,a){const [r,g,b]=hexRgb(hex);return `rgba(${r},${g},${b},${a})`;}
function teamColor(team,fallback=BLUE){return TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||fallback;}
function circleImage(c,img,x,y,r,label,mode='cover',accent=BLUE){
 c.save();c.shadowColor=accent;c.shadowBlur=18;c.beginPath();c.arc(x,y,r+3,0,Math.PI*2);c.fillStyle=rgba(accent,.22);c.fill();c.restore();
 c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
 if(img){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';drawAspectImage(c,img,x-r,y-r,r*2,r*2,mode);}
 else{c.fillStyle='#111c2d';c.fillRect(x-r,y-r,r*2,r*2);c.fillStyle='#d9e9ff';c.font='900 27px Inter,Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(label,x,y);}
 c.restore();c.strokeStyle=rgba(accent,.95);c.lineWidth=3;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
}
function playerLine(market,p){const isFgs=market==='fgs';return {prob:isFgs?p.probability:p.anytimeProbability,odds:isFgs?p.bestOdds:p.bestAtgOdds,book:isFgs?p.bestBook:p.bestAtgBook,fair:isFgs?p.fairOdds:p.fairAtgOdds};}
function compactReason(p,market){
 const m=p?.matchup||{},parts=[];
 if(Number.isFinite(Number(m.goalAllowedRank))&&Number.isFinite(Number(m.rankedTeams)))parts.push(`#${m.goalAllowedRank}/${m.rankedTeams} ${m.position||p.position||''} goals allowed`);
 if(Number(m.defenseRestFactor)>=1.025)parts.push('opponent B2B');
 if(Number.isFinite(Number(m.recentDefenseIndex))&&Math.abs(Number(m.recentDefenseIndex)-1)>=.035)parts.push(`recent D ${Number(m.recentDefenseIndex)>=1?'+':''}${Math.round((Number(m.recentDefenseIndex)-1)*100)}%`);
 if(m.goalie?.verified&&m.goalie?.name)parts.push(`vs ${m.goalie.name}`);
 if(!parts.length)parts.push(`${stat(p.seasonSogRate)} SOG/G · L10 ${p.recentGoals??0} G`);
 if(market==='fgs'&&Number(p.recentFirstGoals)>0)parts.push(`L10 ${p.recentFirstGoals} first goals`);
 return parts.slice(0,3).join(' · ');
}
function drawNeonPanel(c,x,y,w,h,accent,risky=false){
 c.save();c.shadowColor=accent;c.shadowBlur=risky?22:14;c.fillStyle='rgba(4,13,26,.91)';roundRect(c,x,y,w,h,18);c.restore();
 const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,rgba(accent,risky?.28:.18));g.addColorStop(.34,'rgba(6,18,34,.92)');g.addColorStop(1,'rgba(2,10,22,.97)');c.fillStyle=g;roundRect(c,x,y,w,h,18);
 c.strokeStyle=rgba(accent,risky?.98:.82);c.lineWidth=risky?3:2;strokeRoundRect(c,x+1,y+1,w-2,h-2,17);
 c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;strokeRoundRect(c,x+5,y+5,w-10,h-10,14);
}
function drawBadge(c,text,x,y,w,h,fill,stroke='#fff',font=18){
 c.fillStyle=fill;roundRect(c,x,y,w,h,7);c.strokeStyle=rgba(stroke,.55);c.lineWidth=1;strokeRoundRect(c,x+.5,y+.5,w-1,h-1,6);c.fillStyle='#fff';c.font=`900 italic ${font}px Inter,Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x+w/2,y+h/2+1);
}
function drawOddsBox(c,x,y,w,h,label,value,accent){
 c.fillStyle='rgba(0,8,20,.88)';roundRect(c,x,y,w,h,12);c.strokeStyle=rgba(accent,.75);c.lineWidth=1.5;strokeRoundRect(c,x+.75,y+.75,w-1.5,h-1.5,11);
 c.textAlign='center';c.fillStyle='#b9cde6';c.font='850 13px Inter,Arial';c.fillText(label,x+w/2,y+18);
 c.fillStyle=accent;c.font='950 29px Inter,Arial';c.fillText(value,x+w/2,y+50);
}
function drawArena(c,brandBg){
 const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#020817');grad.addColorStop(.52,'#06172d');grad.addColorStop(1,'#06111f');c.fillStyle=grad;c.fillRect(0,0,W,H);
 for(const [cx,color] of [[120,'#136cff'],[1480,'#1d77ff'],[800,'#00aaff']]){const g=c.createRadialGradient(cx,20,8,cx,100,420);g.addColorStop(0,'rgba(40,150,255,.32)');g.addColorStop(1,'rgba(0,70,180,0)');c.fillStyle=g;c.fillRect(0,0,W,500);}
 c.save();c.globalAlpha=.45;c.strokeStyle='rgba(74,153,255,.14)';c.lineWidth=2;for(let y=38;y<240;y+=36){c.beginPath();c.moveTo(0,y);c.lineTo(W,y+20);c.stroke();}c.restore();
 const ice=c.createLinearGradient(0,690,0,H);ice.addColorStop(0,'rgba(25,85,145,.08)');ice.addColorStop(1,'rgba(165,224,255,.18)');c.fillStyle=ice;c.fillRect(0,675,W,H-675);
 c.strokeStyle='rgba(205,240,255,.16)';c.lineWidth=2;c.beginPath();c.moveTo(0,810);c.lineTo(W,810);c.stroke();c.beginPath();c.moveTo(W/2,680);c.lineTo(W/2,H);c.stroke();
 if(brandBg){c.save();c.globalAlpha=.20;c.shadowColor='#2d7fff';c.shadowBlur=28;drawAspectImage(c,brandBg,525,230,550,610,'contain');c.restore();}
 const vignette=c.createRadialGradient(W/2,H/2,260,W/2,H/2,900);vignette.addColorStop(.55,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.58)');c.fillStyle=vignette;c.fillRect(0,0,W,H);
}
function drawWordmark(c,img){
 if(!img)return;
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,sx=Math.round(iw*.275),sw=iw-sx;
 c.save();c.shadowColor='#2d7fff';c.shadowBlur=18;c.drawImage(img,sx,0,sw,ih,40,18,500,122);c.restore();
}
function drawTitle(c,market){
 const line=market==='fgs'?'FIRST GOAL SCORER':'ANYTIME GOAL SCORER';
 c.textAlign='right';c.textBaseline='alphabetic';c.save();c.shadowColor='#43a6ff';c.shadowBlur=18;c.fillStyle='#f7fbff';fit(c,line,760,59,38,950);c.fillText(line,1550,65);c.restore();
 c.fillStyle='#eaf6ff';c.font='950 italic 56px Inter,Arial';c.fillText('MODEL',1550,118);
 c.fillStyle='rgba(3,15,32,.84)';roundRect(c,985,132,565,38,10);c.strokeStyle='rgba(45,127,255,.88)';c.lineWidth=1.5;strokeRoundRect(c,986,133,563,36,9);c.fillStyle='#fff';c.font='850 italic 19px Inter,Arial';c.fillText('TOP 3 PER TEAM + RISKY VALUE',1517,158);
}
function teamHeader(c,team,img,x,y,w,accent,side='left'){
 c.save();c.shadowColor=accent;c.shadowBlur=17;c.fillStyle='rgba(4,13,26,.92)';roundRect(c,x,y,w,105,18);c.restore();
 const g=c.createLinearGradient(x,y,x+w,y);if(side==='left'){g.addColorStop(0,rgba(accent,.62));g.addColorStop(.22,rgba(accent,.18));g.addColorStop(1,'rgba(3,12,26,.92)');}else{g.addColorStop(0,'rgba(3,12,26,.92)');g.addColorStop(.78,rgba(accent,.18));g.addColorStop(1,rgba(accent,.62));}c.fillStyle=g;roundRect(c,x,y,w,105,18);
 c.strokeStyle=rgba(accent,.95);c.lineWidth=2.5;strokeRoundRect(c,x+1,y+1,w-2,103,17);
 const logoX=side==='left'?x+55:x+w-55;circleImage(c,img,logoX,y+52,39,team.abbr,'contain',accent);
 c.fillStyle='#fff';c.textBaseline='alphabetic';
 if(side==='left'){c.textAlign='left';c.font='850 italic 17px Inter,Arial';c.fillText(String(team.abbr||''),x+110,y+31);fit(c,team.name,w-165,36,22,950);c.fillText(team.name,x+110,y+70);}
 else{c.textAlign='right';c.font='850 italic 17px Inter,Arial';c.fillText(String(team.abbr||''),x+w-110,y+31);fit(c,team.name,w-165,36,22,950);c.fillText(team.name,x+w-110,y+70);}
 c.fillStyle='rgba(218,235,255,.82)';c.font='700 13px Inter,Arial';const sub=`${Number(team.expectedGoals||0).toFixed(2)} model goals`;if(side==='left')c.fillText(sub,x+110,y+93);else c.fillText(sub,x+w-110,y+93);
}
function drawMatchup(c,game,x,y,w,h,leftColor,rightColor){
 const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,rgba(leftColor,.30));g.addColorStop(.50,'rgba(3,15,32,.96)');g.addColorStop(1,rgba(rightColor,.30));c.fillStyle=g;roundRect(c,x,y,w,h,18);c.strokeStyle='rgba(76,169,255,.75)';c.lineWidth=2;strokeRoundRect(c,x+1,y+1,w-2,h-2,17);
 c.textAlign='center';c.fillStyle='#fff';c.font='950 italic 34px Inter,Arial';c.fillText(`${game.away.abbr} @ ${game.home.abbr}`,x+w/2,y+43);
 const d=new Date(game.startTime);const date=d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}).toUpperCase(),time=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 c.fillStyle='#d1e4f7';c.font='750 15px Inter,Arial';c.fillText(`${date} · ${time}`,x+w/2,y+70);
}
async function drawPlayer(c,p,market,x,y,w,accent,risky=false){
 if(!p)return;
 const h=121;drawNeonPanel(c,x,y,w,h,accent,risky);
 const im=await image(p.photo);circleImage(c,im,x+59,y+60,43,initials(p.name),'cover',accent);
 if(risky){drawBadge(c,'RISKY VALUE',x+110,y+10,155,28,rgba(accent,.72),accent,15);}
 else{drawBadge(c,`#${p.teamRank||''}`,x+10,y+10,48,28,rgba(accent,.84),accent,17);}
 c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#dcecff';c.font='800 italic 14px Inter,Arial';const nameParts=String(p.name||'').split(/\s+/),first=nameParts.slice(0,-1).join(' ')||nameParts[0]||'',last=nameParts.length>1?nameParts.at(-1):'';c.fillText(first.toUpperCase(),x+112,y+40);
 c.fillStyle='#fff';fit(c,(last||first).toUpperCase(),300,risky?27:30,18,950);c.fillText((last||first).toUpperCase(),x+112,y+70);
 drawBadge(c,String(p.team||''),x+112,y+78,64,27,rgba(accent,.72),accent,15);drawBadge(c,String(p.position||''),x+180,y+78,48,27,'rgba(7,18,34,.92)',accent,15);
 const m=playerLine(market,p),shownOdds=m.odds!=null?price(m.odds):(m.fair!=null?`FAIR ${price(m.fair)}`:'—'),oddsAccent=m.odds!=null?'#13efb6':'#b8c9dc';
 drawOddsBox(c,x+w-245,y+14,112,69,'PROBABILITY',pct(m.prob),accent);
 drawOddsBox(c,x+w-124,y+14,112,69,m.book?String(m.book).toUpperCase():'ODDS',shownOdds,oddsAccent);
 c.fillStyle='#d7e6f8';c.font='700 italic 13px Inter,Arial';c.textAlign='left';let note=compactReason(p,market).toUpperCase();fit(c,note,w-385,13,10,700);c.fillText(note,x+245,y+103);
}
export async function scorerCardBlob(game,market='fgs'){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
 const [brandBg,wordmark,awayLogo,homeLogo]=await Promise.all([image(BRAND_BG),image(BRAND_WORDMARK),image(game.away.logo),image(game.home.logo)]);
 drawArena(c,brandBg);drawWordmark(c,wordmark);drawTitle(c,market);
 const awayColor=teamColor(game.away,'#d51f36'),homeColor=teamColor(game.home,'#1769d5');
 teamHeader(c,game.away,awayLogo,28,186,640,awayColor,'left');teamHeader(c,game.home,homeLogo,932,186,640,homeColor,'right');drawMatchup(c,game,682,196,236,84,awayColor,homeColor);
 const a=market==='fgs'?game.away.players:game.away.atgPlayers,h=market==='fgs'?game.home.players:game.home.atgPlayers,ar=market==='fgs'?game.away.riskyFirstGoal:game.away.riskyAtg,hr=market==='fgs'?game.home.riskyFirstGoal:game.home.riskyAtg;
 const ys=[312,443,574];for(let i=0;i<3;i++){await drawPlayer(c,a?.[i],market,28,ys[i],734,awayColor,false);await drawPlayer(c,h?.[i],market,838,ys[i],734,homeColor,false);}await drawPlayer(c,ar,market,28,705,734,awayColor,true);await drawPlayer(c,hr,market,838,705,734,homeColor,true);
 c.textBaseline='alphabetic';c.fillStyle='rgba(214,232,250,.82)';c.font='650 12px Inter,Arial';c.textAlign='left';const method=market==='fgs'?`${game.directFirstGoalBooks||0} direct FGS books · full-matchup hazard model`:'Full-matchup ATG probability · sportsbook market anchor';c.fillText(method,32,875);c.textAlign='right';c.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1568,875);
 return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
}
function filename(game,market){return `TSO-NHL-${game.away.abbr}-${game.home.abbr}-${market==='fgs'?'First-Goal':'Anytime-Goal'}.png`;}
function shareText(game,market){return `${market==='fgs'?'🏒 NHL First Goal Scorer Model':'🚨 NHL Anytime Goal Scorer Model'}\n${game.away.abbr} @ ${game.home.abbr}\nTop 3 from each team + TSO Risky Value picks\n\nthesportsoutpost.com`;}
export async function downloadScorerCard(game,market='fgs'){const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return blob;}
export async function shareScorerCard(game,market='fgs'){
 const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const file=new File([blob],filename(game,market),{type:'image/png'}),text=shareText(game,market);
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'The Sports Outpost NHL Scorer Model',text,files:[file]});return 'shared';}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+'\n\nCard downloaded — attach the PNG to this post.')}`,'_blank','noopener,noreferrer');return 'downloaded';
}

export const __SCORER_CARD_TEST__={aspectBox,TEAM_COLORS,BRAND_BG,BRAND_WORDMARK};
