from pathlib import Path

JS=Path('sports/nfl/player-prop-tool-v947.js')
PREVIEW=Path('sports/nfl-preview-v893.js')
ROUTER=Path('sports/router.js')
SELFTEST=Path('scripts/nfl-player-prop-tool-v947-selftest.mjs')
BROWSER=Path('tests/nfl-player-prop-tool-v947.spec.js')


def replace_once(path,old,new,label):
    text=path.read_text()
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    path.write_text(text.replace(old,new,1))


def replace_all(path,old,new,label,min_count=1):
    text=path.read_text()
    count=text.count(old)
    if count<min_count:
        raise SystemExit(f'{label}: expected at least {min_count} matches in {path}, found {count}')
    path.write_text(text.replace(old,new))
    return count

# Hard cache bust for the Matchup ownership correction.
replace_once(JS,"const VERSION='95.2';","const VERSION='95.3';",'tool version')
replace_once(PREVIEW,"./nfl/player-prop-tool-v947.js?v=95.2","./nfl/player-prop-tool-v947.js?v=95.3",'preview cache bust')
replace_once(ROUTER,"import('./nfl-preview-v893.js?v=95.2')","import('./nfl-preview-v893.js?v=95.3')",'router cache bust')

# Position-level allowance profile already exists in nfl-research.json as
# previousSeasonAllowed for defense + QB/RB/WR/TE. Keep it separate from the
# exact market allowance used by DEF VS PROP.
old_helper="""  return num(v);
}
function defenseUnit(market){
"""
new_helper="""  return num(v);
}
function historicalPositionAllowed(research,position){
  const pg=research?.matchup?.previousSeasonAllowed?.perGame||null;
  if(!pg)return null;
  const pos=String(position||'').toUpperCase();
  const safe=v=>v==null?null:num(v);
  return{
    yards:safe(pg.yards),
    tds:safe(pg.tds),
    volume:safe(pos==='QB'?pg.completions:pg.receptions),
    volumeLabel:pos==='QB'?'CMP/G':'REC/G',
  };
}
function defenseUnit(market){
"""
replace_once(JS,old_helper,new_helper,'position allowance helper')

