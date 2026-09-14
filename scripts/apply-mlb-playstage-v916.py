from pathlib import Path
import re


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing expected block: {label}')
    return text.replace(old, new, 1)

# v901: use the live linescore defensive alignment first so substitutions and
# position changes are reflected immediately. Fall back to boxscore players for
# any missing slot.
p = Path('sports/mlb/playstage-v901.js')
s = p.read_text()
old = """function fielders(feed,side){
 const team=feed?.liveData?.boxscore?.teams?.[side];if(!team?.players)return[];
 const active=new Map();
 Object.values(team.players).forEach(p=>{const pos=p?.position?.abbreviation;if(DEF_POS[pos]&&!active.has(pos)&&p?.person?.id)active.set(pos,{id:p.person.id,name:p.person.fullName,num:p.jerseyNumber||'',pos});});
 return [...active.values()];
}"""
new = """function fielders(feed,side){
 const slots=[['P','pitcher'],['C','catcher'],['1B','first'],['2B','second'],['SS','shortstop'],['3B','third'],['LF','left'],['CF','center'],['RF','right']];
 const live=feed?.liveData?.linescore?.defense||{},out=[],seen=new Set();
 for(const [pos,key] of slots){const person=live?.[key];if(!person?.id)continue;const p=playerFromFeed(feed,side,person);out.push({...p,id:p.id||person.id,name:p.name||person.fullName||'—',pos,num:p.num||''});seen.add(pos);}
 const team=feed?.liveData?.boxscore?.teams?.[side];
 if(team?.players)for(const raw of Object.values(team.players)){const pos=raw?.position?.abbreviation;if(!DEF_POS[pos]||seen.has(pos)||!raw?.person?.id)continue;const p=playerFromFeed(feed,side,raw.person);out.push({...p,id:p.id||raw.person.id,name:p.name||raw.person.fullName||'—',pos,num:p.num||raw.jerseyNumber||''});seen.add(pos);}
 return out.sort((a,b)=>slots.findIndex(([pos])=>pos===a.pos)-slots.findIndex(([pos])=>pos===b.pos));
}"""
s = must_replace(s, old, new, 'live fielders')

old = """function chibiHTML(p,team,pos,extra=''){const [c1,c2]=colors(team.abbr);const xy=pos||DEF_POS[p.pos]||[50,50];return`<div class=\"ps-chibi ${extra}\" data-player-id=\"${esc(p.id)}\" data-pos=\"${esc(p.pos)}\" style=\"left:${xy[0]}%;top:${xy[1]}%;--c1:${c1};--c2:${c2}\"><div class=\"ps-chibi-shadow\"></div><div class=\"ps-chibi-cap\"></div><div class=\"ps-chibi-head\"><img src=\"${playerImg(p.id)}\" alt=\"\" draggable=\"false\"></div><span class=\"ps-chibi-arm l\"></span><span class=\"ps-chibi-arm r\"></span><div class=\"ps-chibi-body\" data-num=\"${esc(p.num||'')}\"></div><span class=\"ps-chibi-leg l\"></span><span class=\"ps-chibi-leg r\"></span><span class=\"ps-chibi-glove\"></span>${extra.includes('ps-batter')?'<span class=\"ps-chibi-bat\"></span>':''}</div>`;}"""
new = """function chibiHTML(p,team,pos,extra=''){const [c1,c2]=colors(team.abbr);const xy=pos||DEF_POS[p.pos]||[50,50];const role=extra.includes('ps-batter')?'BAT':extra.includes('ps-runner')?({first:'1B',second:'2B',third:'3B'}[p.base]||'RUN'):(p.pos||'');const shortName=String(p.name||'Player').trim().split(/\\s+/).filter(Boolean).at(-1)||'Player';return`<div class=\"ps-chibi ${extra}\" data-player-id=\"${esc(p.id)}\" data-player-name=\"${esc(p.name||'')}\" data-actor-role=\"${esc(role)}\" data-base=\"${esc(p.base||'')}\" data-pos=\"${esc(p.pos)}\" style=\"left:${xy[0]}%;top:${xy[1]}%;--c1:${c1};--c2:${c2}\"><div class=\"ps-chibi-shadow\"></div><div class=\"ps-chibi-cap\"></div><div class=\"ps-chibi-head\"><img src=\"${playerImg(p.id)}\" alt=\"\" draggable=\"false\"></div><span class=\"ps-chibi-arm l\"></span><span class=\"ps-chibi-arm r\"></span><div class=\"ps-chibi-body\" data-num=\"${esc(p.num||'')}\"></div><span class=\"ps-chibi-leg l\"></span><span class=\"ps-chibi-leg r\"></span><span class=\"ps-chibi-glove\"></span>${extra.includes('ps-batter')?'<span class=\"ps-chibi-bat\"></span>':''}<span class=\"ps-actor-label\"><b>${esc(role||'•')}</b><span>${esc(shortName)}</span></span></div>`;}"""
s = must_replace(s, old, new, 'actor labels')
p.write_text(s)

# Router: install v916 after v915.
p = Path('sports/router.js')
s = p.read_text()
s = must_replace(s,
    'conceptV913,conceptV914,conceptV915] = await Promise.all([',
    'conceptV913,conceptV914,conceptV915,conceptV916] = await Promise.all([',
    'router destructure')
s = must_replace(s,
    "        import('./mlb/playstage-concept-v915.js?v=91.55')",
    "        import('./mlb/playstage-concept-v915.js?v=91.55'),\n        import('./mlb/playstage-concept-v916.js?v=91.60')",
    'router v916 import')
s = must_replace(s,
    '      conceptV915.installMlbPlaystageConceptV915?.();',
    '      conceptV915.installMlbPlaystageConceptV915?.();\n      conceptV916.installMlbPlaystageConceptV916?.();',
    'router v916 install')
s = s.replace('MLB v915 QA note:', 'MLB v916 field-actors note:')
p.write_text(s)

# Outer cache bust. Use regex so this stays safe if another workflow advanced it.
p = Path('index.html')
s = p.read_text()
s2, count = re.subn(r'\./sports/router\.js\?v=[A-Za-z0-9._-]+', './sports/router.js?v=90.41', s, count=1)
if count != 1:
    raise SystemExit('outer router cache-bust not found')
p.write_text(s2)

print('Applied MLB PlayStage v916 persistent field actors')
