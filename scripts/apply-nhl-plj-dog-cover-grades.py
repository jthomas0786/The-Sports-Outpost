from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_once(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'missing {label}')
    return text.replace(old, new, 1)

# 1) Market-derived +1.5 underdog cover grading.
path='sports/nhl/plj-candidate-v927.js'
s=read(path)
if 'gradePuckLineDog' not in s:
    marker="export const PLJ_CANDIDATE_ORDER={A:0,B:1,C:2};\n"
    addition="""

export const DOG_COVER_GRADE_ORDER={'A+':0,A:1,'B+':2,B:3,'C+':4,C:5,D:6};

const implied=p=>{
 const n=num(p);if(n==null||n===0)return null;
 return n<0?(-n)/((-n)+100):100/(n+100);
};

export function gradePuckLineDog(line){
 const l=line?.puckLine;
 if(!l?.underdogAbbr||Number(l.underdogLine??1.5)!==1.5)return null;
 const favoritePrice=num(l.price),dogPrice=num(l.underdogPrice);
 if(favoritePrice==null||dogPrice==null)return null;
 const favoriteRaw=implied(favoritePrice),dogRaw=implied(dogPrice);
 if(favoriteRaw==null||dogRaw==null||favoriteRaw+dogRaw<=0)return null;
 const coverProbability=dogRaw/(favoriteRaw+dogRaw);
 const coverPct=Number((coverProbability*100).toFixed(1));
 const grade=coverPct>=70?'A+':coverPct>=67?'A':coverPct>=64?'B+':coverPct>=61?'B':coverPct>=58?'C+':coverPct>=55?'C':'D';
 const label=grade==='A+'?'Elite +1.5 resistance':grade==='A'?'Strong +1.5 resistance':grade==='B+'?'Above-average cover profile':grade==='B'?'Solid cover profile':grade==='C+'?'Slight cover lean':grade==='C'?'Average cover profile':'Weak +1.5 resistance';
 const books=Math.max(0,Math.round(num(l.sportsbookCount)||0));
 const confidence=books>=7?'High':books>=5?'Medium':'Low';
 return {grade,label,coverProbability,coverPct,confidence,books,dogAbbr:l.underdogAbbr,dogTeam:l.underdogTeam||l.underdogAbbr,dogPrice,dogBook:l.underdogBook||'',favoritePrice};
}
"""
    s=replace_once(s, marker, marker+addition, 'PLJ candidate order marker')
write(path,s)

# 2) Render the new grade, probability and slate rank on Puck Line Jesus cards.
path='sports/nhl/puck-line-jesus.js'
s=read(path)
s=s.replace("import {gradePljCandidate,PLJ_CANDIDATE_ORDER} from './plj-candidate-v927.js?v=90.27';","import {gradePljCandidate,gradePuckLineDog,PLJ_CANDIDATE_ORDER} from './plj-candidate-v927.js?v=90.37-dog-cover';")
s=s.replace(" const candidate=gradePljCandidate(line);\n let code='UPCOMING';"," const candidate=gradePljCandidate(line);\n const dogCover=gradePuckLineDog(line);\n let code='UPCOMING';")
s=s.replace(" return {...meta,game,line,side,margin,swing,candidate,goaliePulled:goaliePulled(game,side.underdog)};"," return {...meta,game,line,side,margin,swing,candidate,dogCover,goaliePulled:goaliePulled(game,side.underdog)};")