old_attach="""function attachMatchupProfiles(rows){
  const groups=new Map();
  for(const row of rows){
    if(row.defAllowed==null)continue;
    const key=`${row.position}|${row.market}`;
    if(!groups.has(key))groups.set(key,new Map());
    groups.get(key).set(row.opp,row.defAllowed);
  }
  for(const row of rows){
    const vals=[...(groups.get(`${row.position}|${row.market}`)?.values()||[])].filter(Number.isFinite).sort((a,b)=>a-b);
    if(row.defAllowed==null||!vals.length){
      row.defWeaknessScore=null;row.defStrengthScore=null;row.defHistoryScore=null;row.defHistoryGrade='—';
    }else{
      const lower=vals.filter(v=>v<row.defAllowed).length,equal=vals.filter(v=>v===row.defAllowed).length;
      const allowancePct=clamp((lower+equal*.5)/vals.length);
      row.defWeaknessScore=allowancePct;
      row.defStrengthScore=clamp(1-allowancePct);
      const propFavorability=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
      row.defHistoryScore=propFavorability;
      row.defHistoryGrade=fourGrade(propFavorability);
    }

    const recentRate=row.l10Actual?.rate??row.l5Actual?.rate??null;
    const h2hRate=row.h2hActual?.total>=2?row.h2hActual.rate:null;
    const marginScore=row.histPct==null?null:clamp(.5+Number(row.histPct)*1.35);
    row.playerMatchupScore=weightedScore([[recentRate,.70],[marginScore,.20],[h2hRate,.10]]);
    const defenseFit=row.defHistoryScore;
    row.matchupDefenseScore=defenseFit;
    if(row.playerMatchupScore==null&&defenseFit!=null)row.matchupScore=weightedScore([[.5,.62],[defenseFit,.38]]);
    else if(defenseFit==null)row.matchupScore=row.playerMatchupScore;
    else row.matchupScore=weightedScore([[row.playerMatchupScore,.62],[defenseFit,.38]]);
    row.matchupGrade=fourGrade(row.matchupScore);
  }
}
"""
new_attach="""function attachMatchupProfiles(rows){
  const propGroups=new Map(),positionGroups=new Map();
  for(const row of rows){
    if(row.defAllowed!=null){
      const key=`${row.position}|${row.market}`;
      if(!propGroups.has(key))propGroups.set(key,new Map());
      propGroups.get(key).set(row.opp,row.defAllowed);
    }
    if(row.positionAllowedProfile){
      if(!positionGroups.has(row.position))positionGroups.set(row.position,new Map());
      positionGroups.get(row.position).set(row.opp,row.positionAllowedProfile);
    }
  }
  const percentile=(profiles,field,value)=>{
    if(value==null)return null;
    const vals=profiles.map(p=>p?.[field]).filter(v=>v!=null&&Number.isFinite(Number(v))).map(Number).sort((a,b)=>a-b);
    if(!vals.length)return null;
    const n=Number(value),lower=vals.filter(v=>v<n).length,equal=vals.filter(v=>v===n).length;
    return clamp((lower+equal*.5)/vals.length);
  };
  for(const row of rows){
    const vals=[...(propGroups.get(`${row.position}|${row.market}`)?.values()||[])].filter(Number.isFinite).sort((a,b)=>a-b);
    if(row.defAllowed==null||!vals.length){
      row.defWeaknessScore=null;row.defStrengthScore=null;row.defHistoryScore=null;row.defHistoryGrade='—';
    }else{
      const lower=vals.filter(v=>v<row.defAllowed).length,equal=vals.filter(v=>v===row.defAllowed).length;
      const allowancePct=clamp((lower+equal*.5)/vals.length);
      row.defWeaknessScore=allowancePct;
      row.defStrengthScore=clamp(1-allowancePct);
      const propFavorability=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
      row.defHistoryScore=propFavorability;
      row.defHistoryGrade=fourGrade(propFavorability);
    }

    const positionPeers=[...(positionGroups.get(row.position)?.values()||[])];
    const profile=row.positionAllowedProfile||positionGroups.get(row.position)?.get(row.opp)||null;
    row.positionAllowedProfile=profile;
    const yardsPct=percentile(positionPeers,'yards',profile?.yards);
    const tdsPct=percentile(positionPeers,'tds',profile?.tds);
    const volumePct=percentile(positionPeers,'volume',profile?.volume);
    const positionWeaknessScore=weightedScore([[yardsPct,.65],[tdsPct,.20],[volumePct,.15]]);
    row.positionMatchupScore=positionWeaknessScore;
    row.matchupScore=row.positionMatchupScore;
    row.matchupGrade=fourGrade(row.matchupScore);
  }
}
"""
replace_once(JS,old_attach,new_attach,'position-only Matchup ownership')

old_row="""        prob,edge,proj,l10Avg,l5Actual,l10Actual,h2hActual,defAllowed:historicalDefenseAllowed(research,String(c.market||''),String(c.position||player?.position||'').toUpperCase()),mean,median,p10,p25,p75,p90,iterations,simStop,histDelta,histPct,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',
"""
new_row="""        prob,edge,proj,l10Avg,l5Actual,l10Actual,h2hActual,defAllowed:historicalDefenseAllowed(research,String(c.market||''),String(c.position||player?.position||'').toUpperCase()),positionAllowedProfile:historicalPositionAllowed(research,String(c.position||player?.position||'').toUpperCase()),mean,median,p10,p25,p75,p90,iterations,simStop,histDelta,histPct,rank,correlationLift:num(c.correlationLift),correlationPartner:c.correlationPartner||'',
"""
replace_once(JS,old_row,new_row,'row position profile')

