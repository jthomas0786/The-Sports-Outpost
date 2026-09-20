import fs from 'node:fs';
import path from 'node:path';

const BASE='https://wtt-web-cms-api-prod.azurewebsites.net';
const OUTPUT=path.resolve('slates/table-tennis-live.json');
const MAX_POINTER_AGE_MS=12*60*60*1000;
const MAX_FUTURE_MS=2*60*60*1000;
const FINAL_CACHE_MS=72*60*60*1000;
const USER_AGENT='ParlayPing/0.9';

function parseWttUtc(value){
  const s=String(value||'').trim();
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(!m)return null;
  const [,mm,dd,yyyy,hh,mi,ss='0']=m;
  const ms=Date.UTC(Number(yyyy),Number(mm)-1,Number(dd),Number(hh),Number(mi),Number(ss));
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function parseSetScore(value){
  const m=String(value||'').match(/(\d+)\s*-\s*(\d+)/);
  return m?[Number(m[1]),Number(m[2])]:[null,null];
}
function isVoidLike(card){
  const text=[card?.overallScores,card?.resultOverallScores,...(card?.competitiors||[]).map(c=>c?.irm)].filter(Boolean).join(' ');
  return /\b(?:WO|W\/O|WALKOVER|RET|RETIRED|DSQ|DISQUALIFIED|DEFAULT|ABD|ABANDONED|CANCELLED|CANCELED)\b/i.test(text);
}
async function getJson(url,{timeoutMs=12000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':USER_AGENT},signal:controller.signal});
    if(!r.ok)throw new Error(`WTT request failed ${r.status}: ${url}`);
    return await r.json();
  }finally{clearTimeout(timer);}
}
function loadPrevious(){
  try{return JSON.parse(fs.readFileSync(OUTPUT,'utf8'));}catch{return {matches:{}};}
}
function cleanCompetitor(c){
  const player=Array.isArray(c?.players)&&c.players.length===1?c.players[0]:null;
  const name=String(player?.playerName||c?.competitiorName||'').trim();
  return name?{id:String(player?.playerId||c?.competitiorId||''),name,org:player?.playerOrgCode||c?.competitiorOrg||null,type:c?.competitorType||null}:null;
}
function normalizeCard(pointer,card,nowMs){
  if(!card||!Array.isArray(card.competitiors)||card.competitiors.length!==2)return {skip:'not-two-competitors'};
  if(!/singles/i.test(String(pointer?.subEventType||card?.subEventName||'')))return {skip:'not-singles'};
  const players=card.competitiors.map(cleanCompetitor);
  if(players.some(p=>!p))return {skip:'competitor-name-missing'};
  const startTime=parseWttUtc(card?.matchDateTime?.startDateUTC||card?.matchStartTimeUTC);
  if(!startTime)return {skip:'start-time-missing'};
  const startMs=Date.parse(startTime);
  const age=nowMs-startMs;
  if(age>MAX_POINTER_AGE_MS||age<-MAX_FUTURE_MS)return {skip:'stale-or-future-pointer',startTime};
  const resultStatus=String(card?.resultStatus||'').toUpperCase();
  const final=resultStatus==='OFFICIAL';
  const state=final?'post':resultStatus==='LIVE'?'in':'unknown';
  if(state==='unknown')return {skip:'unsupported-status'};
  const voidLike=isVoidLike(card);
  const scoreText=final?(card?.resultOverallScores||card?.overallScores):(card?.overallScores||card?.resultOverallScores);
  const [homeSets,awaySets]=parseSetScore(scoreText);
  const validSets=Number.isFinite(homeSets)&&Number.isFinite(awaySets);
  const winnerId=final&&!voidLike&&validSets&&homeSets!==awaySets?(homeSets>awaySets?players[0].id:players[1].id):null;
  const id=`${pointer.eventId}:${pointer.documentCode}`;
  return {
    match:{
      id,
      eventId:String(pointer.eventId),
      documentCode:String(pointer.documentCode),
      subEventType:pointer.subEventType||card.subEventName||null,
      description:card.subEventDescription||null,
      startTime,
      state,
      final,
      voidLike,
      resultStatus,
      overallScore:scoreText||null,
      currentGameNumber:Number.isFinite(Number(card.currentGameNumber))?Number(card.currentGameNumber):null,
      gameScores:card.gameScores||null,
      bestOf:Number.isFinite(Number(card?.matchConfig?.bestOfXGames))?Number(card.matchConfig.bestOfXGames):null,
      venue:card.venueName||null,
      table:card.tableName||card.tableNumber||null,
      players:[
        {...players[0],setsWon:validSets?homeSets:null,winner:final&&!voidLike&&winnerId?players[0].id===winnerId:null},
        {...players[1],setsWon:validSets?awaySets:null,winner:final&&!voidLike&&winnerId?players[1].id===winnerId:null}
      ],
      winnerId,
      sourceUpdatedAt:new Date(nowMs).toISOString()
    }
  };
}

const nowMs=Date.now();
const previous=loadPrevious();
let pointers=[];
let sourceOk=true;
let sourceError=null;
try{
  const data=await getJson(`${BASE}/api/cms/GetLiveResult`);
  pointers=Array.isArray(data)?data:[];
}catch(error){sourceOk=false;sourceError=String(error?.message||error);}

const currentMatches={};
const skipped={};
let cardsFetched=0;
if(sourceOk){
  const usable=pointers.filter(p=>p?.eventId&&p?.documentCode&&/singles/i.test(String(p?.subEventType||''))).slice(0,40);
  for(let i=0;i<usable.length;i+=5){
    const batch=usable.slice(i,i+5);
    const results=await Promise.all(batch.map(async pointer=>{
      try{
        const event=encodeURIComponent(pointer.eventId);
        const doc=encodeURIComponent(pointer.documentCode);
        const card=await getJson(`${BASE}/api/cms/GetMatchCardDetails/${event}/${doc}`);
        cardsFetched++;
        return {pointer,normalized:normalizeCard(pointer,card,nowMs)};
      }catch(error){return {pointer,normalized:{skip:'card-request-failed'}};}
    }));
    for(const {normalized} of results){
      if(normalized?.match)currentMatches[normalized.match.id]=normalized.match;
      else if(normalized?.skip)skipped[normalized.skip]=(skipped[normalized.skip]||0)+1;
    }
  }
}

// Keep recent official finals briefly so slips can settle after WTT removes them from its live pointer list.
for(const [id,match] of Object.entries(previous?.matches||{})){
  if(currentMatches[id]||!match?.final)continue;
  const start=Date.parse(match.startTime||'');
  if(Number.isFinite(start)&&nowMs-start<=FINAL_CACHE_MS&&nowMs>=start)currentMatches[id]=match;
}

const matches=Object.values(currentMatches);
const snapshot={
  schemaVersion:1,
  source:'world-table-tennis-official',
  sport:'TABLE_TENNIS',
  generatedAt:new Date(nowMs).toISOString(),
  meta:{
    sourceOk,
    sourceError,
    pointerCount:pointers.length,
    cardsFetched,
    matchCount:matches.length,
    liveCount:matches.filter(m=>m.state==='in').length,
    finalCount:matches.filter(m=>m.final).length,
    voidLikeCount:matches.filter(m=>m.voidLike).length,
    skipped,
    freshnessHours:MAX_POINTER_AGE_MS/3600000,
    finalCacheHours:FINAL_CACHE_MS/3600000,
    note:'Only fresh official WTT singles match cards are accepted. Stale live pointers and void-like finals fail closed.'
  },
  matches:Object.fromEntries(matches.map(m=>[m.id,m]))
};

fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
fs.writeFileSync(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
console.log(`Table Tennis live/final: ${matches.length} accepted (${snapshot.meta.liveCount} live, ${snapshot.meta.finalCount} final); pointers=${pointers.length}; skipped=${JSON.stringify(skipped)}`);
