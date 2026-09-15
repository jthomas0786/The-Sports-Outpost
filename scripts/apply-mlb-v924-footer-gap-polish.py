from pathlib import Path
import re

p=Path('sports/mlb/playstage-concept-v924-desktop-fit.js')
s=p.read_text()
old="""function tighten(root){
  if(!root||!window.matchMedia(MQ).matches) return;
  const footer=root.querySelector('.v923-game-footer');
  const banner=root.querySelector('.ps-play-banner');
  if(!footer||!banner) return;
  footer.style.marginTop='0px';
  requestAnimationFrame(()=>{
    if(!footer.isConnected||!banner.isConnected) return;
    const gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
    if(gap>14){
      const scale=Math.max(.05,Number(root.dataset.ps915Scale)||1);
      footer.style.marginTop=`-${Math.ceil((gap-12)/scale)}px`;
    }
    root.dataset.v924FooterGap=String(Math.round(footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom));
  });
}
"""
new="""function settleFooterGap(root,footer,banner,target=8){
  const scale=Math.max(.05,Number(root.dataset.ps915Scale)||1);
  const gap=footer.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
  const current=parseFloat(footer.style.marginTop)||0;
  footer.style.marginTop=`${current+((target-gap)/scale)}px`;
}
function tighten(root){
  if(!root||!window.matchMedia(MQ).matches) return;
  const footer=root.querySelector('.v923-game-footer');
  const banner=root.querySelector('.ps-play-banner');
  if(!footer||!banner) return;
  footer.style.marginTop='0px';
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
if old not in s:
  if 'function settleFooterGap' not in s: raise SystemExit('v924 tighten function marker missing')
else:
  s=s.replace(old,new,1)
p.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(r"\./mlb/playstage-concept-v924-desktop-fit\.js\?v=[A-Za-z0-9._-]+","./mlb/playstage-concept-v924-desktop-fit.js?v=92.41",r,count=1)
if n!=1: raise SystemExit('v924 router cache marker missing')
router.write_text(r2)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.53',i,count=1)
if n!=1: raise SystemExit('outer router cache marker missing')
index.write_text(i2)
print('Applied v924 footer gap settle polish + cache busts')
