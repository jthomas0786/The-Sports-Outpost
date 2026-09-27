#!/usr/bin/env node
/**
 * v89.1 runtime wrapper for scripts/nfl-odds-refresh.mjs.
 *
 * The established weekly refresh pipeline remains the source of truth. This
 * wrapper preserves every sportsbook line returned by ParlayAPI as `alternates`
 * and batches the large NFL props request so the provider's 10,000-row response
 * ceiling cannot silently drop sportsbook/alternate-line coverage.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT=process.cwd();
const sourcePath=path.join(ROOT,'scripts','nfl-odds-refresh.mjs');
const runtimePath=path.join(ROOT,'scripts','.nfl-odds-refresh-v891-runtime.mjs');
const startMarker='function parsePlayerMarket(rows, internalKey) {';
const endMarker='\nfunction blankMarketDiagnostics';
const propsStartMarker='  // /props is one sport-level call.';
const propsEndMarker='  const oddsParams = new URLSearchParams';

const replacement=`function parsePlayerMarket(rows, internalKey) {
  // v89.1: preserve every sportsbook line returned for the market so the
  // player modal and ParlayPing can resolve exact alternate thresholds.
  const source = rows.filter(r => !isNonSportsbook(r));
  if (!source.length) return null;
  if (internalKey === 'atd' || internalKey === 'firstTd') {
    const all = source.map(r => entry(r,'over')).filter(Boolean);
    const b = best(all);
    return b ? {best:b, all} : null;
  }

  const groups = new Map();
  for (const r of source) {
    const line=finite(r.line); if(line==null) continue;
    const key=String(line);
    const rec=groups.get(key)||{line,rows:[]};
    rec.rows.push(r); groups.set(key,rec);
  }
  const alternates=[...groups.values()].map(g=>{
    const overAll=g.rows.map(r=>entry(r,'over')).filter(Boolean);
    const underAll=g.rows.map(r=>entry(r,'under')).filter(Boolean);
    const ov=best(overAll),un=best(underAll);
    return {
      line:g.line,
      over:ov?{best:ov,all:overAll}:null,
      under:un?{best:un,all:underAll}:null,
    };
  }).filter(x=>x.over||x.under).sort((a,b)=>a.line-b.line);

  if(!alternates.length) return null;
  const chosen=chooseLine(source);
  const primary=alternates.find(x=>chosen&&x.line===chosen.line)||alternates[0];
  return {
    line:primary.line,
    over:primary.over,
    under:primary.under,
    alternates,
  };
}`;

const propsReplacement=`  // v89.2 completeness hotfix: a single weekly NFL /props call can exceed
  // ParlayAPI's 10,000-row response ceiling. Split the highest-volume prop
  // families into smaller requests and recursively split any batch that still
  // reaches the cap. This preserves exact FanDuel/DraftKings/etc. alternate
  // thresholds instead of silently losing rows at the provider boundary.
  let propsRequestCount=0;
  let propsResponseCapped=false;
  async function fetchPropMarkets(markets){
    if(!markets.length) return [];
    const propParams=new URLSearchParams({
      markets:markets.join(','),
      bookmakers:SPORTSBOOK_QUERY,
      limit:'10000',
      maxAgeSec:'3600'
    });
    propsRequestCount++;
    const payload=await fetchJson(\`${'${API}'}/sports/${'${SPORT}'}/props?${'${propParams}'}\`);
    const rows=Array.isArray(payload)?payload:[];
    if(rows.length>=10000&&markets.length>1){
      console.warn(\`::warning::NFL /props batch hit 10,000 rows for ${'${markets.join(",")}'}. Splitting the batch for complete coverage.\`);
      const mid=Math.ceil(markets.length/2);
      const left=await fetchPropMarkets(markets.slice(0,mid));
      const right=await fetchPropMarkets(markets.slice(mid));
      return [...left,...right];
    }
    if(rows.length>=10000){
      propsResponseCapped=true;
      console.warn(\`::warning::NFL /props single-market response still hit 10,000 rows for ${'${markets[0]}'}; provider coverage may remain incomplete.\`);
    }
    return rows;
  }

  const preferredPropBatches=[
    ['player_rec_yds','player_rush_yds'],
    ['player_pass_yds','player_receptions'],
    ['player_anytime_td','player_first_td','player_pass_tds','player_pass_completions'],
  ].map(batch=>batch.filter(key=>API_MARKETS.includes(key))).filter(batch=>batch.length);
  const props=[];
  for(const batch of preferredPropBatches) props.push(...await fetchPropMarkets(batch));
`;

async function main(){
  const src=await fs.readFile(sourcePath,'utf8');
  const start=src.indexOf(startMarker);
  const end=src.indexOf(endMarker,start);
  if(start<0||end<0) throw new Error('v89.1 could not locate parsePlayerMarket() patch point');
  let patched=src.slice(0,start)+replacement+src.slice(end);

  const propsStart=patched.indexOf(propsStartMarker);
  const propsEnd=patched.indexOf(propsEndMarker,propsStart);
  if(propsStart<0||propsEnd<0) throw new Error('v89.2 could not locate NFL /props fetch block');
  patched=patched.slice(0,propsStart)+propsReplacement+patched.slice(propsEnd);
  patched=patched.replace(
    'creditsEstimated:6,windowMode:',
    "creditsEstimated:1+propsRequestCount*5,propsRequestCount,propsFetchMode:'batched-by-market',windowMode:"
  );

  await fs.writeFile(runtimePath,patched,'utf8');
  try{
    await import(`${pathToFileURL(runtimePath).href}?v=892-${Date.now()}`);
  }finally{
    await fs.rm(runtimePath,{force:true});
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
