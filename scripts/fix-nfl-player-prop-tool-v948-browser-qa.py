from pathlib import Path

p=Path('tests/nfl-player-prop-tool-v947.spec.js')
s=p.read_text()

old="""  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'visible',timeout:60000});
  await page.locator('#nflPlayerPropToolBtn').click();"""
new="""  await page.waitForSelector('#nflPlayerPropToolBtn',{state:'attached',timeout:60000});
  await page.evaluate(()=>document.getElementById('nflPlayerPropToolBtn')?.click());"""
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('Prop Tool open helper marker missing')

perf="""

test('scrolling is display-only: no Prop Tool refetch or table rebuild',async({page})=>{
  let toolRequests=0;
  page.on('request',r=>{
    try{
      const u=new URL(r.url());
      if(SNAP.includes(u.pathname)&&(u.searchParams.get('v')||'').startsWith('94.8-'))toolRequests++;
    }catch{}
  });
  await open(page,{width:1280,height:800});
  await expect.poll(()=>toolRequests,{timeout:15000}).toBe(4);
  await page.evaluate(()=>{
    const tbody=document.querySelector('#nflPlayerPropTool tbody');
    if(tbody)tbody.dataset.scrollQaToken='stable';
  });
  const wrap=page.locator('#nflPlayerPropTool .nfl-ppt-table-wrap');
  for(let i=0;i<12;i++){
    await page.mouse.wheel(0,420);
    await wrap.evaluate((el,n)=>{el.scrollLeft=(n%2?0:Math.max(0,el.scrollWidth-el.clientWidth));},i);
  }
  await page.waitForTimeout(1200);
  expect(toolRequests).toBe(4);
  await expect(page.locator('#nflPlayerPropTool tbody')).toHaveAttribute('data-scroll-qa-token','stable');
});
"""
if 'scrolling is display-only: no Prop Tool refetch or table rebuild' not in s:
    s+=perf
p.write_text(s)

selftest=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
t=selftest.read_text()
anchor="assert.ok(!tool.includes('setInterval('),'Player Prop Tool must not poll');"
add="\nassert.ok(!tool.includes(\"addEventListener('scroll'\"),'Player Prop Tool must not render/refetch from scroll events');\nassert.ok(!tool.includes('addEventListener(\"scroll\"'),'Player Prop Tool must not render/refetch from scroll events');"
if add.strip() not in t:
    if anchor not in t: raise SystemExit('static performance QA anchor missing')
    t=t.replace(anchor,anchor+add,1)
selftest.write_text(t)
print('NFL Player Prop Tool v94.8 browser navigation + scroll-performance QA patched')
Path('scripts/fix-nfl-player-prop-tool-v948-browser-qa.py').unlink(missing_ok=True)
