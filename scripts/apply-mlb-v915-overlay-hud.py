from pathlib import Path
import re

concept = Path('sports/mlb/playstage-concept-v915.js')
s = concept.read_text()

hud_marker = '/* v915 overlay HUD refresh */'
reduced = '@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}'
hud_css = r'''
/* v915 overlay HUD refresh */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  display:grid!important;grid-template-columns:minmax(0,1fr) 205px!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  grid-column:1!important;position:relative!important;min-width:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  grid-column:2!important;position:relative!important;min-width:0!important;width:auto!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
  position:absolute!important;top:12px!important;width:232px!important;z-index:94!important;margin:0!important;
  padding:7px!important;border-radius:11px!important;border:1px solid rgba(118,187,255,.42)!important;
  background:linear-gradient(180deg,rgba(7,25,49,.76),rgba(3,13,29,.66))!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.18)!important;backdrop-filter:blur(16px) saturate(1.18)!important;
  box-shadow:0 10px 28px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.07)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-atbat-card{left:12px!important;right:auto!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-pitcher-card{right:12px!important;left:auto!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{font-size:9px!important;color:#c9def6!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{width:17px!important;height:17px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{grid-template-columns:46px minmax(0,1fr)!important;gap:7px!important;margin-top:5px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:54px!important;border-radius:7px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{font-size:16px!important;line-height:1.02!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta{font-size:8px!important;line-height:1.22!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{margin-top:5px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat{padding-top:4px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat b{font-size:13px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat span{font-size:7px!important;margin-top:2px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
  position:absolute!important;left:12px!important;top:144px!important;width:232px!important;z-index:95!important;margin:0!important;
  min-height:28px!important;padding:6px 8px!important;border:1px solid rgba(118,187,255,.34)!important;border-radius:9px!important;
  background:rgba(3,16,34,.64)!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;
  box-shadow:0 8px 22px rgba(0,0,0,.26)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{font-size:7px!important;color:#a9c8eb!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{font-size:13px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{
  position:absolute!important;left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important;
  z-index:96!important;min-width:320px!important;border:1px solid rgba(106,178,246,.42)!important;
  background:rgba(3,16,34,.70)!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;
  box-shadow:0 9px 26px rgba(0,0,0,.28)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric{padding:8px 12px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:8px!important;white-space:nowrap!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric b{font-size:16px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{
  position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:18px!important;transform:translateX(-50%)!important;
  z-index:97!important;width:max-content!important;max-width:min(700px,74%)!important;margin:0!important;padding:9px 14px!important;
  align-items:center!important;border:1px solid rgba(90,175,255,.50)!important;background:rgba(3,17,36,.76)!important;
  -webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important;box-shadow:0 10px 28px rgba(0,0,0,.34)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner .ball{font-size:20px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner b{font-size:18px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner span{font-size:10px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-callout{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{bottom:2px!important;opacity:.42!important;font-size:6px!important;padding:3px 6px!important}

/* Phones keep the desktop composition, but render it responsively instead of shrinking 1440px to ~25%. */
@media(max-width:720px){
  html[data-sport="mlb"] .ps915-scale-frame{height:auto!important;overflow:hidden!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
    width:100%!important;min-width:0!important;max-width:none!important;transform:none!important;margin-left:0!important;border-radius:10px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{
    min-height:50px!important;grid-template-columns:46px minmax(0,1fr) 78px!important;gap:4px!important;padding:5px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live{gap:3px!important;padding:5px!important;border-radius:6px!important;font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live i{width:5px!important;height:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{grid-template-columns:1fr auto 40px auto 1fr!important;gap:3px!important;padding:4px 5px!important;border-radius:7px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{gap:3px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:20px!important;height:20px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:10px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team small{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:17px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-inning{font-size:7px!important;line-height:1.15!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bases-mini{transform:scale(.64)!important;transform-origin:center!important;margin:-2px auto!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{display:block!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block{min-height:0!important;gap:4px!important;padding-left:5px!important;border-left:1px solid #193657!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-icon{font-size:14px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather b{font-size:9px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather span{font-size:6.5px!important;line-height:1.15!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{grid-template-columns:minmax(0,1fr) 96px!important;min-height:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{display:block!important;padding:3px!important;border-left:1px solid #18395e!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right-tabs{grid-template-columns:repeat(2,1fr)!important;gap:2px!important;margin-bottom:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right-tabs button{min-height:22px!important;padding:3px 1px!important;font-size:8px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item{gap:3px!important;padding:5px 2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item b{font-size:9px!important;line-height:1.05!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item p{font-size:7.5px!important;line-height:1.2!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-item small{font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
    top:4px!important;width:28%!important;min-width:0!important;padding:4px!important;border-radius:7px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-atbat-card{left:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-pitcher-card{right:4px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{font-size:7px!important;gap:2px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{width:11px!important;height:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{grid-template-columns:26px minmax(0,1fr)!important;gap:3px!important;margin-top:3px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:31px!important;border-radius:5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{font-size:10.5px!important;line-height:1.02!important;overflow-wrap:anywhere!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
    left:4px!important;top:52px!important;width:28%!important;min-height:20px!important;padding:4px!important;gap:3px!important;border-radius:6px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{font-size:9.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metrics{
    left:50%!important;right:auto!important;top:4px!important;width:38%!important;min-width:0!important;transform:translateX(-50%)!important;border-radius:6px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric{padding:4px 1px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:6px!important;line-height:1!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-metric b{font-size:9.5px!important;line-height:1!important;margin-top:3px!important;white-space:nowrap!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner{
    left:50%!important;bottom:6px!important;width:auto!important;max-width:84%!important;padding:5px 7px!important;gap:5px!important;border-radius:7px!important;
  }
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner .ball{font-size:12px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner b{font-size:11.5px!important;line-height:1!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-play-banner span{font-size:8.5px!important;line-height:1.15!important;margin-top:2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-truth{display:none!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom{grid-template-columns:minmax(0,1fr) 52px 52px 42px!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-linescore{min-width:0!important;font-size:6.5px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-head,
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-row{grid-template-columns:38px repeat(9,minmax(0,1fr)) repeat(3,minmax(0,1fr))!important;min-width:0!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-team img{width:11px!important;height:11px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom-box{padding:4px 2px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom-box label{font-size:6px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-count{font-size:12px!important}
  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-baseboard{transform:scale(.65)!important;transform-origin:center!important}
}
'''

