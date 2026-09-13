import assert from 'node:assert/strict';
import {rankNhlSlatePlayers,renderNhlSlatePoolsHTML,__NHL_SLATE_V906_TEST__} from '../sports/nhl/slate-v906.js';
const players=[
 {id:'a1',team:'AWY',name:'Model Star',position:'C',active:true,availability:'Active'},
 {id:'a2',team:'AWY',name:'Goal Rate',position:'LW',active:true,availability:'Active'},
 {id:'a3',team:'AWY',name:'Three',position:'RW',active:true},{id:'a4',team:'AWY',name:'Four',position:'D',active:true},{id:'a5',team:'AWY',name:'Five',position:'C',active:true},{id:'a6',team:'AWY',name:'Six',position:'LW',active:true},
 {id:'ag',team:'AWY',name:'Away Goalie',position:'G',active:true,confirmedStarter:true},
 {id:'h1',team:'HME',name:'Home One',position:'C',active:true},{id:'h2',team:'HME',name:'Home Two',position:'LW',active:true},{id:'h3',team:'HME',name:'Home Three',position:'RW',active:true},{id:'h4',team:'HME',name:'Home Four',position:'D',active:true},{id:'h5',team:'HME',name:'Home Five',position:'C',active:true},{id:'h6',team:'HME',name:'Home Six',position:'LW',active:true},
 {id:'hg',team:'HME',name:'Home Goalie',position:'G',active:true}
];
const research={players:{a1:{rates:{goals:.2,sog:2.2,points:.5}},a2:{rates:{goals:.8,sog:4,points:1}},ag:{rates:{saves:27.4}},h1:{rates:{goals:.4,sog:3,points:.8}}}};
const sim={games:[{gameId:'g1',ready:true,players:[{id:'a1',metrics:{goals:{atLeastOne:.71}}},{id:'a2',metrics:{goals:{atLeastOne:.52}}}]}]};
const ranked=rankNhlSlatePlayers(players.filter(p=>p.team==='AWY'),'g1',research,sim);
assert.equal(ranked[0].id,'a1','valid simulation probability must outrank baseline fallback');
assert.equal(ranked.some(p=>p.position==='G'),false,'goalies are excluded from top goal threats');
assert.equal(__NHL_SLATE_V906_TEST__.goalProbability('g1','a1',sim),.71);
const game={id:'g1',away:{abbr:'AWY',name:'Away Club',logo:''},home:{abbr:'HME',name:'Home Club',logo:''},players};
const gradeForLean=p=>p==null?'—':p>=.70?'A+':'B';
const gradeRingHTML=(p,g)=>`<ring data-grade="${g}" data-prob="${p??''}"></ring>`;
const html=renderNhlSlatePoolsHTML(game,{research,sim,gradeForLean,gradeRingHTML});
assert.match(html,/View Full Player Pools/);
assert.match(html,/Hide Full Player Pools/);
assert.match(html,/Top Goal Threats/);
assert.match(html,/data-hk-pool-toggle/,'one control should expand both existing team boards');
assert.match(html,/hk-slate-rest/,'remaining players must continue inside each existing team board');
assert.doesNotMatch(html,/hk-slate-full-grid|hk-slate-full-team/,'expansion must not render a second duplicate pool');
assert.match(html,/Away Goalie/,'continued pool must include goalie markets');
assert.match(html,/Home Goalie/,'continued pool must include both team goalies');
assert.match(html,/data-grade="A\+"/,'NFL-parity grade helper should be used on featured players');
const awayBoard=html.split('hk-slate-team-board')[1].split('</section>')[0];
const awayTop=awayBoard.split('hk-slate-top-five')[1].split('hk-slate-rest')[0];
const awayRest=awayBoard.split('hk-slate-rest')[1];
assert.equal((awayTop.match(/hk-slate-player"/g)||[]).length,5,'exactly five featured skaters should be visible before expansion');
assert.match(awayRest,/Six/,'player six should continue directly after the visible top five');
assert.match(awayRest,/Away Goalie/,'goalie should finish the same continued team list');
assert.equal((html.match(/Model Star/g)||[]).length,1,'top-five players must not be duplicated in the expanded pool');
const css='sports/nhl/slate-v906.css',fs=(await import('node:fs')).default,styles=fs.readFileSync(css,'utf8');
assert.match(styles,/hk-matchup-slate\{grid-template-columns:minmax\(0,1fr\)!important/,'slate must be one column');
assert.match(styles,/is-expanded \.hk-slate-rest\{display:flex\}/,'expansion should reveal the continuation in place');
assert.match(styles,/@media\(max-width:390px\)/,'phone breakpoint required');
console.log('NHL v90.6.1 slate: top-five boards extend in place through remaining skaters and goalies without duplication');
