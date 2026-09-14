from pathlib import Path
import re


def must_replace(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'{label}: expected text not found')


v915 = Path('sports/mlb/playstage-concept-v915.js')
s = v915.read_text()

# Keep the approved field image and native 3:2 aspect. Add one fixed desktop
# design width; smaller viewports scale this same composition proportionally.
if "const DESIGN_WIDTH=1440;" not in s:
    s = s.replace("const FALLBACK_ASPECT='1536 / 1024';\n", "const FALLBACK_ASPECT='1536 / 1024';\nconst DESIGN_WIDTH=1440;\n", 1)
if "const scaleWatchers=new WeakMap();" not in s:
    s = s.replace("let installed=false,observer=null,raf=0;\n", "let installed=false,observer=null,raf=0;\nconst scaleWatchers=new WeakMap();\n", 1)

# Remove the previous responsive rules that reflowed the desktop three-column
# Gamecast into vertical mobile sections. Replace them with compact desktop cards
# plus a single whole-Gamecast proportional scaler.
start_token = '@media(max-width:620px){\n  html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi.ps-batter'
new_marker = '/* v915 proportional desktop/mobile shell */'
reduced = '@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-chibi{transition:none!important}}'
if new_marker not in s:
    start = s.find(start_token)
    end = s.find(reduced)
    if start < 0 or end < 0 or end <= start:
        raise SystemExit('v915 responsive replacement anchors missing')
    layout = r'''/* v915 proportional desktop/mobile shell */
html[data-sport="mlb"] .ps915-scale-frame{
  position:relative!important;width:100%!important;max-width:100%!important;
  min-height:0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{
  width:${DESIGN_WIDTH}px!important;min-width:${DESIGN_WIDTH}px!important;max-width:${DESIGN_WIDTH}px!important;
  transform-origin:0 0!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-top{
  min-height:72px!important;grid-template-columns:minmax(100px,.55fr) minmax(410px,1.45fr) minmax(280px,.9fr)!important;
  gap:12px!important;padding:9px 14px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  grid-template-columns:205px minmax(0,1fr) 205px!important;
  min-height:0!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  min-width:0!important;width:auto!important;padding:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  min-width:0!important;width:auto!important;height:auto!important;align-self:start!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  width:100%!important;max-width:none!important;margin:0!important;
}

/* At Bat / Pitching are deliberately compact so the approved field dominates. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card{
  padding:6px!important;margin-bottom:6px!important;border-radius:9px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title{
  gap:5px!important;font-size:8px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-card-title img{
  width:16px!important;height:16px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{
  grid-template-columns:50px minmax(0,1fr)!important;gap:7px!important;margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{
  height:58px!important;border-radius:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player h3{
  font-size:15px!important;line-height:1!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player .meta{
  margin-top:3px!important;font-size:8px!important;line-height:1.25!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-statrow{
  margin-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat{
  padding-top:5px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat b{
  font-size:13px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-stat span{
  margin-top:3px!important;font-size:7px!important;
}

/* On Deck is only a small label + player name. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card{
  display:flex!important;align-items:center!important;gap:7px!important;
  padding:6px 8px!important;margin-bottom:6px!important;min-height:30px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title{
  flex:0 0 auto!important;font-size:7px!important;gap:0!important;white-space:nowrap!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-card-title img,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-headshot,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .meta,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-statrow{
  display:none!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player{
  display:block!important;min-width:0!important;margin:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-ondeck-card .ps-player h3{
  margin:0!important;font-size:13px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}
'''
    s = s[:start] + layout + '\n' + s[end:]

# Install compact-card tagging and the proportional shell scaler.
helper_anchor = 'function enhance(root){\n'
helpers = r'''function markInfoCards(root){
  root.querySelectorAll('.ps-card').forEach(card=>{
    const title=(card.querySelector('.ps-card-title')?.textContent||'').trim().toLowerCase();
    card.classList.toggle('v915-atbat-card',title.includes('at bat'));
    card.classList.toggle('v915-pitcher-card',title.includes('pitching'));
    card.classList.toggle('v915-ondeck-card',title.includes('on deck'));
    card.classList.toggle('v915-primary-card',title.includes('at bat')||title.includes('pitching'));
  });
}
function applyGamecastScale(root){
  const frame=root?.parentElement;
  if(!root||!frame) return;
  frame.classList.add('ps915-scale-frame');
  const available=Math.max(1,frame.clientWidth||DESIGN_WIDTH);
  const scale=Math.min(1,available/DESIGN_WIDTH);
  const rendered=DESIGN_WIDTH*scale;
  const gap=Math.max(0,(available-rendered)/2);
  root.style.transform=`scale(${scale})`;
  root.style.marginLeft=`${gap/scale}px`;
  root.dataset.ps915Scale=scale.toFixed(4);
  frame.style.height=`${Math.ceil(root.offsetHeight*scale)}px`;
}
function wireScale(root){
  if(!scaleWatchers.has(root)&&typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(()=>requestAnimationFrame(()=>applyGamecastScale(root)));
    ro.observe(root);
    scaleWatchers.set(root,ro);
  }
  requestAnimationFrame(()=>applyGamecastScale(root));
}
'''
if 'function markInfoCards(root)' not in s:
    if helper_anchor not in s:
        raise SystemExit('v915 enhance anchor missing')
    s = s.replace(helper_anchor, helpers + '\n' + helper_anchor, 1)

