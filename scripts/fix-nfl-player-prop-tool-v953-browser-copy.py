from pathlib import Path

P=Path('tests/nfl-player-prop-tool-v947.spec.js')
s=P.read_text()
repls={
"expect(metrics.matchTitle).toContain('defensive allowance');":"expect(metrics.matchTitle).toContain('previous-season production allowed');",
"expect(matchupData.title).toContain('defensive allowance');":"expect(matchupData.title).toContain('previous-season production allowed');",
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit(f'missing browser assertion: {old}')
    s=s.replace(old,new,1)
P.write_text(s)
print('v95.3 browser copy assertions aligned with position-only MATCHUP tooltip')
