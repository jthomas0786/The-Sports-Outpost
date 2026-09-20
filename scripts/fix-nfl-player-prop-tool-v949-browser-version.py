from pathlib import Path
p=Path('tests/nfl-player-prop-tool-v947.spec.js')
s=p.read_text()
old="dataset.nflPptVersion==='94.8'"
new="dataset.nflPptVersion==='94.9'"
if new not in s:
    if old not in s: raise SystemExit('browser version assertion marker missing')
    s=s.replace(old,new,1)
p.write_text(s)
print('Updated Player Prop Tool browser QA to expect v94.9')
