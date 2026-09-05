// Pulls a function's real source directly out of index.html at test-run
// time, rather than maintaining a hand-copied snapshot of it in the test
// file. This matters specifically because index.html is one large,
// deliberately single-file app (not a module system) — copying function
// bodies into test files would silently drift from production the next
// time someone edits the real function and forgets the test's copy.
//
// Matching is intentionally simple (brace-counting from `function name(`
// to its closing brace) rather than a full JS parser, since every
// function this suite extracts is a straightforward top-level
// `function name(...) { ... }` declaration.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, '..', 'index.html');

/** Extracts one or more named top-level functions from index.html and
 *  returns them, already evaluated, as real callable JS functions. Any
 *  extra `helperSource` is prepended first (for small dependencies a
 *  function needs, like `clamp`, without pulling in the whole app). */
export function loadFunctions(names, helperSource = ''){
  const html = readFileSync(INDEX_PATH, 'utf8');
  const sources = names.map(name => extractFunction(html, name));
  const combined = helperSource + '\n' + sources.join('\n\n') + '\n' +
    `module.exports = { ${names.join(', ')} };`;
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func — intentional: this IS the point,
  // running the real extracted source rather than a re-typed copy of it.
  new Function('module', 'exports', combined)(mod, mod.exports);
  return mod.exports;
}

function extractFunction(html, name){
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if(start === -1) throw new Error(`extract-from-index: could not find "${marker}" in index.html — has it been renamed or removed?`);
  let i = html.indexOf('{', start);
  if(i === -1) throw new Error(`extract-from-index: found "${marker}" but no opening brace after it`);
  let depth = 0;
  const bodyStart = i;
  for(; i < html.length; i++){
    if(html[i] === '{') depth++;
    else if(html[i] === '}'){
      depth--;
      if(depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error(`extract-from-index: unbalanced braces extracting "${name}" — reached end of file`);
}