new_status=r'''function statusCard(x){
 const g=x.game,l=x.line.puckLine,c=x.candidate,d=x.dogCover;
 const pre=g.status==='pre',candidateClass=pre&&c?` plj-candidate-card-${String(c.grade).toLowerCase()}`:'';
 const rightLabel=pre?'PLJ CANDIDATE':'COVER MARGIN';
 const rightValue=pre?(c?`Grade ${c.grade}`:'Pending'):x.margin>=0?`+${x.margin}`:String(x.margin);
 const rightDetail=pre?(c?.label||'Waiting for enough market data'):(x.goaliePulled?'Opponent net empty':'Live state verified');
 const rightClass=pre&&c?` class="plj-candidate-grade plj-candidate-grade-${String(c.grade).toLowerCase()}"`:'';
 const detail=pre&&c?c.detail:x.detail;
 const dogClass=d?String(d.grade).toLowerCase().replace('+','-plus'):'';
 const dogTile=pre&&d?`<div class="plj-dog-cover"><small>DOG +1.5 COVER${x.dogRank?` · #${x.dogRank}`:''}</small><b class="plj-dog-grade plj-dog-grade-${dogClass}">${esc(d.dogAbbr)} +1.5 · Grade ${esc(d.grade)}</b><span>${esc(`${d.coverPct}% no-vig market estimate`)} · ${esc(price(d.dogPrice))} ${esc(d.dogBook||'Sportsbook')} · ${esc(d.confidence)} confidence</span></div>`:'';
 return `<article class="plj-card plj-${x.code.toLowerCase().replaceAll('_','-')}${candidateClass}">
  <div class="plj-card-top"><span class="plj-badge">${esc(x.label)}</span><span>${esc(gameClock(g))}</span></div>
  <div class="plj-match"><div>${logo(g.away)}<b>${esc(g.away.abbr)}</b><strong>${pre?'—':esc(g.away.score??'—')}</strong></div><i>@</i><div>${logo(g.home)}<b>${esc(g.home.abbr)}</b><strong>${pre?'—':esc(g.home.score??'—')}</strong></div></div>
  <div class="plj-line${pre&&d?' plj-line-three':''}"><div><small>TRACKED FAVORITE</small><b>${esc(l.favoriteAbbr)} -1.5 <em>${esc(price(l.price))}</em></b><span>${esc(l.book||'Sportsbook')} · ${Number(l.sportsbookCount||0)} book${Number(l.sportsbookCount||0)===1?'':'s'}${l.lockedFromHistory?' · locked pregame':''}</span></div>${dogTile}<div><small>${esc(rightLabel)}</small><b${rightClass}>${esc(rightValue)}</b><span>${esc(rightDetail)}</span></div></div>
  <p>${esc(detail)}</p><button type="button" data-plj-game="${esc(g.id)}">Open NHL Live →</button>
 </article>`;
}
function section'''
s2,n=re.subn(r'function statusCard\(x\)\{.*?\n\}\nfunction section',new_status,s,count=1,flags=re.S)
if n!=1 and 'DOG +1.5 COVER' not in s:
    raise SystemExit('could not replace PLJ statusCard')
s=s2 if n==1 else s

old=" const upcoming=model.upcoming.slice().sort((a,b)=>(PLJ_CANDIDATE_ORDER[a.candidate?.grade]??9)-(PLJ_CANDIDATE_ORDER[b.candidate?.grade]??9)||Date.parse(a.game.startTime)-Date.parse(b.game.startTime));\n const gradeA=upcoming.filter(x=>x.candidate?.grade==='A').length;"
new=" const dogRanked=model.upcoming.filter(x=>x.dogCover).slice().sort((a,b)=>(b.dogCover?.coverProbability??0)-(a.dogCover?.coverProbability??0));\n dogRanked.forEach((x,i)=>{x.dogRank=i+1;});\n const upcoming=model.upcoming.slice().sort((a,b)=>(PLJ_CANDIDATE_ORDER[a.candidate?.grade]??9)-(PLJ_CANDIDATE_ORDER[b.candidate?.grade]??9)||Date.parse(a.game.startTime)-Date.parse(b.game.startTime));\n const gradeA=upcoming.filter(x=>x.candidate?.grade==='A').length;"
s=replace_once(s,old,new,'PLJ upcoming ranking block')
s=s.replace("${section('Pregame PLJ Candidates','A/B/C market-shape grade from -1.5 pricing, +1.5 resistance and sportsbook breadth — not a win probability.'","${section('Pregame PLJ Candidates','PLJ favorite grade plus a separate ranked +1.5 underdog cover grade and no-vig market estimate.'")
s=s.replace("Candidate grades are market-shape heuristics, not probabilities · Live score/on-ice state: ESPN","Candidate grades are market-shape heuristics · Dog-cover percentages are no-vig market-implied estimates from paired +1.5/-1.5 prices, not Sports Outpost simulation probabilities · Live score/on-ice state: ESPN")
s=s.replace("./sports/nhl/plj-candidate-v927.css?v=90.27","./sports/nhl/plj-candidate-v927.css?v=90.37-dog-cover")
s=s.replace("export const __PLJ_TEST__={clockSeconds,goaliePulled,classifyPuckLineGame,buildPuckLineJesusModel,gradePljCandidate};","export const __PLJ_TEST__={clockSeconds,goaliePulled,classifyPuckLineGame,buildPuckLineJesusModel,gradePljCandidate,gradePuckLineDog};")
write(path,s)

# 3) Styling for the dedicated underdog grade tile.
path='sports/nhl/plj-candidate-v927.css'
s=read(path)
if '.plj-dog-grade' not in s:
    s += """
.plj-line.plj-line-three{grid-template-columns:repeat(3,minmax(0,1fr))}
.plj-dog-cover{border-color:rgba(52,211,153,.18)!important;background:linear-gradient(180deg,rgba(52,211,153,.055),rgba(255,255,255,.018))!important}
.plj-dog-grade{display:block!important}
.plj-dog-grade-a-plus,.plj-dog-grade-a{color:#78efbd!important}
.plj-dog-grade-b-plus,.plj-dog-grade-b{color:#9fc7ff!important}
.plj-dog-grade-c-plus,.plj-dog-grade-c{color:#d3dfed!important}
.plj-dog-grade-d{color:#9aabba!important}
@media(max-width:900px){.plj-line.plj-line-three{grid-template-columns:repeat(2,minmax(0,1fr))}.plj-line-three .plj-dog-cover{grid-column:1/-1}}
@media(max-width:620px){.plj-line.plj-line-three{grid-template-columns:1fr}.plj-line-three .plj-dog-cover{grid-column:auto}}
"""
write(path,s)

