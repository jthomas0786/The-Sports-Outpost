import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync('sports/nfl/player-prop-tool-v923.js','utf8');
const css=fs.readFileSync('sports/nfl/player-prop-tool-v923.css','utf8');
const preview=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
for(const marker of [
  'PLAYER PROP TOOL','TSO Picks','All Props','MODEL PROB','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H',
  "getJson('./slates/nfl.json')","getJson('./slates/nfl-odds.json')","getJson('./slates/nfl-sim.json')","getJson('./slates/nfl-research.json')",
  'rushYds','recYds','receptions','passYds','passTds','completions','atd',
  'hitRate','h2hRate','recentAverage','impliedFromAmerican','defenseRankMap','buildRows',
  'data-nfl-tool-player','data-nfl-player','openExistingPlayerModal','Player Prop Tool','Quick Guide','Color Cells','Filters'
]) assert(js.includes(marker),`Player Prop Tool missing ${marker}`);
for(const marker of ['nfl-ppt-table','nfl-ppt-player-sticky','nfl-ppt-prob','nfl-ppt-match','nfl-ppt-hit','@media(max-width:700px)'])assert(css.includes(marker),`Player Prop Tool CSS missing ${marker}`);
assert(preview.includes("player-prop-tool-v923.js?v=92.3"),'NFL production wrapper must import Player Prop Tool');
assert(preview.includes('installNflPlayerPropToolV923'),'NFL production wrapper must install Player Prop Tool');
console.log('NFL Player Prop Tool v92.3 regression passed: side-nav surface, live odds/sim/research joins, mixed markets, value/matchup/hit-rate columns, filters, responsive table and existing Player Modal wiring are present.');