old_enhance = "function enhance(root){\n  if(!root) return;\n  root.classList.add('tso-mlb-concept-v915');\n  root.dataset.approvedConcept='v915';\n  ensureApprovedField(root.querySelector('.ps-stage'));\n}"
new_enhance = "function enhance(root){\n  if(!root) return;\n  root.classList.add('tso-mlb-concept-v915');\n  root.dataset.approvedConcept='v915';\n  ensureApprovedField(root.querySelector('.ps-stage'));\n  markInfoCards(root);\n  wireScale(root);\n}"
s = must_replace(s, old_enhance, new_enhance, 'v915 enhance scaler wiring')

# Resize must re-run the same layout scaler without changing composition.
old_hash = "  window.addEventListener('hashchange',queue);\n  queue();"
new_hash = "  window.addEventListener('hashchange',queue);\n  window.addEventListener('resize',queue,{passive:true});\n  queue();"
s = must_replace(s, old_hash, new_hash, 'v915 resize wiring')

# Expose design width for regression checks.
s = s.replace(
    "export const __MLB_PLAYSTAGE_CONCEPT_V915_TEST__={STYLE_ID,ROOT,FIELD_SRC,FALLBACK_ASPECT};",
    "export const __MLB_PLAYSTAGE_CONCEPT_V915_TEST__={STYLE_ID,ROOT,FIELD_SRC,FALLBACK_ASPECT,DESIGN_WIDTH};",
)
v915.write_text(s)

# Cache bust v915 and outer router.
router = Path('sports/router.js')
r = router.read_text()
r = must_replace(r, "./mlb/playstage-concept-v915.js?v=91.52", "./mlb/playstage-concept-v915.js?v=91.53", 'router v915 cache bust')
router.write_text(r)

index = Path('index.html')
ix = index.read_text()
ix = must_replace(ix, './sports/router.js?v=90.37', './sports/router.js?v=90.38', 'outer router cache bust')
index.write_text(ix)

# Keep the PlayStage regression aligned with the new requirements.
test = Path('scripts/mlb-playstage-selftest.mjs')
t = test.read_text()
t = t.replace("./mlb/playstage-concept-v915.js?v=91.52", "./mlb/playstage-concept-v915.js?v=91.53")
t = re.sub(r"assert\.ok\(conceptV915\.includes\('/\* v915 responsive shell:'.*?phone-specific scaling'\);\n", '', t, flags=re.S)
anchor = "assert.ok(conceptV915.includes('object-fit:contain!important'),'v915 must preserve the entire approved image');\n"
checks = (
    "assert.ok(conceptV915.includes('const DESIGN_WIDTH=1440'),'v915 must keep one fixed desktop composition for proportional scaling');\n"
    "assert.ok(conceptV915.includes('/* v915 proportional desktop/mobile shell */'),'v915 must scale the desktop composition instead of reflowing it');\n"
    "assert.ok(conceptV915.includes('grid-template-columns:205px minmax(0,1fr) 205px!important'),'v915 must preserve the three-column Gamecast shell');\n"
    "assert.ok(conceptV915.includes('v915-ondeck-card'),'v915 must compact the On Deck card to a name strip');\n"
    "assert.ok(conceptV915.includes('v915-primary-card'),'v915 must compact At Bat and Pitching cards');\n"
    "assert.ok(conceptV915.includes('applyGamecastScale'),'v915 must proportionally scale the whole Gamecast on small screens');\n"
    "assert.ok(!conceptV915.includes('grid-template-columns:minmax(0,1fr)!important'),'v915 must not stack the Gamecast vertically on mobile');\n"
)
if 'v915 must keep one fixed desktop composition for proportional scaling' not in t:
    if anchor not in t:
        raise SystemExit('selftest insertion anchor missing')
    t = t.replace(anchor, anchor + checks, 1)
test.write_text(t)

print('Applied MLB v915 compact rails + proportional desktop/mobile scaling patch')
