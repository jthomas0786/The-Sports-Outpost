/* TSO Simulations: original cinematic spy-thriller instrumental.
 * Driving minor-key strings, ticking percussion, low bass and brass accents.
 * Authored for TSO, not a reproduction of any film or copyrighted theme.
 * Synthesized offline in the browser and embedded in exported MP4 video.
 */
(function(global){
 'use strict';
 const sampleRate=48000,numberOfChannels=2,bpm=136;
 const tau=Math.PI*2,beatSeconds=60/bpm;
 // Original 4/4 thriller pulse: D minor > Bb > G minor > A.
 // This intentionally does NOT recreate any existing film's melody or meter.
 const progression=[
  {root:38,third:41,fifth:45}, // D minor
  {root:34,third:38,fifth:41}, // Bb
  {root:31,third:34,fifth:38}, // G minor
  {root:33,third:37,fifth:40}  // A, for suspenseful resolution
 ];
 const hz=Array.from({length:96},(_,midi)=>440*Math.pow(2,(midi-69)/12));
 const ostinato=[24,31,27,31,24,29,31,27];
 const brassAccents=[1,0,0,0,0,1,0,1];
 function noise(seed){
  let h=Math.imul(seed^0x9e3779b9,2246822519);
  h=Math.imul(h^(h>>>13),3266489917);
  return ((h^(h>>>16))>>>0)/2147483648-1;
 }
 // Deterministic stereo f32-planar PCM for WebCodecs AAC and native MP4.
 // Samples are independent of chunk boundaries and need no external assets.
 function render(start,count,total,rate=sampleRate){
  const out=new Float32Array(count*numberOfChannels);
  const duration=total/rate;
  for(let i=0;i<count;i++){
   const index=start+i,t=index/rate,beat=t/beatSeconds;
   const beatIndex=Math.floor(beat),beatPhase=t-beatIndex*beatSeconds;
   const eighthIndex=Math.floor(beat*2),eighthPhase=t-eighthIndex*beatSeconds/2;
   const barIndex=Math.floor(beatIndex/4),barPhase=t-barIndex*beatSeconds*4;
   const beatInBar=beatIndex%4,eighthInBar=eighthIndex%8;
   const harmony=progression[Math.floor(beat/8)%progression.length];
   const root=hz[harmony.root],lowRoot=hz[harmony.root-12];
   const noteHz=hz[harmony.root+ostinato[eighthInBar]];
   const bassEnv=Math.exp(-5.6*beatPhase);
   // Driving low, dry drums, double-time metallic ticks and a tom pickup.
   const kickStrength=beatInBar===0?1:beatInBar===2?.86:beatInBar===3?.32:0;
   const kick=kickStrength*Math.sin(tau*(91*beatPhase-80*beatPhase*beatPhase))*
    Math.exp(-19*beatPhase);
   const snare=(beatInBar===1||beatInBar===3)?
    noise(index*3+197)*Math.exp(-31*beatPhase):0;
   const tick=noise(index*11+59)*Math.exp(-90*eighthPhase)*
    (eighthInBar%2?.85:1);
   const tomPickup=(barIndex%4===3&&beatInBar===3)?
    Math.sin(tau*(165*eighthPhase-55*eighthPhase*eighthPhase))*
    Math.exp(-12*eighthPhase):0;
   // Short stabbing low strings, with a relentless eighth-note ostinato.
   const stringEnv=Math.exp(-9.2*eighthPhase);
   const string=(Math.sin(tau*noteHz*eighthPhase)+
    .29*Math.sin(tau*noteHz*2*eighthPhase)+
    .11*Math.sin(tau*noteHz*3*eighthPhase))*stringEnv;
   // Dark pulsed bass, plus sustained orchestral-style tension underneath.
   const bass=(Math.sin(tau*lowRoot*beatPhase)+
    .35*Math.sin(tau*root*beatPhase))*bassEnv;
   const tension=(Math.sin(tau*hz[harmony.root+12]*t)+
    .65*Math.sin(tau*hz[harmony.third+12]*t)+
    .45*Math.sin(tau*hz[harmony.fifth+12]*t))/2.1;
   // Punchy brass-like stabs on an ORIGINAL syncopated phrase.
   const accent=brassAccents[eighthInBar];
   const stab=(Math.sin(tau*hz[harmony.fifth+12]*eighthPhase)+
    .32*Math.sin(tau*hz[harmony.fifth+12]*2*eighthPhase))*
    Math.exp(-7.5*eighthPhase)*accent;
   // Rising static and a brief impact before each new eight-bar sequence.
   const beatInPhrase=beat%32;
   const rise=beatInPhrase>28?(beatInPhrase-28)/4:0;
   const riser=noise(index*13+131)*rise*rise;
   const impact=(barIndex%8===0)?
    noise(index*17+11)*Math.exp(-5.5*barPhase):0;
   const fade=Math.min(1,t/.85,Math.max(0,(duration-t)/1.35));
   const mix=(.245*kick+.09*snare+.041*tick+.048*tomPickup+
    .16*string+.205*bass+.060*tension+.125*stab+.038*riser+
    .050*impact)*fade;
   // Widen strings/brass subtly without separate oscillator state.
   const width=.017*string+.011*stab+.006*Math.sin(tau*root*t)*fade;
   out[i]=Math.max(-.96,Math.min(.96,mix-width));
   out[count+i]=Math.max(-.96,Math.min(.96,mix+width));
  }
  return out;
 }
 global.TSO2SimSoundtrack={sampleRate,numberOfChannels,bpm,style:'original-cinematic-spy-thriller',render};
})(typeof window!=='undefined'?window:globalThis);
