from pathlib import Path

p = Path('sports/mlb/playstage-concept-v915.js')
s = p.read_text()

def replace_once(old, new, label):
    global s
    if old not in s:
        if new in s:
            return
        raise SystemExit(f'missing {label}')
    s = s.replace(old, new, 1)

replace_once(
"  position:absolute!important;top:12px!important;width:232px!important;z-index:94!important;margin:0!important;\n  padding:7px!important;border-radius:11px!important;border:1px solid rgba(118,187,255,.42)!important;",
"  position:absolute!important;top:12px!important;width:232px!important;z-index:94!important;margin:0!important;box-sizing:border-box!important;\n  padding:7px!important;border-radius:11px!important;border:1px solid rgba(118,187,255,.42)!important;",
'desktop primary box sizing')

replace_once(
"  position:absolute!important;left:12px!important;top:144px!important;width:232px!important;z-index:95!important;margin:0!important;\n  min-height:28px!important;padding:6px 8px!important;border:1px solid rgba(118,187,255,.34)!important;border-radius:9px!important;",
"  position:absolute!important;left:12px!important;top:144px!important;width:232px!important;z-index:95!important;margin:0!important;box-sizing:border-box!important;\n  min-height:28px!important;padding:6px 8px!important;border:1px solid rgba(118,187,255,.34)!important;border-radius:9px!important;",
'desktop on deck box sizing')

replace_once(
"  position:absolute!important;left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important;\n  z-index:96!important;min-width:320px!important;border:1px solid rgba(106,178,246,.42)!important;",
"  position:absolute!important;left:50%!important;right:auto!important;top:12px!important;transform:translateX(-50%)!important;box-sizing:border-box!important;\n  z-index:96!important;min-width:320px!important;border:1px solid rgba(106,178,246,.42)!important;",
'desktop metrics box sizing')

replace_once(
"    top:4px!important;width:28%!important;min-width:0!important;padding:4px!important;border-radius:7px!important;",
"    top:4px!important;width:26%!important;min-width:0!important;padding:4px!important;border-radius:7px!important;box-sizing:border-box!important;overflow:hidden!important;",
'mobile primary width')

replace_once(
"    left:4px!important;top:52px!important;width:28%!important;min-height:20px!important;padding:4px!important;gap:3px!important;border-radius:6px!important;",
"    left:4px!important;top:64px!important;width:26%!important;min-height:20px!important;padding:4px!important;gap:3px!important;border-radius:6px!important;box-sizing:border-box!important;overflow:hidden!important;",
'mobile on deck placement')

replace_once(
"    left:50%!important;right:auto!important;top:4px!important;width:38%!important;min-width:0!important;transform:translateX(-50%)!important;border-radius:6px!important;",
"    left:50%!important;right:auto!important;top:4px!important;width:42%!important;min-width:0!important;transform:translateX(-50%)!important;border-radius:6px!important;box-sizing:border-box!important;",
'mobile metrics width')

replace_once(
"  html[data-sport=\"mlb\"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:6px!important;line-height:1!important;white-space:nowrap!important}",
"  html[data-sport=\"mlb\"] ${ROOT}.tso-mlb-concept-v915 .ps-metric span{font-size:7px!important;line-height:1!important;white-space:nowrap!important}",
'mobile metric label readability')

# Match the user's requested metric wording and keep the narrow center HUD readable.
needle = "  for(const sel of ['.v915-atbat-card','.v915-pitcher-card','.v915-ondeck-card','.ps-metrics','.ps-play-banner']){\n    const el=root.querySelector(sel);\n    if(el&&el.parentElement!==stage) stage.appendChild(el);\n  }"
replacement = needle + "\n  const metricLabels=[...root.querySelectorAll('.ps-metric span')];\n  if(metricLabels[0]) metricLabels[0].textContent='EXIT VELO';\n  if(metricLabels[1]) metricLabels[1].textContent='LAUNCH';\n  if(metricLabels[2]) metricLabels[2].textContent='DISTANCE';"
if replacement not in s:
    if needle not in s:
        raise SystemExit('missing HUD relocation loop')
    s = s.replace(needle, replacement, 1)

p.write_text(s)
print('Tightened v915 mobile overlay fit and metric labels')
