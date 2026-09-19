from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_or_verify(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f'{label}: neither original nor corrected form found')


# 1) Fix the production authority collision and hard cache-bust the cleaned stack.
p = 'sports/nfl/player-prop-tool-authority-v945.js'
s = read(p).replace('94.5', '94.6')
s = replace_or_verify(
    s,
    'row.dataset.nflPptPeriod=periodKey;',
    'row.dataset.nflPptAuthorityPeriod=periodKey;delete row.dataset.nflPptPeriod;',
    'row period namespace',
)
s = replace_or_verify(
    s,
    'const btn=event.target.closest?.(`#${TOOL_ID} [data-nfl-ppt-period]`);',
    'const btn=event.target.closest?.(`#${TOOL_ID} .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period]`);',
    'period button selector',
)
write(p, s)


# 2) Make the permanent cleanup generator produce the corrected v94.6 build + QA.
p = 'scripts/apply-nfl-player-prop-tool-v944-cleanup.py'
s = read(p).replace('94.5', '94.6')

# Scope Playwright period locators to the actual period bar buttons. The source is
# a Python raw string, so support both escaped and unescaped quote spellings.
for var in ('period', 'p'):
    old_escaped = f'[data-nfl-ppt-period=\\"${{{var}}}\\"]'
    old_plain = f'[data-nfl-ppt-period="${{{var}}}"]'
    new_escaped = f'#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period=\\"${{{var}}}\\"]'
    new_plain = f'#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period="${{{var}}}"]'
    if new_escaped not in s and new_plain not in s:
        if old_escaped in s:
            s = s.replace(old_escaped, new_escaped, 1)
        elif old_plain in s:
            s = s.replace(old_plain, new_plain, 1)
        else:
            raise SystemExit(f'{var} period locator not found')

new_request_test = r'''test('style and period use frozen four-file snapshot only',async({page})=>{const P=['/slates/nfl.json','/slates/nfl-odds.json','/slates/nfl-sim.json','/slates/nfl-research.json'];let toolRequests=0;page.on('request',r=>{try{const u=new URL(r.url()),v=u.searchParams.get('v')||'';if(P.includes(u.pathname)&&v.startsWith('92.6-'))toolRequests++}catch{}});await open(page);await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);const baseline=toolRequests;for(const s of['safest','bestEdge','balanced','aggressive','correlated','longshot'])if(await page.locator(`#nflPptMode option[value="${s}"]`).count())await page.locator('#nflPptMode').selectOption(s);for(const p of['q1','q2','q3','q4','1h','2h','full']){const b=page.locator(`#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period="${p}"]`);if(await b.count())await b.click()}await page.waitForTimeout(500);expect(toolRequests).toBe(baseline);});
'''
pattern = r"test\('style and period use frozen four-file snapshot only'.*?\n(?=test\('mobile remains horizontally contained')"
s, n = re.subn(pattern, new_request_test, s, count=1, flags=re.S)
if n != 1 and new_request_test.strip() not in s:
    raise SystemExit(f'four-file request regression: expected 1 match, found {n}')

row_test = r'''test('table row clicks cannot masquerade as period controls',async({page})=>{await open(page);expect(await page.locator('#nflPlayerPropTool tbody [data-nfl-ppt-period]').count()).toBe(0);const before=await page.locator('#nflPlayerPropTool').getAttribute('data-nfl-ppt-period');const cell=page.locator('#nflPlayerPropTool tbody tr[data-nfl-ppt-row]:visible td').nth(3);await expect(cell).toBeVisible();await cell.click();await page.waitForTimeout(120);expect(await page.locator('#nflPlayerPropTool').getAttribute('data-nfl-ppt-period')).toBe(before);await expect(page.locator('#nflPlayerPropTool .nfl-ppt-periodbar-v940 button[data-nfl-ppt-period="full"]')).toHaveAttribute('aria-pressed','true');});
'''
if row_test.strip() not in s:
    marker = "test('mobile remains horizontally contained'"
    if marker not in s:
        raise SystemExit('mobile regression marker missing')
    s = s.replace(marker, row_test + marker, 1)

old_assert = "assert.ok(!auth.includes('fetch('));"
new_assert = "assert.ok(auth.includes('.nfl-ppt-periodbar-v940 button[data-nfl-ppt-period]'));assert.ok(auth.includes('nflPptAuthorityPeriod'));assert.ok(!auth.includes('fetch('));"
if new_assert not in s:
    if old_assert not in s:
        raise SystemExit('static period authority assertion marker missing')
    s = s.replace(old_assert, new_assert, 1)
write(p, s)


# 3) Keep the one-time workflow label/version aligned in the worktree.
p = '.github/workflows/one-time-nfl-player-prop-tool-clean-v944.yml'
s = read(p).replace('v94.5', 'v94.6')
write(p, s)

print('v94.6 selector/request QA patch ready')
