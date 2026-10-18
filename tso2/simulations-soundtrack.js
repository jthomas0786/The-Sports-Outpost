/* Original upbeat instrumental bed for exported TSO broadcasts.
 * All PCM is synthesized in-browser: no external song, streaming, licensing,
 * or autoplay dependency. Playback is embedded inside the exported MP4.
 */
(function(global){
 'use strict';
 const sampleRate=48000,numberOfChannels=2,bpm=124;
 const beatSeconds=60/bpm;
 const progression=[
  {bass:43,notes:[55,59,62,67]}, // G
  {bass:38,notes:[54,57,62,66]}, // D
  {bass:40,notes:[52,55,59,64]}, // Em
  {bass:36,notes:[52,55,60,64]}  // C
 ];
 const frequency=Array.from({length:90},(_,midi)=>440*Math.pow(2,(midi-69)/12));
 const tau=2*Math.PI;
 function noise(seed){
  let h=Math.imul(seed^0x9e3779b9,2246822519);
  h=Math.imul(h^(h>>>13),3266489917);
  return ((h^(h>>>16))>>>0)/2147483648-1;
 }
 // Output f32-planar stereo samples, suitable for AudioData and AudioBuffer.
 function render(start,count,total,rate=sampleRate){
  const out=new Float32Array(count*numberOfChannels),duration=total/rate;
  for(let i=0;i<count;i++){
   const index=start+i,t=index/rate,beat=t/beatSeconds;
   const beatIndex=Math.floor(beat),beatTime=t-beatIndex*beatSeconds;
   const eighthIndex=Math.floor(beat*2),eighthTime=t-eighthIndex*beatSeconds/2;
   const chord=progression[Math.floor(beatIndex/4)%progression.length];
   const note=chord.notes[eighthIndex%chord.notes.length]+12;
   const rootHz=frequency[chord.bass],noteHz=frequency[note];
   const kick=Math.sin(tau*(82*beatTime-55*beatTime*beatTime))*Math.exp(-21*beatTime);
   const snare=(beatIndex%4===1||beatIndex%4===3)?
    noise(index)*Math.exp(-27*beatTime):0;
   const hat=noise(index*3+47)*Math.exp(-62*eighthTime);
   const bass=Math.sin(tau*rootHz*beatTime)*Math.exp(-3.1*beatTime)
    +.21*Math.sin(tau*2*rootHz*beatTime)*Math.exp(-5*beatTime);
   const arp=(Math.sin(tau*noteHz*eighthTime)+.18*Math.sin(tau*2*noteHz*eighthTime))*
    Math.exp(-8.5*eighthTime);
   const pad=(Math.sin(tau*frequency[chord.notes[0]]*t)+
    Math.sin(tau*frequency[chord.notes[1]]*t)+
    Math.sin(tau*frequency[chord.notes[2]]*t))/3;
   const fade=Math.min(1,t/1.0,Math.max(0,(duration-t)/1.4));
   const base=(.19*kick+.082*snare+.046*hat+.155*bass+.105*arp+.058*pad)*fade;
   const stereo=.008*Math.sin(tau*(frequency[chord.notes[3]]*.5)*t)*fade;
   out[i]=Math.max(-1,Math.min(1,base-stereo));
   out[count+i]=Math.max(-1,Math.min(1,base+stereo));
  }
  return out;
 }
 global.TSO2SimSoundtrack={sampleRate,numberOfChannels,bpm,render};
})(typeof window!=='undefined'?window:globalThis);
