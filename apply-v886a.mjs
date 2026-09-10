import fs from 'node:fs';
import path from 'node:path';
const previewPath=path.join('sports','nfl-preview.js');
if(!fs.existsSync(previewPath)) throw new Error('sports/nfl-preview.js not found');
let src=fs.readFileSync(previewPath,'utf8');
function replaceLine(regex,line){ if(regex.test(src)) src=src.replace(regex,line); else src=`${line}\n${src}`; }
replaceLine(/^import .*playstage-v88.*$/m, `import { mountOrUpdateNflPlaystageV886A, renderNflPlaystageV886AHTML } from './nfl/playstage-v886a.js?v=88.6a';`);
replaceLine(/^import .*gamecast-v88.*styles.*$/m, `import { ensureNflPlaystageV886AStyles } from './nfl/gamecast-v886a-styles.js?v=88.6a';`);
src=src.replace(/renderNflPlaystageV885[a-zA-Z]*HTML\(/g,'renderNflPlaystageV886AHTML(')
       .replace(/renderNflPlaystageV886[A-Za-z]*HTML\(/g,'renderNflPlaystageV886AHTML(')
       .replace(/mountOrUpdateNflPlaystageV885[a-zA-Z]*\(/g,'mountOrUpdateNflPlaystageV886A(')
       .replace(/mountOrUpdateNflPlaystageV886[A-Za-z]*\(/g,'mountOrUpdateNflPlaystageV886A(')
       .replace(/ensureNflPlaystageV885[a-zA-Z]*Styles\(/g,'ensureNflPlaystageV886AStyles(')
       .replace(/ensureNflPlaystageV886[A-Za-z]*Styles\(/g,'ensureNflPlaystageV886AStyles(')
       .replace(/data-tso-v88[0-9a-z.-]*-gamecast/g,'data-tso-v886a-gamecast');
if(!src.includes('renderNflPlaystageV886AHTML')) throw new Error('v88.6a render import not applied');
if(!src.includes('mountOrUpdateNflPlaystageV886A')) throw new Error('v88.6a mount import not applied');
fs.writeFileSync(previewPath,src);
console.log('Applied v88.6a preview patches');
