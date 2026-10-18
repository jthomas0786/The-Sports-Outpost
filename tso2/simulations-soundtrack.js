/* TSO 2.0 MP4 music: user-approved FSCM Productions - Epic Battle.
 * CC BY 4.0: credit FSCM Productions in social video descriptions.
 * The exact MP3 is served locally. Never substitute synthesized audio.
 */
(function(global){
'use strict';
const url='./assets/music/fscm-productions-epic-battle.mp3';
let audio=null,loading=null;
const soundtrack={
 sampleRate:48000,numberOfChannels:2,style:'FSCM Productions - Epic Battle',
 attribution:'Epic Battle by FSCM Productions | https://fscmproductions.bandcamp.com\nRoyalty Free Music by https://www.free-stock-music.com',
 async load(context){
  if(!context||typeof context.decodeAudioData!=='function')
   throw Error('Audio decoding is unavailable in this browser.');
  if(audio&&audio.sampleRate===context.sampleRate)return soundtrack;
  if(loading)return loading;
  loading=(async()=>{
   const response=await fetch(url,{cache:'force-cache'});
   if(!response.ok)throw Error('Epic Battle MP3 missing from this deployment (HTTP '+response.status+').');
   const encoded=await response.arrayBuffer();
   if(encoded.byteLength<1000000)throw Error('Epic Battle MP3 is incomplete.');
   const decoded=await context.decodeAudioData(encoded);
   if(decoded.length<decoded.sampleRate*175)throw Error('Epic Battle MP3 is incomplete or unreadable.');
   audio=decoded;soundtrack.sampleRate=decoded.sampleRate;
   return soundtrack;
  })();
  try{return await loading}finally{loading=null}
 },
 render(start,count,total,rate=soundtrack.sampleRate){
  if(!audio)throw Error('Epic Battle music has not been loaded.');
  if(rate!==audio.sampleRate)throw Error('MP4 audio sample rate mismatch.');
  const left=audio.getChannelData(0);
  const right=audio.getChannelData(Math.min(audio.numberOfChannels-1,1));
  const overlap=Math.min(Math.round(rate*1.5),Math.floor(left.length/10));
  const period=left.length-overlap;
  const result=new Float32Array(count*2);
  for(let i=0;i<count;i++){
   const index=start+i,p=index%period;
   let l=left[p],r=right[p];
   if(index>=period&&p<overlap){
    const fraction=(p+.5)/overlap;
    const a=Math.cos(fraction*Math.PI/2);
    const b=Math.sin(fraction*Math.PI/2);
    l=left[period+p]*a+l*b;
    r=right[period+p]*a+r*b;
   }
   const fadeIn=Math.min(1,index/(rate*.55));
   const fadeOut=Math.min(1,Math.max(0,(total-index)/(rate*1.8)));
   const volume=.55*Math.min(fadeIn,fadeOut);
   result[i]=Math.max(-1,Math.min(1,l*volume));
   result[count+i]=Math.max(-1,Math.min(1,r*volume));
  }
  return result;
 }
};
global.TSO2SimSoundtrack=soundtrack;
})(typeof window!=='undefined'?window:globalThis);
