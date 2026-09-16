from pathlib import Path
import re

p=Path('sports/mlb/playstage-concept-v924-desktop-fit.js')
s=p.read_text()

# Keep the Live At-Bat banner below the field in normal, deterministic layout space.
# The banner starts 10px below the stage and is at least 54px tall, so a 72px
# stage reserve leaves a small ~8px footer gap without any runtime measuring.
s2,n=re.subn(
  r'(\.tso-mlb-desktop-v924 \.ps-stage\{\n\s*width:100%!important;max-width:100%!important;min-width:0!important;\n\s*)margin:0 0 \d+px!important;',
  r'\1margin:0 0 72px!important;',
  s,
  count=1,
)
if n!=1:
  raise SystemExit('v924 stage reserve marker missing')
s=s2

# Remove the mutation-driven footer measuring/reset loop. It visibly bounced the
# footer because every live DOM update first reset margin-top to 0 and only fixed
# it on later animation frames.
old_block="""
function settleFooterGap(root,footer,banner,target=8){
  const scale=Math.max(.05,Number(root.dataset.ps915Scale)||1);
  const gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
  const current=parseFloat(footer.style.marginTop)||0;
  footer.style.setProperty('margin-top',`${current+((target-gap)/scale)}px`,'important');
}
function tighten(root){
  if(!root||!window.matchMedia(MQ).matches) return;
  const footer=root.querySelector('.v923-game-footer');
  const banner=root.querySelector('.ps-play-banner');
  if(!footer||!banner) return;
  footer.style.setProperty('margin-top','0px','important');
  requestAnimationFrame(()=>{
    if(!footer.isConnected||!banner.isConnected) return;
    let gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
    if(gap>14||gap<6) settleFooterGap(root,footer,banner,8);
    requestAnimationFrame(()=>{
      if(!footer.isConnected||!banner.isConnected) return;
      gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
      if(gap>14||gap<6) settleFooterGap(root,footer,banner,8);
      requestAnimationFrame(()=>{
        if(!footer.isConnected||!banner.isConnected) return;
        root.dataset.v924FooterGap=String(Math.round(footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom));
      });
    });
  });
}
"""
if old_block in s:
  s=s.replace(old_block,'\n',1)
elif 'function settleFooterGap' in s or 'function tighten(root)' in s:
  raise SystemExit('v924 footer correction block changed unexpectedly')

s=s.replace("    root.dataset.desktopFit='v924';\n    tighten(root);", "    root.dataset.desktopFit='v924';\n    root.dataset.footerGapMode='structural';", 1)
s=s.replace("    delete root.dataset.desktopFit;", "    delete root.dataset.desktopFit;\n    delete root.dataset.footerGapMode;", 1)

if 'tighten(root)' in s or 'settleFooterGap' in s:
  raise SystemExit('runtime footer correction still present')
if "margin:0 0 72px!important;" not in s:
  raise SystemExit('structural footer reserve missing')
p.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(
  r"\./mlb/playstage-concept-v924-desktop-fit\.js\?v=[A-Za-z0-9._-]+",
  "./mlb/playstage-concept-v924-desktop-fit.js?v=92.43",
  r,
  count=1,
)
if n!=1:
  raise SystemExit('v924 router cache marker missing')
r=r2

# The installer had been accidentally repeated four times. The module is guarded,
# but keeping one call avoids redundant mutation queues and makes the lifecycle clear.
call='      conceptV924.installMlbPlaystageConceptV924DesktopFit?.();'
if r.count(call)<1:
  raise SystemExit('v924 installer call missing')
r=re.sub(r'(?:'+re.escape(call)+r'\n){2,}', call+'\n', r)
if r.count(call)!=1:
  raise SystemExit(f'expected one v924 installer call, found {r.count(call)}')
router.write_text(r)

index=Path('index.html')
i=index.read_text()
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,i)
if not m:
  raise SystemExit('outer router cache marker missing')
major=int(m.group(1)); minor=int(m.group(2))
next_router=f'./sports/router.js?v={major}.{minor+1}'
i2,n=re.subn(pat,next_router,i,count=1)
if n!=1:
  raise SystemExit('outer router cache bump failed')
index.write_text(i2)

print(f'Applied stable structural MLB footer spacing + cache busts ({next_router})')
