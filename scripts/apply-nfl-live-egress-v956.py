from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(); n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {n}')
    p.write_text(s.replace(old,new,1))


def regex_once(path, pattern, repl, label, flags=0):
    p=Path(path); s=p.read_text(); out,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {n}')
    p.write_text(out)


def bump_query(path, module_pattern, label):
    p=Path(path); s=p.read_text()
    pat=rf'({module_pattern}\?v=)(\d+)\.(\d+)'
    def bump(m):
        return f'{m.group(1)}{m.group(2)}.{int(m.group(3))+1}'
    out,n=re.subn(pat,bump,s,count=1)
    if n!=1:
        raise SystemExit(f'{label}: expected one cache-bust target in {path}, found {n}')
    p.write_text(out)

# Browser live poller: 5s compact heartbeat, full detail only once/minute, hidden tabs paused.
live=Path('sports/nfl/live.js')
s=live.read_text()
if 'v95.6 low-egress NFL live transport' not in s:
    s=s.replace('const POLL_MS=2000;','// v95.6 low-egress NFL live transport\nconst POLL_MS=5000;\nconst FULL_DETAIL_REFRESH_MS=60000;',1)
    s=s.replace('let _slate=null,_onChange=null,_timer=null,_inflight=false,_lastNotifySig={};','let _slate=null,_onChange=null,_timer=null,_inflight=false,_lastNotifySig={},_lastFullFetchAt=0;',1)
    old="""async function fetchJson(url){try{const r=await fetch(url,{cache:'no-store'});if(!r?.ok)return null;const d=await r.json();return d?.games?d:null;}catch{return null;}}
async function loadLiveDocument(){const remote=configuredLiveUrl();if(remote){const data=await fetchJson(remote);if(data&&Object.keys(data.games||{}).length)return {data,source:'remote'};}const data=await fetchJson(STATIC_LIVE_URL);if(!data)return null;return {data,source:'static'};}"""
    new="""async function fetchJson(url){try{const r=await fetch(url,{cache:'no-store'});if(!r?.ok)return null;const d=await r.json();return d?.games?d:null;}catch{return null;}}
const liveModeUrl=(url,mode)=>`${url}${String(url).includes('?')?'&':'?'}mode=${encodeURIComponent(mode)}`;
async function loadLiveDocument({full=false}={}){const remote=configuredLiveUrl();if(remote){const data=await fetchJson(liveModeUrl(remote,full?'full':'compact'));if(data&&Object.keys(data.games||{}).length)return {data,source:'remote',full};}const data=await fetchJson(STATIC_LIVE_URL);if(!data)return null;return {data,source:'static',full:false};}"""
    if old not in s: raise SystemExit('live transport block missing')
    s=s.replace(old,new,1)
    s=s.replace("async function tick(){\n  if(_inflight||!_slate)return;_inflight=true;\n  try{\n    const loaded=await loadLiveDocument();if(!loaded)return;",
                "async function tick(forceFull=false){\n  if(_inflight||!_slate)return;_inflight=true;\n  try{\n    const wantFull=forceFull||Date.now()-_lastFullFetchAt>=FULL_DETAIL_REFRESH_MS;\n    const loaded=await loadLiveDocument({full:wantFull});if(!loaded)return;\n    if(loaded.source==='remote'&&loaded.full)_lastFullFetchAt=Date.now();",1)
    s=s.replace("winProbability:gl.winProbability||null,linescores:gl.linescores||null,currentDrive:gl.currentDrive||null,plays:Array.isArray(gl.plays)?gl.plays:[],playerStats:gl.playerStats||null,boxScore:gl.boxScore||null,teamStats:gl.teamStats||null,scoringPlays:Array.isArray(gl.scoringPlays)?gl.scoringPlays:[]",
                "winProbability:gl.winProbability??g.liveScore?.winProbability??null,linescores:gl.linescores??g.liveScore?.linescores??null,currentDrive:gl.currentDrive??g.liveScore?.currentDrive??null,plays:Array.isArray(gl.plays)?gl.plays:(g.liveScore?.plays||[]),playerStats:gl.playerStats??g.liveScore?.playerStats??null,boxScore:gl.boxScore??g.liveScore?.boxScore??null,teamStats:gl.teamStats??g.liveScore?.teamStats??null,scoringPlays:Array.isArray(gl.scoringPlays)?gl.scoringPlays:(g.liveScore?.scoringPlays||[])" ,1)
    old_should="function shouldPoll(){if(!_slate)return false;if(typeof document!=='undefined'&&(document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948')))return false;const now=Date.now();return(_slate.games||[]).some(g=>g.status==='in'||(g.status==='pre'&&g.startTimeUTC&&Number.isFinite(new Date(g.startTimeUTC).getTime())&&new Date(g.startTimeUTC).getTime()-now<30*60000&&new Date(g.startTimeUTC).getTime()-now>-3*3600000));}"
    new_should="function shouldPoll(){if(!_slate)return false;if(typeof document!=='undefined'){if(document.hidden)return false;if(document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return false;}const now=Date.now();return(_slate.games||[]).some(g=>g.status==='in'||(g.status==='pre'&&g.startTimeUTC&&Number.isFinite(new Date(g.startTimeUTC).getTime())&&new Date(g.startTimeUTC).getTime()-now<10*60000&&new Date(g.startTimeUTC).getTime()-now>-3*3600000));}"
    if old_should not in s: raise SystemExit('shouldPoll block missing')
    s=s.replace(old_should,new_should,1)
    old_start="export function startLivePolling(slate,onChange){_slate=slate;_onChange=onChange||null;if(_timer)clearInterval(_timer);tick();_timer=setInterval(()=>{if(shouldPoll())tick();},POLL_MS);}\nexport async function refreshLiveNow(){await tick();}\nexport function stopLivePolling(){if(_timer){clearInterval(_timer);_timer=null;}_slate=null;_onChange=null;_lastNotifySig={};_acceptedByGame.clear();}"
    new_start="export function startLivePolling(slate,onChange){_slate=slate;_onChange=onChange||null;_lastFullFetchAt=0;if(_timer)clearInterval(_timer);if(shouldPoll())tick(true);_timer=setInterval(()=>{if(shouldPoll())tick(false);},POLL_MS);}\nexport async function refreshLiveNow(){await tick(true);}\nexport function stopLivePolling(){if(_timer){clearInterval(_timer);_timer=null;}_slate=null;_onChange=null;_lastNotifySig={};_lastFullFetchAt=0;_acceptedByGame.clear();}"
    if old_start not in s: raise SystemExit('start/stop poll block missing')
    s=s.replace(old_start,new_start,1)
    live.write_text(s)

