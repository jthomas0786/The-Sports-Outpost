from pathlib import Path

JS = Path('sports/nfl/player-prop-tool-v947.js')
CSS = Path('sports/nfl/player-prop-tool-v947.css')
PREVIEW = Path('sports/nfl-preview-v893.js')
ROUTER = Path('sports/router.js')
SELFTEST = Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
BROWSER = Path('tests/nfl-player-prop-tool-v947.spec.js')


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match in {path}, found {count}')
    path.write_text(text.replace(old, new, 1))


def replace_all(path, old, new, label, minimum=1):
    text = path.read_text()
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected at least {minimum} matches in {path}, found {count}')
    path.write_text(text.replace(old, new))
    return count

# Cache-bust the complete import chain so the frozen-column behavior is immediate in production.
replace_once(JS, "const VERSION='94.9';", "const VERSION='95.0';", 'tool version')
replace_once(PREVIEW, "./nfl/player-prop-tool-v947.js?v=94.9", "./nfl/player-prop-tool-v947.js?v=95.0", 'preview cache bust')
replace_once(ROUTER, "import('./nfl-preview-v893.js?v=94.9')", "import('./nfl-preview-v893.js?v=95.0')", 'router cache bust')

# Make the PLAYER header part of the same sticky/frozen first column as every body cell.
old_header = "HEADERS.map(([key,label])=>`<th data-col=\"${key}\" aria-sort=\"none\"><button type=\"button\" data-ppt-sort=\"${key}\"><span>${label}</span><i>↕</i></button></th>`).join('')"
new_header = "HEADERS.map(([key,label])=>`<th class=\"${key==='player'?'nfl-ppt-player-sticky':''}\" data-col=\"${key}\" aria-sort=\"none\"><button type=\"button\" data-ppt-sort=\"${key}\"><span>${label}</span><i>↕</i></button></th>`).join('')"
replace_once(JS, old_header, new_header, 'PLAYER header sticky class')

css = CSS.read_text()
marker = '/* v95.0 frozen Player column */'
if marker in css:
    raise SystemExit('sticky Player CSS already present unexpectedly')
css += r'''

/* v95.0 frozen Player column */
/* Keep the complete first column — PLAYER header, watch star, avatar, name and
   metadata — anchored at the left edge while the remaining prop columns scroll. */
#nflView #nflPlayerPropTool .nfl-ppt-table thead tr:nth-child(2) th.nfl-ppt-player-sticky,
#nflView #nflPlayerPropTool .nfl-ppt-table tbody tr[data-nfl-ppt-row] > td.nfl-ppt-player-sticky,
#nflView #nflPlayerPropTool .nfl-ppt-table tbody tr[data-nfl-ppt-row] > td:first-child{
  position:sticky!important;
  left:0!important;
  right:auto!important;
  transform:none!important;
}
#nflView #nflPlayerPropTool .nfl-ppt-table thead tr:nth-child(2) th.nfl-ppt-player-sticky{
  z-index:9!important;
  background:#0a1a2d!important;
  box-shadow:7px 0 12px rgba(0,0,0,.28)!important;
  border-right:1px solid #315a81!important;
}
#nflView #nflPlayerPropTool .nfl-ppt-table tbody tr[data-nfl-ppt-row] > td.nfl-ppt-player-sticky,
#nflView #nflPlayerPropTool .nfl-ppt-table tbody tr[data-nfl-ppt-row] > td:first-child{
  z-index:6!important;
  box-shadow:7px 0 12px rgba(0,0,0,.22)!important;
}
'''
CSS.write_text(css)

# Advance browser expectations to the cache-busted release. Keep existing v94.9
# CSS-contract assertions intact because those styles are still part of v95.0.
replace_all(BROWSER, "94.9", "95.0", 'browser version assertions')
replace_once(SELFTEST, "./nfl/player-prop-tool-v947.js?v=94.9", "./nfl/player-prop-tool-v947.js?v=95.0", 'selftest preview cache bust')
replace_once(SELFTEST, "import('./nfl-preview-v893.js?v=94.9')", "import('./nfl-preview-v893.js?v=95.0')", 'selftest router cache bust')

