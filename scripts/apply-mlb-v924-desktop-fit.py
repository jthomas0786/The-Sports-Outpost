from pathlib import Path
import re

play=Path('sports/mlb/playstage-v901.js')
s=play.read_text()
old="""shell.innerHTML=rootHTML(snap,{prePlay:shouldAnimate,panel:state.panel||'live'});root=shell.querySelector(`.${ROOT_CLASS}`);wireStageTabs(root,state);state.lastPlayId=id;if(shouldAnimate)setTimeout(()=>animatePlay(root,snap),120);"""
new="""const mustRender=!root||!!shouldAnimate;
 if(mustRender){
   shell.innerHTML=rootHTML(snap,{prePlay:shouldAnimate,panel:state.panel||'live'});
   root=shell.querySelector(`.${ROOT_CLASS}`);
   wireStageTabs(root,state);
   if(shouldAnimate)setTimeout(()=>animatePlay(root,snap),120);
 }else if(root){
   root.dataset.lastPollAt=String(Date.now());
 }
 if(id)state.lastPlayId=id;"""
if old not in s:
    if 'const mustRender=!root||!!shouldAnimate;' not in s:
        raise SystemExit('playstage stable-render marker missing')
else:
    s=s.replace(old,new,1)
play.write_text(s)

router=Path('sports/router.js')
r=router.read_text()
r=r.replace("conceptV921,conceptV922,conceptV923]", "conceptV921,conceptV922,conceptV923,conceptV924]",1)
r=r.replace("import('./mlb/playstage-concept-v923-desktop-tabs.js?v=92.30')\n", "import('./mlb/playstage-concept-v923-desktop-tabs.js?v=92.30'),\n        import('./mlb/playstage-concept-v924-desktop-fit.js?v=92.40')\n",1)
r=r.replace("conceptV923.installMlbPlaystageConceptV923DesktopTabs?.();\n", "conceptV923.installMlbPlaystageConceptV923DesktopTabs?.();\n      conceptV924.installMlbPlaystageConceptV924DesktopFit?.();\n",1)
r=r.replace("./mlb/playstage-v901.js?v=90.45", "./mlb/playstage-v901.js?v=90.46",1)
for marker in [
    "conceptV923,conceptV924]",
    "./mlb/playstage-concept-v924-desktop-fit.js?v=92.40",
    "conceptV924.installMlbPlaystageConceptV924DesktopFit?.();",
    "./mlb/playstage-v901.js?v=90.46",
]:
    if marker not in r: raise SystemExit(f'router v924 marker missing: {marker}')
router.write_text(r)

index=Path('index.html')
i=index.read_text()
i2,n=re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+','./sports/router.js?v=90.51',i,count=1)
if n!=1: raise SystemExit('index router cache marker missing')
index.write_text(i2)
print('Applied MLB v924 full-width desktop fit + stable 5s polling')
