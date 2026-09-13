from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def must_replace(text, old, new, label, count=1):
    found = text.count(old)
    if found < count:
        raise SystemExit(f'{label}: expected at least {count} occurrence(s), found {found}')
    return text.replace(old, new, count)


# 1) Put defensive actors and hit destinations into the new broadcast-perspective field.
p = Path('sports/mlb/playstage-v901.js')
s = p.read_text()
s = must_replace(
    s,
    "const DEF_POS={P:[50,66],C:[50,88],'1B':[66,62],'2B':[58,51],SS:[42,51],'3B':[34,62],LF:[25,31],CF:[50,22],RF:[75,31]};",
    "const DEF_POS={P:[50,66],C:[50,88],'1B':[66,62],'2B':[58,51],SS:[42,51],'3B':[34,62],LF:[27,45],CF:[50,41],RF:[73,45]};",
    'broadcast defensive coordinates',
)
s = must_replace(
    s,
    "if(x!=null&&y!=null){x=18+(x/250)*64;y=18+(y/250)*58;return[Math.max(14,Math.min(86,x)),Math.max(18,Math.min(75,y))];}",
    "if(x!=null&&y!=null){x=17+(x/250)*66;y=39+(y/250)*31;return[Math.max(13,Math.min(87,x)),Math.max(39,Math.min(72,y))];}",
    'Statcast field-coordinate projection',
)
s = must_replace(
    s,
    "const desc=String(play?.result?.description||'').toLowerCase();if(desc.includes('left field'))return[25,30];if(desc.includes('right field'))return[75,30];if(desc.includes('center'))return[50,22];if(desc.includes('shortstop'))return[42,51];if(desc.includes('second baseman'))return[58,51];if(desc.includes('third baseman'))return[34,62];if(desc.includes('first baseman'))return[66,62];if(kind==='ground_out'||kind==='ground_ball'||kind==='double_play')return[45,56];return[58,31];",
    "const desc=String(play?.result?.description||'').toLowerCase();if(desc.includes('left field'))return[27,45];if(desc.includes('right field'))return[73,45];if(desc.includes('center'))return[50,41];if(desc.includes('shortstop'))return[42,51];if(desc.includes('second baseman'))return[58,51];if(desc.includes('third baseman'))return[34,62];if(desc.includes('first baseman'))return[66,62];if(kind==='ground_out'||kind==='ground_ball'||kind==='double_play')return[45,56];return[58,44];",
    'fallback hit destinations',
)
p.write_text(s)

# 2) Final v905 visual polish: perspective scaling, equipment correctness and a dimensional ball.
p = Path('sports/mlb/playstage-concept-v905.js')
s = p.read_text()
old = 'html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi.ps-batter{width:118px!important;height:164px!important;transform:translate(-50%,-66%)!important}.ps-chibi.ps-pitcher{width:88px!important;height:126px!important}.ps-chibi.ps-catcher{width:92px!important;height:124px!important}.ps-chibi.ps-runner{width:80px!important;height:114px!important}.ps-chibi[data-pos="LF"],.ps-chibi[data-pos="CF"],.ps-chibi[data-pos="RF"]{width:61px!important;height:88px!important}'
new = old.replace('width:61px!important;height:88px!important', 'width:44px!important;height:64px!important') + '''
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi.ps-batter .ps905-mitt,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi.ps-runner .ps905-mitt{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi.ps-batter .ps905-cap>path:nth-child(2){opacity:.16}.ps-chibi.ps-batter .ps905-cap{transform:scale(1.055) translateY(1px);transform-origin:60px 36px}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-ball{z-index:73!important;width:11px!important;height:11px!important;border:1px solid rgba(130,142,148,.75)!important;background:radial-gradient(circle at 34% 28%,#fff 0 28%,#f6f3ec 45%,#d4d7d4 74%,#9da8aa 100%)!important;box-shadow:0 0 0 2px rgba(255,255,255,.08),0 0 12px rgba(255,255,255,.72),0 3px 7px rgba(0,0,0,.35)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-ball:after{content:'';position:absolute;inset:-9px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.2),rgba(131,205,255,.08) 38%,transparent 72%);pointer-events:none}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi[data-pos="LF"]>.ps905-rig,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi[data-pos="CF"]>.ps905-rig,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v905 .ps-chibi[data-pos="RF"]>.ps905-rig{filter:drop-shadow(0 3px 2px rgba(0,0,0,.42));}
'''
s = must_replace(s, old, new, 'v905 role/depth polish')
p.write_text(s)

# 3) Cache-bust the changed concept and router so the deployed visual updates immediately.
p = Path('sports/router.js')
s = p.read_text()
s = must_replace(s, "import('./mlb/playstage-concept-v905.js?v=90.5')", "import('./mlb/playstage-concept-v905.js?v=90.51')", 'v905 import cache bust')
p.write_text(s)

p = Path('index.html')
s = p.read_text()
s = must_replace(s, './sports/router.js?v=90.11', './sports/router.js?v=90.12', 'router cache bust')
p.write_text(s)

# 4) Expand PlayStage regression coverage for the new geometry/rig layer.
p = Path('scripts/mlb-playstage-selftest.mjs')
s = p.read_text()
s = must_replace(s, "assert.deepEqual(t.hitTarget({result:{description:'Fly ball to left field'}},'fly_out'),[25,30]);", "assert.deepEqual(t.hitTarget({result:{description:'Fly ball to left field'}},'fly_out'),[27,45]);", 'fly target regression')
s = must_replace(s, "assert.deepEqual(t.BASE_POS.second,[50,49]);", "assert.deepEqual(t.BASE_POS.second,[50,49]);\nassert.deepEqual(t.DEF_POS.CF,[50,41]);", 'CF depth regression')
anchor = "const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');"
v905_checks = '''const conceptV905=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v905.js',import.meta.url),'utf8');
for(const marker of [
  'tso-mlb-concept-v905',
  'ps905-stadium',
  'ps905-grandstand',
  'ps905-board-shell',
  'ps905-rig',
  'ps905WindupCore',
  'ps905PitchArm',
  'ps905SwingCore',
  'ps905RunBob',
  'ps905FieldGrounder',
  'ps905TrackFly',
  'ps905DpCore',
  'ps905CatcherPop',
  'ps905SlideCore',
  'ps905TagCore',
  'ps905-rounding',
  'ps-chibi.ps-batter .ps905-mitt',
]) assert.ok(conceptV905.includes(marker),`v905 concept missing ${marker}`);

'''
s = must_replace(s, anchor, v905_checks + anchor, 'v905 regression block')
s = must_replace(s, "assert.ok(router.includes(\"./mlb/playstage-concept-v904.js?v=90.4\"),'Router must load approved MLB concept');", "assert.ok(router.includes(\"./mlb/playstage-concept-v904.js?v=90.4\"),'Router must load approved MLB concept');\nassert.ok(router.includes(\"./mlb/playstage-concept-v905.js?v=90.51\"),'Router must load v905 MLB concept');", 'v905 router assertion')
s = must_replace(s, "assert.ok(router.includes('installMlbPlaystageConceptV904'),'Router must install approved MLB concept');", "assert.ok(router.includes('installMlbPlaystageConceptV904'),'Router must install approved MLB concept');\nassert.ok(router.includes('installMlbPlaystageConceptV905'),'Router must install v905 MLB concept');", 'v905 installer assertion')
p.write_text(s)

print('Applied MLB PlayStage v905 depth/perspective polish, cache busts and regression coverage.')
