from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        if new in s:
            return
        raise SystemExit(f'{label}: marker missing')
    p.write_text(s.replace(old, new, 1))


def bump_query(path, pattern, label):
    p = Path(path)
    s = p.read_text()
    m = re.search(pattern, s)
    if not m:
        raise SystemExit(f'{label}: version marker missing')
    prefix, major, minor = m.group(1), int(m.group(2)), int(m.group(3))
    new = f'{prefix}{major}.{minor + 1}'
    p.write_text(s[:m.start()] + new + s[m.end():])
    print(f'{label}: {m.group(0)} -> {new}')


preview = Path('sports/nfl-preview.js')
s = preview.read_text()

# Persist All Players controls instead of treating search as a one-off DOM hide.
state_old = "  allSort: 'edge',\n  gamecastTab: 'game',"
state_new = "  allSort: 'edge',\n  allSearch: '',\n  allTeam: 'ALL',\n  allPosition: 'ALL',\n  gamecastTab: 'game',"
if state_new not in s:
    if state_old not in s:
        raise SystemExit('All Players state marker missing')
    s = s.replace(state_old, state_new, 1)

new_all_players = r'''function allPlayerPositionBucket(pos){
  const p=String(pos||'').toUpperCase();
  return p==='HB'||p==='FB'?'RB':p;
}

function allPlayerMatchesFilters(p){
  const q=String(state.allSearch||'').trim().toLowerCase();
  const team=String(state.allTeam||'ALL').toUpperCase();
  const pos=String(state.allPosition||'ALL').toUpperCase();
  if(team!=='ALL' && String(p?.team||'').toUpperCase()!==team) return false;
  if(pos!=='ALL' && allPlayerPositionBucket(p?.pos)!==pos) return false;
  if(!q) return true;
  const r=p?.research||{};
  const hay=[
    p?.name,p?.team,p?.pos,p?.opp,
    r?.jersey,r?.position,r?.depth?.label,r?.depth?.role
  ].filter(v=>v!=null&&v!=='').join(' ').toLowerCase();
  return hay.includes(q);
}

function sortedAllPlayers(){
  const players=[...data().players];
  if(state.allSort==='primary') players.sort((a,b)=>b.prob-a.prob);
  else if(state.allSort==='firstTd') players.sort((a,b)=>(firstTdProbability(b)||0)-(firstTdProbability(a)||0));
  else if(state.allSort==='usage') players.sort((a,b)=>b.usage-a.usage);
  else if(state.allSort==='rz') players.sort((a,b)=>b.rz-a.rz);
  else players.sort((a,b)=>b.edge-a.edge);
  return players;
}

function allPlayerFilterOptions(players){
  const teams=[...new Set(players.map(p=>String(p?.team||'').toUpperCase()).filter(Boolean))].sort();
  const positions=[...new Set(players.map(p=>allPlayerPositionBucket(p?.pos)).filter(Boolean))].sort((a,b)=>{
    const order=['QB','RB','WR','TE','K','P','SKILL'];
    const ai=order.indexOf(a),bi=order.indexOf(b);
    return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b);
  });
  if(state.allTeam!=='ALL'&&!teams.includes(String(state.allTeam).toUpperCase())) state.allTeam='ALL';
  if(state.allPosition!=='ALL'&&!positions.includes(String(state.allPosition).toUpperCase())) state.allPosition='ALL';
  return {teams,positions};
}

function applyAllPlayersFilters(root){
  const list=root?.querySelector?.('#nflAllList');
  if(!list) return;
  const players=data().players||[];
  const byId=new Map(players.map(p=>[String(p.id),p]));
  let shown=0;
  for(const card of list.querySelectorAll('.nfl-mlb-prop-card[data-nfl-player]')){
    const p=byId.get(String(card.dataset.nflPlayer||''));
    const visible=!!p&&allPlayerMatchesFilters(p);
    card.hidden=!visible;
    card.style.display=visible?'':'none';
    if(visible){
      shown++;
      card.removeAttribute('aria-hidden');
      const rank=card.querySelector('.nfl-mlb-prop-rank');
      if(rank) rank.textContent=String(shown);
    }else{
      card.setAttribute('aria-hidden','true');
    }
  }
  const count=root.querySelector('#nflAllCount b');
  if(count) count.textContent=String(shown);
  const empty=root.querySelector('#nflAllEmpty');
  if(empty){
    empty.hidden=shown!==0;
    empty.style.display=shown===0?'':'none';
  }
}

function allPlayersHTML(){
  const players=sortedAllPlayers();
  const {teams,positions}=allPlayerFilterOptions(players);
  const cardProp=state.allSort==='firstTd'?'firstTd':'atd';
  const teamOptions=teams.map(team=>`<option value="${esc(team)}" ${state.allTeam===team?'selected':''}>${esc(team)}</option>`).join('');
  const positionOptions=positions.map(pos=>`<option value="${esc(pos)}" ${state.allPosition===pos?'selected':''}>${esc(pos)}</option>`).join('');
  const cards=players.map((p,i)=>playerCard(p,cardProp,i+1)).join('');
  return `<div class="ms-all-toolbar"><div class="ms-all-left"><label>Sort<select id="nflAllSort"><option value="edge" ${state.allSort==='edge'?'selected':''}>TSO Edge · high to low</option><option value="primary" ${state.allSort==='primary'?'selected':''}>Anytime TD probability</option><option value="firstTd" ${state.allSort==='firstTd'?'selected':''}>First TD probability</option><option value="usage" ${state.allSort==='usage'?'selected':''}>Snap share</option><option value="rz" ${state.allSort==='rz'?'selected':''}>Red-zone opportunities</option></select></label><label>Team<select id="nflAllTeam"><option value="ALL">All teams</option>${teamOptions}</select></label><label>Position<select id="nflAllPosition"><option value="ALL">All positions</option>${positionOptions}</select></label><label>Search<input id="nflSearch" value="${esc(state.allSearch)}" placeholder="Player, team or position" autocomplete="off" spellcheck="false"></label><button class="nfl-mlb-prop-tab" id="nflAllClear" type="button">Clear</button></div><div class="ms-prop-note" id="nflAllCount" aria-live="polite"><b>${players.length}</b> of ${players.length} modeled players</div></div><div class="nfl-mlb-prop-list" id="nflAllList">${cards}<div class="nfl-live-empty" id="nflAllEmpty" hidden style="display:none"><b>No players match those filters.</b><span>Clear a filter or try a different player/team search.</span></div></div>`;
}'''