browser = BROWSER.read_text()
sticky_test = r'''

test('v95.0 keeps the entire Player column frozen during horizontal scrolling',async({page})=>{
  await open(page,{width:900,height:800});
  const wrap=page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap');
  const playerHead=page.locator('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
  const firstRow=page.locator('#nflPlayerPropTool tbody tr:visible').first();
  const playerCell=firstRow.locator('td').first();
  const propCell=firstRow.locator('td').nth(1);
  const before=await page.evaluate(()=>{
    const wrap=document.querySelector('#nflPlayerPropTool .nfl-ppt-table-wrap');
    const head=document.querySelector('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
    const row=document.querySelector('#nflPlayerPropTool tbody tr:not([hidden])');
    const player=row?.children?.[0],next=row?.children?.[1];
    return {max:wrap?wrap.scrollWidth-wrap.clientWidth:0,headLeft:head?.getBoundingClientRect().left,playerLeft:player?.getBoundingClientRect().left,nextLeft:next?.getBoundingClientRect().left};
  });
  expect(before.max).toBeGreaterThan(100);
  await wrap.evaluate(el=>{el.scrollLeft=Math.min(500,el.scrollWidth-el.clientWidth);});
  await expect.poll(()=>wrap.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  const after=await page.evaluate(()=>{
    const head=document.querySelector('#nflPlayerPropTool thead tr:nth-child(2) th[data-col="player"]');
    const row=document.querySelector('#nflPlayerPropTool tbody tr:not([hidden])');
    const player=row?.children?.[0],next=row?.children?.[1];
    return {headLeft:head?.getBoundingClientRect().left,playerLeft:player?.getBoundingClientRect().left,nextLeft:next?.getBoundingClientRect().left,headPos:head?getComputedStyle(head).position:'',playerPos:player?getComputedStyle(player).position:'',headZ:head?Number(getComputedStyle(head).zIndex):0,playerZ:player?Number(getComputedStyle(player).zIndex):0};
  });
  expect(after.headPos).toBe('sticky');
  expect(after.playerPos).toBe('sticky');
  expect(after.headZ).toBeGreaterThan(after.playerZ);
  expect(Math.abs(after.headLeft-before.headLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.playerLeft-before.playerLeft)).toBeLessThanOrEqual(2);
  expect(after.nextLeft).toBeLessThan(before.nextLeft-100);
  await expect(playerHead).toHaveClass(/nfl-ppt-player-sticky/);
  await expect(playerCell).toHaveClass(/nfl-ppt-player-sticky/);
  await expect(propCell).not.toHaveClass(/nfl-ppt-player-sticky/);
});
'''
if "keeps the entire Player column frozen during horizontal scrolling" not in browser:
    browser += sticky_test
BROWSER.write_text(browser)

selftest = SELFTEST.read_text()
extra = r'''

assert.ok(tool.includes("key==='player'?'nfl-ppt-player-sticky':''"),'PLAYER header must join the sticky first column');
assert.ok(css.includes('/* v95.0 frozen Player column */'),'v95.0 frozen Player column CSS missing');
assert.ok(css.includes('th.nfl-ppt-player-sticky'),'PLAYER header sticky selector missing');
assert.ok(css.includes('td.nfl-ppt-player-sticky'),'Player body cell sticky selector missing');
assert.ok(css.includes('position:sticky!important'),'Player column must be forced sticky');
'''
if "PLAYER header must join the sticky first column" not in selftest:
    selftest = selftest.rstrip() + extra + "\n"
SELFTEST.write_text(selftest)

print('Applied NFL Player Prop Tool v95.0 frozen Player column cutover.')
