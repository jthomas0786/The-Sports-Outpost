const STYLE_ID='tso-mlb-playstage-concept-v915-style';
const ROOT='.tso-mlb-playstage-v901';
const FIELD_SRC='./field-bg.jpg';
const FALLBACK_ASPECT='1536 / 1024';
const DESIGN_WIDTH=1440;
let installed=false,observer=null,raf=0;
const scaleWatchers=new WeakMap();

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* v915 uses the user-approved field-bg.jpg as the only stadium/field surface.
   The image is never cropped, filtered, transformed, or visually reconstructed. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-sky,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-lights,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-wall,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grass,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-infield,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-infield-grass,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-mound,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-foul,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-base,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-home,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps907-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps909-scene,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps908-atmosphere,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps908-foreground,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-fieldfx,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-lens,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps911-homeglow,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-home-dirt,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-box,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps912-plate,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps907-ump{display:none!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{min-height:0!important;background:#020914!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:${FALLBACK_ASPECT}!important;
  overflow:hidden!important;background:#020914!important;isolation:isolate!important;perspective:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:before,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage:after{display:none!important;content:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps914-field{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  object-fit:contain!important;object-position:center center!important;display:block!important;
  z-index:1!important;pointer-events:none!important;user-select:none!important;
  filter:none!important;transform:none!important;image-rendering:auto!important;
}

/* Every DOM actor is invisible at rest. Role classes such as ps-runner never
   make an actor visible by themselves; only short-lived animation-state classes do. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-pitcher,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner{
  opacity:0!important;pointer-events:none!important;transform:translate(-50%,-91%)!important;
  transform-origin:50% 100%!important;
  transition:left .30s cubic-bezier(.2,.72,.2,1),top .30s cubic-bezier(.2,.72,.2,1),opacity .08s linear!important;
  filter:drop-shadow(0 4px 3px rgba(0,0,0,.48))!important;z-index:42!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-windup,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-throwing,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-swing,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-running,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catching,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-tracking,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-grounder,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-turn,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-catcher-throw,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-slide,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-tag,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps905-rounding,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps906-transfer{opacity:1!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi>.ps905-rig,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi>.ps907-backrig{
  width:100%!important;height:100%!important;
  filter:saturate(1.04) contrast(1.03) drop-shadow(0 1px 1px rgba(0,0,0,.3))!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter{width:58px!important;height:82px!important;z-index:50!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-catcher{width:50px!important;height:70px!important;z-index:48!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-pitcher{width:47px!important;height:68px!important;z-index:45!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="1B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="3B"]{width:39px!important;height:56px!important;z-index:44!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="2B"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="SS"]{width:36px!important;height:52px!important;z-index:43!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="LF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="CF"],
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi[data-pos="RF"]{width:25px!important;height:36px!important;z-index:42!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-runner{width:40px!important;height:58px!important;z-index:47!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{z-index:96!important;top:10px!important;left:10px!important;max-width:min(370px,50%)!important;background:rgba(3,16,34,.88)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{z-index:96!important;top:10px!important;right:10px!important;background:rgba(3,16,34,.88)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{z-index:97!important;bottom:10px!important;width:min(620px,72%)!important;padding:8px 14px!important;background:rgba(2,13,29,.91)!important;backdrop-filter:blur(7px)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{z-index:98!important;bottom:1px!important;opacity:.62!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-ball,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-balltrail{z-index:99!important}

/* v915 proportional desktop/mobile shell */
html[data-sport="mlb"] .ps915-scale-frame{
  position:relative!important;width:100%!important;max-width:100%!important;
  min-height:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
  width:${DESIGN_WIDTH}px!important;min-width:${DESIGN_WIDTH}px!important;max-width:${DESIGN_WIDTH}px!important;
  transform-origin:0 0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{
  min-height:72px!important;grid-template-columns:minmax(100px,.55fr) minmax(410px,1.45fr) minmax(280px,.9fr)!important;
  gap:12px!important;padding:9px 14px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  grid-template-columns:205px minmax(0,1fr) 205px!important;
  min-height:0!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  min-width:0!important;width:auto!important;padding:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  min-width:0!important;width:auto!important;height:auto!important;align-self:start!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  width:100%!important;max-width:none!important;margin:0!important;
}

/* v915 desktop-parity reset: core mobile rules may never reflow this composition. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{border-radius:16px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  display:grid!important;flex-direction:initial!important;
  grid-template-columns:205px minmax(0,1fr) 205px!important;
  min-height:0!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{order:0!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left{
  display:block!important;grid-template-columns:none!important;gap:0!important;
  border-right:1px solid #18395e!important;border-top:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  display:block!important;border-left:1px solid #18395e!important;border-top:0!important;padding-bottom:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  display:block!important;position:relative!important;min-width:0!important;width:auto!important;height:auto!important;
  align-self:start!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  position:relative!important;width:100%!important;height:auto!important;min-height:0!important;
  max-width:none!important;margin:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live{
  position:static!important;margin:0!important;justify-self:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{
  margin-top:0!important;grid-template-columns:1fr auto 82px auto 1fr!important;
  gap:12px!important;padding:8px 14px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{gap:10px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:44px!important;height:44px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:21px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:38px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{
  grid-template-columns:1fr 1fr!important;gap:12px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{
  padding-left:14px!important;border-left:1px solid #193657!important;border-top:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-player{
  grid-template-columns:82px 1fr!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-headshot{height:94px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{
  grid-template-columns:50px minmax(0,1fr)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:58px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom{
  grid-template-columns:minmax(480px,1.7fr) 170px 150px 130px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-linescore{overflow:visible!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-head,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-row{min-width:0!important}

/* At Bat / Pitching are deliberately compact so the approved field dominates. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
  padding:6px!important;margin-bottom:6px!important;border-radius:9px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{
  gap:5px!important;font-size:8px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{
  width:16px!important;height:16px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{
  grid-template-columns:50px minmax(0,1fr)!important;gap:7px!important;margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{
  height:58px!important;border-radius:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{
  font-size:15px!important;line-height:1!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta{
  margin-top:3px!important;font-size:8px!important;line-height:1.25!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{
  margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat{
  padding-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat b{
  font-size:13px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat span{
  margin-top:3px!important;font-size:7px!important;
}

/* On Deck is only a small label + player name. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
  display:flex!important;align-items:center!important;gap:7px!important;
  padding:6px 8px!important;margin-bottom:6px!important;min-height:30px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{
  flex:0 0 auto!important;font-size:7px!important;gap:0!important;white-space:nowrap!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title img,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-headshot,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .meta,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-statrow{
  display:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player{
  display:block!important;min-width:0!important;margin:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{
  margin:0!important;font-size:13px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}


/* v915 overlay HUD refresh */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  display:grid!important;grid-template-columns:minmax(0,1fr) 205px!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  grid-column:1!important;position:relative!important;min-width:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  grid-column:2!important;position:relative!important;min-width:0!important;width:auto!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
  position:absolute!important;top:12px!important;width:232px!important;z-index:94!important;margin:0!important;box-sizing:border-box!important;
  padding:7px!important;border-radius:11px!important;border:1px solid rgba(118,187,255,.42)!important;
  background:linear-gradient(180deg,rgba(7,25,49,.76),rgba(3,13,29,.66))!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.18)!important;backdrop-filter:blur(16px) saturate(1.18)!important;
  box-shadow:0 10px 28px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.07)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-atbat-card{left:12px!important;right:auto!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-pitcher-card{right:12px!important;left:auto!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{font-size:9px!important;color:#c9def6!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{width:17px!important;height:17px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{grid-template-columns:46px minmax(0,1fr)!important;gap:7px!important;margin-top:5px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:54px!important;border-radius:7px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{font-size:16px!important;line-height:1.02!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta{font-size:8px!important;line-height:1.22!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{margin-top:5px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat{padding-top:4px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat b{font-size:13px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat span{font-size:7px!important;margin-top:2px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
  position:absolute!important;left:12px!important;top:144px!important;width:232px!important;z-index:95!important;margin:0!important;box-sizing:border-box!important;
  min-height:28px!important;padding:6px 8px!important;border:1px solid rgba(118,187,255,.34)!important;border-radius:9px!important;
  background:rgba(3,16,34,.64)!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;
  box-shadow:0 8px 22px rgba(0,0,0,.26)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{font-size:7px!important;color:#a9c8eb!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{font-size:13px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{
  position:absolute!important;left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important;box-sizing:border-box!important;
  z-index:96!important;min-width:320px!important;border:1px solid rgba(106,178,246,.42)!important;
  background:rgba(3,16,34,.70)!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;
  box-shadow:0 9px 26px rgba(0,0,0,.28)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric{padding:8px 12px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:8px!important;white-space:nowrap!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric b{font-size:16px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{
  position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:18px!important;transform:translateX(-50%)!important;
  z-index:97!important;width:max-content!important;max-width:min(700px,74%)!important;margin:0!important;padding:9px 14px!important;
  align-items:center!important;border:1px solid rgba(90,175,255,.50)!important;background:rgba(3,17,36,.76)!important;
  -webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;box-shadow:0 10px 28px rgba(0,0,0,.34)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner .ball{font-size:20px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner b{font-size:18px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner span{font-size:10px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{bottom:2px!important;opacity:.42!important;font-size:6px!important;padding:3px 6px!important}

/* Phones keep the desktop composition, but render it responsively instead of shrinking 1440px to ~25%. */
@media(max-width:720px){
  html[data-sport="mlb"] .ps915-scale-frame{height:auto!important;overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
    width:100%!important;min-width:0!important;max-width:none!important;transform:none!important;margin-left:0!important;border-radius:10px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{
    min-height:50px!important;grid-template-columns:46px minmax(0,1fr) 78px!important;gap:4px!important;padding:5px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live{gap:3px!important;padding:5px!important;border-radius:6px!important;font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live i{width:5px!important;height:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{grid-template-columns:1fr auto 40px auto 1fr!important;gap:3px!important;padding:4px 5px!important;border-radius:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{gap:3px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:20px!important;height:20px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team small{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:17px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-inning{font-size:7px!important;line-height:1.15!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bases-mini{transform:scale(.64)!important;transform-origin:center!important;margin:-2px auto!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{display:block!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block{min-height:0!important;gap:4px!important;padding-left:5px!important;border-left:1px solid #193657!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-icon{font-size:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather b{font-size:9px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather span{font-size:6.5px!important;line-height:1.15!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{grid-template-columns:minmax(0,1fr) 96px!important;min-height:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{display:block!important;padding:3px!important;border-left:1px solid #18395e!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right-tabs{grid-template-columns:repeat(2,1fr)!important;gap:2px!important;margin-bottom:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right-tabs button{min-height:22px!important;padding:3px 1px!important;font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item{gap:3px!important;padding:5px 2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item b{font-size:9px!important;line-height:1.05!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item p{font-size:7.5px!important;line-height:1.2!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item small{font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
    top:4px!important;width:26%!important;min-width:0!important;padding:4px!important;border-radius:7px!important;box-sizing:border-box!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-atbat-card{left:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-pitcher-card{right:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{font-size:7px!important;gap:2px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{width:11px!important;height:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{grid-template-columns:26px minmax(0,1fr)!important;gap:3px!important;margin-top:3px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:31px!important;border-radius:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{font-size:10.5px!important;line-height:1.02!important;overflow-wrap:anywhere!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
    left:4px!important;top:64px!important;width:26%!important;min-height:20px!important;padding:4px!important;gap:3px!important;border-radius:6px!important;box-sizing:border-box!important;overflow:hidden!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{font-size:9.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{
    left:50%!important;right:auto!important;top:4px!important;width:42%!important;min-width:0!important;transform:translateX(-50%)!important;border-radius:6px!important;box-sizing:border-box!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric{padding:4px 1px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:7px!important;line-height:1!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric b{font-size:9.5px!important;line-height:1!important;margin-top:3px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{
    left:50%!important;bottom:6px!important;width:auto!important;max-width:84%!important;padding:5px 7px!important;gap:5px!important;border-radius:7px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner .ball{font-size:12px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner b{font-size:11.5px!important;line-height:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner span{font-size:8.5px!important;line-height:1.15!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom{grid-template-columns:minmax(0,1fr) 52px 52px 42px!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-linescore{min-width:0!important;font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-head,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-row{grid-template-columns:38px repeat(9,minmax(0,1fr)) repeat(3,minmax(0,1fr))!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-team img{width:11px!important;height:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom-box{padding:4px 2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom-box label{font-size:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-count{font-size:12px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-baseboard{transform:scale(.65)!important;transform-origin:center!important}
}

@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}
`;
  document.head.appendChild(s);
}

function applyNativeAspect(stage,img){
  if(!stage||!img||!img.naturalWidth||!img.naturalHeight) return;
  stage.style.setProperty('aspect-ratio',`${img.naturalWidth} / ${img.naturalHeight}`,'important');
}
function ensureApprovedField(stage){
  if(!stage) return;
  let img=stage.querySelector(':scope>.ps914-field');
  if(!img){
    stage.insertAdjacentHTML('afterbegin',`<img class="ps914-field" src="${FIELD_SRC}" alt="" aria-hidden="true" decoding="async" draggable="false">`);
    img=stage.querySelector(':scope>.ps914-field');
  }else if(img.getAttribute('src')!==FIELD_SRC){
    img.setAttribute('src',FIELD_SRC);
  }
  if(img.complete&&img.naturalWidth) applyNativeAspect(stage,img);
  else img.addEventListener('load',()=>applyNativeAspect(stage,img),{once:true});
}
function markInfoCards(root){
  root.querySelectorAll('.ps-card').forEach(card=>{
    const title=(card.querySelector('.ps-card-title')?.textContent||'').trim().toLowerCase();
    card.classList.toggle('v915-atbat-card',title.includes('at bat'));
    card.classList.toggle('v915-pitcher-card',title.includes('pitching'));
    card.classList.toggle('v915-ondeck-card',title.includes('on deck'));
    card.classList.toggle('v915-primary-card',title.includes('at bat')||title.includes('pitching'));
  });
}
function arrangeStageOverlays(root){
  const stage=root?.querySelector('.ps-stage');
  if(!stage) return;
  for(const sel of ['.v915-atbat-card','.v915-pitcher-card','.v915-ondeck-card','.ps-metrics','.ps-play-banner']){
    const el=root.querySelector(sel);
    if(el&&el.parentElement!==stage) stage.appendChild(el);
  }
  const metricLabels=[...root.querySelectorAll('.ps-metric span')];
  if(metricLabels[0]) metricLabels[0].textContent='EXIT VELO';
  if(metricLabels[1]) metricLabels[1].textContent='LAUNCH';
  if(metricLabels[2]) metricLabels[2].textContent='DISTANCE';
  root.querySelectorAll('.ps-callout').forEach(el=>el.setAttribute('aria-hidden','true'));
}
function applyGamecastScale(root){
  const frame=root?.parentElement;
  if(!root||!frame) return;
  frame.classList.add('ps915-scale-frame');
  const available=Math.max(1,frame.clientWidth||DESIGN_WIDTH);
  const responsive=available<=720||window.matchMedia?.('(max-width:720px)')?.matches;
  if(responsive){
    root.style.transform='none';
    root.style.marginLeft='0px';
    root.dataset.ps915Scale='1.0000';
    frame.style.height='auto';
    return;
  }
  const scale=Math.min(1,available/DESIGN_WIDTH);
  const rendered=DESIGN_WIDTH*scale;
  const gap=Math.max(0,(available-rendered)/2);
  root.style.transform=`scale(${scale})`;
  root.style.marginLeft=`${gap/scale}px`;
  root.dataset.ps915Scale=scale.toFixed(4);
  frame.style.height=`${Math.ceil(root.offsetHeight*scale)}px`;
}
function wireScale(root){
  if(!scaleWatchers.has(root)&&typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(()=>requestAnimationFrame(()=>applyGamecastScale(root)));
    ro.observe(root);
    scaleWatchers.set(root,ro);
  }
  requestAnimationFrame(()=>applyGamecastScale(root));
}

function enhance(root){
  if(!root) return;
  root.classList.add('tso-mlb-concept-v915');
  root.dataset.approvedConcept='v915';
  ensureApprovedField(root.querySelector('.ps-stage'));
  markInfoCards(root);
  arrangeStageOverlays(root);
  wireScale(root);
}
function scan(){
  raf=0;
  if(document.documentElement.getAttribute('data-sport')!=='mlb') return;
  document.querySelectorAll(ROOT).forEach(enhance);
}
function queue(){if(!raf) raf=requestAnimationFrame(scan);}
export function installMlbPlaystageConceptV915(){
  ensureStyles();
  if(installed){queue();return;}
  installed=true;
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-player-id']});
  window.addEventListener('hashchange',queue);
  window.addEventListener('resize',queue,{passive:true});
  queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V915_TEST__={STYLE_ID,ROOT,FIELD_SRC,FALLBACK_ASPECT,DESIGN_WIDTH};