# Supabase Edge Function: compact mode omits the high-volume box/player/team payload,
# skips postgame summary downloads, and gets a shared CDN cache window.
edge=Path('supabase/functions/nfl-live/index.ts')
s=edge.read_text()
if 'v95.6 compact egress mode' not in s:
    marker='const n = (v: unknown) => {'
    inject='''// v95.6 compact egress mode: browser heartbeats carry only live Gamecast essentials.\nconst headersFor = (compact: boolean) => ({\n  ...CORS,\n  "cache-control": compact\n    ? "public, max-age=3, s-maxage=5, stale-while-revalidate=10"\n    : "public, max-age=5, s-maxage=10, stale-while-revalidate=20",\n});\n\n'''
    if marker not in s: raise SystemExit('edge header insertion marker missing')
    s=s.replace(marker,inject+marker,1)
    serve='Deno.serve(async (req: Request) => {\n  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });'
    repl='Deno.serve(async (req: Request) => {\n  const compact = new URL(req.url).searchParams.get("mode") === "compact";\n  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(compact) });'
    if serve not in s: raise SystemExit('edge serve marker missing')
    s=s.replace(serve,repl,1)
    s=s.replace('{ status: 405, headers: CORS }','{ status: 405, headers: headersFor(compact) }',1)
    s=s.replace('if (g.status === "in" || g.status === "post") {','if (g.status === "in" || (!compact && g.status === "post")) {',1)
    s=s.replace('const plays = recent(summary);','const plays = compact ? recent(summary).slice(-12) : recent(summary);',1)
    detail='''              playerStats: playerStats(summary),\n              boxScore: fullBoxScore(summary),\n              teamStats: teamStats(summary),'''
    if detail not in s: raise SystemExit('edge full detail fields missing')
    s=s.replace(detail,'              ...(compact ? {} : { playerStats: playerStats(summary), boxScore: fullBoxScore(summary), teamStats: teamStats(summary) }),',1)
    # Remaining success/error responses use the mode-specific cache header.
    s=s.replace('{ status: 200, headers: CORS }','{ status: 200, headers: headersFor(compact) }',1)
    s=s.replace('{ status: 502, headers: CORS }','{ status: 502, headers: headersFor(compact) }',1)
    edge.write_text(s)

