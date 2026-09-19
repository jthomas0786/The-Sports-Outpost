from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def must_replace(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# 1) Fix the production authority collision and hard cache-bust the cleaned stack.
p = 'sports/nfl/player-prop-tool-authority-v945.js'
s = read(p)
s = s.replace('94.5', '94.6')
s = must_replace(
    s,
    "row.dataset.nflPptPeriod=periodKey;",
    "row.dataset.nflPptAuthorityPeriod=periodKey;delete row.dataset.nflPptPeriod;",
    'row period namespace',
)
s = must_replace(
    s,
    "const btn=event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-period]`);",
    "const btn=event.target.closest?.(`#${TOOL_ID} .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period]`);",
    'period button selector',
)
write(p, s)


# 2) Make the permanent cleanup generator produce the corrected v94.6 build + QA.
p = 'scripts/apply-nfl-player-prop-tool-v944-cleanup.py'
s = read(p)
s = s.replace('94.5', '94.6')

s = must_replace(
    s,
    'page.locator(`[data-nfl-ppt-period=\\"${period}\\"]`)',
    'page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\"${period}\\"]`)',
    'video-sequence period locator',
)
s = must_replace(
    s,
    'page.locator(`[data-nfl-ppt-period=\\"${p}\\"]`)',
    'page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\"${p}\\"]`)',
    'snapshot period locator',
)

old_request_test = "test('style and period use frozen four-file snapshot only',async({page})=>{const P=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'],c=new Map(P.map(x=>[x,0]));page.on('request',r=>{try{const p=new URL(r.url()).pathname;if(c.has(p))c.set(p,c.get(p)+1)}catch{}});await open(page);await expect.poll(()=>[...c.values()].reduce((a,b)=>a+b,0),{timeout:15000}).toBe(4);for(const s of['safest','bestEdge','balanced','aggressive','correlated','longshot'])if(await page.locator(`#nflPptMode option[value=\\\"${s}\\\"]`).count())await page.locator('#nflPptMode').selectOption(s);for(const p of['q1','q2','q3','q4','1h','2h','full']){const b=page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\\"${p}\\\"]`);if(await b.count())await b.click()}await page.waitForTimeout(400);expect([...c.values()].reduce((a,b)=>a+b,0)).toBe(4);});"
new_request_test = "test('style and period use frozen four-file snapshot only',async({page})=>{const P=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'];let toolRequests=0;page.on('request',r=>{try{const u=new URL(r.url()),v=u.searchParams.get('v')||'';if(P.includes(u.pathname)&&v.startsWith('92.6-'))toolRequests++}catch{}});await open(page);await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);const baseline=toolRequests;for(const s of['safest','bestEdge','balanced','aggressive','correlated','longshot'])if(await page.locator(`#nflPptMode option[value=\\\"${s}\\\"]`).count())await page.locator('#nflPptMode').selectOption(s);for(const p of['q1','q2','q3','q4','1h','2h','full']){const b=page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\\"${p}\\\"]`);if(await b.count())await b.click()}await page.waitForTimeout(500);expect(toolRequests).toBe(baseline);});"
s = must_replace(s, old_request_test, new_request_test, 'four-file request regression')

row_test = "test('table row clicks cannot masquerade as period controls',async({page})=>{await open(page);expect(await page.locator('#nflPlayerPropTool tbody [data-nfl-ppt-period]').count()).toBe(0);const before=await page.locator('#nflPlayerPropTool').getAttribute('data-nfl-ppt-period');const cell=page.locator('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:visible td').nth(3);await expect(cell).toBeVisible();await cell.click();await page.waitForTimeout(120);expect(await page.locator('#nflPlayerPropTool').getAttribute('data-nfl-ppt-period')).toBe(before);await expect(page.locator('#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\\"full\\\"]')).toHaveAttribute('aria-pressed','true');});\n"
marker = "test('mobile remains horizontally contained'"
if row_test.strip() not in s:
    s = must_replace(s, marker, row_test + marker, 'row-click regression insert')

s = must_replace(
    s,
    "assert.ok(!auth.includes('fetch('));",
    "assert.ok(auth.includes('.nfl-ppt-periodbar-v940 button[data-nfl-ppt-period]'));assert.ok(auth.includes('nflPptAuthorityPeriod'));assert.ok(!auth.includes('fetch('));",
    'static period authority assertions',
)
write(p, s)


# 3) Keep the one-time workflow label/version aligned in the commit it produces.
p = '.github/workflows/one-time-nfl-player-prop-tool-clean-v944.yml'
s = read(p).replace('v94.5', 'v94.6')
write(p, s)

print('v94.6 selector/request QA patch ready')
