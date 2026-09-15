from pathlib import Path
import re

router=Path('sports/router.js')
s=router.read_text()

if 'conceptV922' not in s:
    old='conceptV917,conceptV920,conceptV921] = await Promise.all(['
    new='conceptV917,conceptV920,conceptV921,conceptV922] = await Promise.all(['
    if old not in s:
        raise SystemExit('MLB concept destructuring anchor missing')
    s=s.replace(old,new,1)

if "./mlb/playstage-concept-v922-desktop.js?v=92.20" not in s:
    old="        import('./mlb/playstage-concept-v921-mobile.js?v=92.10')"
    new="        import('./mlb/playstage-concept-v921-mobile.js?v=92.10'),\n        import('./mlb/playstage-concept-v922-desktop.js?v=92.20')"
    if old not in s:
        raise SystemExit('v921 import anchor missing')
    s=s.replace(old,new,1)

if 'installMlbPlaystageConceptV922Desktop' not in s:
    old='      conceptV921.installMlbPlaystageConceptV921Mobile?.();'
    new=old+'\n      conceptV922.installMlbPlaystageConceptV922Desktop?.();'
    if old not in s:
        raise SystemExit('v921 install anchor missing')
    s=s.replace(old,new,1)

router.write_text(s)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.49',i,count=1)
if n!=1:
    raise SystemExit('index router cache marker missing')
index.write_text(i2)
