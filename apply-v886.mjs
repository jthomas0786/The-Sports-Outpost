import fs from 'node:fs';
import path from 'node:path';

const previewPath=path.join('sports','nfl-preview.js');
if(!fs.existsSync(previewPath)) throw new Error('sports/nfl-preview.js not found');
let src=fs.readFileSync(previewPath,'utf8');

function upsertImport(matchers, line){
  let replaced=false;
  for(const rx of matchers){
    if(rx.test(src)){ src=src.replace(rx, line); replaced=true; break; }
  }
  if(!replaced) src = `${line}\n${src}`;
}

upsertImport([
  /^import .*playstage-v885a.*$/m,
  /^import .*playstage-v885.*$/m,
  /^import .*playstage-v886.*$/m
], `import { mountOrUpdateNflPlaystageV886, renderNflPlaystageV886HTML } from './nfl/playstage-v886.js?v=88.6';`);

upsertImport([
  /^import .*gamecast-v885-styles.*$/m,
  /^import .*gamecast-v886-styles.*$/m
], `import { ensureNflPlaystageV886Styles } from './nfl/gamecast-v886-styles.js?v=88.6';`);

const replacements=[
  [/renderNflPlaystageV885aHTML\(/g,'renderNflPlaystageV886HTML('],
  [/renderNflPlaystageV885HTML\(/g,'renderNflPlaystageV886HTML('],
  [/mountOrUpdateNflPlaystageV885a\(/g,'mountOrUpdateNflPlaystageV886('],
  [/mountOrUpdateNflPlaystageV885\(/g,'mountOrUpdateNflPlaystageV886('],
  [/ensureNflPlaystageV885Styles\(/g,'ensureNflPlaystageV886Styles('],
  [/ensureNflPlaystageV885aStyles\(/g,'ensureNflPlaystageV886Styles('],
  [/data-tso-v885-gamecast/g,'data-tso-v886-gamecast']
];
for(const [rx,repl] of replacements) src=src.replace(rx,repl);

if(!/renderNflPlaystageV886HTML\(/.test(src)){
  src=src.replace(/const\s+gameView\s*=\s*[^;]+;/, `const gameView=renderNflPlaystageV886HTML(g,{halftime:state.halftime});`);
}
if(!/mountOrUpdateNflPlaystageV886\(/.test(src) && /mountOrUpdateNflPlaystageV886/.test(src)){
  src += `\n\n// v88.6 note: direct renderer import installed.`;
}

fs.writeFileSync(previewPath,src);
console.log('Applied v88.6 preview patches');
