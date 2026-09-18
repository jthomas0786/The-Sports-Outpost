from pathlib import Path

p=Path('sports/nhl/launch-v922.js')
s=p.read_text()
old="""function installPropsControls(){
 const toolbar=document.querySelector('#nhlView .hk-prop-toolbar');if(!toolbar)return;
 let host=document.getElementById('hkLaunchPropsControls');
 if(!host){host=document.createElement('section');host.id='hkLaunchPropsControls';host.className='hk-launch-props-controls';toolbar.after(host);}
 const rows=[...document.querySelectorAll('#nhlView .hk-prop-card')].map(cardInfo);
"""
new="""function installPropsControls(){
 const toolbar=document.querySelector('#nhlView .hk-prop-toolbar');if(!toolbar)return;
 let host=document.getElementById('hkLaunchPropsControls');
 // Do not rebuild an already-mounted control bar. The launch observer watches
 // child-list changes, and replacing this innerHTML on every scan detached the
 // search field while a user was typing. A real NHL page rerender removes the
 // whole host, so the next scan still rebuilds controls from fresh slate data.
 if(host)return;
 host=document.createElement('section');host.id='hkLaunchPropsControls';host.className='hk-launch-props-controls';toolbar.after(host);
 const rows=[...document.querySelectorAll('#nhlView .hk-prop-card')].map(cardInfo);
"""
if new in s:
    print('NHL Props controls stability patch already applied')
elif old not in s:
    raise SystemExit('Expected installPropsControls anchor not found')
else:
    p.write_text(s.replace(old,new,1))
    print('Applied stable NHL Props controls patch')

# Keep the browser/selftest regression explicit so this bug cannot silently return.
t=Path('scripts/nhl-launch-v922-selftest.mjs')
ts=t.read_text()
anchor="assert(wrapper.includes('await installNhlLaunchV922(host);'),'production NHL wrapper must install launch controller');\n"
check="assert(launch.includes('if(host)return;'),'launch Props controls must stay mounted across observer scans so typing cannot detach the input');\n"
if check not in ts:
    if anchor not in ts: raise SystemExit('Launch selftest anchor missing')
    t.write_text(ts.replace(anchor,anchor+check,1))
    print('Added stable-controls launch regression')