pattern = r"function allPlayersHTML\(\)\{[\s\S]*?\n\}\n\n+function featuredPlayerForGame"
m = re.search(pattern, s)
if not m:
    if 'function allPlayerMatchesFilters(p)' not in s:
        raise SystemExit('All Players render function marker missing')
else:
    s = s[:m.start()] + new_all_players + "\n\nfunction featuredPlayerForGame" + s[m.end():]

old_wire = """  root.querySelector('#nflAllSort')?.addEventListener('change',e=>{state.allSort=e.target.value;render();});
  const search=root.querySelector('#nflSearch');
  search?.addEventListener('input',()=>{const q=search.value.toLowerCase();root.querySelectorAll('#nflAllList .nfl-mlb-prop-card').forEach(c=>c.hidden=!c.textContent.toLowerCase().includes(q));});
"""
new_wire = """  root.querySelector('#nflAllSort')?.addEventListener('change',e=>{state.allSort=e.target.value;render();});
  root.querySelector('#nflAllTeam')?.addEventListener('change',e=>{state.allTeam=e.target.value||'ALL';applyAllPlayersFilters(root);});
  root.querySelector('#nflAllPosition')?.addEventListener('change',e=>{state.allPosition=e.target.value||'ALL';applyAllPlayersFilters(root);});
  const search=root.querySelector('#nflSearch');
  search?.addEventListener('input',()=>{state.allSearch=search.value;applyAllPlayersFilters(root);});
  root.querySelector('#nflAllClear')?.addEventListener('click',()=>{
    state.allSearch=''; state.allTeam='ALL'; state.allPosition='ALL';
    const q=root.querySelector('#nflSearch'); if(q) q.value='';
    const team=root.querySelector('#nflAllTeam'); if(team) team.value='ALL';
    const pos=root.querySelector('#nflAllPosition'); if(pos) pos.value='ALL';
    applyAllPlayersFilters(root);
  });
  applyAllPlayersFilters(root);
"""
if new_wire not in s:
    if old_wire not in s:
        raise SystemExit('All Players wire marker missing')
    s = s.replace(old_wire, new_wire, 1)

preview.write_text(s)

# Cache-bust the production chain so the live site cannot retain the broken controls.
bump_query('sports/nfl-preview-v890.js', r"(\./nfl-preview\.js\?v=)(\d+)\.(\d+)", 'NFL base preview')
bump_query('sports/nfl-preview-v893.js', r"(\./nfl-preview-v890\.js\?v=)(\d+)\.(\d+)", 'NFL wrapper preview')
bump_query('sports/router.js', r"(\./nfl-preview-v893\.js\?v=)(\d+)\.(\d+)", 'NFL router preview import')
bump_query('index.html', r"(\./sports/router\.js\?v=)(\d+)\.(\d+)", 'outer router')

print('Applied NFL All Players search/filter controls fix')
