import fs from 'node:fs';
import assert from 'node:assert/strict';

const router=fs.readFileSync('sports/router.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const concept=fs.readFileSync('sports/nfl/chibi-preview-approved-concept-v913.js','utf8');
const privatePreview=fs.readFileSync('sports/nfl/chibi-preview-private-v901.js','utf8');

assert(router.includes("chibi-preview-approved-concept-v913.js?v=91.3"),'router must import approved concept guard');
assert(router.includes('installNflChibiApprovedConceptV913();'),'router must install approved concept guard');
assert(index.includes('sports/router.js?v=90.60-chibi-approved913'),'index must cache-bust approved concept router');
assert(concept.includes('APPROVED 3D CONCEPT'),'approved concept badge missing');
assert(concept.includes('Dak Prescott'),'Dak approved concept mapping missing');
assert(concept.includes('visibility:hidden!important'),'legacy flat mascot must be hidden before async replacement');
assert(concept.includes('Approved-grade render pending'),'non-approved players must not receive a fake approximation');
assert(privatePreview.includes('chibiCompositeHTML'),'legacy module still exists and therefore approved guard remains required');

for(const p of [
  'sports/nfl/assets/chibis/DAL/dak-prescott/approved/hero-v001.part1.b64',
  'sports/nfl/assets/chibis/DAL/dak-prescott/approved/actions-v001.b64'
]){
  const b64=fs.readFileSync(p,'utf8').trim();
  const buf=Buffer.from(b64,'base64');
  assert(buf.length>10000,`${p} approved concept asset unexpectedly small`);
  assert.equal(buf[0],0xff,`${p} missing JPEG SOI`);
  assert.equal(buf[1],0xd8,`${p} missing JPEG SOI`);
  assert.equal(buf.at(-2),0xff,`${p} missing JPEG EOI`);
  assert.equal(buf.at(-1),0xd9,`${p} missing JPEG EOI`);
}

console.log('NFL chibi approved concept v91.3 regression passed');
