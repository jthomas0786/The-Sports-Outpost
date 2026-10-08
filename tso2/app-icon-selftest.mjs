import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='tso2/brand/';
const pngs=[
  ['identity/tso2-app-icon-master-approved.png',1254,1254],
  ['production/tso2-app-icon-512.png',512,512],
  ['production/tso2-app-icon-192.png',192,192],
  ['production/tso2-apple-touch-icon-180.png',180,180],
  ['production/tso2-favicon-32.png',32,32],
];
for(const [file,width,height] of pngs){
  const bytes=fs.readFileSync(base+file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Not a PNG: '+file);
  assert.equal(bytes.readUInt32BE(16),width,'PNG width mismatch '+file);
  assert.equal(bytes.readUInt32BE(20),height,'PNG height mismatch '+file);
}
const ico=fs.readFileSync(base+'production/tso2-favicon.ico');
assert.equal(ico.readUInt16LE(2),1,'Favicon ICO type');
assert.equal(ico.readUInt16LE(4),3,'ICO includes 16, 32 and 48px variants');
const webp=fs.readFileSync(base+'production/tso2-app-icon-512.webp');
assert.equal(webp.toString('ascii',0,4),'RIFF');
assert.equal(webp.toString('ascii',8,12),'WEBP');
const manifest=JSON.parse(fs.readFileSync('tso2/manifest.webmanifest','utf8'));
assert.equal(manifest.short_name,'TSO');
assert.equal(manifest.name,'The Sports Outpost');
assert.equal(manifest.display,'standalone');
assert.ok(manifest.icons.some(x=>x.sizes==='192x192'&&x.src.includes('tso2-app-icon-192.png')));
assert.ok(manifest.icons.some(x=>x.sizes==='512x512'&&x.src.includes('tso2-app-icon-512.png')));
const html=fs.readFileSync('tso2/index.html','utf8');
for(const ref of ['tso2-favicon.ico','tso2-favicon-32.png','tso2-apple-touch-icon-180.png','/manifest.webmanifest']){
  assert.ok(html.includes(ref),'Missing reference: '+ref);
}
assert.doesNotMatch(html,/<link rel="icon" href="\/brand\/approved\/tso2-wordmark-horizontal-approved.webp"/);
console.log('TSO 2.0 approved app icon: all 7 binary assets and manifest dimensions verified');