# Command Center: never run its independent Supabase poll while closed; use compact payload when open.
cc=Path('sports/nfl/command-center-client.js')
s=cc.read_text()
if 'compactLiveUrl' not in s:
    s=s.replace("const liveUrl=()=>window.DW_NFL_LIVE_ENDPOINT||window.TSO_NFL_LIVE_URL||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';",
                "const liveUrl=()=>window.DW_NFL_LIVE_ENDPOINT||window.TSO_NFL_LIVE_URL||'https://hjhfbhpuuxnrexddplxd.supabase.co/functions/v1/nfl-live';\nconst compactLiveUrl=()=>{const u=liveUrl();return `${u}${String(u).includes('?')?'&':'?'}mode=compact`;};",1)
    s=s.replace("if(busy||document.hidden||document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return;",
                "if(busy||document.hidden||!document.getElementById('ccFootballCol')?.classList.contains('active')||document.getElementById('nflPlayerPropTool')||document.getElementById('nflView')?.classList.contains('nfl-ppt-active-v948'))return;",1)
    s=s.replace('get(liveUrl()),get(\'./slates/nfl-live-odds.json\')','get(compactLiveUrl()),get(\'./slates/nfl-live-odds.json\')',1)
    cc.write_text(s)

# Cache-bust the active module chain so existing browsers receive the new poller immediately.
preview=Path('sports/nfl-preview.js'); s=preview.read_text()
s,n=re.subn(r"\./nfl/live\.js\?v=\d+\.\d+", "./nfl/live.js?v=89.22", s, count=1)
if n!=1: raise SystemExit('base preview live import cache marker missing')
preview.write_text(s)

v890=Path('sports/nfl-preview-v890.js'); s=v890.read_text()
s,n=re.subn(r"\./nfl/live\.js\?v=\d+\.\d+", "./nfl/live.js?v=89.22", s, count=1)
if n!=1: raise SystemExit('v890 live preload cache marker missing')
s,n=re.subn(r"\./nfl-preview\.js\?v=\d+\.\d+", "./nfl-preview.js?v=89.44", s, count=1)
if n!=1: raise SystemExit('v890 base preview cache marker missing')
v890.write_text(s)

v893=Path('sports/nfl-preview-v893.js'); s=v893.read_text()
s,n=re.subn(r"\./nfl-preview-v890\.js\?v=\d+\.\d+", "./nfl-preview-v890.js?v=89.44", s, count=1)
if n!=1: raise SystemExit('v893 base wrapper cache marker missing')
v893.write_text(s)

router=Path('sports/router.js'); s=router.read_text()
s,n=re.subn(r"\./nfl-preview-v893\.js\?v=[^']+", "./nfl-preview-v893.js?v=95.6", s, count=1)
if n!=1: raise SystemExit('router NFL cache marker missing')
router.write_text(s)

index=Path('index.html'); s=index.read_text()
pat=r'(\./sports/router\.js\?v=)(\d+)\.(\d+)'
def bump(m): return f"{m.group(1)}{m.group(2)}.{int(m.group(3))+1}"
s,n=re.subn(pat,bump,s,count=1)
if n!=1: raise SystemExit('outer router cache marker missing')
index.write_text(s)

# Keep permanent regressions version-agnostic where this transport-only cache bust is concerned.
ptest=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
if ptest.exists():
    s=ptest.read_text()
    s=s.replace("assert.ok(router.includes(\"import('./nfl-preview-v893.js?v=95.3')\"),'router must hard cache-bust NFL preview to v94.9');",
                "assert.ok(/import\\('\\.\\/nfl-preview-v893\\.js\\?v=[^']+'\\)/.test(router),'router must hard cache-bust NFL preview');")
    ptest.write_text(s)

gct=Path('.github/workflows/nfl-gamecast-tests.yml')
if gct.exists():
    s=gct.read_text().replace('grep -F "./nfl/live.js?v=89.21" sports/nfl-preview.js','grep -F "./nfl/live.js?v=89.22" sports/nfl-preview.js')
    gct.write_text(s)

print('v95.6 low-egress NFL live transport applied')
