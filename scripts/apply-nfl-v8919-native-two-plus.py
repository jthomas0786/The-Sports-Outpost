from pathlib import Path
import re

# v89.19: make 2+ TD a native NFL prop-card + player-modal field.
# The v89.18 enhancer appended a separate strip; this patch moves the value into
# the actual render path so users cannot miss it and every surface shares one value.

preview = Path('sports/nfl-preview.js')
s = preview.read_text()

marker = "function propValue(p,prop){"
helper = """function twoPlusTdProbability(p){
  const two=finiteNumberOrNull(p?.sim?.probabilities?.twoPlusTd);
  const atd=finiteNumberOrNull(p?.sim?.probabilities?.atd);
  if(two==null) return null;
  return clamp(two,0,atd==null?1:atd);
}

"""
if 'function twoPlusTdProbability(p)' not in s:
    if marker not in s: raise SystemExit('preview propValue marker missing')
    s=s.replace(marker,helper+marker,1)

old_bridge="""      simProb:finiteNumberOrNull(v.simProb),
      simUsed:!!v.simUsed,
      offer:o?{"""
new_bridge="""      simProb:finiteNumberOrNull(v.simProb),
      simUsed:!!v.simUsed,
      twoPlusTd:prop==='atd'?twoPlusTdProbability(player):null,
      offer:o?{"""
if 'twoPlusTd:prop===' not in s:
    if old_bridge not in s: raise SystemExit('canonical prop bridge marker missing')
    s=s.replace(old_bridge,new_bridge,1)

old_detail="""function propCardDetail(p,v,prop){
  if(prop==='atd'||prop==='firstTd') return [
    ['SNAP',`${p.usage}%`],['RZ OPPS',p.rz],['TSO EDGE',p.edge],
  ];
  return [
    ['TSO PROJ',fmtLine(v.projection)],['L5 AVG',fmtLine(v.recent)],['OPP AVG',fmtLine(v.defense)],
  ];
}"""
new_detail="""function propCardDetail(p,v,prop){
  if(prop==='atd'){
    const two=twoPlusTdProbability(p);
    return [
      ['SNAP',`${p.usage}%`],['RZ OPPS',p.rz],['2+ TD',two==null?'—':`${(two*100).toFixed(1)}%`],['TSO EDGE',p.edge],
    ];
  }
  if(prop==='firstTd') return [
    ['SNAP',`${p.usage}%`],['RZ OPPS',p.rz],['TSO EDGE',p.edge],
  ];
  return [
    ['TSO PROJ',fmtLine(v.projection)],['L5 AVG',fmtLine(v.recent)],['OPP AVG',fmtLine(v.defense)],
  ];
}"""
if "['2+ TD',two==null" not in s:
    if old_detail not in s: raise SystemExit('native prop-card detail block missing')
    s=s.replace(old_detail,new_detail,1)

old_market="""  const marketLabel=PROPS[prop]||prop;
  const marketMain=(prop==='atd'||prop==='firstTd')?v.main:(v.line!=null?`Over ${fmtLine(v.line)}`:`Proj ${fmtLine(v.projection)}`);
  const odds="""
new_market="""  const marketLabel=PROPS[prop]||prop;
  const marketMain=(prop==='atd'||prop==='firstTd')?v.main:(v.line!=null?`Over ${fmtLine(v.line)}`:`Proj ${fmtLine(v.projection)}`);
  const twoPlus=prop==='atd'?twoPlusTdProbability(p):null;
  const twoPlusInline=twoPlus==null?'':`<span class=\"nfl-mlb-two-plus-inline\" style=\"display:inline-flex;align-items:center;gap:5px;width:max-content;margin-top:6px;padding:4px 7px;border:1px solid rgba(245,158,11,.42);border-radius:999px;background:rgba(245,158,11,.11);color:#fbbf24;font:900 8px 'JetBrains Mono',monospace\">2+ TD <b style=\"color:#fff\">${(twoPlus*100).toFixed(1)}%</b></span>`;
  const odds="""
if 'const twoPlusInline=' not in s:
    if old_market not in s: raise SystemExit('playerCard market marker missing')
    s=s.replace(old_market,new_market,1)

old_html="""    <div class=\"nfl-mlb-prop-market\"><span>${esc(marketLabel)}</span><strong>${esc(marketMain)}</strong><small>"""
new_html="""    <div class=\"nfl-mlb-prop-market\"><span>${esc(marketLabel)}</span><strong>${esc(marketMain)}</strong>${twoPlusInline}<small>"""
if '${twoPlusInline}<small>' not in s:
    if old_html not in s: raise SystemExit('playerCard market HTML marker missing')
    s=s.replace(old_html,new_html,1)

preview.write_text(s)

# Player modal: consume the exact same canonical 2+ probability.
research=Path('sports/nfl-research-ui.js')
r=research.read_text()

old_hdr="""function propHeaderStats(r,ctx,snapPct,rzOpps){
  const seasonTotal=propSeasonTotal(r,ctx.key),vol=propVolume(r,ctx.key);
  if(ctx.key==='atd'||ctx.key==='firstTd') return [
    [ctx.key==='atd'?`${ctx.prob}%`:`${ctx.prob}%`,ctx.meta.button],
    [r?.last5?.tdGames??'—','TD Games L5'],
    [rzOpps||'—','RZ Opps'],
    [Number.isFinite(ctx.defense)?fmt1(ctx.defense):'—','Opp TD/G']
  ];"""
