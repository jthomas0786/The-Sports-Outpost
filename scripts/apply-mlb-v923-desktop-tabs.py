from pathlib import Path
import re

router=Path('sports/router.js')
s=router.read_text()

if 'conceptV923' not in s:
    old='conceptV920,conceptV921,conceptV922] = await Promise.all(['
    new='conceptV920,conceptV921,conceptV922,conceptV923] = await Promise.all(['
    if old not in s: raise SystemExit('v923 destructuring anchor missing')
    s=s.replace(old,new,1)

if "./mlb/playstage-concept-v923-desktop-tabs.js?v=92.30" not in s:
    old="        import('./mlb/playstage-concept-v922-desktop.js?v=92.20')"
    new=old+",\n        import('./mlb/playstage-concept-v923-desktop-tabs.js?v=92.30')"
    if old not in s: raise SystemExit('v922 import anchor missing')
    s=s.replace(old,new,1)

if 'installMlbPlaystageConceptV923DesktopTabs' not in s:
    old='      conceptV922.installMlbPlaystageConceptV922Desktop?.();'
    new=old+'\n      conceptV923.installMlbPlaystageConceptV923DesktopTabs?.();'
    if old not in s: raise SystemExit('v922 install anchor missing')
    s=s.replace(old,new,1)
router.write_text(s)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.50',i,count=1)
if n!=1: raise SystemExit('index router cache marker missing')
index.write_text(i2)

# Keep the immediately previous desktop regression current with the outer router cache.
t=Path('scripts/mlb-v922-desktop-selftest.mjs')
if t.exists():
    x=t.read_text().replace("./sports/router.js?v=90.49","./sports/router.js?v=90.50")
    t.write_text(x)

print('MLB v923 desktop tabs/layout wired')
