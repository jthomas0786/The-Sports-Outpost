from pathlib import Path
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
s=p.read_text()
old="dataset.nflPptVersion==='94.8'"
new="dataset.nflPptVersion==='94.9'"
count=s.count(old)
if count:
    s=s.replace(old,new)
if old in s:
    raise SystemExit('stale v94.8 browser version assertion remains')
if new not in s:
    raise SystemExit('v94.9 browser version assertion missing')
p.write_text(s)
print(f'Updated all {count} stale Player Prop Tool browser QA version assertions to v94.9')
