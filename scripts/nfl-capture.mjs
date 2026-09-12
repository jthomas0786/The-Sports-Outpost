#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureInputs } from './lib/nfl-capture.mjs';
const read=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}};
const writeOnce=async(file,data)=>{await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(file,JSON.stringify(data)+'\n',{flag:'wx'});return true;}catch(error){if(error.code==='EEXIST')return false;throw error;}};
const [slate,liveDoc,research,odds,liveOdds]=await Promise.all(['slates/nfl.json',process.env.NFL_LIVE_OUT||'slates/nfl-live.json','slates/nfl-research.json','slates/nfl-odds.json','slates/nfl-live-odds.json'].map(read));
if(!slate||!liveDoc)throw new Error('Slate and live snapshot are required');
const {captures,skipped}=captureInputs({slate,liveDoc,research,odds,liveOdds,source:process.env.GITHUB_SHA||null});
let saved=0;
for(const {key,inputs,frame} of captures){
 if(!/^[a-zA-Z0-9_-]+$/.test(frame.gameId))throw new Error('Invalid game ID');
 const target=`history/nfl/frames/${frame.gameId}/${key}.json`;
 try{await fs.access(target);continue;}catch{}
 for(const [kind,ref] of Object.entries(frame.refs))await writeOnce(`history/nfl/inputs/${ref}.json`,inputs[kind]);
 if(await writeOnce(target,frame))saved++;
}
console.log(JSON.stringify({saved,skipped}));
