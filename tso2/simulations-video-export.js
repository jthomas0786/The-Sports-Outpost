/* TSO 2.0 16:9 landscape NFL simulated broadcast.
 * Stat sidebars, overlays and final slides use the SAME illustrative play
 * ledger and verified 50K sampled world. Not real play tracking or footage.
 */
(function(global){
'use strict';
const FPS=24,W=1280,H=720;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clean=v=>String(v??'');
const abbr=team=>String(team?.abbr||'NFL').toUpperCase();
const logoUrl=team=>'/api/tso2-nfl-logo?team='+encodeURIComponent(abbr(team));
function logoImage(url){
 return new Promise(resolve=>{
  const img=new Image();let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok?img:null)};
  const timer=setTimeout(()=>finish(false),5000);
  img.crossOrigin='anonymous';img.onload=()=>finish(img.naturalWidth>0);
  img.onerror=()=>finish(false);img.src=url;
 });
}
function roundRect(c,x,y,w,h,r,color,border){
 c.beginPath();c.roundRect(x,y,w,h,r);
 if(color){c.fillStyle=color;c.fill()}
 if(border){c.strokeStyle=border;c.lineWidth=1.3;c.stroke()}
}
function text(c,value,x,y,size=22,color='#f9fbff',weight=700,align='left',maxWidth){
 c.font=weight+' '+size+'px system-ui, -apple-system, sans-serif';
 c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';
 if(maxWidth)c.fillText(clean(value),x,y,maxWidth);
 else c.fillText(clean(value),x,y);
}
function wrapped(c,value,x,y,maxWidth,{size=17,lineHeight=23,lines=2,color='#d1d5de',weight=600}={}){
 c.font=weight+' '+size+'px system-ui,sans-serif';
 let line='',count=0;
 for(const word of clean(value).split(/\s+/)){
  const next=line?line+' '+word:word;
  if(c.measureText(next).width<=maxWidth){line=next;continue}
  if(line){text(c,line,x,y+count*lineHeight,size,color,weight);if(++count>=lines)return}
  line=word;
 }
 if(line)text(c,line,x,y+count*lineHeight,size,color,weight,maxWidth);
}
function base(c,subtitle='50,000-RUN · ILLUSTRATIVE NFL SIMULATION'){
 c.fillStyle='#080b11';c.fillRect(0,0,W,H);
 const glow=c.createLinearGradient(0,0,W,H);
 glow.addColorStop(0,'#19202b');glow.addColorStop(.5,'#0d131c');glow.addColorStop(1,'#090d15');
 c.fillStyle=glow;c.fillRect(0,0,W,188);
 c.fillStyle='#ff541d';c.fillRect(0,0,W,5);
 text(c,'THE SPORTS OUTPOST',35,35,22,'#fff',950);
 text(c,subtitle,35,57,12,'#ffce52',820);
 text(c,'TSO SIMULATIONS  ·  2026 NFL',W-35,35,15,'#f5cc55',900,'right');
 c.fillStyle='#364050';c.fillRect(26,72,W-52,1);
}
function footer(c,note='NOT ACTUAL NFL FOOTAGE OR OFFICIAL STATS'){
 c.fillStyle='#131923';c.fillRect(0,H-44,W,44);
 c.fillStyle='#ff541d';c.fillRect(0,H-44,W,2);
 text(c,note,26,H-18,13,'#ffd056',820);
 text(c,'thesportsoutpost.com  •  illustrated sampled-world replay',W-26,H-18,12,'#bdc6d5',650,'right');
}
function drawLogo(c,img,cx,cy,label,size=62){
 roundRect(c,cx-size/2,cy-size/2,size,size,13,'#202733','#404958');
 if(img){try{c.drawImage(img,cx-size*.43,cy-size*.43,size*.86,size*.86)}catch(_){text(c,label,cx,cy+8,22,'#fff',950,'center')}}
 else text(c,label,cx,cy+8,22,'#fff',950,'center');
}
function scoreboard(c,game,logos,score,quarter='Q1',clock='15:00'){
 roundRect(c,266,82,748,106,15,'#151b26','#4b5362');
 drawLogo(c,logos[0],317,133,abbr(game.away),72);
 drawLogo(c,logos[1],963,133,abbr(game.home),72);
 text(c,abbr(game.away),368,121,25,'#fff',950);
 text(c,abbr(game.home),912,121,25,'#fff',950,'right');
 text(c,score[0],495,156,56,'#fff',950,'center');
 text(c,'—',640,149,43,'#ffce52',900,'center');
 text(c,score[1],785,156,56,'#fff',950,'center');
 text(c,quarter+'   '+clock,640,178,16,'#ffce52',880,'center');
}
const num=v=>Number.isFinite(Number(v))?Math.round(Number(v)):0;
const val=v=>Number.isFinite(Number(v))?String(Math.round(Number(v))):'—';
function sideStats(c,game,snap,team,x){
 // Show only player box-score rows from completed plays. No aggregate team counters.
 const code=abbr(team),all=Object.values(snap?.players?.[code]||{});
 const sections=[
  {title:'PASSING',rows:all.filter(p=>p.passAtt||p.sacks).sort((a,b)=>b.passAtt-a.passAtt),
   format:p=>p.passComp+'/'+p.passAtt+'  '+val(p.passYds)+'Y  '+val(p.passTd)+'TD'+(p.int?' '+p.int+'INT':'')},
  {title:'RUSHING',rows:all.filter(p=>p.carries).sort((a,b)=>b.carries-a.carries),
   format:p=>p.carries+'A  '+val(p.rushYds)+'Y'+(p.rushTd?' '+p.rushTd+'TD':'')},
  {title:'RECEIVING',rows:all.filter(p=>p.targets).sort((a,b)=>b.targets-a.targets),
   format:p=>p.receptions+'/'+p.targets+'  '+val(p.recYds)+'Y'+(p.recTd?' '+p.recTd+'TD':'')}
 ];
 const w=232,y=203,h=459;
 roundRect(c,x,y,w,h,13,'#151c27','#354052');
 text(c,code+' · PLAYER BOX',x+12,y+27,16,'#ffd15a',950);
 c.fillStyle='#303b4b';c.fillRect(x+12,y+39,w-24,1);
 const count=sections.reduce((sum,section)=>sum+Math.max(section.rows.length,1),0);
 const rowH=Math.max(8,Math.min(22,Math.floor((h-49-3*30)/Math.max(1,count))));
 let yy=y+44;
 for(const section of sections){
  yy+=21;
  text(c,section.title,x+12,yy,12,'#ffb761',920);
  c.fillStyle='#303b4b';c.fillRect(x+12,yy+4,w-24,1);
  yy+=9;
  if(!section.rows.length){
   text(c,'No attempts yet',x+12,yy+rowH*.68,10,'#8d9cae',680);
   yy+=rowH;continue;
  }
  for(const [i,p] of section.rows.entries()){
   if(i%2===0){c.fillStyle='#1d2734';c.fillRect(x+9,yy-2,w-18,rowH);}
   const baseline=yy+rowH*.73;
   const font=rowH>=15?11:Math.max(8,Math.floor(rowH*.67));
   text(c,p.name||'PLAYER',x+12,baseline,font,'#fff',800,'left',113);
   text(c,section.format(p),x+w-11,baseline,Math.max(8,font-1),'#cddbe9',780,'right',105);
   yy+=rowH;
  }
 }
}
function intro(c,game,logos){
 base(c,'ILLUSTRATIVE 50,000-RUN NFL GAME REPLAY');
 scoreboard(c,game,logos,[0,0],'PREVIEW','');
 roundRect(c,155,242,W-310,324,18,'#151c27','#465064');
 text(c,'TSO BROADCAST',W/2,310,23,'#ffca54',940,'center');
 text(c,abbr(game.away)+'  AT  '+abbr(game.home),W/2,377,67,'#fff',1000,'center');
 text(c,'LANDSCAPE SIMULATED REPLAY',W/2,422,24,'#ffce55',900,'center');
 wrapped(c,'The final score comes from a verified sampled world. Play paths and play-by-play are score-conditioned illustrations, not official game tracking.',W/2-450,474,900,{size:19,lineHeight:30,lines:3,weight:650,color:'#d7e0eb'});
 footer(c);
}
function drawBroadcastEvent(c,game,logos,event,progress){
 const detail=global.TSO2SimBroadcastEvent?.fromPlay(event,game);
 if(!detail||progress<.43)return;
 const accent=detail.tone==='score'?'#ffd45f':
  detail.tone==='defense'||detail.tone==='turnover'?'#86c7ff':
  detail.tone==='warning'?'#ffc178':'#ff8650';
 const team=detail.team===abbr(game.away)?0:detail.team===abbr(game.home)?1:-1;
 const x=347,y=333,w=586,h=160;
 c.save();c.shadowColor='#000c';c.shadowBlur=27;c.shadowOffsetY=9;
 roundRect(c,x,y,w,h,15,'#141a24',accent);c.restore();
 c.fillStyle=accent;c.fillRect(x+3,y+16,5,h-32);
 if(team>=0)drawLogo(c,logos[team],x+56,y+66,abbr(team===0?game.away:game.home),64);
 const left=x+(team>=0?105:25),max=w-(team>=0?125:50);
 text(c,(detail.teamName||detail.team||'TSO REPLAY').toUpperCase(),left,y+26,13,accent,950,'left',max);
 const title=detail.title||'GAME EVENT';
 c.font='950 38px system-ui,sans-serif';
 const size=c.measureText(title).width>max?29:38;
 text(c,title,left,y+76,size,'#fff',950,'left',max);
 if(detail.actor)text(c,detail.actor,left,y+108,20,'#ffd982',920,'left',max);
 text(c,detail.subline||'ILLUSTRATIVE REPLAY',left,y+141,12,'#cbd5e2',780,'left',max);
}
function play(c,game,logos,event,field,snap){
 base(c);
 const progress=field.progress??0;
 const complete=progress>=.94;
 const away=complete?event.scoreAway:event.beforeAway??event.scoreAway;
 const home=complete?event.scoreHome:event.beforeHome??event.scoreHome;
 scoreboard(c,game,logos,[away,home],'Q'+event.quarter,event.clock||'');
 sideStats(c,game,snap,game.away,25);
 sideStats(c,game,snap,game.home,W-257);
 roundRect(c,270,199,740,394,14,'#0d201a','#3f4e49');
 if(field.canvas){
  try{c.drawImage(field.canvas,278,211,724,363)}catch(_){}
 }
 roundRect(c,270,601,740,63,10,'#18202b','#374657');
 text(c,'PLAY '+String((event.index??field.index)+1).padStart(3,'0')+'  ·  '+event.kind,287,622,14,'#ffca4e',940);
 wrapped(c,event.commentary||'',287,645,705,{size:14,lineHeight:16,lines:2,color:'#f0f5fa',weight:720});
 drawBroadcastEvent(c,game,logos,event,progress);
 footer(c,'TSO 50K SIMULATION · RUNNING PLAYER STATS');
}
function boxPages(game,snapshot){
 const away=abbr(game.away),home=abbr(game.home),a=snapshot.teams?.[away],b=snapshot.teams?.[home];
 if(!a||!b)throw Error('The illustrative play ledger has no complete team totals.');
 const teams=[away,home];
 const entries=team=>{
  const all=Object.values(snapshot.players?.[team]||{});
  return {
   passing:all.filter(p=>p.passAtt||p.sacks).sort((x,y)=>y.passAtt-x.passAtt),
   rushing:all.filter(p=>p.carries).sort((x,y)=>y.carries-x.carries),
   receiving:all.filter(p=>p.targets).sort((x,y)=>y.targets-x.targets)
  };
 };
 return [
  {type:'teams',title:'FINAL TEAM STATS',rows:[
   ['FINAL SCORE',val(a.points),val(b.points)],
   ['Q1',val(a.quarter?.[0]),val(b.quarter?.[0])],
   ['Q2',val(a.quarter?.[1]),val(b.quarter?.[1])],
   ['Q3',val(a.quarter?.[2]),val(b.quarter?.[2])],
   ['Q4',val(a.quarter?.[3]),val(b.quarter?.[3])],
   ['TOTAL YARDS',val(a.totalYds),val(b.totalYds)],
   ['PASSING YARDS',val(a.passing),val(b.passing)],
   ['RUSHING YARDS',val(a.rushing),val(b.rushing)],
   ['FIRST DOWNS',val(a.firstDowns),val(b.firstDowns)],
   ['PASS COMP/ATT',a.passComp+'/'+a.passAtt,b.passComp+'/'+b.passAtt],
   ['RUSH ATTEMPTS',val(a.rushAtt),val(b.rushAtt)],
   ['TURNOVERS',val(a.interceptions),val(b.interceptions)],
   ['SACKS ALLOWED',val(a.sacksAllowed),val(b.sacksAllowed)],
   ['PUNTS',val(a.punts),val(b.punts)],
   ['FIELD GOALS MADE',val(a.fieldGoals),val(b.fieldGoals)]
  ]},
  {type:'players',title:'FULL PLAYER BOX SCORE',teams:Object.fromEntries(teams.map(t=>[t,entries(t)]))}
 ];
}
function finalSlide(c,game,logos,snapshot,page,pageIndex,total){
 base(c,page.type==='teams'?'FINAL STATISTICS · ILLUSTRATIVE GAME':'FULL PLAYER BOX SCORE · ILLUSTRATIVE GAME');
 const away=abbr(game.away),home=abbr(game.home),a=snapshot.teams[away],b=snapshot.teams[home];
 scoreboard(c,game,logos,[a.points,b.points],'FINAL','');
 text(c,page.title,W/2,223,27,'#ffd05a',950,'center');
 if(page.type==='teams'){
  roundRect(c,200,243,880,410,13,'#141c27','#3d495c');
  text(c,'STATISTIC',235,272,15,'#ffce55',930);
  text(c,away,833,272,18,'#ffce55',930,'center');
  text(c,home,1002,272,18,'#ffce55',930,'center');
  let y=293;
  for(const [i,row] of page.rows.entries()){
   if(i%2===0)roundRect(c,216,y-17,844,22,3,'#202a36');
   text(c,row[0],238,y,14,'#e7edf6',760);
   text(c,row[1],833,y,16,'#fff',900,'center');
   text(c,row[2],1002,y,16,'#fff',900,'center');
   y+=23;
  }
 }else{
  // Single 16:9 player screen: three markets side by side and BOTH teams in each.
  // All tracked participants remain here; density scales with the play ledger.
  const specs=[
   {category:'passing',name:'PASSING',heads:['PLAYER','CMP/ATT','YDS','TD','INT'],
    format:p=>[p.name,p.passComp+'/'+p.passAtt,val(p.passYds),val(p.passTd),val(p.int)]},
   {category:'rushing',name:'RUSHING',heads:['PLAYER','ATT','YDS','TD'],
    format:p=>[p.name,val(p.carries),val(p.rushYds),val(p.rushTd)]},
   {category:'receiving',name:'RECEIVING',heads:['PLAYER','REC/TGT','YDS','TD'],
    format:p=>[p.name,p.receptions+'/'+p.targets,val(p.recYds),val(p.recTd)]}
  ];
  for(const [index,spec] of specs.entries()){
   const x=25+index*419,w=393,y=239,h=414;
   roundRect(c,x,y,w,h,10,'#131c28','#354355');
   text(c,spec.name,x+12,y+27,19,'#ffd055',950);
   const coords=spec.heads.length===5?[x+12,x+263,x+310,x+350,x+381]:
    [x+12,x+276,x+333,x+381];
   for(let j=1;j<spec.heads.length;j++)
    text(c,spec.heads[j],coords[j],y+48,9,'#a6b6ce',850,'right');
   const combined=[...(page.teams[away]?.[spec.category]||[]),...(page.teams[home]?.[spec.category]||[])];
   const rowH=Math.min(22,Math.max(7,(h-64-2*20)/Math.max(combined.length,1)));
   let yy=y+53;
   for(const code of [away,home]){
    const players=page.teams[code]?.[spec.category]||[];
    c.fillStyle='#293546';c.fillRect(x+8,yy,w-16,18);
    text(c,code+' · '+spec.name,x+13,yy+13,11,'#ffd15a',900);
    yy+=20;
    if(!players.length){
     text(c,'No recorded attempts',x+12,yy+rowH*.72,9,'#a1acba',720);
     yy+=rowH;
    }
    for(const [k,p] of players.entries()){
     if(k%2===0){c.fillStyle='#1b2736';c.fillRect(x+8,yy,w-16,rowH);}
     const row=spec.format(p),font=Math.min(12,Math.max(7,Math.floor(rowH*.7)));
     const baseline=yy+rowH*.74;
     for(let j=0;j<row.length;j++)
      text(c,row[j],coords[j],baseline,font,j===0?'#fff':'#dce7f2',j===0?760:850,j===0?'left':'right',j===0?231:53);
     yy+=rowH;
    }
   }
  }
 }
 text(c,'SCREEN '+(pageIndex+1)+' OF '+total,W/2,671,13,'#bfcad9',800,'center');
 footer(c,'FULL BOX SCORE FROM ILLUSTRATIVE PLAY LEDGER · NOT OFFICIAL');
}

