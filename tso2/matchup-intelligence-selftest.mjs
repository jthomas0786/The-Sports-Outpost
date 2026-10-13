import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('tso2/matchup-intelligence.js','utf8');
const bundled=readFileSync('tso2/pages.js','utf8');
const bundledCss=readFileSync('tso2/styles.css','utf8');
const css=readFileSync('tso2/matchup-intelligence.css','utf8');
const app=readFileSync('tso2/app.js','utf8');
assert.ok(bundled.includes(source.trim()),'Real staged pages.js must contain matchup intelligence runtime');
assert.ok(bundledCss.includes(css.trim()),'Real staged styles.css must contain matchup styles');
assert.match(app,/research:row=>propResearchPayload\(row\)/,'Inline research must use existing authenticated/data-backed worker');
assert.match(app,/history:\(row,book\)=>propHistoryPayload\(row,book\)/,'Inline odds history must use existing verified snapshot endpoint');
assert.ok(!source.includes('Math.random'),'No fake player ranking or model probabilities');
assert.ok(!source.includes('CHEAT CODE'),'Do not copy third-party proprietary score names');
assert.ok(css.includes('.mi-player.is-open') && css.includes('.mi-teams'),'Expandable player cards + two-sided team breakdown required');
const context={window:{},console};
vm.runInNewContext(source,context);
const view=context.window.TSO2Matchup;
assert.ok(view?.listing && view?.bind && view?.matchedStats);
const g={id:'g1',league:'nfl',away:{name:'Buffalo',abbr:'BUF'},home:{name:'Los Angeles',abbr:'LA'}};
const rows=[
 {key:'k1',sport:'nfl',player:'Test Back',team:'BUF',market:'atd',marketLabel:'Anytime TD',side:'over',book:'Verified Book',price:125,model:{probabilityPct:82,edgePct:1.0}},
 {key:'k2',sport:'nfl',player:'Test WR',team:'LA',market:'recYds',marketLabel:'Receiving yards',side:'over',line:54.5,book:'Verified Book',price:-110,model:{probabilityPct:60,edgePct:7}},
 {key:'k3',sport:'nfl',player:'Test TE',team:'LA',market:'recYds',marketLabel:'Receiving yards',side:'under',selection:'Under 21.5',line:21.5,book:'Verified Book',price:-105},
 {key:'k4',sport:'nfl',player:'Test Quarterback',team:'BUF',market:'passYds',marketLabel:'Passing yards',side:'over',selection:'Over 250.5',line:250.5,book:'Verified Book',price:-115},
 {key:'k5',sport:'nfl',player:'Test Receiver Two',team:'BUF',market:'recYds',marketLabel:'Receiving yards',side:'over',selection:'Over 65.5',line:65.5,book:'Verified Book',price:-115,model:{probabilityPct:75,edgePct:0.5}}
];
const html=view.listing(g,rows);
assert.match(html,/BUF defense vs LA offense/);
assert.match(html,/LA defense vs BUF offense/);
assert.match(html,/Test WR/);
assert.match(html,/Test Back/);
assert.match(html,/MODEL %/);
assert.match(html,/60.0%/);
assert.match(html,/82.0%/);
assert.match(html,/MARKET ONLY/);
assert.ok(!html.includes('Test TE'),'Under selections must not be featured in Game Hub');
assert.ok(!html.includes('Under 21.5'),'Under thresholds must never leak to featured cards');
assert.match(html,/ALL PROPS/);
assert.match(html,/Passing Yards/);
assert.match(html,/Receiving Yards/);
assert.match(html,/Anytime TD/);
assert.ok(!html.includes('OTHER PROPS'),'Market categories must be specific to actual player props');
assert.equal(view.eligibleOver(rows[2]),false);
assert.equal(view.eligibleOver(rows[1]),true);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'atd',selection:'Yes'}),true);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'atd',selection:'No'}),false);
assert.equal(view.eligibleOver({key:'xx',player:'Test',market:'recYds',selection:'N/A'}),false);

