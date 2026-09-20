import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const tool=read('sports/nfl/player-prop-tool-v947.js');
const css=read('sports/nfl/player-prop-tool-v947.css');
const preview=read('sports/nfl-preview-v893.js');
const router=read('sports/router.js');

for(const label of ['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']) assert.ok(tool.includes(`'${label}'`),`missing ${label}`);
for(const style of ['tsoPick','safest','bestEdge','balanced','aggressive','correlated','longshot']) assert.ok(tool.includes(`'${style}'`),`missing style ${style}`);
for(const period of ['full','1h','2h','q1','q2','q3','q4']) assert.ok(tool.includes(`'${period}'`),`missing period ${period}`);
assert.ok(tool.includes("const FILES=['./slates/nfl.json','./slates/nfl-odds.json','./slates/nfl-sim.json','./slates/nfl-research.json']"),'must freeze exactly four source files');
assert.equal((tool.match(/fetch\(/g)||[]).length,1,'v94.7 must have one centralized fetch path');
assert.ok(!tool.includes('MutationObserver'),'Player Prop Tool must not install a MutationObserver');
assert.ok(!tool.includes('setInterval('),'Player Prop Tool must not poll');
assert.ok(!tool.includes("addEventListener('scroll'"),'Player Prop Tool must not render/refetch from scroll events');
assert.ok(!tool.includes('addEventListener("scroll"'),'Player Prop Tool must not render/refetch from scroll events');
assert.ok(tool.includes('data-nfl-ppt-side=\"over\"'),'Over switch option missing');
assert.ok(tool.includes('data-nfl-ppt-side=\"under\"'),'Under switch option missing');
assert.ok(tool.includes("state.side=state.side===v?null:v"),'Over/Under switch must be mutually exclusive and same-click clear');
assert.ok(tool.includes("if(ignore!=='side'&&state.side&&row.side!==state.side)return false"),'Side filter predicate missing');
assert.ok(tool.includes("side:null"),'Default and clear state must show both sides');
assert.ok(tool.includes("classList.add('nfl-ppt-active-v948')"),'Player Prop Tool open must claim visible NFL view');
assert.ok(tool.includes("classList.remove('nfl-ppt-active-v948')"),'Player Prop Tool close must release visible NFL view');
assert.ok(tool.includes("data-ppt-sort=\"${key}\""),'all headers must be sort controls');
assert.ok(tool.includes(".nfl-ppt-periodbar-v947 [data-nfl-ppt-period]"),'period clicks must be scoped to the period bar');
assert.ok(tool.includes('bookLogo(row.book'),'sportsbook image path missing');
assert.ok(tool.includes('teamLogo(row.opp)'),'DEF opponent logo path missing');
assert.ok(tool.includes('gameOptionLabel(g)'),'Game filter must show every slate game with date/time');
assert.ok(tool.includes('nfl-ppt-watch-v947'),'compact Player-column watch star missing');
assert.ok(tool.includes('nfl-ppt-match-v947'),'MATCHUP player-v-defense cell missing');
assert.ok(tool.includes('nfl-ppt-match-line-v947'),'MATCHUP position-vs-opponent-logo line missing');
assert.ok(tool.includes('const statKey=MARKET_STAT'),'historical market-stat mapping missing');
assert.ok(tool.includes("const histDelta=full&&l10Avg!=null"),'actual player-form margin must derive from L10 average');
assert.ok(tool.includes('previousSeasonAllowed?.perGame'),'DEF VS PROP must use historical opponent allowance data');
assert.ok(tool.includes('row.defStrengthScore=clamp(1-allowancePct)'),'defense-strength normalization must remain available');
assert.ok(tool.includes("const propFavorability=row.side==='under'?row.defStrengthScore:row.defWeaknessScore"),'DEF VS PROP must favor high allowance for Overs and low allowance for Unders');
assert.ok(tool.includes('row.defHistoryScore=propFavorability'),'DEF VS PROP grade must own player-side prop favorability');
assert.ok(tool.includes('function historicalPositionAllowed(research,position)'),'MATCHUP must read the defense + position-group allowance profile');
assert.ok(tool.includes('positionAllowedProfile:historicalPositionAllowed'),'rows must carry a position-only opponent profile');
assert.ok(tool.includes('const positionWeaknessScore=weightedScore'),'MATCHUP must grade position-level opponent allowance');
assert.ok(tool.includes('row.positionMatchupScore=positionWeaknessScore'),'MATCHUP must own the position-only score');
assert.ok(tool.includes('row.matchupScore=row.positionMatchupScore'),'MATCHUP must not blend player form into the position grade');
assert.ok(!tool.includes('row.playerMatchupScore'),'MATCHUP must not use individual player-form scoring');
assert.ok(tool.includes("if(key==='def')return row.defHistoryScore"),'DEF VS PROP sort must use player-favorable prop score');
assert.ok(tool.includes("if(key==='matchup')return row.matchupScore"),'MATCHUP sort must use player-v-defense score');
assert.ok(tool.includes("return s>=.70?'Great':s>=.58?'Good':s>=.42?'Fair':'Poor'"),'Great/Good/Fair/Poor scale missing');
assert.ok(tool.includes('No simulation data is used'),'MATCHUP and defense tooltips must identify actual-only data');
assert.ok(tool.includes('graded from the displayed player prop side'),'DEF tooltip must explain player-favorable grading');
assert.ok(tool.includes('position-only matchup grade'),'MATCHUP tooltip must explain position-only grading');
assert.ok(tool.includes('Every player at the same position facing the same defense gets the same grade.'),'Quick Guide must lock position-only Matchup semantics');
assert.ok(tool.includes('Great/green helps the pick; Poor/red hurts it.'),'Quick Guide must explain player-favorable DEF colors');
assert.ok(!tool.includes('function historicalHtml(row)'),'historical hit-rate box must not own MATCHUP');
assert.ok(!tool.includes('50K simulation matchup read'),'DEF VS PROP must not use simulated matchup copy');

assert.ok(tool.includes("['matchup','MATCHUP']"),'MATCHUP column label must be preserved');
for(const label of ['PLAYER','PROP LINE','PICK','PROJ','L10 AVG','COV PROB','EDGE','DEF VS PROP','MATCHUP','SIM DEF','L5','L10','H2H']) assert.ok(tool.includes(`<b>${label}</b>`)||tool.includes(`['${label.toLowerCase()}','${label}']`)||tool.includes(`'${label}'`),`guide/header missing ${label}`);
assert.ok(css.includes('v94.9 larger text + actual Historical column'),'v94.9 readability CSS missing');
assert.ok(css.includes('v94.9 full-cell conditional grade formatting'),'full-cell grade formatting missing');
for(const tone of ['great','good','mid','bad']){
  assert.ok(css.includes(`td:has(.nfl-ppt-match-v947.${tone})`),`MATCHUP full-cell background missing for ${tone}`);
  assert.ok(css.includes(`td:has(.nfl-ppt-def-v947.${tone})`),`DEF VS PROP full-cell background missing for ${tone}`);
}

assert.ok(css.includes('.nfl-ppt-player-v947 b{font-size:15px}'),'player-name font enlargement missing');
assert.ok(css.includes('.nfl-ppt-guide-grid-v947 p{font-size:11px'),'Quick Guide readability enlargement missing');

assert.ok(tool.includes('recentAverage(logs,statKey,10)'),'L10 AVG must use actual game logs');
assert.ok(tool.includes('actualHitRate(logs,statKey'),'L5/L10 must use actual game logs');
assert.ok(tool.includes('actualH2HRate(logs,statKey'),'H2H must use actual opponent game logs');
assert.ok(tool.includes('proj=mean'),'PROJ must come from the 50K simulation distribution');
assert.ok(tool.includes('historicalRateCell(row.l5Actual'),'L5 historical cell missing');
assert.ok(tool.includes('historicalRateCell(row.l10Actual'),'L10 historical cell missing');
assert.ok(tool.includes('historicalRateCell(row.h2hActual'),'H2H historical cell missing');
assert.ok(!tool.includes('hitCell(row.prob,5'),'L5 must never use simulation-equivalent hits');
assert.ok(!tool.includes('hitCell(row.prob,10'),'L10 must never use simulation-equivalent hits');
assert.ok(!tool.includes('<span>50K SIM</span>'),'H2H must never display a simulation percentage');
assert.ok(!tool.includes('<span>SIM MEAN</span>'),'PROJ must not display SIM MEAN');
assert.ok(!tool.includes('<span>SIM MED</span>'),'L10 AVG must not display SIM MED');
assert.ok(tool.includes("research.mountNflResearchUI(root)"),'modern research player modal must be explicitly mounted');
assert.ok(tool.includes("root.querySelector('.tso-nfl-player-card-v72')"),'must wait for actual modern NFL player modal');
assert.ok(tool.includes("directModal:true"),'player modal must preserve the frozen Prop Tool in place');
assert.ok(tool.includes("data-nfl-ppt-direct-shell"),'player modal must be created from the frozen row identity');
assert.ok(tool.includes("<h2>${esc(row.name)}</h2>"),'direct player modal must use the selected frozen player name');
assert.ok(tool.includes("${esc(row.team)} · ${esc(row.position||'')}"),'direct player modal must provide team and position to research UI');
assert.ok(tool.includes("const saved=modalReturn;"),'direct player modal close must synchronously capture the saved table position');
assert.ok(tool.includes("if(saved?.directModal)"),'direct player modal close must synchronously restore scroll before the click returns');
assert.ok(tool.includes("if(saved.directModal)"),'direct modal fallback must restore scroll without rebuilding the Prop Tool snapshot');
const browserQa=read('tests/nfl-player-prop-tool-v947.spec.js');
assert.ok(browserQa.includes("first().evaluate(el=>el.click())"),'modal QA must not let Playwright auto-scroll the sticky player column before click dispatch');

assert.ok(tool.includes('<colgroup>'),'table must use an explicit colgroup');
assert.ok(css.includes('stroke-width:2.2'),'coverage ring must stay thin');
assert.ok(css.includes('border-bottom:1px solid #1f3b58'),'player rows/cells must retain visible borders');
assert.ok(css.includes('scrollbar-width:none'),'horizontal table scrollbar must remain visually hidden');
assert.ok(preview.includes("./nfl/player-prop-tool-v947.js?v=95.3"),'preview must import v94.9');
for(const retired of ['player-prop-tool-sim-v939','player-prop-tool-controls-v933','player-prop-tool-build-period-v940','player-prop-tool-reference-v941','player-prop-tool-snapshot-v928','player-prop-tool-static-guard-v929','player-prop-tool-ux-v930']) assert.ok(!preview.includes(retired),`retired writer still active in preview: ${retired}`);
assert.ok(!router.includes('installNflBackgroundFreezeV930'),'global Player Prop background freeze must be removed');
const basePreview=read('sports/nfl-preview.js');
const liveEngine=read('sports/nfl/live.js');
const halftimeUi=read('sports/nfl/halftime-ui-v884.js');
const modelEdge=read('sports/nfl/prop-model-edge-v8918.js');
const commandCenterClient=read('sports/nfl/command-center-client.js');
assert.ok(basePreview.includes("nfl-ppt-opening-modal"),'base NFL renderer must allow the explicit Player Prop modal handoff');
assert.ok(basePreview.includes("root.querySelector('#nflPlayerPropTool')||root.classList.contains('nfl-ppt-active-v948')"),'base NFL renderer must not overwrite active Player Prop Tool');
assert.ok(basePreview.includes("root?.querySelector('#nflPlayerPropTool')||root?.classList.contains('nfl-ppt-active-v948')"),'live callback must not rerender active Player Prop Tool');
assert.ok(liveEngine.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'NFL live polling must pause on Player Prop Tool');
assert.ok(halftimeUi.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'halftime polling must pause on Player Prop Tool');
assert.ok(modelEdge.includes("root.classList.contains('nfl-ppt-active-v948')"),'model observer/refresh must pause on Player Prop Tool');
assert.ok(commandCenterClient.includes("document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')"),'Command Center polling must pause on Player Prop Tool');

assert.ok(router.includes("import('./nfl-preview-v893.js?v=95.3')"),'router must hard cache-bust NFL preview to v94.9');
console.log('✓ NFL Player Prop Tool v95.3 player-v-defense matchup static regression passed');

assert.ok(tool.includes("key==='player'?'nfl-ppt-player-sticky':''"),'PLAYER header must join the sticky first column');
assert.ok(css.includes('/* v95.0 frozen Player column */'),'v95.0 frozen Player column CSS missing');
assert.ok(css.includes('th.nfl-ppt-player-sticky'),'PLAYER header sticky selector missing');
assert.ok(css.includes('td.nfl-ppt-player-sticky'),'Player body cell sticky selector missing');
assert.ok(css.includes('position:sticky!important'),'Player column must be forced sticky');


assert.ok(tool.includes("const VERSION='95.3'"),'Player Prop Tool v95.3 version missing');
assert.ok(css.includes('/* v95.1 player-v-defense matchup restore */'),'restored matchup CSS missing');
