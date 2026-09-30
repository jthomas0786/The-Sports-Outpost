import fs from 'node:fs/promises';
import {buildFirstGoalSlate} from '../sports/nhl/first-goal-model-v928.js';

const [slate,research,odds]=await Promise.all([
 fs.readFile('slates/nhl.json','utf8').then(JSON.parse),
 fs.readFile('slates/nhl-research.json','utf8').then(JSON.parse),
 fs.readFile('slates/nhl-odds.json','utf8').then(JSON.parse),
]);
let old=null;try{old=JSON.parse(await fs.readFile('slates/nhl-first-goal.json','utf8'));}catch{}
const out=buildFirstGoalSlate(slate,research,odds,old);
for(const game of out.games){
 for(const side of ['away','home']){
  if(!Array.isArray(game?.[side]?.players)||game[side].players.length!==3)throw new Error(`FGS ${game.gameId} ${side} does not have exactly 3 first-goal candidates`);
  if(!Array.isArray(game?.[side]?.atgPlayers)||game[side].atgPlayers.length!==3)throw new Error(`ATG ${game.gameId} ${side} does not have exactly 3 anytime-goal candidates`);
  if(!game?.[side]?.riskyFirstGoal)throw new Error(`FGS ${game.gameId} ${side} is missing risky value pick`);
  if(!game?.[side]?.riskyAtg)throw new Error(`ATG ${game.gameId} ${side} is missing risky value pick`);
  for(const p of game[side].players)if(!(Number(p.probability)>0&&Number(p.probability)<1))throw new Error(`Invalid FGS probability for ${p.name}`);
  for(const p of game[side].atgPlayers)if(!(Number(p.anytimeProbability)>0&&Number(p.anytimeProbability)<1))throw new Error(`Invalid ATG probability for ${p.name}`);
  if(game[side].players.some(p=>p.id===game[side].riskyFirstGoal.id))throw new Error(`FGS risky pick duplicated Top 3 for ${game[side].abbr}`);
  if(game[side].atgPlayers.some(p=>p.id===game[side].riskyAtg.id))throw new Error(`ATG risky pick duplicated Top 3 for ${game[side].abbr}`);
 }
}
await fs.writeFile('slates/nhl-first-goal.json',JSON.stringify(out,null,2)+'\n');
const fgsQuotes=(odds.quotes||[]).filter(q=>q.market==='fgs').length,atgQuotes=(odds.quotes||[]).filter(q=>q.market==='atg').length;
console.log(`NHL first-goal model: games=${out.games.length} FGS quotes=${fgsQuotes} ATG quotes=${atgQuotes} generated=${out.generatedAt}`);