assert.match(html,/ranked by TSO Prop Signal/);
assert.match(html,/data-mi-ranking-status/);
assert.ok(!html.includes('highest model probability first'));
assert.match(view.listing(g,[rows[1],rows[4]]),/Receiving Yards/);
assert.match(html,/data-mi-expand/);
assert.match(html,/data-mi-add/);
assert.match(html,/data-mi-filter/);
assert.ok(!html.includes('Venom'),'TSO branding must remain independent');
assert.match(view.listing({id:'g2',league:'nba',away:{abbr:'NYK'},home:{abbr:'BOS'}},[]),/No verified Over\/Yes selections/);
function fixture(sport,market,player,expected){
 const result=view.matchedStats({available:true,player}, {sport,market});
 assert.deepEqual([...result.map(g=>g.value)],expected);
}
fixture('nfl','atd',{gameLog:[{date:'2026-10-10',tds:1},{date:'2026-10-02',tds:0}]},[1,0]);
fixture('nba','points',{recentGames:[{date:'2026-10-10',stats:{points:28}}]},[28]);
fixture('nhl','sog',{recentGames:[{date:'2026-10-10',stats:{sog:4}}]},[4]);
fixture('mlb','hr',{gameLog:[{date:'2026-10-10',hr:1}]},[1]);
fixture('nfl','atd',{gameLog:[]},[]);
const observed=[{date:'2026-10-09',value:120},{date:'2026-10-02',value:72},{date:'2026-09-25',value:95}];
const chart=view.recentGamesChart(observed,rows[1]);
assert.match(chart,/mi-games-chart/,'Exact game log renders visual SVG');
assert.match(chart,/<rect/,'Observed results are actual SVG bars');
assert.match(chart,/PROP LINE 54.5/,'The same sportsbook selection line is overlaid');
assert.match(chart,/LAST 3 OBSERVED GAMES/);
assert.match(view.hitRateVisual(observed,rows[1],5),/mi-hit-track/,'Hit rates include progress gauges');
assert.match(view.lineMovementChart({available:true,open:{price:-110},current:{price:-125},points:[{price:-110},{price:-115},{price:-125}]},rows[1]),/mi-movement-chart/,'Two or more recorded odds snapshots yield a real trend');
assert.ok(!view.lineMovementChart({available:true,open:{price:-110},current:{price:-110},points:[{price:-110}]},rows[1]).includes('mi-movement-chart'),'Do not fake a movement chart from one recorded snapshot');
assert.ok(!view.recentGamesChart([],rows[1]).includes('mi-games-chart'),'No manufactured bars for missing research data');


// New evidence-first analytics: connect the existing 2026 nflverse opportunity
// snapshot only when GSIS player identity AND team are independently verified.
const pbpFixture={
 schemaVersion:1,source:'nflverse / nflfastR play-by-play (CC BY 4.0)',
 generatedAt:'2026-10-10T08:00:00Z',
 seasons:{'2026':{
  teams:{BUF:{gamesPlayed:5,redZoneOpps:45,goalLineOpps:10,carries:160,targets:180},
         LA:{gamesPlayed:5,redZoneOpps:39,goalLineOpps:14,carries:125,targets:220}},
  players:{'00-0033553':{
   name:'Test Back',team:'BUF',gamesWithOpportunities:5,
   targetSharePct:23.4,carrySharePct:39,redZoneSharePct:36,
   goalLineSharePct:44,targets:42,carries:62,redZoneOpps:16,
   goalLineOpps:5,redZoneTdYieldPct:22.2
  }}
 }}
};
const idResearch={available:true,player:{gsisId:'00-0033553',team:'BUF'}};
assert.equal(view.opportunityForPlayer(pbpFixture,idResearch,rows[0]).targetSharePct,23.4);
assert.equal(view.opportunityForPlayer(pbpFixture,{available:true,player:{gsisId:'00-0033553',team:'LA'}},rows[0]),null,
 'Wrong team must never borrow another player’s opportunities');
assert.equal(view.opportunityForPlayer(pbpFixture,{available:true,player:{gsisId:'00-0099999',team:'BUF'}},rows[0]),null,
 'No exact GSIS identity must show unavailable, never guessed usage');
