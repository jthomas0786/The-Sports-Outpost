from pathlib import Path
import re

router=Path('sports/router.js')
s=router.read_text()
if 'conceptV921' not in s:
    s=s.replace('conceptV916,conceptV917,conceptV920] = await Promise.all([','conceptV916,conceptV917,conceptV920,conceptV921] = await Promise.all([')
    s=s.replace("        import('./mlb/playstage-concept-v920-mobile.js?v=92.00')\n", "        import('./mlb/playstage-concept-v920-mobile.js?v=92.00'),\n        import('./mlb/playstage-concept-v921-mobile.js?v=92.10')\n")
    s=s.replace('      conceptV920.installMlbPlaystageConceptV920Mobile?.();\n','      conceptV920.installMlbPlaystageConceptV920Mobile?.();\n      conceptV921.installMlbPlaystageConceptV921Mobile?.();\n')
if "./mlb/playstage-concept-v921-mobile.js?v=92.10" not in s or 'installMlbPlaystageConceptV921Mobile' not in s:
    raise SystemExit('router v921 wiring failed')
router.write_text(s)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.47',i,count=1)
if n!=1:
    raise SystemExit('index router cache marker missing')
index.write_text(i2)

for p in Path('scripts').glob('*.mjs'):
    t=p.read_text()
    if './sports/router.js?v=90.46' in t:
        p.write_text(t.replace('./sports/router.js?v=90.46','./sports/router.js?v=90.47'))

print('Applied MLB v921 mobile polish wiring + router cache bust')
