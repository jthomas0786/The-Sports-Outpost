// TSO 2.0 real Parlay Ping integration regression tests.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=readFileSync(new URL('./pages.js',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
const shell=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const route=pages.slice(pages.indexOf('    parlays(league){'),pages.indexOf('    community(league){'));
assert(route.startsWith('    parlays(league){'));
assert(route.includes('data-parlayping-workspace'));
assert(route.includes('data-parlayping-frame'));
assert(route.includes('https://parlayping.thesportsoutpost.com/?tso_embed=1'));
assert(!route.includes('data-parlay-mode'), 'Removed old Parlay Lab engine must not appear on the tab');
assert(!route.includes('target="_blank"'),'Feature controls cannot lead users off the TSO tab');
for(const path of ['/', '/submit','/profile','/trending','/profile?tab=community','/profile?tab=dev','/account.html'])
  assert(route.includes('data-parlayping-page="'+path+'"'),'Missing Parlay Ping section '+path);
assert(app.includes('function mountParlayPingWorkspace()'));
assert(app.includes("if(currentRoute==='parlays')mountParlayPingWorkspace()"));
assert(css.includes('.parlayping-workspace-frame-shell iframe'));
assert(shell.includes('data-route="parlays"')&&shell.includes('PARLAY PING'));
console.log('TSO 2.0 full Parlay Ping in-tab features, no off-site link hub: PASS');
