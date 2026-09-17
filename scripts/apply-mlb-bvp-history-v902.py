from pathlib import Path
import re

adapter=Path('sports/mlb/adapter.js')
router=Path('sports/router.js')
index=Path('index.html')

# Repair the source BvP pull. MLB Stats API is inconsistent when vsPlayer is
# requested without a season, so ask for the career total explicitly and keep a
# current-season vsPlayer fallback. We then select the response with the largest
# real PA sample instead of assuming stats[0] is the aggregate.
a=adapter.read_text()
if 'const totalUrl = `${MLB}/people/${batterId}/stats`' not in a:
    pat=r"async function fetchHeadToHead\(batterId, pitcherId, debug = false\) \{.*?\n\}\n\n/\*\* MLB reports IP"
    repl=r'''async function fetchHeadToHead(batterId, pitcherId, debug = false) {
  if (!batterId || !pitcherId) return null;
  const base = `${MLB}/people/${batterId}/stats`;
  const totalUrl = `${base}?stats=vsPlayerTotal&opposingPlayerId=${pitcherId}&group=hitting&gameType=R&sportId=1`;
  const seasonUrl = `${base}?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting&gameType=R&season=${SEASON}&sportId=1`;
  const [totalData, seasonData] = await Promise.all([
    getJSON(totalUrl).catch(() => null),
    getJSON(seasonUrl).catch(() => null),
  ]);

  // Prefer the block with the largest actual PA sample. When vsPlayerTotal is
  // supported this is the career aggregate; if that endpoint is unavailable,
  // the season-scoped vsPlayer response still gives a truthful fallback.
  const blocks = [...(totalData?.stats ?? []), ...(seasonData?.stats ?? [])];
  const blockPA = block => (block?.splits ?? []).reduce(
    (t, sp) => t + (num(sp.stat?.plateAppearances) ?? 0), 0
  );
  const candidates = blocks
    .map(block => ({ block, pa: blockPA(block) }))
    .filter(x => x.pa > 0)
    .sort((x, y) => y.pa - x.pa);
  const chosen = candidates[0]?.block ?? null;
  const splits = chosen?.splits ?? [];
  if (debug) {
    const type = chosen?.type?.displayName || chosen?.type?.code || chosen?.type?.name || 'none';
    console.log(`    [h2h debug] batter ${batterId} vs pitcher ${pitcherId}: ` +
      `${splits.length} split(s), source=${type}, PA=${candidates[0]?.pa ?? 0}`);
  }
  if (!splits.length) return null;

  const sum = key => splits.reduce((t, sp) => t + (num(sp.stat?.[key]) ?? 0), 0);
  const pa = sum('plateAppearances');
  if (!pa) return null;
  const ab = sum('atBats'), h = sum('hits');
  const typeText = [chosen?.type?.displayName, chosen?.type?.code, chosen?.type?.name]
    .filter(Boolean).join(' ');
  return {
    pa, ab, h,
    hr: sum('homeRuns'), rbi: sum('rbi'), bb: sum('baseOnBalls'), so: sum('strikeOuts'),
    doubles: sum('doubles'), triples: sum('triples'),
    avg: ab ? +(h / ab).toFixed(3) : null,
    slg: ab ? +(sum('totalBases') / ab).toFixed(3) : null,
    obp: pa ? +((h + sum('baseOnBalls') + sum('hitByPitch')) / pa).toFixed(3) : null,
    scope: /total/i.test(typeText) ? 'career' : 'season',
  };
}

/** MLB reports IP'''
    a2,n=re.subn(pat,repl,a,count=1,flags=re.S)
    if n!=1:
        raise SystemExit('Could not patch fetchHeadToHead in sports/mlb/adapter.js')
    adapter.write_text(a2)

r=router.read_text()
changed=False
if "./mlb/player-modal-bvp-v902.js" not in r:
    old="const [liveSwitcher,playerParity,playstage,concept"
    new="const [liveSwitcher,playerParity,playerBvp,playstage,concept"
    if old not in r:
        raise SystemExit('MLB router Promise destructure marker missing')
    r=r.replace(old,new,1)
    old="        import('./mlb/player-modal-parity-v901.js?v=90.2'),\n"
    new=old+"        import('./mlb/player-modal-bvp-v902.js?v=90.3'),\n"
    if old not in r:
        raise SystemExit('MLB player parity import marker missing')
    r=r.replace(old,new,1)
    old="      playerParity.installMlbPlayerModalParityV901?.();\n"
    new=old+"      playerBvp.installMlbPlayerModalBvpV902?.();\n"
    if old not in r:
        raise SystemExit('MLB player parity install marker missing')
    r=r.replace(old,new,1)
    changed=True
    router.write_text(r)

if changed:
    x=index.read_text()
    pat=r'(\./sports/router\.js\?v=)(\d+)\.(\d+)([^\"\']*)'
    m=re.search(pat,x)
    if not m:
        raise SystemExit('Outer router cache marker missing')
    prefix,major,minor,suffix=m.group(1),int(m.group(2)),int(m.group(3)),m.group(4)
    replacement=f'{prefix}{major}.{minor+1}{suffix}'
    x2,n=re.subn(pat,replacement,x,count=1)
    if n!=1:
        raise SystemExit('Outer router cache bump failed')
    index.write_text(x2)

print('MLB BvP v90.2: repaired source history pull and wired conditional modal section')