if hud_marker not in s:
    if reduced not in s:
        raise SystemExit('reduced-motion marker not found')
    s = s.replace(reduced, hud_css + '\n' + reduced, 1)

if 'function arrangeStageOverlays(root)' not in s:
    marker = 'function applyGamecastScale(root){'
    arrange = r'''function arrangeStageOverlays(root){
  const stage=root?.querySelector('.ps-stage');
  if(!stage) return;
  for(const sel of ['.v915-atbat-card','.v915-pitcher-card','.v915-ondeck-card','.ps-metrics','.ps-play-banner']){
    const el=root.querySelector(sel);
    if(el&&el.parentElement!==stage) stage.appendChild(el);
  }
  root.querySelectorAll('.ps-callout').forEach(el=>el.setAttribute('aria-hidden','true'));
}
'''
    if marker not in s:
        raise SystemExit('scale function marker not found')
    s = s.replace(marker, arrange + marker, 1)

new_scale = r'''function applyGamecastScale(root){
  const frame=root?.parentElement;
  if(!root||!frame) return;
  frame.classList.add('ps915-scale-frame');
  const available=Math.max(1,frame.clientWidth||DESIGN_WIDTH);
  const responsive=available<=720||window.matchMedia?.('(max-width:720px)')?.matches;
  if(responsive){
    root.style.transform='none';
    root.style.marginLeft='0px';
    root.dataset.ps915Scale='1.0000';
    frame.style.height='auto';
    return;
  }
  const scale=Math.min(1,available/DESIGN_WIDTH);
  const rendered=DESIGN_WIDTH*scale;
  const gap=Math.max(0,(available-rendered)/2);
  root.style.transform=`scale(${scale})`;
  root.style.marginLeft=`${gap/scale}px`;
  root.dataset.ps915Scale=scale.toFixed(4);
  frame.style.height=`${Math.ceil(root.offsetHeight*scale)}px`;
}'''
s, count = re.subn(r"function applyGamecastScale\(root\)\{.*?\n\}", new_scale, s, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'applyGamecastScale replacement count={count}')

old = "  markInfoCards(root);\n  wireScale(root);"
new = "  markInfoCards(root);\n  arrangeStageOverlays(root);\n  wireScale(root);"
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('enhance hook not found')
concept.write_text(s)

router = Path('sports/router.js')
rs = router.read_text()
rs = rs.replace('MLB v915 QA note: desktop geometry is intentionally preserved on mobile and scaled as one unit.',
                'MLB v915 QA note: desktop overlay geometry is preserved on mobile with a native-width readable responsive shell.')
