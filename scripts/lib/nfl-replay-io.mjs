import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
export const option=(name,fallback=null)=>{const i=process.argv.indexOf(`--${name}`);return i<0?fallback:process.argv[i+1]};
export async function writeReplayFile(file,value){
  const out=path.resolve(file),root=path.resolve('artifacts/nfl-replay');
  if(!out.startsWith(root+path.sep))throw new Error('Replay outputs must stay inside artifacts/nfl-replay to protect production data');
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,JSON.stringify(value,null,2)+'\n');
  return out;
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
const read=(sha,file)=>{try{return JSON.parse(git('show',`${sha}:${file}`));}catch{return null;}};
export function archiveFromGit({gameId,ref='origin/main',limit=100}){
  // Resolve to a commit before passing the revision to subsequent git commands.
  const head=git('rev-parse','--verify',`${ref}^{commit}`).trim();
  const commits=git('log',`-n${limit}`,'--format=%H','--first-parent',head,'--','slates/nfl-live.json').trim().split('\n').filter(Boolean).reverse();
  const archive={schemaVersion:1,source:{kind:'git',head},game:null,frames:[],research:[],odds:[],skipped:[]};
  const priorSeen={research:new Set(),odds:new Set()};
  for(const sha of commits){
    const liveDoc=read(sha,'slates/nfl-live.json'),live=liveDoc?.games?.[gameId];
    if(!live)continue;
    const capturedAt=git('show','-s','--format=%cI',sha).trim();
    const observed=live.lastFetchedAt??liveDoc.lastFetchedAt;
    const time=typeof observed==='number'?observed:Date.parse(observed);
    if(!Number.isFinite(time)){archive.skipped.push({sha,reason:'Missing live observation time'});continue;}
    // Other inputs must already have existed when this live state was observed.
    // The same commit may update multiple files, so walk from its parent.
    const prior=git('rev-list','-1',`--before=${new Date(time).toISOString()}`,`${sha}^`).trim();
    if(!prior)continue;
    const slate=read(prior,'slates/nfl.json');
    const game=slate?.games?.find(g=>String(g.gameId||g.id)===gameId);
    if(!game){archive.skipped.push({sha,reason:'No archived slate game'});continue;}
    if(!archive.game)archive.game={gameId,startTimeUTC:game.startTimeUTC,away:{abbr:game.away?.abbr,name:game.away?.name},home:{abbr:game.home?.abbr,name:game.home?.name}};
    for(const [kind,file] of [['research','slates/nfl-research.json'],['odds','slates/nfl-odds.json']]){
      const source=git('log','-1','--format=%H',prior,'--',file).trim();
      if(!source||priorSeen[kind].has(source))continue;
      const data=read(source,file);if(!data)continue;
      const availableAt=git('show','-s','--format=%cI',source).trim();
      if(Date.parse(availableAt)>time)continue;
      if(kind==='research')data.players=(data.players||[]).filter(p=>String(p.gameId||'')===gameId||(!p.gameId&&[game.away?.abbr,game.home?.abbr].includes(p.team)));
      else data.games=(data.games||[]).filter(g=>String(g.gameId||'')===gameId||(!g.gameId&&g.away===game.away?.abbr&&g.home===game.home?.abbr));
      archive[kind].push({availableAt,source,data});priorSeen[kind].add(source);
    }
    // Model time is when the snapshot was captured, while inputs are restricted
    // further to those present before its observation time.
    const at=new Date(Math.max(time,Date.parse(capturedAt))).toISOString();
    if(archive.frames.some(f=>f.at===at))continue;
    archive.frames.push({at,source:sha,liveGame:{...live,lastFetchedAt:observed}});
  }
  archive.frames.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  if(!archive.frames.length)throw new Error('No archived frames for this game');
  return archive;
}

export function discoverReplayGames({ref='origin/main',limit=100}={}){
  if(!Number.isInteger(limit)||limit<1)throw new Error('History limit must be a positive integer');
  const head=git('rev-parse','--verify',`${ref}^{commit}`).trim();
  const commits=git('log',`-n${limit}`,'--format=%H','--first-parent',head,'--','slates/nfl-live.json').trim().split('\n').filter(Boolean);
  const games=new Map();
  for(const sha of commits){
    const doc=read(sha,'slates/nfl-live.json');
    for(const [gameId,live] of Object.entries(doc?.games||{})){
      const record=games.get(gameId)||{gameId,away:live.awayAbbr||null,home:live.homeAbbr||null,states:[],captures:0};
      if(!record.states.includes(live.status))record.states.push(live.status);
      record.captures++;games.set(gameId,record);
    }
  }
  return {head,limit,scannedCommits:commits.length,games:[...games.values()].sort((a,b)=>a.gameId.localeCompare(b.gameId))};
}