# 4) Regression coverage.
path='scripts/nhl-puck-line-jesus-selftest.mjs'
s=read(path)
s=s.replace("import {gradePljCandidate} from '../sports/nhl/plj-candidate-v927.js';","import {gradePljCandidate,gradePuckLineDog} from '../sports/nhl/plj-candidate-v927.js';")
s=s.replace("underdogPrice:-135,sportsbookCount:5","underdogAbbr:'CGY',underdogTeam:'Calgary Flames',underdogLine:1.5,underdogPrice:-135,underdogBook:'BetMGM',sportsbookCount:5")
if 'strongDogCover' not in s:
    marker="assert.equal(cCandidate.grade,'C','heavily juiced -1.5 should not be promoted as a PLJ setup');\n"
    addition="""const strongDogCover=gradePuckLineDog({puckLine:{favoriteAbbr:'BUF',line:-1.5,price:231,underdogAbbr:'CBJ',underdogLine:1.5,underdogPrice:-250,underdogBook:'bet365',sportsbookCount:6}});
const weakDogCover=gradePuckLineDog({puckLine:{favoriteAbbr:'EDM',line:-1.5,price:115,underdogAbbr:'VAN',underdogLine:1.5,underdogPrice:-126,underdogBook:'Pinnacle',sportsbookCount:7}});
assert.equal(strongDogCover.grade,'A+','strong +1.5 market resistance should receive the top dog-cover grade');
assert.equal(weakDogCover.grade,'D','near-balanced +1.5 pricing should receive a low dog-cover grade');
assert.ok(strongDogCover.coverProbability>weakDogCover.coverProbability,'dog-cover grade must order stronger market-implied cover chances above weaker ones');
assert.equal(classifyPuckLineGame(pregame??{},line)?.dogCover?.dogAbbr??'CGY','CGY');
"""
    # pregame is declared later, so keep the classify assertion out of this insertion.
    addition=addition.replace("assert.equal(classifyPuckLineGame(pregame??{},line)?.dogCover?.dogAbbr??'CGY','CGY');\n","")
    s=replace_once(s,marker,marker+addition,'candidate regression insertion point')
    later="assert.equal(classifyPuckLineGame(pregame,{...line,puckLine:{...line.puckLine,price:190,underdogPrice:-180,sportsbookCount:8}}).candidate.grade,'A');\n"
    later_add="assert.equal(classifyPuckLineGame(pregame,line).dogCover.dogAbbr,'CGY','classified pregame games must carry the +1.5 dog-cover grade');\n"
    s=replace_once(s,later,later+later_add,'pregame dog-cover assertion point')
    s=s.replace("console.log('  ✓ PLJ pregame candidate A/B/C grading uses market shape without inventing probability');","console.log('  ✓ PLJ pregame candidate A/B/C grading uses market shape without inventing probability');\nconsole.log('  ✓ +1.5 underdogs receive ranked no-vig market cover grades without claiming simulation probability');")
write(path,s)

# 5) Keep every browser import on one cache-busted PLJ module identity.
path='sports/nhl/puck-line-jesus-alerts-v925.js'
s=read(path).replace("./puck-line-jesus.js?v=90.29","./puck-line-jesus.js?v=90.37-dog-cover")
write(path,s)

path='sports/nhl/view-v906.js'
s=read(path)
s=s.replace("./puck-line-jesus.js?v=90.29","./puck-line-jesus.js?v=90.37-dog-cover")
s=s.replace("./puck-line-jesus-alerts-v925.js?v=90.29","./puck-line-jesus-alerts-v925.js?v=90.37-dog-cover")
write(path,s)

path='sports/router.js'
s=read(path)
if 'pljdog=1' not in s:
    s,n=re.subn(r"(\./nhl/view-v906\.js\?v=[^'\"]+)(['\"])",lambda m:m.group(1)+'&pljdog=1'+m.group(2),s,count=1)
    if n!=1: raise SystemExit('could not bump NHL view cache key')
write(path,s)

path='index.html'
s=read(path)
if 'nhlpljdog=1' not in s:
    s,n=re.subn(r"(\./sports/router\.js\?v=[^'\"]+)(['\"])",lambda m:m.group(1)+'&nhlpljdog=1'+m.group(2),s,count=1)
    if n!=1: raise SystemExit('could not bump outer sports router cache key')
write(path,s)

print('Applied NHL Puck Line Jesus +1.5 dog cover grades, ranks and cache busts.')
