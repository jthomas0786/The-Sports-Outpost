from pathlib import Path
import re


def bump_query(path, pattern, label):
    p=Path(path)
    s=p.read_text()
    m=re.search(pattern,s)
    if not m:
        raise SystemExit(f'{label}: cache marker missing')
    prefix,major,minor,suffix=m.group(1),int(m.group(2)),int(m.group(3)),m.group(4)
    new=f'{prefix}{major}.{minor+1}{suffix}'
    p.write_text(s[:m.start()]+new+s[m.end():])
    print(f'{label}: {m.group(0)} -> {new}')


bump_query(
    'sports/router.js',
    r"(\./nfl-preview-v893\.js\?v=)(\d+)\.(\d+)([^'\"]*)",
    'NFL preview import'
)

bump_query(
    'index.html',
    r"(\./sports/router\.js\?v=)(\d+)\.(\d+)([^'\"]*)",
    'outer router import'
)

print('Applied NFL readability cache bust v89.22')
