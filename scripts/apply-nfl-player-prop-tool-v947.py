from pathlib import Path
import re


def read(path): return Path(path).read_text()
def write(path,text):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(text)
def replace_once(text,old,new,label):
    if new in text: return text
    if old not in text: raise SystemExit(f'{label}: source marker missing')
    return text.replace(old,new,1)

# Finalize v94.7 table semantics and image fallbacks.
p='sports/nfl/player-prop-tool-v947.js'; s=read(p)
s=replace_once(
    s,
    "function bookLogo(book){\n  const domain=bookDomain(book);\n  return domain?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`:'';\n}",
    "function bookLogo(book,link=''){\n  let domain=bookDomain(book);\n  if(!domain&&link){try{domain=new URL(link,location.href).hostname.replace(/^www\\./,'');}catch{}}\n  return domain?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`:'';\n}",
    'sportsbook logo resolver',
)
s=replace_once(
    s,
    "book:full?String(c.book||'Sportsbook'):'TSO 50K',\n        prob,edge",
    "book:full?String(c.book||'Sportsbook'):'TSO 50K',link:full?String(c.link||''):'',\n        prob,edge",
    'candidate link',
)
s=replace_once(s,"const src=bookLogo(row.book);","const src=bookLogo(row.book,row.link);",'book link usage')
s=replace_once(
    s,
    "<img src=\"${esc(src)}\" alt=\"${esc(row.book)}\" loading=\"lazy\" referrerpolicy=\"no-referrer\"><i>",
    "<img src=\"${esc(src)}\" alt=\"${esc(row.book)}\" loading=\"lazy\" referrerpolicy=\"no-referrer\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='grid'\"><i>",
    'sportsbook image fallback',
)
s=replace_once(
    s,
    "<table class=\"nfl-ppt-table\">${'<col>'.repeat(13)}${headerHtml()}",
    "<table class=\"nfl-ppt-table\"><colgroup>${'<col>'.repeat(13)}</colgroup>${headerHtml()}",
    'explicit colgroup',
)
write(p,s)

# Retire the global Player Prop background-freeze wrapper and hard cache-bust v94.7.
p='sports/router.js'; s=read(p)
s=re.sub(r"^import \{ installNflBackgroundFreezeV930 \} from './nfl/player-prop-tool-background-freeze-v930\.js\?v=[^']+';\n",'',s,count=1,flags=re.M)
s=re.sub(r'^installNflBackgroundFreezeV930\(\);\n','',s,count=1,flags=re.M)
s,n=re.subn(r"import\('\./nfl-preview-v893\.js\?v=[^']+'\)","import('./nfl-preview-v893.js?v=94.7')",s,count=1)
if n!=1 and "import('./nfl-preview-v893.js?v=94.7')" not in s: raise SystemExit('NFL preview router cache marker missing')
write(p,s)

# Bump outer router cache marker without disturbing unrelated MLB/NHL cache versions.
p='index.html'; s=read(p)
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,s)
if not m: raise SystemExit('index router cache marker missing')
major,minor=int(m.group(1)),int(m.group(2))
s=re.sub(pat,f'./sports/router.js?v={major}.{minor+1}',s,count=1)
write(p,s)

# Cached old preview URLs must resolve without re-installing any retired table writer.
stubs={
  'sports/nfl/player-prop-tool-sim-v939.js':"export function installNflPlayerPropToolSimV939(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_SIM_V939_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-controls-v933.js':"export function installNflPlayerPropToolControlsV933(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_CONTROLS_V933_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-build-period-v940.js':"export function installNflPlayerPropToolBuildPeriodV940(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_BUILD_PERIOD_V940_TEST__={compatibilityOnly:true};\n",
  'sports/nfl/player-prop-tool-reference-v941.js':"export function installNflPlayerPropToolReferenceV941(){return false;}\nexport const __NFL_PLAYER_PROP_TOOL_REFERENCE_V941_TEST__={compatibilityOnly:true};\n",
}
for path,text in stubs.items(): write(path,text)

# Stop obsolete Player Prop workflows/helpers from rewriting the new single-owner build.
for path in [
  '.github/workflows/nfl-player-prop-tool-browser-v923.yml',
  '.github/workflows/one-time-nfl-player-prop-tool-clean-v944.yml',
  '.github/workflows/one-time-nfl-prop-build-period-v940.yml',
  '.github/workflows/one-time-nfl-player-prop-tool-video-v943.yml',
  'scripts/apply-nfl-player-prop-tool-v944-cleanup.py',
  'scripts/fix-nfl-player-prop-tool-v946.py',
  'scripts/apply-nfl-player-prop-tool-v943-video-fix.py',
]:
    Path(path).unlink(missing_ok=True)

# Browser test should assert modern-modal state without relying on version-specific Locator.filter options.
p='tests/nfl-player-prop-tool-v947.spec.js'; s=read(p)
s=s.replace("expect(await page.locator('#nflView .ms-modal:not(:has(.tso-nfl-player-card-v72))').filter({visible:true}).count().catch(()=>0)).toBe(0);","expect(await page.locator('#nflView .ms-modal').evaluateAll(ms=>ms.filter(m=>m.getClientRects().length&&!m.querySelector('.tso-nfl-player-card-v72')).length)).toBe(0);")
write(p,s)

print('NFL Player Prop Tool v94.7 production cutover prepared')
