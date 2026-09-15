from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def replace_between(text,start,end,replacement):
    a=text.find(start)
    if a<0: raise SystemExit(f'missing start marker: {start}')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'missing end marker: {end}')
    return text[:a]+replacement+text[b:]

# Wire the historical fallback into the base NHL props renderer.
p=ROOT/'sports/nhl/view.js'
s=p.read_text()
imp="import {historicalPropProjection,historicalSourceLabel,propLine} from './props-model.js?v=90.1';\n"
if imp not in s:
    needle="import {gradeForLean,gradeRingHTML,overProbability} from './grade.js?v=90.4';\n"
    if needle not in s: raise SystemExit('grade import marker missing')
    s=s.replace(needle,needle+imp,1)

replacement=r'''function projectionState(p){
 const simulated=simulationMetric(p);
 if(simulated)return {...simulated,source:'simulation',historical:null};
 const historical=historicalPropProjection(research?.players?.[p.id],market,research?.currentSeason);
 return historical?{game:null,metric:historical.metric,source:'historical',historical}:null;
}
function forecast(p,state=projectionState(p)){
 if(!state)return '';
 const {game,metric}=state;
 if(state.source==='simulation')return `${market==='atg'?'Goal chance '+(metric.atLeastOne*100).toFixed(1)+'% · ':''}Mean ${metric.mean.toFixed(2)} · Median ${metric.median} · ${game.iterations.toLocaleString()} sims`;
 const source=historicalSourceLabel(state.historical);
 return market==='atg'?`Baseline goal chance ${(metric.atLeastOne*100).toFixed(1)}% · ${source}`:`Historical model · Mean ${metric.mean.toFixed(2)} · Median ${metric.median} · ${source}`;
}
function baseline(p){const history=research?.players?.[p.id];const key=market==='atg'?'goals':market;const rate=history?.rates?.[key];return rate==null?'Season baseline pending':`${history.season-1}–${String(history.season).slice(-2)} avg ${Number(rate).toFixed(2)}/game (${history.games} GP)`;}
function priceText(p,q=quoteFor(odds,p.game.id,p.id,market)){
 if(p.game.status==='post')return 'Market closed';
 if(q)return `${q.book} · ${market==='atg'?'Goal':q.line} · ${market==='atg'?'Yes':'O'} ${priceFmt(q.over)} / ${market==='atg'?'No':'U'} ${priceFmt(q.under)}`;
 const picked=propLine(market,null),label=market==='atg'?'Goal 0.5':`O ${picked.line}`;
 if(!Number.isFinite(picked.line))return p.game.status==='in'?'Live odds pending':'Odds pending';
 return `TSO reference ${label} · ${p.game.status==='in'?'live sportsbook odds pending':'sportsbook odds pending'}`;
}
function gradeState(p,state=projectionState(p)){
 const q=quoteFor(odds,p.game.id,p.id,market),picked=propLine(market,q);
 const probability=state&&Number.isFinite(picked.line)?overProbability(state.metric,picked.line):null;
 return {probability,grade:gradeForLean(probability),q,line:picked.line,referenceLine:picked.reference,source:state?.source||null,historical:state?.historical||null,game:state?.game||null};
}
function props(){
 const ps=(doc?.games||[]).flatMap(g=>g.players.map(p=>({...p,game:g}))).filter(p=>market==='saves'?p.position==='G':p.position!=='G');
 const ranked=ps.map(p=>{const state=projectionState(p);return {p,state,grade:gradeState(p,state)};}).sort((a,b)=>(b.grade.probability??-1)-(a.grade.probability??-1));
 return `<div class="hk-prop-toolbar"><label>Player market<select id="hk-market">${Object.entries(markets).map(([k,v])=>`<option value="${k}" ${k===market?'selected':''}>${v}</option>`).join('')}</select></label><div class="hk-prop-note"><b>${ps.length}</b><span>players on this slate</span></div></div><div class="hk-list-head"><span>${esc(markets[market])}</span><small>Same NFL grade thresholds + progress rings · confirmed simulations when ready · verified 2025–26 historical fallback · sportsbook lines when listed</small></div><div class="hk-prop-list">${ranked.map(({p,state,grade},i)=>{
 const key=market==='atg'?'goals':market,model=forecast(p,state),book=priceText(p,grade.q);
 const ring=gradeRingHTML(grade.probability,grade.grade,'lg');
 let gradeNote='Historical baseline pending';
 if(grade.probability!=null){
  const pct=(grade.probability*100).toFixed(grade.probability<.1?1:0)+'%';
  gradeNote=grade.source==='simulation'?`TSO grade · ${pct} model hit · ${grade.game.iterations.toLocaleString()} sims${grade.referenceLine?' · TSO reference line':''}`:`TSO grade · ${pct} model hit · ${historicalSourceLabel(grade.historical)} · ${grade.referenceLine?'TSO reference line':'sportsbook line'}`;
 }
 return `<article class="hk-prop-card"><div class="hk-prop-rank">${i+1}</div><div class="hk-prop-avatar">${photo(p)}</div><div class="hk-prop-main"><div class="hk-prop-name"><b>${esc(p.name)}</b><span>${esc(p.team)} · ${esc(p.position)}</span></div><div class="hk-prop-match">${esc(p.game.away.abbr)} @ ${esc(p.game.home.abbr)} · ${esc(p.availability||'Status pending')}</div><div class="hk-prop-detail"><span>CURRENT<b>${esc(p.current?.[key]??'—')}</b></span><span>BASELINE<b>${esc(baseline(p))}</b></span><span>LINEUP<b>${esc(lineupLabel(p.game))}</b></span></div></div><div class="hk-prop-market"><span>${esc(markets[market])}</span><strong>${model?esc(model):'Projection pending'}</strong><small>${esc(book)}</small></div><div class="hk-prop-grade">${ring}<small>${esc(gradeNote)}</small></div></article>`;
 }).join('')||empty('Player rosters are not available yet.')}</div>`;
}
'''
s=replace_between(s,'function forecast(','function scorebar(',replacement)
p.write_text(s)

