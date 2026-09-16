from pathlib import Path
import re

router_p=Path('sports/router.js')
index_p=Path('index.html')
concept_p=Path('sports/nfl/chibi-preview-approved-concept-v913.js')

router=router_p.read_text()
imp="import { installNflChibiApprovedConceptV913 } from './nfl/chibi-preview-approved-concept-v913.js?v=91.3';"
anchor="import { installNflChibiPreviewPrivateV901 } from './nfl/chibi-preview-private-v901.js?v=91.2';"
if imp not in router:
    if anchor not in router:
        raise SystemExit('private chibi preview import anchor missing')
    router=router.replace(anchor,anchor+'\n'+imp,1)
call='installNflChibiApprovedConceptV913();'
call_anchor='installNflChibiPreviewPrivateV901();'
if call not in router:
    if call_anchor not in router:
        raise SystemExit('private chibi preview install anchor missing')
    router=router.replace(call_anchor,call_anchor+'\n'+call,1)
router_p.write_text(router)

index=index_p.read_text()
pat=r'(\.\/sports\/router\.js\?v=)[A-Za-z0-9._-]+'
index2,n=re.subn(pat,r'\g<1>90.60-chibi-approved913',index,count=1)
if n!=1:
    raise SystemExit('index router cache marker missing')
index_p.write_text(index2)

concept=concept_p.read_text()
old="#nflChibiDetailModal .chibi-preview-badge,#nflChibiDetailModal .chibi-live-qa{--legacy-flat-preview-disabled:1}"
new="#nflChibiDetailModal .chibi-live-qa{visibility:hidden!important}"
if old in concept:
    concept=concept.replace(old,new,1)
elif new not in concept:
    raise SystemExit('legacy flat preview guard marker missing')
concept_p.write_text(concept)

print('Applied NFL chibi approved concept v91.3')