async function loadMuxer(){
 if(global.Mp4Muxer)return global.Mp4Muxer;
 if(!global.document)throw Error('Video export requires a browser.');
 if(!loadMuxer.pending)loadMuxer.pending=new Promise((resolve,reject)=>{
  const node=document.createElement('script');
  node.src='./vendor/mp4-muxer.min.js?v=20261017-mp4-v522';
  node.crossOrigin='anonymous';
  node.onload=()=>global.Mp4Muxer?resolve(global.Mp4Muxer):reject(Error('MP4 encoder module unavailable.'));
  node.onerror=()=>reject(Error('MP4 encoder could not be loaded. Check your connection.'));
  document.head.appendChild(node);
 });
 return loadMuxer.pending;
}
async function setupEncoder(c,muxer,fps){
 const options=['avc1.42001f','avc1.42E01F','avc1.4d401f'];
 for(const codec of options){
  const config={codec,width:W,height:H,bitrate:3500000,framerate:fps,
   hardwareAcceleration:'prefer-hardware',avc:{format:'avc'}};
  try{
   const result=await VideoEncoder.isConfigSupported(config);
   if(result.supported){
    let error=null;
    const encoder=new VideoEncoder({
     output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),
     error:err=>{error=err}
    });
    encoder.configure(result.config);
    return {encoder,check:()=>{if(error)throw error}};
   }
  }catch(_){}
 }
 throw Error('H.264 MP4 encoding is unsupported in this browser.');
}
async function encodeWebCodecs(canvas,frames,progress){
 const lib=await loadMuxer();
 const muxer=new lib.Muxer({
  target:new lib.ArrayBufferTarget(),
  video:{codec:'avc',width:W,height:H,frameRate:FPS},
  fastStart:'in-memory',firstTimestampBehavior:'offset'
 });
 const {encoder,check}=await setupEncoder(canvas,muxer,FPS);
 try{
  for(let i=0;i<frames;i++){
   progress.render(i);
   const vf=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/FPS),duration:Math.round(1000000/FPS)});
   try{encoder.encode(vf,{keyFrame:i%72===0})}finally{vf.close()}
   if(i%12===0){check();progress.report(i,frames)}
   if(encoder.encodeQueueSize>7)await encoder.flush();
  }
  await encoder.flush();check();muxer.finalize();
  return new Blob([muxer.target.buffer],{type:'video/mp4'});
 }finally{encoder.close()}
}
async function encodeNative(canvas,frames,progress){
 if(!canvas.captureStream||typeof MediaRecorder==='undefined')
  throw Error('MP4 video export is unsupported by this browser.');
 const mime=['video/mp4;codecs=avc1.42E01F','video/mp4;codecs=avc1.42001f','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('Native MP4 recording is unavailable. Try Safari or Chrome with H.264 WebCodecs.');
 const stream=canvas.captureStream(FPS),chunks=[];
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
 let failed=null;
 const stopped=new Promise((resolve,reject)=>{
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=e=>{failed=e.error||Error('MP4 recorder failed');reject(failed)};
  recorder.onstop=()=>failed?reject(failed):resolve();
 });
 try{
  recorder.start(1000);
  for(let i=0;i<frames;i++){
   progress.render(i);if(i%12===0)progress.report(i,frames);
   await wait(1000/FPS);
  }
  recorder.stop();await stopped;
  return new Blob(chunks,{type:'video/mp4'});
 }finally{stream.getTracks().forEach(t=>t.stop())}
}
async function exportVideo({game,plays,snapshot,renderField,onProgress=()=>{}}={}){
 if(!game?.representativeWorld||!Array.isArray(plays)||!plays.length||!snapshot?.teams)
  throw Error('An eligible representative simulation and complete box score are required.');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d',{alpha:false});
 if(!c)throw Error('Canvas drawing is unavailable.');
 const logos=await Promise.all([logoImage(logoUrl(game.away)),logoImage(logoUrl(game.home))]);
 const pages=boxPages(game,snapshot);
 const engine=global.TSO2SimEngine;
 if(typeof engine?.snapshot!=='function')throw Error('Simulation stat ledger is unavailable for video export.');
 // Cache cumulative completed-play snapshots; sidebars must agree exactly with
 // the same event ledger used by the final box score and on-page replay.
 const snapshots=new Map([[plays.length,snapshot]]);
 const at=index=>{
  const done=clamp(index,0,plays.length);
  if(!snapshots.has(done))snapshots.set(done,engine.snapshot(game,plays,done));
  return snapshots.get(done);
 };
 const introFrames=FPS*2,outroFrames=FPS*4;
 // Highlight plays receive a readable 1.25 second pause in the MP4; all
 // ordinary illustrative snaps remain short. No extra events are generated.
 const playDurations=plays.map(event=>global.TSO2SimBroadcastEvent?.fromPlay(event,game)?
  Math.round(FPS*1.25):Math.max(8,Math.round(FPS*.42)));
 const offsets=[0];
 for(const duration of playDurations)offsets.push(offsets[offsets.length-1]+duration);
 const replayFrames=offsets[offsets.length-1],frames=introFrames+replayFrames+pages.length*outroFrames;
 const render=frame=>{
  if(frame<introFrames)return intro(c,game,logos);
  let pos=frame-introFrames;
  if(pos<replayFrames){
   let lo=0,hi=plays.length;
   while(lo+1<hi){const mid=(lo+hi)>>1;if(offsets[mid]<=pos)lo=mid;else hi=mid;}
   const index=lo,fraction=(pos-offsets[index])/playDurations[index];
   const field=renderField(index,fraction);
   return play(c,game,logos,plays[index],{canvas:field,progress:fraction,index},at(index+(fraction>=.94?1:0)));
  }
  pos-=replayFrames;
  const pageIndex=Math.min(pages.length-1,Math.floor(pos/outroFrames));
  return finalSlide(c,game,logos,snapshot,pages[pageIndex],pageIndex+1,pages.length);
 };
 const progress={
  render,
  report:(current,total)=>onProgress(100*current/total,current<introFrames?'Encoding intro':current<introFrames+replayFrames?'Encoding replay highlights':'Appending complete final box score')
 };
 onProgress(0,'Preparing '+plays.length+' illustrated plays and '+pages.length+' final box-score pages');
 let blob;
 if(typeof VideoEncoder!=='undefined'&&typeof VideoFrame!=='undefined'){
  try{blob=await encodeWebCodecs(canvas,frames,progress)}
  catch(err){
   if(err?.message?.includes('Game changed'))throw err;
   if(typeof MediaRecorder!=='undefined')blob=await encodeNative(canvas,frames,progress);
   else throw err;
  }
 }else blob=await encodeNative(canvas,frames,progress);
 if(!blob||blob.size<1024||!blob.type.includes('mp4'))throw Error('The MP4 encoder did not return a valid video.');
 onProgress(100,'MP4 ready');
 return {blob,durationSeconds:frames/FPS,boxScorePages:pages.length,plays:plays.length};
}
global.TSO2SimulationVideo={export:exportVideo,boxPages};
})(typeof window!=='undefined'?window:globalThis);
