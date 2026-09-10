import fs from 'node:fs';
import path from 'node:path';

const previewPath = path.join('sports', 'nfl-preview.js');
if (!fs.existsSync(previewPath)) throw new Error('sports/nfl-preview.js not found');
let src = fs.readFileSync(previewPath, 'utf8');

function ensureImport(regex, line) {
  if (regex.test(src)) src = src.replace(regex, line);
  else src = `${line}\n${src}`;
}

ensureImport(/^import .*playstage-v88.*$/m, `import { mountOrUpdateNflPlaystageV886B, renderNflPlaystageV886BHTML } from './nfl/playstage-v886b.js?v=88.6b';`);
ensureImport(/^import .*gamecast-v88.*styles.*$/m, `import { ensureNflPlaystageV886BStyles } from './nfl/gamecast-v886b-styles.js?v=88.6b';`);

src = src
  .replace(/renderNflPlaystageV88[0-9A-Za-z.]*HTML\(/g, 'renderNflPlaystageV886BHTML(')
  .replace(/mountOrUpdateNflPlaystageV88[0-9A-Za-z.]*\(/g, 'mountOrUpdateNflPlaystageV886B(')
  .replace(/ensureNflPlaystageV88[0-9A-Za-z.]*Styles\(/g, 'ensureNflPlaystageV886BStyles(')
  .replace(/data-tso-v88[0-9a-z.-]*-gamecast/g, 'data-tso-v886b-gamecast');

if (!src.includes('renderNflPlaystageV886BHTML')) throw new Error('render hook not updated');
if (!src.includes('mountOrUpdateNflPlaystageV886B')) throw new Error('mount hook not updated');

fs.writeFileSync(previewPath, src);
console.log('Applied v88.6b preview patches');
