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
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,i)
if not m:
    raise SystemExit('index router cache marker missing')
current=(int(m.group(1)),int(m.group(2)))
if current < (90,49):
    i=re.sub(pat,'./sports/router.js?v=90.49',i,count=1)
index.write_text(i)