const opportunityCard=view.opportunityEvidence(pbpFixture,idResearch,rows[0]);
for(const text of ['TARGET SHARE','23.4%','RED-ZONE SHARE','36.0%','GOAL-LINE SHARE','44.0%','RED-ZONE CHANCES','2026 nflverse'])
 assert.ok(opportunityCard.includes(text),'Missing verified opportunity signal: '+text);
const wrongTeamOpportunityCard=view.opportunityEvidence(pbpFixture,{available:true,player:{gsisId:'00-0033553',team:'LA'}},rows[0]);
assert.ok(!wrongTeamOpportunityCard.includes('23.4%'),'Identity mismatch should never display data');
const matchupEvidence=view.opposingOffenseEvidence(pbpFixture,'BUF',g);
assert.ok(matchupEvidence.includes('LA offense'),'Buffalo defense must be paired with opposing LA offense');
assert.ok(matchupEvidence.includes('7.8'),'39 red-zone opportunities across 5 LA games is 7.8 per game');
assert.ok(matchupEvidence.includes('2.8'),'14 goal-line opportunities across 5 LA games is 2.8 per game');
assert.ok(matchupEvidence.includes('not defensive yards allowed'),'Clearly separate offensive opportunity from defensive allowance');
const highModel={sport:'nfl',player:'Test WR',market:'recYds',side:'over',line:94.5,model:{probabilityPct:80}};
const observedResearch={available:true,player:{gameLog:[
 {date:'2026-10-10',recYds:125},{date:'2026-10-03',recYds:74},
 {date:'2026-09-26',recYds:76},{date:'2026-09-19',recYds:147},
 {date:'2026-09-12',recYds:91},{date:'2026-09-05',recYds:99}
]}};
const quickRead=view.decisionEvidence(observedResearch,highModel);
assert.ok(quickRead.includes('THE QUICK READ'));
assert.ok(quickRead.includes('MODEL AND RECENT RESULTS DIFFER'),
 'A large divergence between 80% model and actual observed hits should not be hidden');
assert.ok(quickRead.includes('2/5'),'Quick read must compute observed hits against the exact 94.5 line');
assert.ok(!view.decisionEvidence({available:true,player:{gameLog:[]}},highModel).includes('MODEL AND RECENT RESULTS DIFFER'),
 'Never manufacture model-versus-form disagreements without an observed sample');


assert.match(html,/data-mi-signal="k1"/,'TSO signal visible in collapsed player row');
assert.match(html,/TSO PROP SIGNAL/,'TSO score title visible before expansion');
assert.match(css,/\.mi-signal-mini/,'Compact progress bar styled');
assert.match(css,/\.mi-signal-detail/,'Expanded factor breakdown styled');
const mkResearch=nums=>({available:true,player:{gameLog:nums.map((recYds,i)=>({date:'2026-09-'+(10+i),recYds}))}});
const exact={...rows[1],model:{probabilityPct:76,edgePct:8},impliedPct:50};
const high=view.signalScore(exact,mkResearch([83,80,75,95,77,82]));
const low=view.signalScore(exact,mkResearch([20,21,25,18,23,24]));
assert.ok(high.score>low.score,'Same model and odds must respond to exact-line game performance');
assert.ok(high.score<=87,'Short observed samples must cap top-tier scores');
assert.match(view.signalMini(exact,mkResearch([83,80,75,95,77,82])),/role="progressbar"/);
assert.match(view.signalDetail(exact,mkResearch([83,80,75,95,77,82])),/Price value/);
assert.match(view.signalDetail(exact,mkResearch([83,80,75,95,77,82])),/NOT a probability of winning/);
assert.equal(view.signalScore(exact,{available:false}).score,null,'No invented score without history');
assert.equal(view.signalScore({...exact,model:{}},mkResearch([83,80,75,95,77,82])).tier,'FORM ONLY','A market-only prop must have a distinct observed-history label');
const identity={...mkResearch([83,80,75,95,77,82]),player:{...mkResearch([83,80,75,95,77,82]).player,gsisId:'00-0033553',team:'BUF'}};
const roleRow={...exact,team:'BUF'};
assert.ok(view.signalScore(roleRow,identity,pbpFixture).factors.some(f=>f.label==='Verified role'),'Correct GSIS ID enables opportunity factor');
assert.ok(!view.signalScore(roleRow,{available:true,player:{...identity.player,team:'LA'}},pbpFixture).factors.some(f=>f.label==='Verified role'),'Mismatched team must exclude opportunity factor');


