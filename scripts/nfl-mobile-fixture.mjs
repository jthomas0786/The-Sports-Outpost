import fs from 'node:fs';
import {fixture} from './nfl-prop-watch-selftest.mjs';
import {buildNflCommandCenter,renderNflCommandCenter} from '../sports/nfl/command-center.js';
const f=fixture(),model=buildNflCommandCenter(f);
model.alerts.push({...model.alerts.find(a=>a.type==='Prop watch'),key:'waiting',name:'Waiting For Updated Projection',model:null});
fs.writeFileSync('tests/nfl-prop-watch.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic NFL watch scenario</title><script type="module">const html=await(await fetch('../index.html')).text();const parsed=new DOMParser().parseFromString(html,'text/html');for(const style of parsed.querySelectorAll('style'))document.head.append(style.cloneNode(true));</script><div class="cc-backdrop is-open"><div class="cc-panel"><div class="cc-header"><h2>Synthetic NFL scenario</h2></div><div class="cc-body"><div id="ccFootballCol" class="active">${renderNflCommandCenter(model)}</div></div></div></div></html>`);