new_hdr="""function propHeaderStats(r,ctx,snapPct,rzOpps,twoPlusTd=null){
  const seasonTotal=propSeasonTotal(r,ctx.key),vol=propVolume(r,ctx.key);
  if(ctx.key==='atd') return [
    [`${ctx.prob}%`,ctx.meta.button],
    [Number.isFinite(Number(twoPlusTd))?`${Number(twoPlusTd).toFixed(1)}%`:'—','2+ TD'],
    [rzOpps||'—','RZ Opps'],
    [Number.isFinite(ctx.defense)?fmt1(ctx.defense):'—','Opp TD/G']
  ];
  if(ctx.key==='firstTd') return [
    [`${ctx.prob}%`,ctx.meta.button],
    [r?.last5?.tdGames??'—','TD Games L5'],
    [rzOpps||'—','RZ Opps'],
    [Number.isFinite(ctx.defense)?fmt1(ctx.defense):'—','Opp TD/G']
  ];"""
if "'2+ TD']" not in r:
    if old_hdr not in r: raise SystemExit('modal header stats block missing')
    r=r.replace(old_hdr,new_hdr,1)

old_atd="""  const atd=numeric(textMetric(scoring,'Anytime TD'),Number(r?.model?.atdProbability||0)*100);
  const firstTd=numeric(textMetric(scoring,'First TD'),0);"""
new_atd="""  const atd=numeric(textMetric(scoring,'Anytime TD'),Number(r?.model?.atdProbability||0)*100);
  const canonicalAtd=findPreviewPropResult(r,'atd');
  const twoPlusRaw=Number(canonicalAtd?.twoPlusTd);
  const twoPlusTd=Number.isFinite(twoPlusRaw)?clampNum(twoPlusRaw<=1?twoPlusRaw*100:twoPlusRaw,0,100):null;
  const firstTd=numeric(textMetric(scoring,'First TD'),0);"""
if 'const canonicalAtd=findPreviewPropResult' not in r:
    if old_atd not in r: raise SystemExit('modal ATD extraction marker missing')
    r=r.replace(old_atd,new_atd,1)

old_ctx="""    const ctx=propContext(r,selected,{atd,firstTd,edge});
    const propSelect="""
new_ctx="""    const ctx=propContext(r,selected,{atd,firstTd,edge});
    if(selected==='atd'&&twoPlusTd!=null) ctx.twoPlusTd=twoPlusTd;
    const propSelect="""
if "ctx.twoPlusTd=twoPlusTd" not in r:
    if old_ctx not in r: raise SystemExit('modal prop context marker missing')
    r=r.replace(old_ctx,new_ctx,1)

old_call="""    const hs=propHeaderStats(r,ctx,snapPct,rzOpps);"""
new_call="""    const hs=propHeaderStats(r,ctx,snapPct,rzOpps,twoPlusTd);"""
if new_call not in r:
    if old_call not in r: raise SystemExit('modal header call marker missing')
    r=r.replace(old_call,new_call,1)

old_body="""  if(ctx.key==='atd'||ctx.key==='firstTd') body=`${ctx.prob}% ${ctx.meta.label.toLowerCase()} probability for ${last}. ${depthLabel(r,r.position)} · ${snapPct||'—'}% snap baseline · ${rzOpps||'—'} red-zone opportunities · ${fmt1(ctx.defense)} TD/g allowed by the matchup position group.`;"""
new_body="""  if(ctx.key==='atd'||ctx.key==='firstTd'){
    const multi=ctx.key==='atd'&&Number.isFinite(Number(ctx.twoPlusTd))?` · ${Number(ctx.twoPlusTd).toFixed(1)}% chance for 2+ TDs.`:'';
    body=`${ctx.prob}% ${ctx.meta.label.toLowerCase()} probability for ${last}. ${depthLabel(r,r.position)} · ${snapPct||'—'}% snap baseline · ${rzOpps||'—'} red-zone opportunities · ${fmt1(ctx.defense)} TD/g allowed by the matchup position group.${multi}`;
  }"""
if 'chance for 2+ TDs' not in r:
    if old_body not in r: raise SystemExit('modal verdict body marker missing')
    r=r.replace(old_body,new_body,1)

research.write_text(r)

# Cache-bust the actual module chain.
v890=Path('sports/nfl-preview-v890.js'); x=v890.read_text(); x=x.replace("./nfl-preview.js?v=89.39","./nfl-preview.js?v=89.40"); v890.write_text(x)
v893=Path('sports/nfl-preview-v893.js'); x=v893.read_text(); x=x.replace("./nfl-preview-v890.js?v=89.39","./nfl-preview-v890.js?v=89.40"); v893.write_text(x)
router=Path('sports/router.js'); x=router.read_text(); x=x.replace("./nfl-preview-v893.js?v=89.41","./nfl-preview-v893.js?v=89.42"); x=x.replace("./nfl-research-ui.js?v=86.8","./nfl-research-ui.js?v=86.9"); router.write_text(x)

# Bump outer router cache marker without assuming its current version.
index=Path('index.html'); x=index.read_text();
pat=r'\./sports/router\.js\?v=(\d+)\.(\d+)'
m=re.search(pat,x)
if not m: raise SystemExit('index router cache marker missing')
major,minor=int(m.group(1)),int(m.group(2))
x=re.sub(pat,f'./sports/router.js?v={major}.{minor+1}',x,count=1)
index.write_text(x)

print('NFL v89.19 native 2+ TD visibility applied to prop cards and player modal')
