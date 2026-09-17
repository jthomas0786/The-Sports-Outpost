from pathlib import Path
import re

changed=[]

p=Path('sports/nfl-preview-v893.js')
s=p.read_text()
orig=s
s=s.replace("import { installNflPropModelEdgeV8917 } from './nfl/prop-model-edge-v8917.js?v=89.17';",
            "import { installNflPropModelEdgeV8918 } from './nfl/prop-model-edge-v8918.js?v=89.18';")
s=s.replace("installNflPropModelEdgeV8917().catch(e=>console.warn('[NFL Prop Model v89.17] simulation edge UI unavailable:',e));",
            "installNflPropModelEdgeV8918().catch(e=>console.warn('[NFL Prop Model v89.18] simulation + 2+ TD UI unavailable:',e));")
if s!=orig:
    p.write_text(s); changed.append(str(p))
elif 'installNflPropModelEdgeV8918' not in s:
    raise SystemExit('NFL preview v893 prop model hook not found')

p=Path('sports/router.js')
s=p.read_text(); orig=s
s,n=re.subn(r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)", "import('./nfl-preview-v893.js?v=89.41')", s, count=1)
if n!=1 and "./nfl-preview-v893.js?v=89.41" not in s:
    raise SystemExit('NFL preview router import not found')
if s!=orig:
    p.write_text(s); changed.append(str(p))

p=Path('sports/registry.js')
s=p.read_text(); orig=s
if "'twoPlusTd'" not in s:
    s=s.replace("props: ['atd', 'firstTd'", "props: ['atd', 'twoPlusTd', 'firstTd'", 1)
if s!=orig:
    p.write_text(s); changed.append(str(p))

# Bump the outer router URL only when this feature is newly wired, preventing stale browser graphs.
p=Path('index.html')
s=p.read_text(); orig=s
if changed:
    pat=r'(\./sports/router\.js\?v=)(\d+)\.(\d+)'
    m=re.search(pat,s)
    if not m:
        raise SystemExit('index router cache marker missing')
    major,minor=int(m.group(2)),int(m.group(3))
    s=re.sub(pat,lambda x:f"{x.group(1)}{major}.{minor+1}",s,count=1)
if s!=orig:
    p.write_text(s); changed.append(str(p))

print('NFL v89.18 2+ TD applied:', ', '.join(changed) if changed else 'already applied')
