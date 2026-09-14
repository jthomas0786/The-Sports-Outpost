from pathlib import Path
import re


def must_replace(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'{label}: expected text not found')


# 1) Correct the fallback aspect to the actual approved field-bg.jpg dimensions
# and add responsive rules that prevent the three-column desktop shell from
# overflowing phones/tablets.
v915 = Path('sports/mlb/playstage-concept-v915.js')
s = v915.read_text()
s = must_replace(
    s,
    "const FALLBACK_ASPECT='1536 / 1025';",
    "const FALLBACK_ASPECT='1536 / 1024';",
    'v915 fallback aspect',
)

responsive = r'''/* v915 responsive shell: preserve the approved field composition while the entire Gamecast fits the viewport. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
  width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{min-width:0!important;max-width:100%!important}
@media(max-width:900px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{grid-template-columns:minmax(0,1fr)!important;gap:8px!important;padding:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live{justify-self:stretch!important;justify-content:center!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{width:100%!important;min-width:0!important;grid-template-columns:minmax(0,1fr) auto 54px auto minmax(0,1fr)!important;gap:6px!important;padding:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:34px!important;height:34px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:clamp(14px,4.5vw,19px)!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:30px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{min-width:0!important;padding-left:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{grid-template-columns:minmax(0,1fr)!important;min-height:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{grid-row:1!important;width:100%!important;min-width:0!important;overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{width:100%!important;min-width:0!important;border-left:0!important;border-right:0!important;border-top:1px solid #18395e!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left .ps-card,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right .ps-card{min-width:0!important;margin:0!important}
}
@media(max-width:620px){
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{border-radius:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{padding:7px!important;gap:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{grid-template-columns:minmax(0,1fr) auto 44px auto minmax(0,1fr)!important;gap:4px!important;padding:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{gap:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:28px!important;height:28px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:clamp(12px,4vw,16px)!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team small{font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:25px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-inning{font-size:9px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{grid-template-columns:minmax(0,1fr)!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{border-left:0!important;border-top:1px solid #193657!important;padding:6px 0 0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{grid-template-columns:minmax(0,1fr)!important;padding:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{width:100%!important;max-width:100%!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{left:5px!important;top:5px!important;max-width:58%!important;padding:5px 7px!important;gap:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner .ball{font-size:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner b{font-size:12px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner span{font-size:8px!important;line-height:1.2!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{right:5px!important;top:5px!important;max-width:40%!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric{padding:4px 5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric b{font-size:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{left:6px!important;right:6px!important;transform:none!important;width:auto!important;max-width:none!important;bottom:6px!important;padding:5px 7px!important;font-size:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{display:none!important}
}
'''
marker = '@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}'
if '/* v915 responsive shell:' not in s:
    if marker not in s:
        raise SystemExit('v915 reduced-motion marker missing')
    s = s.replace(marker, responsive + '\n' + marker, 1)
v915.write_text(s)

# 2) Cache-bust the corrected v915 concept layer.
router = Path('sports/router.js')
r = router.read_text()
r = must_replace(
    r,
    "./mlb/playstage-concept-v915.js?v=91.51",
    "./mlb/playstage-concept-v915.js?v=91.52",
    'router v915 cache bust',
)
router.write_text(r)

# 3) Keep static regression assertions aligned with the production import and
# require the responsive shell markers.
test = Path('scripts/mlb-playstage-selftest.mjs')
t = test.read_text().replace(
    "./mlb/playstage-concept-v915.js?v=91.51",
    "./mlb/playstage-concept-v915.js?v=91.52",
)
anchor = "assert.ok(conceptV915.includes('object-fit:contain!important'),'v915 must preserve the entire approved image');\n"
extra = (
    "assert.ok(conceptV915.includes('/* v915 responsive shell:'),'v915 must include responsive Gamecast shell');\n"
    "assert.ok(conceptV915.includes('@media(max-width:900px)'),'v915 must collapse the three-column shell for tablets/mobile');\n"
    "assert.ok(conceptV915.includes('@media(max-width:620px)'),'v915 must include phone-specific scaling');\n"
)
if 'v915 must include responsive Gamecast shell' not in t:
    if anchor not in t:
        raise SystemExit('selftest insertion anchor missing')
    t = t.replace(anchor, anchor + extra, 1)
