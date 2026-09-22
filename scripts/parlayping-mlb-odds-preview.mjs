#!/usr/bin/env node
import fs from 'node:fs/promises';

const KEY=process.env.PARLAY_API_KEY||'';
if(!KEY){console.error('PARLAY_API_KEY missing');process.exit(2);}
const date=process.env.PREVIEW_DATE||new Date().toISOString().slice(0,10);
const players=(process.env.PREVIEW_PLAYERS||'Kazuma Okamoto,CJ Abrams').split(',').map(s=>s.trim()).filter(Boolean);
const wantedBooks=new Set(['draftkings','fanduel','bet365','caesars','espnbet']);
const normalizeBook=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const url=`https://parlay-api.com/v1/sports/baseball_mlb/props?date=${encodeURIComponent(date)}&market=batter_home_runs`;
const res=await fetch(url,{headers:{accept:'application/json','X-API-Key':KEY}});
const text=await res.text();
if(!res.ok)throw new Error(`${res.status} ${text.slice(0,300)}`);
const rows=JSON.parse(text);
if(!Array.isArray(rows))throw new Error('Unexpected ParlayAPI response');
const selected=rows.filter(r=>players.some(p=>String(r.player_name||'').toLowerCase()===p.toLowerCase()))
  .filter(r=>Number(r.line)===0.5)
  .filter(r=>Number.isFinite(Number(r.over_price)))
  .filter(r=>wantedBooks.has(normalizeBook(r.source||r.source_title)));
const output={date,market:'batter_home_runs',players:Object.fromEntries(players.map(p=>[p,selected.filter(r=>String(r.player_name||'').toLowerCase()===p.toLowerCase()).map(r=>({source:r.source,source_title:r.source_title,line:Number(r.line),over_price:Number(r.over_price),snapshot_time:r.snapshot_time,commence_time:r.commence_time,home_team:r.home_team,away_team:r.away_team}))]))};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/parlayping-mlb-hr-odds.json',JSON.stringify(output,null,2));
console.log('Fetched real MLB HR offers for preview:',Object.fromEntries(Object.entries(output.players).map(([p,v])=>[p,v.length])));