old_match="""function matchupHtml(row){
  const grade=row.matchupGrade||'—',tone=gradeToneHistorical(grade),src=teamLogo(row.opp),side=row.side==='under'?'Under':'Over';
  const player=row.playerMatchupScore==null?'player form pending':`${Math.round(row.playerMatchupScore*100)}% player-form score`;
  const defense=row.matchupDefenseScore==null?'defense profile pending':`${Math.round(row.matchupDefenseScore*100)}% defense-fit score`;
  const title=`${row.position||'OFF'} vs ${row.opp} defense for ${marketLabel(row.market)} ${side}. ${grade} blends actual recent player results with the opponent's actual previous-season defensive allowance to this position/prop (${player}; ${defense}). No simulation data is used.`;
  return `<div class=\"nfl-ppt-match-v947 ${tone}\" title=\"${esc(title)}\"><div class=\"nfl-ppt-match-line-v947\"><b>${esc(row.position||'OFF')}</b><span>vs</span>${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}</div><small>${esc(grade)}</small></div>`;
}
"""
new_match="""function matchupHtml(row){
  const grade=row.matchupGrade||'—',tone=gradeToneHistorical(grade),src=teamLogo(row.opp),profile=row.positionAllowedProfile||null;
  const detail=[];
  if(profile?.yards!=null)detail.push(`${fmt(profile.yards)} YDS/G`);
  if(profile?.tds!=null)detail.push(`${fmt(profile.tds)} TD/G`);
  if(profile?.volume!=null)detail.push(`${fmt(profile.volume)} ${profile.volumeLabel||'VOL/G'}`);
  const title=`${row.position||'OFF'} vs ${row.opp} defense. ${grade==='—'?'Position-level defensive allowance data is unavailable.':`${grade} is a position-only matchup grade: higher previous-season production allowed to the ${row.position||'offensive'} position group grades more favorably; lower allowance grades more difficult.`} ${detail.length?`Opponent position allowance: ${detail.join(' · ')}. `:''}This does not use this player's form, prop line, market, or Over/Under side. No simulation data is used.`;
  return `<div class=\"nfl-ppt-match-v947 ${tone}\" title=\"${esc(title)}\"><div class=\"nfl-ppt-match-line-v947\"><b>${esc(row.position||'OFF')}</b><span>vs</span>${src?`<img src=\"${esc(src)}\" alt=\"${esc(row.opp)} defense\">`:`<strong>${esc(row.opp||'DEF')}</strong>`}</div><small>${esc(grade)}</small></div>`;
}
"""
replace_once(JS,old_match,new_match,'position-only Matchup tooltip/render')

old_guide='    <div><b>MATCHUP</b><p>Player position vs the opponent defense. The grade blends actual recent player results with the opponent’s actual defensive allowance for this position/prop.</p></div>'
new_guide='    <div><b>MATCHUP</b><p>Position vs opponent defense only. Every player at the same position facing the same defense gets the same grade. Great/green means that defense allowed more production to the position; Poor/red means it was stingier.</p></div>'
replace_once(JS,old_guide,new_guide,'Quick Guide Matchup semantics')

# Permanent static regression ownership.
replace_all(SELFTEST,'95.2','95.3','selftest version bump')
old_static="""assert.ok(tool.includes('const defenseFit=row.defHistoryScore'),'MATCHUP must consume the same player-favorable defense fit');
assert.ok(tool.includes('row.matchupScore=weightedScore'),'MATCHUP must blend player form and opponent defense');
"""
new_static="""assert.ok(tool.includes('function historicalPositionAllowed(research,position)'),'MATCHUP must read the defense + position-group allowance profile');
assert.ok(tool.includes('positionAllowedProfile:historicalPositionAllowed'),'rows must carry a position-only opponent profile');
assert.ok(tool.includes('const positionWeaknessScore=weightedScore'),'MATCHUP must grade position-level opponent allowance');
assert.ok(tool.includes('row.positionMatchupScore=positionWeaknessScore'),'MATCHUP must own the position-only score');
assert.ok(tool.includes('row.matchupScore=row.positionMatchupScore'),'MATCHUP must not blend player form into the position grade');
assert.ok(!tool.includes('row.playerMatchupScore'),'MATCHUP must not use individual player-form scoring');
"""
replace_once(SELFTEST,old_static,new_static,'selftest Matchup ownership')
replace_once(SELFTEST,
"assert.ok(tool.includes('graded from the displayed player prop side'),'DEF tooltip must explain player-favorable grading');",
"assert.ok(tool.includes('graded from the displayed player prop side'),'DEF tooltip must explain player-favorable grading');\nassert.ok(tool.includes('position-only matchup grade'),'MATCHUP tooltip must explain position-only grading');\nassert.ok(tool.includes('Every player at the same position facing the same defense gets the same grade.'),'Quick Guide must lock position-only Matchup semantics');",
'selftest Matchup copy')