test.write_text(t)

# 4) Correct the visual-QA expectation to the actual GitHub asset dimensions and
# add a 390px phone pass that fails on any horizontal overflow.
qa = Path('.github/workflows/one-time-mlb-playstage-v915-visual-qa.yml')
q = qa.read_text().replace("q.fieldNatural[1]!==1025", "q.fieldNatural[1]!==1024")
if 'mlb-playstage-v915-mobile.png' not in q:
    close = '          await b.close();'
    mobile = r'''          await p.setViewportSize({width:390,height:844});
          await p.reload({waitUntil:'domcontentloaded'});
          await p.waitForSelector('.tso-mlb-concept-v915',{timeout:30000});
          await p.waitForFunction(()=>{const i=document.querySelector('.ps914-field');return i?.complete&&i.naturalWidth>0&&i.getAttribute('src')==='./field-bg.jpg'},{timeout:30000});
          await p.waitForTimeout(1200);
          await p.locator('.tso-mlb-playstage-v901').screenshot({path:'qa/mlb-playstage-v915-mobile.png'});
          const mobile=await p.evaluate(()=>{
            const root=document.querySelector('.tso-mlb-playstage-v901');
            const stage=document.querySelector('.ps-stage');
            const field=document.querySelector('.ps914-field');
            const rr=root?.getBoundingClientRect(),sr=stage?.getBoundingClientRect();
            const actors=[...document.querySelectorAll('.ps-chibi')];
            return {
              viewport:innerWidth,
              docWidth:document.documentElement.scrollWidth,
              rootLeft:rr?.left??0,
              rootRight:rr?.right??0,
              rootWidth:rr?.width??0,
              stageWidth:sr?.width??0,
              stageAspect:sr?.height?sr.width/sr.height:0,
              imageAspect:field?.naturalHeight?field.naturalWidth/field.naturalHeight:0,
              fieldNatural:[field?.naturalWidth||0,field?.naturalHeight||0],
              idleVisible:actors.filter(e=>parseFloat(getComputedStyle(e).opacity)>.01).length
            };
          });
          fs.writeFileSync('qa/mlb-playstage-v915-mobile.json',JSON.stringify(mobile,null,2));
          console.log({mobile});
          if(mobile.docWidth>mobile.viewport+1||mobile.rootLeft<-1||mobile.rootRight>mobile.viewport+1||mobile.stageWidth>mobile.rootWidth+1||mobile.fieldNatural[0]!==1536||mobile.fieldNatural[1]!==1024||Math.abs(mobile.stageAspect-mobile.imageAspect)>.005||mobile.idleVisible)process.exitCode=4;
'''
    if close not in q:
        raise SystemExit('QA browser close marker missing')
    q = q.replace(close, mobile + close, 1)
    q = q.replace(
        'git add qa/mlb-playstage-v915-current.png qa/mlb-playstage-v915-stage.png qa/mlb-playstage-v915-current.json',
        'git add qa/mlb-playstage-v915-current.png qa/mlb-playstage-v915-stage.png qa/mlb-playstage-v915-current.json qa/mlb-playstage-v915-mobile.png qa/mlb-playstage-v915-mobile.json',
        1,
    )
qa.write_text(q)

# 5) Bust the outer router import so browsers cannot keep the old v915 module URL.
index = Path('index.html')
ix = index.read_text()
ix2, n = re.subn(r'(\./sports/router\.js\?v=)[A-Za-z0-9._-]+', r'\g<1>90.37', ix, count=1)
if n != 1:
    raise SystemExit('index router cache-bust tag missing')
index.write_text(ix2)

print('Applied MLB v915 approved-field mobile scaling patch')
