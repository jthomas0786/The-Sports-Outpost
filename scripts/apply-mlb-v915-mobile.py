from pathlib import Path


def must_replace(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'{label}: expected text not found')


v915 = Path('sports/mlb/playstage-concept-v915.js')
s = v915.read_text()
marker = '/* v915 desktop-parity reset: core mobile rules may never reflow this composition. */'
anchor = '/* At Bat / Pitching are deliberately compact so the approved field dominates. */'
reset = r'''/* v915 desktop-parity reset: core mobile rules may never reflow this composition. */
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915{border-radius:16px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-grid{
  display:grid!important;flex-direction:initial!important;
  grid-template-columns:205px minmax(0,1fr) 205px!important;
  min-height:0!important;align-items:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{order:0!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-left{
  display:block!important;grid-template-columns:none!important;gap:0!important;
  border-right:1px solid #18395e!important;border-top:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-right{
  display:block!important;border-left:1px solid #18395e!important;border-top:0!important;padding-bottom:6px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-center{
  display:block!important;position:relative!important;min-width:0!important;width:auto!important;height:auto!important;
  align-self:start!important;overflow:hidden!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-stage{
  position:relative!important;width:100%!important;height:auto!important;min-height:0!important;
  max-width:none!important;margin:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-live{
  position:static!important;margin:0!important;justify-self:start!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score{
  margin-top:0!important;grid-template-columns:1fr auto 82px auto 1fr!important;
  gap:12px!important;padding:8px 14px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team{gap:10px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team img{width:44px!important;height:44px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-team b{font-size:21px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-score-num{font-size:38px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather{
  grid-template-columns:1fr 1fr!important;gap:12px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-weather-block,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-venue-block{
  padding-left:14px!important;border-left:1px solid #193657!important;border-top:0!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-player{
  grid-template-columns:82px 1fr!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-headshot{height:94px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-player{
  grid-template-columns:50px minmax(0,1fr)!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .v915-primary-card .ps-headshot{height:58px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-bottom{
  grid-template-columns:minmax(480px,1.7fr) 170px 150px 130px!important;
}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-linescore{overflow:visible!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-head,
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v915 .ps-line-row{min-width:0!important}
'''
if marker not in s:
    if anchor not in s:
        raise SystemExit('desktop parity insertion anchor missing')
    s = s.replace(anchor, reset + '\n' + anchor, 1)
v915.write_text(s)

router = Path('sports/router.js')
r = router.read_text()
r = must_replace(r, "./mlb/playstage-concept-v915.js?v=91.53", "./mlb/playstage-concept-v915.js?v=91.54", 'router v915 cache bust')
router.write_text(r)

index = Path('index.html')
ix = index.read_text()
ix = must_replace(ix, './sports/router.js?v=90.38', './sports/router.js?v=90.39', 'outer router cache bust')
index.write_text(ix)

test = Path('scripts/mlb-playstage-selftest.mjs')
t = test.read_text().replace("./mlb/playstage-concept-v915.js?v=91.53", "./mlb/playstage-concept-v915.js?v=91.54")
anchor_test = "assert.ok(conceptV915.includes('applyGamecastScale'),'v915 must proportionally scale the whole Gamecast on small screens');\n"
extra = (
    "assert.ok(conceptV915.includes('/* v915 desktop-parity reset:'),'v915 must neutralize legacy mobile reflow rules');\n"
    "assert.ok(conceptV915.includes('display:grid!important;flex-direction:initial!important'),'v915 must keep the Gamecast grid on phones');\n"
    "assert.ok(conceptV915.includes('position:relative!important;width:100%!important;height:auto!important'),'v915 field stage must participate in layout with no blank center track');\n"
)
if 'v915 must neutralize legacy mobile reflow rules' not in t:
    if anchor_test not in t:
        raise SystemExit('selftest desktop parity anchor missing')
    t = t.replace(anchor_test, anchor_test + extra, 1)
test.write_text(t)

print('Applied MLB v915 desktop-parity mobile scaling lock')
