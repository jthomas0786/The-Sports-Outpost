/* TSO 3.0 official ESPN athlete season split normalization.
   node --test tso3/tests/athlete-official-splits.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../preview-worker.js',import.meta.url),'utf8');
const from=source.indexOf('function athleteStatFields('),
 to=source.indexOf('function athleteGamelogEntries(',from);
const splitFrom=source.indexOf('function athleteOfficialSplits('),
 splitTo=source.indexOf('async function verifiedAthleteDepth(',splitFrom);
assert.ok(from>=0&&to>from&&splitFrom>=0&&splitTo>splitFrom);
const normalize=runInNewContext(source.slice(from,to)+source.slice(splitFrom,splitTo)+';athleteOfficialSplits');
const fixture={
 names:['earnedRunAverage','strikeouts','battersFaced'],
 labels:['ERA','K','TBF'],
 splitCategories:[
  {displayName:'Home/Away',splits:[
   {displayName:'Home Games',abbreviation:'Home',stats:['2.10','35','81']},
   {displayName:'Away Games',abbreviation:'Away',stats:['-','28','67']}
  ]},
  {displayName:'Opponents',splits:[
   {displayName:'vs Boston Red Sox',abbreviation:'BOS',stats:['3.50','9','24']}
  ]}
 ]
};
test('official ESPN season split names, categories and values survive normalization',()=>{
 const arr=normalize(fixture);
 assert.equal(arr.length,2);
 assert.equal(arr[0].name,'Home/Away');
 assert.equal(arr[0].splits[1].name,'Away Games');
 assert.equal(arr[1].splits[0].abbreviation,'BOS');
 assert.equal(arr[1].splits[0].values[1].numeric,9);
});
test('unavailable stat cells are never fabricated into numeric zero',()=>{
 const x=normalize(fixture)[0].splits[1].values[0];
 assert.equal(x.value,'-');
 assert.equal(x.numeric,null);
});
test('malformed provider split payload produces no source-backed categories',()=>{
 assert.equal(normalize({splitCategories:null}).length,0);
 assert.equal(normalize({splitCategories:[{displayName:'Missing Split',splits:null}]}).length,0);
});
