// Source-level and behavior smoke test for the TSO 2.0 all-sports Research Lab.
// No network access, database writes, fake site odds or production changes.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app=fs.readFileSync('tso2/app.js','utf8');
const pages=fs.readFileSync('tso2/pages.js','utf8');
const css=fs.readFileSync('tso2/styles.css','utf8');
const shell=fs.readFileSync('tso2/index.html','utf8');
const seam=app.indexOf('\n\n(() => {');
assert.ok(seam>1000,'Research Lab must load before the legacy application initializes');
const sandbox={window:{}};
vm.runInNewContext(app.slice(0,seam),sandbox);
const lab=sandbox.window.TSO2ResearchLab;
assert.equal(typeof lab?.render,'function','Research Lab renderer exported');
assert.match(pages,/data-research-route/);
assert.doesNotMatch(pages,/data-research-results/,'Legacy Research landing table is replaced');
assert.match(css,/\.lab2-table-wrap/,'Native TSO styling bundled into existing stylesheet');
assert.doesNotMatch(shell,/<script[^>]+src="\.\/research-lab\.js/,'No unsupported Cloudflare routes');
assert.match(app,/addSelection:row=>row&&addPropToParlay\(row\)/,'Adds existing exact selection, not a synthetic pick');
assert.match(app,/openDetail:row=>row&&openResearchDetail\(row\)/,'Retains Deep Research');

const elems={};
const root={
  innerHTML:'',contains:()=>true,
  querySelector(selector){return elems[selector]||(elems[selector]={value:'all',innerHTML:'',textContent:''})},
  querySelectorAll(){return []}
};
const sample=(sport,player,team,key,modeled)=>({
  sport,player,team,key,homeTeam:'KC',awayTeam:'NO',market:'atd',marketLabel:'Anytime TD',
  side:'over',price:155,book:'Sample book',impliedPct:39.2,
  ...(modeled?{model:{probabilityPct:44.2,edgePct:5,projection:{mean:.68},sourceLabel:'sample feed'}}:{})
});
const rows=[sample('nfl','One','KC','one',true),sample('nfl','Two','NO','two',false),
  {...sample('nfl','Unrelated','BAL','three',false),homeTeam:'BAL',awayTeam:'CIN'},
  sample('nba','Basketball Player','BOS','four',true),
  sample('mlb','Baseball Player','NYY','five',false),
  sample('nhl','Hockey Player','NYR','six',true)];
const games=[{id:'fixture-game',league:'nfl',state:'pre',startTime:'2026-10-11T18:00:00Z',
  away:{abbr:'NO',name:'New Orleans'},home:{abbr:'KC',name:'Kansas City'}}];
let added=[],opened=[],switches=[];
let props={rows,games,league:'nfl',addSelection:row=>added.push(row?.key),
  openDetail:row=>opened.push(row?.key),changeLeague:s=>switches.push(s)};
lab.render(root,props);
const table=()=>elems['[data-lab-table]'].innerHTML;
assert.ok(table().includes('One')&&table().includes('Two')&&!table().includes('Unrelated'),'Selected game filters rows');
assert.ok(table().includes('44.2%')&&table().includes('Market only'),'Only genuine probabilities appear');
assert.ok(!table().includes('Basketball Player'),'League filter respected');
const click=(attribute,dataset={})=>root.onclick({target:{closest:()=>({hasAttribute:x=>x===attribute,dataset})}});
click('data-lab-add',{labAdd:'0'});
click('data-lab-detail',{labDetail:'0'});
assert.deepEqual(added,['one'],'Add action calls existing app selection handler');
assert.deepEqual(opened,['one'],'Intel action opens existing research');
click('data-lab-all-games');
assert.ok(table().includes('Unrelated'),'All Games includes other matchups');
assert.ok(root.innerHTML.includes('data-lab-sport="nba"'),'Other league controls available');
click('data-lab-sport',{labSport:'nba'});
assert.deepEqual(switches,['nba'],'League switch goes through existing shell');
for(const sport of ['nba','mlb','nhl']){
  props={...props,league:sport,games:[]};
  lab.render(root,props);
  assert.ok(table().includes(rows.find(r=>r.sport===sport).player),'Research renders '+sport+' selection');
}
console.log('TSO 2.0 Research Lab: four sports, verified values, game filters, parlay, intel and shell integration passed');
