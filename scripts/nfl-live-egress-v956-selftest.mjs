#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const live=fs.readFileSync('sports/nfl/live.js','utf8');
const edge=fs.readFileSync('supabase/functions/nfl-live/index.ts','utf8');
const cc=fs.readFileSync('sports/nfl/command-center-client.js','utf8');
const preview=fs.readFileSync('sports/nfl-preview.js','utf8');

assert.ok(live.includes('v95.6 low-egress NFL live transport'),'low-egress marker missing');
assert.ok(live.includes('const POLL_MS=5000'),'browser heartbeat must not remain at 2 seconds');
assert.ok(live.includes('const FULL_DETAIL_REFRESH_MS=60000'),'full-detail refresh interval missing');
assert.ok(live.includes("full?'full':'compact'"),'browser must request compact mode between detail refreshes');
assert.ok(live.includes('if(document.hidden)return false'),'hidden tabs must stop NFL live network polling');
assert.ok(live.includes("<10*60000"),'pregame remote polling window must be reduced to ten minutes');
assert.ok(live.includes('gl.playerStats??g.liveScore?.playerStats'),'compact heartbeats must preserve cached player details');
assert.ok(live.includes('gl.boxScore??g.liveScore?.boxScore'),'compact heartbeats must preserve cached box score');
assert.ok(live.includes('if(shouldPoll())tick(true)'),'initial full fetch must only happen inside the live/pregame polling window');

assert.ok(edge.includes('v95.6 compact egress mode'),'edge compact marker missing');
assert.ok(edge.includes('searchParams.get("mode") === "compact"'),'Edge Function must expose compact mode');
assert.ok(edge.includes('s-maxage=5'),'compact mode must use shared CDN caching');
assert.ok(edge.includes('(!compact && g.status === "post")'),'compact mode must not build expensive postgame summaries');
assert.ok(edge.includes('recent(summary).slice(-12)'),'compact mode must cap recent play payload');
assert.ok(edge.includes('compact ? {} : { playerStats: playerStats(summary), boxScore: fullBoxScore(summary), teamStats: teamStats(summary) }'),'compact mode must omit heavy player/box/team payload');

assert.ok(cc.includes('compactLiveUrl'),'Command Center must use compact live endpoint');
assert.ok(cc.includes("!document.getElementById('ccFootballCol')?.classList.contains('active')"),'closed Command Center must not poll Supabase');
assert.ok(cc.includes('get(compactLiveUrl())'),'Command Center remote fetch must be compact');
assert.ok(preview.includes("./nfl/live.js?v=89.22"),'active NFL preview must cache-bust low-egress poller');

console.log('✓ NFL v95.6 low-egress live transport regression passed');
