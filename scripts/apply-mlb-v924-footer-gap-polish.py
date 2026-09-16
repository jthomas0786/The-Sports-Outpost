from pathlib import Path
import re

p=Path('sports/mlb/playstage-concept-v924-desktop-fit.js')
s=p.read_text()

old_set="footer.style.marginTop=`${current+((target-gap)/scale)}px`;"
new_set="footer.style.setProperty('margin-top',`${current+((target-gap)/scale)}px`,'important');"
if old_set in s:
  s=s.replace(old_set,new_set,1)
elif new_set not in s:
  raise SystemExit('v924 footer settle assignment marker missing')

old_reset="footer.style.marginTop='0px';"
new_reset="footer.style.setProperty('margin-top','0px','important');"
if old_reset in s:
  s=s.replace(old_reset,new_reset,1)
elif new_reset not in s:
  raise SystemExit('v924 footer reset marker missing')

p.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
r2,n=re.subn(
  r"\./mlb/playstage-concept-v924-desktop-fit\.js\?v=[A-Za-z0-9._-]+",
  "./mlb/playstage-concept-v924-desktop-fit.js?v=92.42",
  r,
  count=1,
)
if n!=1: raise SystemExit('v924 router cache marker missing')
router.write_text(r2)

index=Path('index.html')
i=index.read_text()
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,i)
if not m: raise SystemExit('outer router cache marker missing')
major=int(m.group(1)); minor=int(m.group(2))
next_router=f'./sports/router.js?v={major}.{minor+1}'
i2,n=re.subn(pat,next_router,i,count=1)
if n!=1: raise SystemExit('outer router cache bump failed')
index.write_text(i2)

print(f'Applied enforced MLB footer gap collapse + cache busts ({next_router})')
