import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync('sports/nfl/player-prop-tool-v926.js','utf8');
const css=fs.readFileSync('sports/nfl/player-prop-tool-v926.css','utf8');
const visibilityCss=fs.readFileSync('sports/nfl/player-prop-tool-visibility-v927.css','utf8');
const preview=fs.readFileSync('sports/nfl-preview-v893.js','utf8');
for(const marker of [
  'PLAYER PROP TOOL','TSO Picks','All Props','MODEL PROB','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H',
  "getJson('./slates/nfl.json')","getJson('./slates/nfl-odds.json')","getJson('./slates/nfl-sim.json')","getJson('./slates/nfl-research.json')",
  'rushYds','recYds','receptions','passYds','passTds','completions','atd',
  'hitRate','h2hRate','recentAverage','impliedFromAmerican','defenseRankMap','buildRows','rowsForDocs',
  'data-nfl-tool-player','data-nfl-player','openExistingPlayerModal','Player Prop Tool','Quick Guide','Color Cells','Filters',
  'PAGE_SIZE=60','renderLimit','Show ${Math.min(PAGE_SIZE,more)} more','loading="lazy"','decoding="async"',
  'nfl-ppt-ring-track','nfl-ppt-ring-fill','nfl-ppt-ring-label'
]) assert(js.includes(marker),`Player Prop Tool v92.6 missing ${marker}`);
for(const marker of ['nfl-ppt-table','nfl-ppt-player-sticky','nfl-ppt-prob','nfl-ppt-ring-track','nfl-ppt-ring-fill','nfl-ppt-more','overflow-x:auto','overflow-y:visible','overscroll-behavior-y:auto','contain:none','@media(max-width:700px)'])assert(css.includes(marker),`Player Prop Tool v92.6 CSS missing ${marker}`);
for(const marker of ['max-width:1500px','height:48px','width:1420px','height:78px','width:50px','font-size:15px','width:58px','overflow-y:visible','touch-action:pan-x pan-y','@media(max-width:700px)'])assert(visibilityCss.includes(marker),`Player Prop Tool v92.7 visibility CSS missing ${marker}`);
assert(!js.includes('new MutationObserver'),'v92.6 Player Prop Tool must not use mutation observers');
assert(!js.includes('setInterval('),'v92.6 Player Prop Tool must not auto-rerender on an interval');
assert(preview.includes("player-prop-tool-v926.js?v=92.7"),'NFL production wrapper must import the v92.6 Player Prop Tool with the v92.7 cache key');
assert(preview.includes("player-prop-tool-visibility-v927.css?v=92.7"),'NFL production wrapper must load the v92.7 visibility layer');
assert(preview.includes('installNflPlayerPropToolV926'),'NFL production wrapper must install Player Prop Tool v92.6');
assert(!preview.includes('installNflPlayerPropToolPerformanceV925'),'NFL production wrapper must not install the old repaint-heavy v92.5 layer');
console.log('NFL Player Prop Tool regression passed: v92.6 static batched rendering and non-trapping scroll remain intact, while v92.7 enlarges controls, rows, avatars, values and probability rings for readability.');