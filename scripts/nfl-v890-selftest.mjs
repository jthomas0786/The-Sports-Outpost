#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const enhancer=fs.readFileSync('sports/nfl/gamecast-v890-enhancer.js','utf8');
const styles=fs.readFileSync('sports/nfl/gamecast-v890-styles.js','utf8');
const wrapper=fs.readFileSync('sports/nfl-preview-v890.js','utf8');
const router=fs.readFileSync('sports/router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert(enhancer.includes('const FIELD_CHUNK_COUNT=7'));
assert(enhancer.includes("const FIELD_CHUNK_PREFIX='/sports/nfl/gamecast-field-v890.b64.'"));
const chunks=Array.from({length:7},(_,i)=>fs.readFileSync(`sports/nfl/gamecast-field-v890.b64.${String(i).padStart(2,'0')}`,'utf8').trim());
const bytes=Buffer.from(chunks.join(''),'base64');
assert(bytes.length>50000,'clean field art should decode to a non-trivial image');
assert.equal(bytes.subarray(4,8).toString('ascii'),'ftyp');
assert(bytes.subarray(8,20).toString('ascii').includes('avif')||bytes.subarray(8,20).toString('ascii').includes('avis'));
assert(enhancer.includes("type:'image/avif'"));
assert(enhancer.includes('loadFieldObjectUrl'));
assert(enhancer.includes('extractTeamLogoUrls'));
assert(enhancer.includes("oldObserver?.disconnect?.()"));
assert(enhancer.includes('image-visible__svg-logic__overlay-gameplay'));
assert(styles.includes('visibility:hidden!important'));
assert(styles.includes('.tso-v890-fieldImage'));
assert(styles.includes('.tso-v890-teamLogo--away'));
assert(styles.includes('.tso-v890-teamLogo--home'));
assert(wrapper.includes('ensureNflGamecastV890Styles();'));
assert(wrapper.includes("./nfl-preview.js?v=88.6e"));
assert(router.includes("nfl-preview-v890.js?v=89.0"));
assert.equal(pkg.scripts['nfl:v89.0:test'],'node scripts/nfl-v890-selftest.mjs');
console.log('✓ v89.0 clean visible field + hidden logic field layer architecture self-test passed');
console.log(`✓ field art reconstructed from ${chunks.length} cached chunks (${bytes.length} bytes)`);
