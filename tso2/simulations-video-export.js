/* TSO 2.0 simulated NFL broadcast exporter.
 * Encodes an MP4 of the same verified representative sampled world, with a
 * complete play-ledger-derived box score appended. NOT actual game footage.
 * Browser-only, no upload, no credentials and no assumed video capability.
 */
(function(global){
'use strict';
const FPS=24,W=720,H=1280;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clean=v=>String(v??'');
const abbr=team=>String(team?.abbr||'NFL').toUpperCase();
const logoUrl=team=>{
 const code=abbr(team)==='LA'?'lar':abbr(team)==='WSH'?'wsh':abbr(team).toLowerCase();
 return '/api/tso2-nfl-logo?team='+encodeURIComponent(abbr(team));
};
function logoImage(url){
 return new Promise(resolve=>{
  const img=new Image();let done=false;
  const end=valid=>{if(done)return;done=true;clearTimeout(timer);resolve(valid?img:null)};
  const timer=setTimeout(()=>end(false),5500);
  img.crossOrigin='anonymous';
  img.onload=()=>end(img.naturalWidth>0);
  img.onerror=()=>end(false);
  img.src=url;
 });
}
function roundRect(c,x,y,w,h,r,color,border){
 c.beginPath();c.roundRect(x,y,w,h,r);if(color){c.fillStyle=color;c.fill()}
 if(border){c.strokeStyle=border;c.lineWidth=1.7;c.stroke()}
}
function text(c,value,x,y,size=22,color='#fafafa',weight=700,align='left'){
 c.font=weight+' '+size+'px system-ui, -apple-system, sans-serif';c.fillStyle=color;
 c.textAlign=align;c.textBaseline='alphabetic';c.fillText(clean(value),x,y);
}
function wrapped(c,value,x,y,maxWidth,{size=22,lineHeight=30,lines=3,color='#d1d5de',weight=600}={}){
 c.font=weight+' '+size+'px system-ui, sans-serif';
 let line='',count=0;
 for(const word of clean(value).split(/\s+/)){
  const next=line?line+' '+word:word;
  if(c.measureText(next).width<=maxWidth){line=next;continue}
  if(line){text(c,line,x,y+count*lineHeight,size,color,weight);count++;if(count>=lines)return;}
  line=word;
 }
 if(line)text(c,line,x,y+count*lineHeight,size,color,weight);
}
function base(c){
 c.fillStyle='#090d14';c.fillRect(0,0,W,H);
 const g=c.createLinearGradient(0,0,0,420);
 g.addColorStop(0,'#1b1e2a');g.addColorStop(1,'#0a0e15');
 c.fillStyle=g;c.fillRect(0,0,W,440);
 c.fillStyle='#ff541d';c.fillRect(0,0,9,H);
 text(c,'THE SPORTS OUTPOST',W/2,53,24,'#ffce50',950,'center');
 text(c,'50,000-RUN NFL SIMULATION  •  ILLUSTRATIVE REPLAY',W/2,83,13,'#aeb7c6',800,'center');
 c.fillStyle='#ff541d';c.fillRect(38,108,W-76,3);
}
function drawLogo(c,img,cx,cy,name,size=86){
 roundRect(c,cx-size/2,cy-size/2,size,size,17,'#171f2b','#374657');
 if(img){try{c.drawImage(img,cx-size*.43,cy-size*.43,size*.86,size*.86)}catch(_){text(c,name,cx,cy+9,25,'#fff',900,'center')}}
 else text(c,name,cx,cy+9,25,'#fff',900,'center');
}
function header(c,game,logos,score,period='SIMULATED',clock=''){
 const y=157;drawLogo(c,logos[0],83,y,abbr(game.away),78);
 drawLogo(c,logos[1],W-83,y,abbr(game.home),78);
 text(c,abbr(game.away),149,y-14,25,'#fff',900);
 text(c,abbr(game.home),W-149,y-14,25,'#fff',900,'right');
 text(c,score[0],262,y+17,60,'#fff',950,'center');
 text(c,score[1],W-262,y+17,60,'#fff',950,'center');
 text(c,'–',W/2,y+11,43,'#ffcb44',800,'center');
 text(c,period+' '+clock,W/2,y+50,17,'#ffce50',850,'center');
 roundRect(c,34,244,W-68,38,7,'#18202c','#303848');
 text(c,'TSO MODEL • NOT AN ACTUAL GAME RECORDING',W/2,270,14,'#d1d8e2',750,'center');
}
function footer(c,page='SIMULATED SCENARIO'){
 c.fillStyle='#151d29';c.fillRect(0,H-85,W,85);
 c.fillStyle='#ff541d';c.fillRect(0,H-85,W,3);
 text(c,page,W/2,H-46,16,'#ffce50',850,'center');
 text(c,'thesportsoutpost.com  •  simulated, not official game statistics',W/2,H-18,12,'#aab7c4',600,'center');
}
function intro(c,game,logos){
 base(c);header(c,game,logos,['0','0'],'PREVIEW');
 roundRect(c,32,324,W-64,515,22,'#131c27','#374356');
 text(c,'ILLUSTRATIVE',W/2,418,23,'#ffce50',900,'center');
 text(c,'SIMULATED GAME REPLAY',W/2,462,30,'#fff',950,'center');
 text(c,abbr(game.away)+'   @   '+abbr(game.home),W/2,561,44,'#fff',950,'center');
 wrapped(c,'The final score comes from one sampled world in the 50,000-run TSO model. Play paths are reconstructed illustrations.',74,651,W-148,{size:20,lineHeight:35,lines:5,color:'#d3d9e3'});
 roundRect(c,83,882,W-166,84,15,'#53291c','#fd632d');
 text(c,'SIMULATION HIGHLIGHTS + FULL BOX SCORE',W/2,932,20,'#ffe8c8',900,'center');
 footer(c,'TSO SIMULATIONS  •  2026 NFL');
}
function play(c,game,logos,event,field){
 base(c);
 const progress=field.progress??0;
 const away=progress>.92?event.scoreAway:event.beforeAway??event.scoreAway;
 const home=progress>.92?event.scoreHome:event.beforeHome??event.scoreHome;
 header(c,game,logos,[away,home],'Q'+event.quarter,event.clock||'');
 roundRect(c,27,318,W-54,365,14,'#102921','#324b45');
 if(field.canvas){c.drawImage(field.canvas,39,332,W-78,326)}
 roundRect(c,29,713,W-58,112,13,'#181f2b','#39495b');
 text(c,'PLAY '+String((event.index??field.index)+1).padStart(3,'0')+'  ·  '+event.kind,47,751,18,'#ffca49',900);
 wrapped(c,event.commentary||'',47,790,W-98,{size:17,lineHeight:23,lines:2,color:'#f4f5f8',weight:750});
 roundRect(c,29,858,W-58,196,13,'#111b28','#364252');
 text(c,abbr(game.away)+' OFFENSE',57,898,18,'#ffce50',900);
 text(c,abbr(game.home)+' OFFENSE',W-57,898,18,'#ffce50',900,'right');
 text(c,'SCORING WORLD · '+String(game.representativeWorld?.sampledIndex??0),W/2,955,17,'#d4dbe6',750,'center');
 wrapped(c,'Score-conditioned replay · movement, gains and play selection are illustrative, not tracked NFL snaps.',58,1000,W-116,{size:17,lineHeight:24,lines:2});
 footer(c,'TSO 50K CORRELATED MONTE CARLO');
}
const val=v=>Number.isFinite(Number(v))?String(Math.round(Number(v))):'—';
function boxPages(game,snapshot){
 const away=abbr(game.away),home=abbr(game.home);
 const a=snapshot.teams[away],b=snapshot.teams[home];
 if(!a||!b)throw Error('Final scenario team totals unavailable.');
 const pages=[{type:'overview',title:'FINAL BOX SCORE',rows:[
  ['STATISTIC',away,home],
  ['FINAL SCORE',val(a.points),val(b.points)],
  ['Q1',val(a.quarter?.[0]),val(b.quarter?.[0])],
  ['Q2',val(a.quarter?.[1]),val(b.quarter?.[1])],
  ['Q3',val(a.quarter?.[2]),val(b.quarter?.[2])],
  ['Q4',val(a.quarter?.[3]),val(b.quarter?.[3])],
  ['TOTAL YARDS',val(a.totalYds),val(b.totalYds)],
  ['PASSING YARDS',val(a.passing),val(b.passing)],
  ['RUSHING YARDS',val(a.rushing),val(b.rushing)],
  ['FIRST DOWNS',val(a.firstDowns),val(b.firstDowns)],
  ['COMP / ATT',a.passComp+'/'+a.passAtt,b.passComp+'/'+b.passAtt],
  ['RUSH ATT',val(a.rushAtt),val(b.rushAtt)],
  ['TURNOVERS',val(a.interceptions),val(b.interceptions)],
  ['SACKS ALLOWED',val(a.sacksAllowed),val(b.sacksAllowed)],
  ['PUNTS',val(a.punts),val(b.punts)],
  ['MADE FIELD GOALS',val(a.fieldGoals),val(b.fieldGoals)]
 ]}];
 for(const team of [away,home]){
  const all=Object.values(snapshot.players?.[team]||{});
  const groups=[
   {name:'PASSING',items:all.filter(x=>x.passAtt||x.sacks).sort((x,y)=>y.passAtt-x.passAtt),format:x=>x.passComp+'/'+x.passAtt+' · '+x.passYds+' YDS · '+x.passTd+' TD · '+x.int+' INT'},
   {name:'RUSHING',items:all.filter(x=>x.carries).sort((x,y)=>y.carries-x.carries),format:x=>x.carries+' ATT · '+x.rushYds+' YDS · '+x.rushTd+' TD'},
   {name:'RECEIVING',items:all.filter(x=>x.targets).sort((x,y)=>y.targets-x.targets),format:x=>x.receptions+'/'+x.targets+' REC/TGT · '+x.recYds+' YDS · '+x.recTd+' TD'}
  ];
  const rows=[];
  for(const group of groups){
   rows.push({section:group.name});
   for(const person of group.items)rows.push({name:person.name||'Unknown',detail:group.format(person)});
  }
  if(!rows.length)rows.push({section:'NO VERIFIED PLAY LEDGER ENTRIES'});
  let batch=[],height=0;
  for(const row of rows){
   const rowHeight=row.section?39:64;
   // Keep the entire player box-score page within the visible video canvas.
   if(batch.length&&height+rowHeight>590){pages.push({type:'players',title:team+' PLAYER BOX SCORE',rows:batch});batch=[];height=0}
   batch.push(row);height+=rowHeight;
  }
  if(batch.length)pages.push({type:'players',title:team+' PLAYER BOX SCORE',rows:batch});
 }
 return pages;
}
function finalSlide(c,game,logos,snapshot,page,pagenum,total){
 base(c);
 const away=abbr(game.away),home=abbr(game.home),a=snapshot.teams[away],b=snapshot.teams[home];
 header(c,game,logos,[a.points,b.points],'FINAL','');
 roundRect(c,27,315,W-54,783,16,'#121b27','#445262');
 text(c,page.title,W/2,372,28,'#ffce50',950,'center');
 text(c,'DERIVED FROM ILLUSTRATIVE PLAY LEDGER',W/2,406,15,'#bdc9d7',750,'center');
 if(page.type==='overview'){
  let y=459;
  for(const [idx,row] of page.rows.entries()){
   roundRect(c,45,y-24,W-90,38,6,idx%2?'#172333':'#1c2838');
   text(c,row[0],59,y,16,idx===0?'#ffca4d':'#f0f2f6',idx===0?900:700);
   text(c,row[1],W-192,y,17,idx===0?'#ffca4d':'#fff',850,'center');
   text(c,row[2],W-95,y,17,idx===0?'#ffca4d':'#fff',850,'center');
   y+=39;
  }
 }else{
  let y=460;
  for(const row of page.rows){
   if(row.section){
    text(c,row.section,52,y,20,'#ffce50',900);y+=39;
   }else{
    wrapped(c,row.name,51,y,W-105,{size:17,lineHeight:20,lines:1,color:'#fff',weight:850});
    y+=27;
    wrapped(c,row.detail,64,y,W-125,{size:16,lineHeight:20,lines:1,color:'#b4c6db',weight:600});
    y+=37;
   }
  }
 }
 text(c,'BOX SCORE PAGE '+pagenum+' / '+total, W/2,1139,17,'#e0e8f1',800,'center');
 footer(c,'SCENARIO STATISTICS · NOT OFFICIAL NFL RESULTS');
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
  const config={codec,width:W,height:H,bitrate:2500000,framerate:fps,
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
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});
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
 const introFrames=FPS*2,playFrames=Math.max(8,Math.round(FPS*.42)),outroFrames=FPS*4;
 const frames=introFrames+plays.length*playFrames+pages.length*outroFrames;
 const render=frame=>{
  if(frame<introFrames)return intro(c,game,logos);
  let pos=frame-introFrames;
  if(pos<plays.length*playFrames){
   const index=Math.floor(pos/playFrames),fraction=(pos%playFrames)/playFrames;
   const field=renderField(index,fraction);
   return play(c,game,logos,plays[index],{canvas:field,progress:fraction,index});
  }
  pos-=plays.length*playFrames;
  const pageIndex=Math.min(pages.length-1,Math.floor(pos/outroFrames));
  return finalSlide(c,game,logos,snapshot,pages[pageIndex],pageIndex+1,pages.length);
 };
 const progress={
  render,
  report:(current,total)=>onProgress(100*current/total,current<introFrames?'Encoding intro':current<introFrames+plays.length*playFrames?'Encoding replay':'Appending complete final box score')
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
