import { mountOrUpdateNflPlaystageV885 as mountBase, renderNflPlaystageV885HTML as renderBase } from './playstage-v885.js?v=88.5';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;

function normalizeGame(game){
  const g=clone(game)||{};
  const live=g.liveScore||{};
  const away=g.away||{};
  const home=g.home||{};

  // v88.5 PlayStage was authored against a flatter demo object. Production
  // Gamecast stores most live fields under g.liveScore. Mirror those fields so
  // the PlayStage always sees the same live state as the scoreboard.
  if(live.period!=null) g.period=live.period;
  if(live.clockMin!=null){
    const total=Math.max(0,Math.round(Number(live.clockMin)*60));
    const mm=Math.floor(total/60), ss=String(total%60).padStart(2,'0');
    g.displayClock=g.displayClock||`${mm}:${ss}`;
    g.clockDisplay=g.clockDisplay||g.displayClock;
  }
  if(live.down!=null) g.down=live.down;
  if(live.distance!=null) g.distance=live.distance;
  if(live.downDistanceText) g.downDistance=live.downDistanceText;

  let possAbbr='';
  if(live.possession==='away') possAbbr=away.abbr||'';
  else if(live.possession==='home') possAbbr=home.abbr||'';
  else possAbbr=g.possession||'';
  if(possAbbr) g.possession=possAbbr;

  if(finite(live.yardFromOwn)!=null){
    g.yardLine=finite(live.yardFromOwn);
    const opp=live.possession==='away'?home.abbr:away.abbr;
    const y=finite(live.yardFromOwn);
    g.fieldPosition = y<=50 ? `${possAbbr} ${Math.round(y)}` : `${opp||''} ${Math.round(100-y)}`.trim();
  }

  g.situation={
    ...(g.situation||{}),
    possession:possAbbr||g.situation?.possession,
    downDistanceText:live.downDistanceText||g.situation?.downDistanceText,
    shortText:g.fieldPosition||g.situation?.shortText,
    yardLine:g.yardLine??g.situation?.yardLine,
    distance:g.distance??g.situation?.distance,
  };

  const last=(Array.isArray(live.plays)&&live.plays.length)?live.plays.at(-1):null;
  const liveText=live.lastPlayText||last?.text||last?.shortText||'';
  if(liveText){
    g.currentPlay={
      ...(g.currentPlay||{}),
      title:g.currentPlay?.title||last?.shortText||last?.type||'Current Play',
      typeText:g.currentPlay?.typeText||last?.type||last?.shortText||'Current Play',
      shortText:g.currentPlay?.shortText||last?.shortText||last?.type||'Current Play',
      description:g.currentPlay?.description||liveText,
      text:g.currentPlay?.text||liveText,
    };
  }

  if(live.currentDrive){
    g.drive={
      ...(g.drive||{}),
      plays:live.currentDrive.playCount??live.currentDrive.plays??g.drive?.plays,
      yards:live.currentDrive.yards??g.drive?.yards,
      time:live.currentDrive.elapsedDisplay||live.currentDrive.time||g.drive?.time,
      result:live.currentDrive.result||g.drive?.result,
    };
  }

  if(live.winProbability){
    let aw=finite(live.winProbability.away), hm=finite(live.winProbability.home);
    if(aw!=null && aw<=1) aw*=100;
    if(hm!=null && hm<=1) hm*=100;
    g.winProb={...(g.winProb||{}),away:aw??g.winProb?.away,home:hm??g.winProb?.home};
  }

  if(Number(live.period)===2 && finite(live.clockMin)!=null && finite(live.clockMin)<=2) g.halftimeState='warming';
  if(/half/i.test(String(g.statusDetail||g.status_detail||''))) g.halftimeState='ready';

  return g;
}

export function renderNflPlaystageV885aHTML(game,opts={}){
  return renderBase(normalizeGame(game),opts);
}

export function mountOrUpdateNflPlaystageV885a(root,game,opts={}){
  return mountBase(root,normalizeGame(game),opts);
}