if "./mlb/playstage-concept-v915.js?v=91.54" not in rs and "./mlb/playstage-concept-v915.js?v=91.55" not in rs:
    raise SystemExit('v915 router import not found')
rs = rs.replace("./mlb/playstage-concept-v915.js?v=91.54", "./mlb/playstage-concept-v915.js?v=91.55")
router.write_text(rs)

index = Path('index.html')
ix = index.read_text()
ix2, n = re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+', './sports/router.js?v=90.40', ix)
if n < 1:
    raise SystemExit('outer router cache-bust not found')
index.write_text(ix2)

test = Path('scripts/mlb-playstage-selftest.mjs')
ts = test.read_text()
old_block = """assert.ok(conceptV915.includes('const DESIGN_WIDTH=1440'),'v915 must keep one fixed desktop composition for proportional scaling');
assert.ok(conceptV915.includes('/* v915 proportional desktop/mobile shell */'),'v915 must scale the desktop composition instead of reflowing it');
assert.ok(conceptV915.includes('grid-template-columns:205px minmax(0,1fr) 205px!important'),'v915 must preserve the three-column Gamecast shell');
assert.ok(conceptV915.includes('v915-ondeck-card'),'v915 must compact the On Deck card to a name strip');
assert.ok(conceptV915.includes('v915-primary-card'),'v915 must compact At Bat and Pitching cards');
assert.ok(conceptV915.includes('applyGamecastScale'),'v915 must proportionally scale the whole Gamecast on small screens');
assert.ok(conceptV915.includes('/* v915 desktop-parity reset:'),'v915 must neutralize legacy mobile reflow rules');
assert.ok(conceptV915.includes('display:grid!important;flex-direction:initial!important'),'v915 must keep the Gamecast grid on phones');
assert.ok(conceptV915.includes('position:relative!important;width:100%!important;height:auto!important'),'v915 field stage must participate in layout with no blank center track');
assert.ok(!conceptV915.includes('grid-template-columns:minmax(0,1fr)!important'),'v915 must not stack the Gamecast vertically on mobile');
"""
new_block = """assert.ok(conceptV915.includes('const DESIGN_WIDTH=1440'),'v915 must retain the desktop design reference width');
assert.ok(conceptV915.includes('/* v915 overlay HUD refresh */'),'v915 must install the field-overlay HUD');
assert.ok(conceptV915.includes('function arrangeStageOverlays(root)'),'v915 must move player/event HUD elements into the field stage');
assert.ok(conceptV915.includes("'.v915-atbat-card','.v915-pitcher-card','.v915-ondeck-card','.ps-metrics','.ps-play-banner'"),'v915 must overlay At Bat, Pitching, On Deck, metrics and event banner');
assert.ok(conceptV915.includes('grid-template-columns:minmax(0,1fr) 205px!important'),'v915 desktop must reclaim the old left rail for the field');
assert.ok(conceptV915.includes('.ps-callout{display:none!important}'),'v915 must remove the duplicate bottom play message');
assert.ok(conceptV915.includes('left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important'),'v915 must center Statcast metrics at the top of the field');
assert.ok(conceptV915.includes('bottom:18px!important;transform:translateX(-50%)!important'),'v915 must move the richer event banner to bottom-center');
assert.ok(conceptV915.includes('@media(max-width:720px)'),'v915 must have a dedicated readable phone layout');
assert.ok(conceptV915.includes("root.dataset.ps915Scale='1.0000'"),'v915 phones must render at native CSS scale instead of shrinking the 1440px canvas');
assert.ok(conceptV915.includes('grid-template-columns:minmax(0,1fr) 96px!important'),'v915 phone must keep field and live rail side-by-side');
assert.ok(conceptV915.includes('applyGamecastScale'),'v915 must preserve proportional scaling above the phone breakpoint');
assert.ok(conceptV915.includes('position:relative!important;width:100%!important;height:auto!important'),'v915 field stage must participate in layout with no blank center track');
"""
if old_block not in ts and new_block not in ts:
    raise SystemExit('selftest v915 block not found')
ts = ts.replace(old_block, new_block)
ts = ts.replace("./mlb/playstage-concept-v915.js?v=91.54", "./mlb/playstage-concept-v915.js?v=91.55")
test.write_text(ts)

print('Applied MLB v915 overlay HUD + readable responsive phone layout')