# Bust the wrapper and router imports so production immediately receives the new base renderer.
p=ROOT/'sports/nhl/view-v906.js'
s=p.read_text()
s,n=re.subn(r"import \* as base from './view\.js\?v=[^']+';", "import * as base from './view.js?v=90.6';", s, count=1)
if n!=1: raise SystemExit('view-v906 base import marker missing')
p.write_text(s)

p=ROOT/'sports/router.js'
s=p.read_text()
s,n=re.subn(r"import\('./nhl/view-v906\.js\?v=[^']+'\)", "import('./nhl/view-v906.js?v=90.19')", s, count=1)
if n!=1: raise SystemExit('router NHL import marker missing')
p.write_text(s)

# Bust the outer router import without depending on the current cache version.
p=ROOT/'index.html'
s=p.read_text()
s,n=re.subn(r'(\./sports/router\.js\?v=)[^"\']+', r'\g<1>90.52', s, count=1)
if n!=1: raise SystemExit('index router import marker missing')
p.write_text(s)

# Put the fallback regression in the normal NHL workflow.
p=ROOT/'.github/workflows/nhl.yml'
s=p.read_text()
if 'node --check sports/nhl/props-model.js' not in s:
    s=s.replace('          node --check sports/nhl/view-v906.js\n','          node --check sports/nhl/view-v906.js\n          node --check sports/nhl/props-model.js\n',1)
if 'node scripts/nhl-props-baseline-selftest.mjs' not in s:
    s=s.replace('          node scripts/nhl-selftest.mjs\n','          node scripts/nhl-selftest.mjs\n          node scripts/nhl-props-baseline-selftest.mjs\n',1)
p.write_text(s)

# Document exactly when prior-season data gives way to the active season.
p=ROOT/'sports/nhl/README.md'
s=p.read_text()
marker='## Props historical fallback\n'
if marker not in s:
    s += '''\n\n## Props historical fallback\n\nNHL Props keep the strict lineup-confirmed simulation as the highest-confidence projection. When that simulation is not eligible, the Props page grades from verified 2025–26 regular-season player rates. Preseason games are excluded from the active-season blend. The 2026–27 regular season remains at 0% weight through five completed games, blends linearly from games 6–19, and becomes the full baseline at 20 completed regular-season games. If a sportsbook line is unavailable, the UI uses a clearly labeled TSO reference line for the grade and explicitly says sportsbook odds are pending.\n'''
p.write_text(s)

print('Applied NHL Props historical fallback to production renderer and cache chain.')
