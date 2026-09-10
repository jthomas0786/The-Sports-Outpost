#!/usr/bin/env node
/**
 * v89.1 runtime wrapper for scripts/nfl-odds-refresh.mjs.
 *
 * The established weekly refresh pipeline remains the source of truth. This
 * wrapper patches only parsePlayerMarket() in-memory so every sportsbook line
 * returned by the existing single paid /props call is preserved as `alternates`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT=process.cwd();
const sourcePath=path.join(ROOT,'scripts','nfl-odds-refresh.mjs');
const runtimePath=path.join(ROOT,'scripts','.nfl-odds-refresh-v891-runtime.mjs');
const startMarker='function parsePlayerMarket(rows, internalKey) {';
const endMarker='\nfunction blankMarketDiagnostics';

const replacement=`function parsePlayerMarket(rows, internalKey) {
  // v89.1: preserve every sportsbook line from the SAME /props response so the
  // player modal can offer alternate yards/receptions/TD/completion lines without
  // an extra API request. Top-level line/over/under remains backward compatible.
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

async function main(){
  const src=await fs.readFile(sourcePath,'utf8');
  const start=src.indexOf(startMarker);
  const end=src.indexOf(endMarker,start);
  if(start<0||end<0) throw new Error('v89.1 could not locate parsePlayerMarket() patch point');
  const patched=src.slice(0,start)+replacement+src.slice(end);
  await fs.writeFile(runtimePath,patched,'utf8');
  try{
    await import(`${pathToFileURL(runtimePath).href}?v=891-${Date.now()}`);
  }finally{
    await fs.rm(runtimePath,{force:true});
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
