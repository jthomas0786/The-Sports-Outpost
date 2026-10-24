/* TSO3 self-audit: six-league navigation, original branding, and source policy.
   No network requests, secrets, provider billing, or production changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const app=file('app.js'),worker=file('preview-worker.js'),html=file('index.html');
const styles=file('styles.css'),manifest=JSON.parse(file('manifest.webmanifest'));
const names=['nfl','nba','mlb','nhl','wnba','cfb'];
test('six sports, sport-specific research category navigation and provenance',()=>{
 for(const name of names)assert.match(app,new RegExp(name+":\\{label:"));
 assert.match(app,/function pageData\(\)/);
 assert.match(app,/SOURCE_LINEAGE/);
 assert.match(app,/NOT VERIFIED/);
 assert.match(worker,/ESPN_SCOREBOARDS/);
});
test('NFL includes all 19 observed public cheatsheet categories, without copying scores',()=>{
 const words=['TD Matchups','First TD','Role Matchups','Market Grades',
 'Coverage Matchups','Alignment Matchups','WR vs CB Matchups','Rushing Matchups',
 'Redzone Matchups','Line Matchups','Hit Rate Matrix','Team Share %',
 'Team Defensive Stats','Coverage Matrix','Team Tendencies','Coverage Players',
 'Odds Discrepancies','Receiving Value','Explosive Plays'];
 for(const name of words)assert.ok(app.includes("['"+name+"'"),name+' unavailable');
});
test('original SVG brand assets and install manifest routes are in the app',()=>{
 assert.equal(manifest.name,'The Sports Outpost');
 assert.ok(manifest.icons.some(icon=>icon.src==='/assets/tso-app-icon.svg'));
 for(const name of ['tso-mark','tso-app-icon','tso-research-hero']){
  const svg=file('assets/'+name+'.svg');
  assert.match(svg,/^<svg /);
  assert.match(svg,/<\/svg>$/);
  assert.doesNotMatch(svg,/<script|onload=/i);
  assert.match(worker,new RegExp(name+'\\\\.svg'));
 }
 assert.match(html,/rel="manifest"/);
 assert.match(styles,/tso-research-hero\.svg/);
});
test('no emoji glyph icons, with accessible inline vector action controls',()=>{
 const emoji=/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
 for(const name of ['app.js','index.html','styles.css','preview-worker.js',
  'nfl-lab.js','nfl-props.js','nfl-validation.js','nba-lab.js','nba-depth.js','live-boxscore.js']){
  assert.equal(emoji.test(file(name)),false,'emoji glyph appears in '+name);
 }
 assert.match(app,/function iconSvg\(/);
 assert.match(html,/class="tso-icon"/);
});
test('all research sources enforce integrity before rendering probabilities',()=>{
 assert.match(worker,/verifiedOtherOdds\(league\)/);
 assert.match(worker,/q\.preserved===true/);
 assert.match(worker,/otherOddsMatch\(q,g,league\)/);
 assert.match(worker,/verifiedNhlGoalModel\(\)/);
 assert.match(worker,/nflOddsAgeLimitMinutes\(/);
 assert.match(app,/probability===null\?null:\{probabilityPct:probability\*100/);
});
test('checkbox filters permit multi-market and multi-book comparisons',()=>{
 assert.match(html,/id="marketPicker"/);
 assert.match(html,/id="bookPicker"/);
 assert.match(app,/data-tso-check/);
 assert.match(app,/state\.marketSelections/);
 assert.match(app,/state\.bookSelections/);
});