const historical=view.signalScore({...exact,model:null},mkResearch([88,90,92,94,96,98]));
assert.equal(historical.tier,'FORM ONLY');
assert.ok(historical.score>0&&historical.score<=74,'Without model, scores are provisional and capped');
assert.match(view.signalMini({...exact,model:null},mkResearch([88,90,92,94,96,98])),/FORM ONLY/);
assert.equal(view.signalScore({...exact,model:null},{available:false}).score,null,'Do not invent missing history');
const defenseFixture=(team,def,pos)=>({available:true,sport:'nfl',player:{team,matchup:{
 opponent:def,positionGroup:pos,previousSeasonAllowed:{position:pos,games:15,perGame:{recYds:120.5,receptions:9.1,rushYds:99.5,passYds:219.9}}}}});
assert.match(view.verifiedDefensiveMatchup(defenseFixture('LA','BUF','WR'),'BUF','LA').html,/BUF defense vs WR/);
assert.match(view.verifiedDefensiveMatchup(defenseFixture('BUF','LA','RB'),'LA','BUF').html,/LA defense vs RB/);
assert.equal(view.verifiedDefensiveMatchup(defenseFixture('BUF','LA','RB'),'BUF','LA'),null);
assert.equal(view.verifiedDefensiveMatchup(defenseFixture('LA','BUF','WR'),'LA','BUF'),null);


// Both ALL PROPS and each prop market must sort by TSO Signal instead of model %.
const rankRow=(key,player,market,prob,line=50)=>({key,sport:'nfl',player,team:'BUF',market,side:'over',line,
 model:prob===null?null:{probabilityPct:prob,edgePct:5}});
const scoredLog=(market,nums)=>({available:true,player:{gameLog:nums.map((value,i)=>
 ({date:'2026-09-'+String(10+i),[market]:value}))}});
const rankCandidates=[
 rankRow('model-high-form-low','High Prob, Poor Form','recYds',88),
 rankRow('signal-strong','Lower Prob, Great Form','recYds',75),
 rankRow('market-only','No Model, Great Form','recYds',null),
 rankRow('no-data','No Verified Games','recYds',95),
 rankRow('other-prop','Rushing Candidate','rushYds',69,40)
];
const signalCache=new Map([
 ['model-high-form-low',scoredLog('recYds',[12,20,18,22,25,15,16,19,23,14])],
 ['signal-strong',scoredLog('recYds',[75,80,77,83,71,82,76,79,87,81])],
 ['market-only',scoredLog('recYds',[79,81,84,83,77,88,85,82,90,91])],
 ['other-prop',scoredLog('rushYds',[50,60,55,51,49,61,62,59,70,58])]
]);
const receive=view.rankRowsBySignal(rankCandidates.filter(r=>r.market==='recYds'),signalCache);
assert.deepEqual(receive.map(r=>r.key),
 ['signal-strong','market-only','model-high-form-low','no-data'],
 'Receiving Yards sorts exact calculated TSO Signal high to low; ungraded last');
const overall=view.rankRowsBySignal(rankCandidates,signalCache);
const numerical=overall.map(r=>view.signalScore(r,signalCache.get(r.key)).score).filter(x=>x!==null);
assert.deepEqual(numerical,[...numerical].sort((a,b)=>b-a),'ALL PROPS uses descending TSO Signal');
assert.equal(overall.at(-1).key,'no-data','Model probability cannot rescue an ungraded player');

console.log('TSO scored prop ranking and evidence suite: PASS');
