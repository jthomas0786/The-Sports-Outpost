#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const checks=[];
function ok(name,cond){ if(!cond) throw new Error('FAIL: '+name); checks.push(name); }
const ui=read('sports/nfl-preview.js');
ok('missing sim is null-safe',ui.includes("function finiteNumberOrNull")&&ui.includes('if(sp==null) return clamp'));
ok('full weekly prop pool',!ui.includes('(priced.length?priced:pool)')&&ui.includes('const scored=pool.sort'));
ok('A+ volume grade exists',ui.includes("p>=.70?'A+'"));
ok('weekly TD ordering uses game kickoff',ui.includes('const gameStart=new Date(g.startTimeUTC||0).getTime()'));
const live=read('scripts/nfl-live-poller.mjs');
ok('live snapshot keyed by weekly slate',live.includes('weekChanged')&&live.includes('schemaVersion:4,weekKey'));
const sim=read('scripts/nfl-sim-auto.mjs');
ok('simulation state rolls weekly',sim.includes('previousWeekKey')&&sim.includes('schemaVersion:2,engineVersion:config.engineVersion,weekKey'));
const wf=read('.github/workflows/nfl-slate.yml');
ok('Tuesday weekly slate cron',wf.includes("cron: '0 8 * * 2'")&&!wf.includes("cron: '0 12 * * *'"));
const router=read('sports/router.js');
ok('v86.1 cache bust',router.includes("nfl-preview.js?v=86.1"));
console.log('✓ v86.1 NFL weekly hotfix self-test passed');
for(const x of checks) console.log('  ✓ '+x);
