const W=1600,H=900,BLUE='#2d7fff',INK='#f7fbff',MUTED='#9ab2cf',RISK='#ffd45c';
const BRAND_BG='./logo-outpost-primary.png';
const BRAND_WORDMARK_B64_URL='./assets/tso-wordmark-share.b64?v=90.47-original-wordmark';
let brandWordmarkPromise=null;
async function originalWordmark(){
 if(!brandWordmarkPromise){
  brandWordmarkPromise=fetch(BRAND_WORDMARK_B64_URL,{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw new Error('wordmark asset '+r.status);return r.text();})
   .then(b64=>image('data:image/webp;base64,'+b64.trim()))
   .catch(()=>null);
 }
 return brandWordmarkPromise;
}
const TEAM_COLORS={ANA:'#fc4c02',BOS:'#ffb81c',BUF:'#003087',CGY:'#d2001c',CAR:'#cc0000',CHI:'#cf0a2c',COL:'#6f263d',CBJ:'#002654',DAL:'#006847',DET:'#ce1126',EDM:'#ff4c00',FLA:'#c8102e',LA:'#a2aaad',MIN:'#154734',MTL:'#af1e2d',NSH:'#ffb81c',NJ:'#ce1126',NYI:'#00539b',NYR:'#0038a8',OTT:'#c52032',PHI:'#f74902',PIT:'#fcb514',SJ:'#006d75',SEA:'#99d9d9',STL:'#002f87',TB:'#002868',TOR:'#003e7e',UTA:'#69b3e7',VAN:'#00205b',VGK:'#b4975a',WSH:'#041e42',WPG:'#041e42'};
const price=v=>v==null?'—':`${Number(v)>0?'+':''}${Number(v)}`;
const pct=v=>Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(Number(v)>=.1?1:2)}%`:'—';
const stat=v=>Number.isFinite(Number(v))?Number(v).toFixed(2):'—';
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function strokeRoundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);c.stroke();}
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function fit(c,text,max,widthStart=30,min=12,weight=900,family='Inter,Arial,sans-serif',italic=false){let s=widthStart;c.font=`${italic?'italic ':''}${weight} ${s}px ${family}`;while(s>min&&c.measureText(text).width>max){s--;c.font=`${italic?'italic ':''}${weight} ${s}px ${family}`;}return s;}
function initials(name){return String(name||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
async function image(url){if(!url)return null;return new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});}
function aspectBox(iw,ih,w,h,mode='cover'){iw=Number(iw)||0;ih=Number(ih)||0;if(!iw||!ih)return null;const scale=mode==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;return {dx:(w-dw)/2,dy:(h-dh)/2,dw,dh};}
function drawAspectImage(c,img,x,y,w,h,mode='cover'){const box=aspectBox(img?.naturalWidth||img?.width,img?.naturalHeight||img?.height,w,h,mode);if(!box)return;c.drawImage(img,x+box.dx,y+box.dy,box.dw,box.dh);}
function hexRgb(hex){const h=String(hex||BLUE).replace('#','').padEnd(6,'0').slice(0,6);return [parseInt(h.slice(0,2),16)||45,parseInt(h.slice(2,4),16)||127,parseInt(h.slice(4,6),16)||255];}
function rgba(hex,a){const [r,g,b]=hexRgb(hex);return `rgba(${r},${g},${b},${a})`;}
function teamColor(team,fallback=BLUE){return TEAM_COLORS[String(team?.abbr||'').toUpperCase()]||fallback;}
function lighten(hex,amount=.35){const [r,g,b]=hexRgb(hex);return `rgb(${Math.min(255,Math.round(r+(255-r)*amount))},${Math.min(255,Math.round(g+(255-g)*amount))},${Math.min(255,Math.round(b+(255-b)*amount))})`;}
function circleImage(c,img,x,y,r,label,mode='cover',accent=BLUE){
 c.save();c.shadowColor=accent;c.shadowBlur=26;c.fillStyle=rgba(accent,.28);c.beginPath();c.arc(x,y,r+5,0,Math.PI*2);c.fill();c.restore();
 c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
 if(img){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';drawAspectImage(c,img,x-r,y-r,r*2,r*2,mode);}
 else{c.fillStyle='#101c2c';c.fillRect(x-r,y-r,r*2,r*2);c.fillStyle='#e6f3ff';c.font='900 28px Inter,Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(label,x,y);}
 c.restore();c.strokeStyle='#eaf7ff';c.lineWidth=1.5;c.beginPath();c.arc(x,y,r+1,0,Math.PI*2);c.stroke();c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.arc(x,y,r+5,0,Math.PI*2);c.stroke();
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
function stadiumLightBank(c,x,y,flip=1){c.save();c.translate(x,y);c.rotate(flip*.08);for(let i=0;i<7;i++){const px=i*31*flip;c.shadowColor='#70c8ff';c.shadowBlur=22;c.fillStyle='rgba(228,248,255,.96)';c.beginPath();c.arc(px,0,7.5,0,Math.PI*2);c.fill();}c.restore();}
function drawArena(c,brandBg){
 const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#010714');bg.addColorStop(.42,'#03152c');bg.addColorStop(.70,'#04182d');bg.addColorStop(1,'#09182a');c.fillStyle=bg;c.fillRect(0,0,W,H);
 const crown=c.createRadialGradient(W/2,120,40,W/2,220,800);crown.addColorStop(0,'rgba(26,137,255,.34)');crown.addColorStop(.58,'rgba(4,49,112,.12)');crown.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=crown;c.fillRect(0,0,W,640);

 c.save();
 const leftCrowd=c.createLinearGradient(0,120,560,520);leftCrowd.addColorStop(0,'rgba(14,74,150,.30)');leftCrowd.addColorStop(1,'rgba(1,8,20,.02)');
 polygon(c,[[0,115],[575,115],[510,520],[0,610]]);c.fillStyle=leftCrowd;c.fill();
 const rightCrowd=c.createLinearGradient(W,120,1040,520);rightCrowd.addColorStop(0,'rgba(14,74,150,.30)');rightCrowd.addColorStop(1,'rgba(1,8,20,.02)');
 polygon(c,[[W,115],[1025,115],[1090,520],[W,610]]);c.fillStyle=rightCrowd;c.fill();
 c.restore();
 c.save();c.strokeStyle='rgba(46,145,255,.23)';c.lineWidth=2;for(let r=610;r<=1010;r+=72){c.beginPath();c.arc(W/2,520,r,Math.PI*1.07,Math.PI*1.93);c.stroke();}c.restore();
 c.save();for(let ring=0;ring<6;ring++){const y=118+ring*46,alpha=.16-ring*.015;for(let x=18+(ring%2)*13;x<W;x+=33){c.fillStyle=`rgba(${ring%2?80:42},${ring%2?165:120},255,${alpha})`;c.beginPath();c.arc(x,y+(x%5)*1.4,1.6+(ring%3)*.35,0,Math.PI*2);c.fill();}}c.restore();
 const horizon=c.createLinearGradient(0,250,0,650);horizon.addColorStop(0,'rgba(2,9,20,0)');horizon.addColorStop(.7,'rgba(0,18,43,.20)');horizon.addColorStop(1,'rgba(2,9,18,.72)');c.fillStyle=horizon;c.fillRect(0,230,W,460);
 const ice=c.createLinearGradient(0,625,0,H);ice.addColorStop(0,'rgba(36,102,165,.15)');ice.addColorStop(.36,'rgba(77,160,220,.24)');ice.addColorStop(1,'rgba(205,241,255,.46)');c.fillStyle=ice;c.fillRect(0,620,W,H-620);
 const iceGlow=c.createRadialGradient(W/2,790,40,W/2,790,690);iceGlow.addColorStop(0,'rgba(210,248,255,.34)');iceGlow.addColorStop(.5,'rgba(60,170,255,.11)');iceGlow.addColorStop(1,'rgba(0,60,130,0)');c.fillStyle=iceGlow;c.fillRect(0,570,W,H-570);
 c.save();c.strokeStyle='rgba(213,244,255,.19)';c.lineWidth=1.2;for(let i=0;i<24;i++){const y=690+i*9;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(480,y-10+(i%3)*6,1120,y+8-(i%4)*5,W,y-4);c.stroke();}c.restore();
 c.save();c.strokeStyle='rgba(50,140,220,.22)';c.lineWidth=3;c.beginPath();c.moveTo(W/2,640);c.lineTo(W/2,H);c.stroke();c.beginPath();c.ellipse(W/2,792,144,52,0,0,Math.PI*2);c.stroke();c.restore();
 if(brandBg){
  c.save();c.globalAlpha=.30;c.shadowColor='#1599ff';c.shadowBlur=46;
  drawAspectImage(c,brandBg,535,155,530,660,'contain');
  c.restore();
}
 const edge=c.createRadialGradient(W/2,H/2,300,W/2,H/2,980);edge.addColorStop(.53,'rgba(0,0,0,0)');edge.addColorStop(.82,'rgba(0,5,16,.22)');edge.addColorStop(1,'rgba(0,0,0,.72)');c.fillStyle=edge;c.fillRect(0,0,W,H);
}
function drawWordmark(c,img){
 if(!img)return;
 c.save();
 c.imageSmoothingEnabled=true;
 c.imageSmoothingQuality='high';
 c.globalCompositeOperation='source-over';
 c.globalAlpha=1;
 drawAspectImage(c,img,48,24,720,126,'contain');
 c.restore();
}
function metallicText(c,text,x,y,maxWidth,startSize,align='right'){
 c.textAlign=align;c.textBaseline='alphabetic';
 fit(c,text,maxWidth,startSize,30,800,'Arial Narrow, Inter, Arial, sans-serif',true);
 const g=c.createLinearGradient(0,y-startSize,0,y+8);
 g.addColorStop(0,'#ffffff');g.addColorStop(.34,'#f5fbff');g.addColorStop(.63,'#c9e2f4');g.addColorStop(1,'#62b8ff');
 c.save();c.shadowColor='#1599ff';c.shadowBlur=18;c.lineJoin='round';
 c.strokeStyle='#092748';c.lineWidth=5;c.strokeText(text,x,y,maxWidth);
 c.strokeStyle='#79ccff';c.lineWidth=1.25;c.strokeText(text,x,y,maxWidth);
 c.fillStyle=g;c.fillText(text,x,y,maxWidth);c.restore();
}
function drawTitle(c,market){
 const line=market==='fgs'?'FIRST GOAL SCORER':'ANYTIME GOAL SCORER';
 metallicText(c,line,1548,112,790,64,'right');
 const x=1005,y=145,w=540,h=41;
 c.fillStyle='rgba(2,12,29,.88)';roundRect(c,x,y,w,h,10);
 c.strokeStyle='rgba(46,155,255,.96)';c.lineWidth=2;strokeRoundRect(c,x+1,y+1,w-2,h-2,9);
 c.textAlign='center';c.fillStyle='#fff';c.font='800 italic 18px Inter,Arial,sans-serif';
 c.fillText('TOP 3 PER TEAM + RISKY VALUE',x+w/2,y+27);
}
function drawTeamLogo(c,img,x,y,w,h,accent){if(!img)return;c.save();c.shadowColor=accent;c.shadowBlur=24;c.globalAlpha=.98;drawAspectImage(c,img,x,y,w,h,'contain');c.restore();}
function teamHeader(c,team,img,x,y,w,h,accent,side='left'){
 const cut=36,pts=side==='left'?[[x,y],[x+w-cut,y],[x+w,y+h/2],[x+w-cut,y+h],[x,y+h],[x+14,y+h/2]]:[[x+cut,y],[x+w,y],[x+w-14,y+h/2],[x+w,y+h],[x+cut,y+h],[x,y+h/2]];
 c.save();c.shadowColor=accent;c.shadowBlur=24;polygon(c,pts);c.fillStyle='rgba(2,10,23,.94)';c.fill();c.restore();
 const g=c.createLinearGradient(x,y,x+w,y);if(side==='left'){g.addColorStop(0,rgba(accent,.78));g.addColorStop(.24,rgba(accent,.32));g.addColorStop(.62,'rgba(4,12,25,.93)');g.addColorStop(1,'rgba(1,8,19,.96)');}else{g.addColorStop(0,'rgba(1,8,19,.96)');g.addColorStop(.38,'rgba(4,12,25,.93)');g.addColorStop(.76,rgba(accent,.32));g.addColorStop(1,rgba(accent,.78));}polygon(c,pts);c.fillStyle=g;c.fill();c.strokeStyle=lighten(accent,.45);c.lineWidth=3;c.stroke();
 c.save();polygon(c,pts);c.clip();const shine=c.createLinearGradient(x,y,x,y+h);shine.addColorStop(0,'rgba(255,255,255,.13)');shine.addColorStop(.35,'rgba(255,255,255,0)');shine.addColorStop(1,'rgba(0,0,0,.20)');c.fillStyle=shine;c.fillRect(x,y,w,h);c.restore();
 if(side==='left'){drawTeamLogo(c,img,x+12,y-10,120,h+20,accent);c.textAlign='left';c.fillStyle='#e9f6ff';c.font='800 italic 18px Inter,Arial,sans-serif';c.fillText(String(team.abbr||''),x+145,y+34);fit(c,String(team.name||'').toUpperCase(),w-200,46,24,820,'Inter, Arial, sans-serif',true);c.fillStyle='#fff';c.fillText(String(team.name||'').toUpperCase(),x+145,y+81);c.fillStyle='#d7ebff';c.font='700 13px Inter,Arial';c.fillText(`${Number(team.expectedGoals||0).toFixed(2)} model goals`,x+147,y+104);}
 else{drawTeamLogo(c,img,x+w-132,y-10,120,h+20,accent);c.textAlign='right';c.fillStyle='#e9f6ff';c.font='800 italic 18px Inter,Arial,sans-serif';c.fillText(String(team.abbr||''),x+w-145,y+34);fit(c,String(team.name||'').toUpperCase(),w-200,46,24,820,'Inter, Arial, sans-serif',true);c.fillStyle='#fff';c.fillText(String(team.name||'').toUpperCase(),x+w-145,y+81);c.fillStyle='#d7ebff';c.font='700 13px Inter,Arial';c.fillText(`${Number(team.expectedGoals||0).toFixed(2)} model goals`,x+w-147,y+104);}
}
function drawMatchup(c,game,x,y,w,h,leftColor,rightColor){
 const pts=[[x+22,y],[x+w-22,y],[x+w,y+h/2],[x+w-22,y+h],[x+22,y+h],[x,y+h/2]],g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,rgba(leftColor,.52));g.addColorStop(.48,'rgba(3,14,31,.96)');g.addColorStop(.52,'rgba(3,14,31,.96)');g.addColorStop(1,rgba(rightColor,.52));polygon(c,pts);c.fillStyle=g;c.fill();c.strokeStyle='rgba(116,205,255,.94)';c.lineWidth=2.5;c.stroke();c.save();c.shadowColor='#248eff';c.shadowBlur=18;c.strokeStyle='rgba(55,149,255,.7)';c.stroke();c.restore();
 c.textAlign='center';c.fillStyle='#fff';c.font='820 italic 34px Inter,Arial,sans-serif';c.fillText(`${game.away.abbr} @ ${game.home.abbr}`,x+w/2,y+46);
 const d=new Date(game.startTime),date=d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}).toUpperCase(),time=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});c.fillStyle='#dbeeff';c.font='800 italic 15px Inter,Arial';c.fillText(`${date} · ${time}`,x+w/2,y+75);c.fillStyle='rgba(255,255,255,.72)';c.font='700 11px Inter,Arial';c.fillText(String(game.venue||'NHL'),x+w/2,y+96);
}
function drawMetricBox(c,x,y,w,h,label,value,accent,valueColor){c.fillStyle='rgba(1,9,22,.93)';roundRect(c,x,y,w,h,9);c.strokeStyle=rgba(accent,.95);c.lineWidth=1.7;strokeRoundRect(c,x+.8,y+.8,w-1.6,h-1.6,8);c.fillStyle=label==='ODDS'||label==='FAIR'?'#cde6f8':lighten(accent,.60);c.font='750 12px Inter,Arial';c.textAlign='center';c.fillText(label,x+w/2,y+19);const val=String(value||'—');fit(c,val,w-10,31,18,820,'Inter, Arial, sans-serif',true);c.fillStyle=valueColor;c.fillText(val,x+w/2,y+52);}
function drawRank(c,text,x,y,accent){c.save();c.shadowColor=accent;c.shadowBlur=15;c.fillStyle=rgba(accent,.94);roundRect(c,x,y,50,30,6);c.restore();c.fillStyle='#fff';c.font='820 italic 19px Inter,Arial,sans-serif';c.textAlign='center';c.fillText(text,x+25,y+22);}
function drawPill(c,text,x,y,w,accent,filled=true){c.fillStyle=filled?rgba(accent,.90):'rgba(4,14,29,.92)';roundRect(c,x,y,w,28,6);c.strokeStyle=rgba(accent,.75);c.lineWidth=1.2;strokeRoundRect(c,x+.6,y+.6,w-1.2,26.8,5.4);c.fillStyle='#fff';c.font='800 italic 15px Inter,Arial';c.textAlign='center';c.fillText(text,x+w/2,y+20);}
function drawPlayerPanel(c,x,y,w,h,accent,risky){
 const cut=18,pts=[[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],[x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]];c.save();c.shadowColor=accent;c.shadowBlur=risky?25:17;polygon(c,pts);c.fillStyle='rgba(1,8,20,.94)';c.fill();c.restore();const g=c.createLinearGradient(x,y,x+w,y);g.addColorStop(0,rgba(accent,risky?.24:.16));g.addColorStop(.30,'rgba(3,13,28,.93)');g.addColorStop(1,'rgba(1,7,18,.97)');polygon(c,pts);c.fillStyle=g;c.fill();c.strokeStyle=lighten(accent,.38);c.lineWidth=risky?3.2:2.4;c.stroke();c.save();polygon(c,pts);c.clip();const sheen=c.createLinearGradient(x,y,x,y+h);sheen.addColorStop(0,'rgba(255,255,255,.085)');sheen.addColorStop(.22,'rgba(255,255,255,0)');c.fillStyle=sheen;c.fillRect(x,y,w,h);c.restore();
}
async function drawPlayer(c,p,market,x,y,w,accent,risky=false){
 if(!p)return;const h=126;drawPlayerPanel(c,x,y,w,h,accent,risky);const photo=await image(p.photo);circleImage(c,photo,x+63,y+64,48,initials(p.name),'cover',accent);
 if(risky){c.save();c.shadowColor=accent;c.shadowBlur=18;c.fillStyle=rgba(accent,.92);const badgeW=168,pts=[[x+119,y+7],[x+119+badgeW-16,y+7],[x+119+badgeW,y+21],[x+119+badgeW-16,y+35],[x+119,y+35]];polygon(c,pts);c.fill();c.restore();c.fillStyle='#fff';c.font='820 italic 15px Inter,Arial,sans-serif';c.textAlign='center';c.fillText('RISKY VALUE',x+197,y+29);}else drawRank(c,`#${p.teamRank||''}`,x+8,y+8,accent);
 const parts=String(p.name||'').trim().split(/\s+/),first=parts.length>1?parts.slice(0,-1).join(' '):parts[0]||'',last=parts.length>1?parts.at(-1):parts[0]||'';c.textAlign='left';c.fillStyle='#d9e9fa';c.font='700 italic 14px Inter,Arial';c.fillText(first.toUpperCase(),x+124,y+(risky?55:34));fit(c,last.toUpperCase(),258,risky?31:33,20,820,'Inter, Arial, sans-serif',true);c.fillStyle='#fff';c.fillText(last.toUpperCase(),x+124,y+(risky?83:64));drawPill(c,String(p.team||''),x+124,y+88,65,accent,true);drawPill(c,String(p.position||''),x+194,y+88,51,accent,false);
 const m=playerLine(market,p),live=m.odds!=null,shown=live?price(m.odds):(m.fair!=null?price(m.fair):'—'),oddsColor=live?'#38f5bd':'#e7f1fb';drawMetricBox(c,x+w-246,y+16,111,70,'PROBABILITY',pct(m.prob),accent,lighten(accent,.58));drawMetricBox(c,x+w-126,y+16,114,70,live?(m.book?String(m.book).toUpperCase().slice(0,9):'ODDS'):'FAIR',shown,accent,oddsColor);
 const reason=compactReason(p,market).toUpperCase();c.textAlign='left';c.fillStyle='#edf5ff';fit(c,reason,w-405,13,10,750,'Inter,Arial,sans-serif',true);c.fillText(reason,x+260,y+108);
}
export async function scorerCardBlob(game,market='fgs'){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
 const [brandBg,wordmark,awayLogo,homeLogo]=await Promise.all([image(BRAND_BG),originalWordmark(),image(game.away.logo),image(game.home.logo)]);
 drawArena(c,brandBg);drawWordmark(c,wordmark);drawTitle(c,market);
 const awayColor=teamColor(game.away,'#d51f36'),homeColor=teamColor(game.home,'#1769d5');
 teamHeader(c,game.away,awayLogo,32,190,618,116,awayColor,'left');teamHeader(c,game.home,homeLogo,950,190,618,116,homeColor,'right');drawMatchup(c,game,666,198,268,105,awayColor,homeColor);
 const a=market==='fgs'?game.away.players:game.away.atgPlayers,h=market==='fgs'?game.home.players:game.home.atgPlayers,ar=market==='fgs'?game.away.riskyFirstGoal:game.away.riskyAtg,hr=market==='fgs'?game.home.riskyFirstGoal:game.home.riskyAtg;
 const ys=[322,454,586];for(let i=0;i<3;i++){await drawPlayer(c,a?.[i],market,36,ys[i],668,awayColor,false);await drawPlayer(c,h?.[i],market,896,ys[i],668,homeColor,false);}await drawPlayer(c,ar,market,36,718,668,awayColor,true);await drawPlayer(c,hr,market,896,718,668,homeColor,true);
 c.textBaseline='alphabetic';c.fillStyle='rgba(229,243,255,.76)';c.font='700 10.5px Inter,Arial';c.textAlign='left';const method=market==='fgs'?`${game.directFirstGoalBooks||0} direct FGS books · full-matchup hazard model`:'Full-matchup ATG probability · sportsbook market anchor';c.fillText(method,40,884);c.textAlign='right';c.fillText('Model probabilities are estimates, not guarantees · thesportsoutpost.com',1560,884);
 return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
}
function filename(game,market){return `TSO-NHL-${game.away.abbr}-${game.home.abbr}-${market==='fgs'?'First-Goal':'Anytime-Goal'}.png`;}
function shareText(game,market){return `${market==='fgs'?'🏒 NHL First Goal Scorer':'🚨 NHL Anytime Goal Scorer'}\n${game.away.abbr} @ ${game.home.abbr}\nTop 3 from each team + TSO Risky Value picks\n\nthesportsoutpost.com`;}
export async function downloadScorerCard(game,market='fgs'){const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return blob;}
export async function shareScorerCard(game,market='fgs'){
 const blob=await scorerCardBlob(game,market);if(!blob)throw new Error('Card render failed');const file=new File([blob],filename(game,market),{type:'image/png'}),text=shareText(game,market);
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'The Sports Outpost NHL Scorer',text,files:[file]});return 'shared';}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename(game,market);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+'\n\nCard downloaded — attach the PNG to this post.')}`,'_blank','noopener,noreferrer');return 'downloaded';
}
export const __SCORER_CARD_TEST__={aspectBox,TEAM_COLORS,BRAND_BG,BRAND_WORDMARK_B64_URL};
