import fs from 'node:fs/promises';
import {buildPuckLineJesusModel} from '../sports/nhl/puck-line-jesus.js';
import {updatePljHistory} from './nhl-plj-history-lib.mjs';

const HISTORY='slates/nhl-plj-history.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const fallback={version:1,updatedAt:null,season:'2026-27',summary:{tracked:0,completed:0,pljLive:0,pljCashes:0,lateCashes:0,backdoors:0,covered:0},games:[]};

const [slate,lines,history]=await Promise.all([
 read('slates/nhl.json'),
 read('slates/nhl-puck-lines.json'),
 read(HISTORY).catch(()=>fallback)
]);
const model=buildPuckLineJesusModel(slate,lines);
model.season=slate.season||lines.season||history.season||'';
const next=updatePljHistory(history,model,new Date());
next.season=model.season;
await fs.writeFile(HISTORY,JSON.stringify(next,null,2)+'\n');
console.log(`PLJ history: tracked=${next.summary.tracked} completed=${next.summary.completed} live=${next.summary.pljLive} cashes=${next.summary.pljCashes} backdoors=${next.summary.backdoors}`);