# Browser QA version bump and direct proof that same position/opponent owns one Matchup score.
replace_all(BROWSER,'95.2','95.3','browser version bump')
replace_once(BROWSER,
"test('v95.3 Matchup is player position vs opponent defense and DEF VS PROP favors the displayed pick'",
"test('v95.3 Matchup is position-only vs opponent defense and DEF VS PROP favors the displayed pick'",
'focused browser title')
replace_all(BROWSER,"expect(metrics.matchTitle).toContain('actual recent player results');","expect(metrics.matchTitle).toContain('position-only matchup grade');\n  expect(metrics.matchTitle).toContain(\"does not use this player's form\");",'focused Matchup tooltip',1)
replace_all(BROWSER,"expect(matchupData.title).toContain('actual recent player results');","expect(matchupData.title).toContain('position-only matchup grade');\n  expect(matchupData.title).toContain(\"does not use this player's form\");",'readability Matchup tooltip',1)

old_owner="""  const ownership=await page.evaluate(()=>{
    const rows=window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[];
    return rows.filter(x=>Number.isFinite(Number(x.matchupScore))&&Number.isFinite(Number(x.defStrengthScore))&&Number.isFinite(Number(x.defWeaknessScore))&&Number.isFinite(Number(x.defHistoryScore))).slice(0,100).map(r=>({matchupScore:r.matchupScore,defStrengthScore:r.defStrengthScore,defWeaknessScore:r.defWeaknessScore,defHistoryScore:r.defHistoryScore,side:r.side}));
  });
  expect(ownership.length).toBeGreaterThan(0);
  for(const row of ownership){
    expect(row.matchupScore).toBeGreaterThanOrEqual(0);
    expect(row.matchupScore).toBeLessThanOrEqual(1);
    expect(row.defStrengthScore+row.defWeaknessScore).toBeCloseTo(1,5);
    const expected=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
    expect(row.defHistoryScore).toBeCloseTo(expected,5);
  }
  expect(ownership.some(x=>x.side==='over')).toBe(true);
  expect(ownership.some(x=>x.side==='under')).toBe(true);
"""
new_owner="""  const ownership=await page.evaluate(()=>{
    const rows=window.__TSO_NFL_PLAYER_PROP_V947__?.buildRows?.()||[];
    return rows.filter(x=>Number.isFinite(Number(x.matchupScore))&&Number.isFinite(Number(x.positionMatchupScore))&&Number.isFinite(Number(x.defStrengthScore))&&Number.isFinite(Number(x.defWeaknessScore))&&Number.isFinite(Number(x.defHistoryScore))).slice(0,200).map(r=>({name:r.name,position:r.position,opp:r.opp,market:r.market,matchupScore:r.matchupScore,positionMatchupScore:r.positionMatchupScore,defStrengthScore:r.defStrengthScore,defWeaknessScore:r.defWeaknessScore,defHistoryScore:r.defHistoryScore,side:r.side}));
  });
  expect(ownership.length).toBeGreaterThan(0);
  for(const row of ownership){
    expect(row.matchupScore).toBeCloseTo(row.positionMatchupScore,8);
    expect(row.matchupScore).toBeGreaterThanOrEqual(0);
    expect(row.matchupScore).toBeLessThanOrEqual(1);
    expect(row.defStrengthScore+row.defWeaknessScore).toBeCloseTo(1,5);
    const expected=row.side==='under'?row.defStrengthScore:row.defWeaknessScore;
    expect(row.defHistoryScore).toBeCloseTo(expected,5);
  }
  const byPositionDefense=new Map();
  for(const row of ownership){
    const key=`${row.position}|${row.opp}`;
    if(!byPositionDefense.has(key))byPositionDefense.set(key,[]);
    byPositionDefense.get(key).push(row);
  }
  for(const rows of byPositionDefense.values()){
    if(rows.length<2)continue;
    const scores=new Set(rows.map(r=>Number(r.matchupScore).toFixed(8)));
    expect(scores.size).toBe(1);
  }
  expect(ownership.some(x=>x.side==='over')).toBe(true);
  expect(ownership.some(x=>x.side==='under')).toBe(true);
"""
replace_once(BROWSER,old_owner,new_owner,'browser position-only Matchup ownership')
replace_once(BROWSER,
"expect(guideText[8]).toContain('Player position vs the opponent defense');",
"expect(guideText[8]).toContain('Position vs opponent defense only');\n  expect(guideText[8]).toContain('same position facing the same defense gets the same grade');",
'Quick Guide browser Matchup semantics')

print('v95.3 position-only MATCHUP cutover applied')
