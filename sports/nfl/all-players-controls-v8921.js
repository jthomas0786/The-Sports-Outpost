const FILTER_STATE={search:'',team:'ALL',position:'ALL'};
let installed=false;
let observer=null;
let pending=false;

const norm=v=>String(v??'').trim();
const posBucket=v=>{const p=norm(v).toUpperCase();return p==='HB'||p==='FB'?'RB':p;};

function cardMeta(card){
  const name=norm(card.querySelector('.nfl-mlb-prop-name b')?.textContent);
  const meta=norm(card.querySelector('.nfl-mlb-prop-name span')?.textContent).split('·').map(norm);
  const team=(meta[0]||'').toUpperCase();
  const position=posBucket(meta[1]||'');
  return {name,team,position};
}

function optionHtml(values,current,allLabel){
  return [`<option value="ALL">${allLabel}</option>`,...values.map(v=>`<option value="${v}"${v===current?' selected':''}>${v}</option>`)].join('');
}

function ensureStyles(){
  if(document.getElementById('tso-nfl-all-players-v8921-styles'))return;
  const style=document.createElement('style');
  style.id='tso-nfl-all-players-v8921-styles';
  style.textContent=`
    #nflView .ms-all-toolbar{position:relative;z-index:2}
    #nflView .ms-all-toolbar .ms-all-left{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
    #nflView .ms-all-toolbar label{min-width:130px}
    #nflView .ms-all-toolbar label:has(#nflSearch){min-width:210px;flex:1 1 220px}
    #nflView .ms-all-toolbar select,#nflView .ms-all-toolbar input,#nflView .ms-all-toolbar button{pointer-events:auto!important;touch-action:manipulation}
    #nflView .ms-all-toolbar select,#nflView .ms-all-toolbar input{width:100%;box-sizing:border-box}
    #nflView #nflAllClear{align-self:flex-end;min-height:34px;white-space:nowrap}
    #nflView #nflAllList .nfl-mlb-prop-card[hidden]{display:none!important}
    #nflView #nflAllEmpty{margin-top:8px}
    @media(max-width:700px){#nflView .ms-all-toolbar label{min-width:calc(50% - 6px);flex:1 1 calc(50% - 6px)}#nflView .ms-all-toolbar label:has(#nflSearch){min-width:100%;flex-basis:100%}}
  `;
  document.head.appendChild(style);
}

function collect(root){
  const cards=[...root.querySelectorAll('#nflAllList .nfl-mlb-prop-card[data-nfl-player]')];
  const teams=new Set(),positions=new Set();
  for(const card of cards){
    const m=cardMeta(card);
    if(m.team)teams.add(m.team);
    if(m.position)positions.add(m.position);
    card.dataset.tsoAllName=m.name.toLowerCase();
    card.dataset.tsoAllTeam=m.team;
    card.dataset.tsoAllPosition=m.position;
  }
  const posOrder=['QB','RB','WR','TE','K','P','SKILL'];
  return {
    cards,
    teams:[...teams].sort(),
    positions:[...positions].sort((a,b)=>{
      const ai=posOrder.indexOf(a),bi=posOrder.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b);
    })
  };
}

function matches(card){
  const q=FILTER_STATE.search.trim().toLowerCase();
  const team=FILTER_STATE.team;
  const position=FILTER_STATE.position;
  if(team!=='ALL'&&card.dataset.tsoAllTeam!==team)return false;
  if(position!=='ALL'&&card.dataset.tsoAllPosition!==position)return false;
  if(!q)return true;
  const hay=[card.dataset.tsoAllName,card.dataset.tsoAllTeam,card.dataset.tsoAllPosition,card.textContent].join(' ').toLowerCase();
  return hay.includes(q);
}

function apply(root){
  const list=root.querySelector('#nflAllList');
  if(!list)return;
  const {cards}=collect(root);
  let shown=0;
  for(const card of cards){
    const visible=matches(card);
    card.hidden=!visible;
    card.style.display=visible?'':'none';
    card.setAttribute('aria-hidden',visible?'false':'true');
    if(visible){
      shown++;
      const rank=card.querySelector('.nfl-mlb-prop-rank');
      if(rank)rank.textContent=String(shown);
    }
  }
  const note=root.querySelector('.ms-all-toolbar .ms-prop-note');
  if(note)note.innerHTML=`<b>${shown}</b> of ${cards.length} modeled players`;
  let empty=root.querySelector('#nflAllEmpty');
  if(!empty){
    empty=document.createElement('div');
    empty.id='nflAllEmpty';
    empty.className='nfl-live-empty';
    empty.innerHTML='<b>No players match those filters.</b><span>Clear a filter or try a different search.</span>';
    list.appendChild(empty);
  }
  empty.hidden=shown!==0;
  empty.style.display=shown===0?'':'none';
}

function ensureControls(root){
  const toolbar=root.querySelector('.ms-all-toolbar');
  const left=toolbar?.querySelector('.ms-all-left');
  const search=root.querySelector('#nflSearch');
  const list=root.querySelector('#nflAllList');
  if(!toolbar||!left||!search||!list)return false;

  const {teams,positions}=collect(root);
  if(FILTER_STATE.team!=='ALL'&&!teams.includes(FILTER_STATE.team))FILTER_STATE.team='ALL';
  if(FILTER_STATE.position!=='ALL'&&!positions.includes(FILTER_STATE.position))FILTER_STATE.position='ALL';

  let team=left.querySelector('#nflAllTeam');
  if(!team){
    const label=document.createElement('label');
    label.dataset.tsoAllTeam='1';
    label.innerHTML='<span>Team</span><select id="nflAllTeam" aria-label="Filter All Players by team"></select>';
    search.closest('label')?.before(label);
    team=label.querySelector('select');
  }
  team.innerHTML=optionHtml(teams,FILTER_STATE.team,'All teams');
  team.value=FILTER_STATE.team;

  let position=left.querySelector('#nflAllPosition');
  if(!position){
    const label=document.createElement('label');
    label.dataset.tsoAllPosition='1';
    label.innerHTML='<span>Position</span><select id="nflAllPosition" aria-label="Filter All Players by position"></select>';
    search.closest('label')?.before(label);
    position=label.querySelector('select');
  }
  position.innerHTML=optionHtml(positions,FILTER_STATE.position,'All positions');
  position.value=FILTER_STATE.position;

  let clear=left.querySelector('#nflAllClear');
  if(!clear){
    clear=document.createElement('button');
    clear.id='nflAllClear';
    clear.type='button';
    clear.className='nfl-mlb-prop-tab';
    clear.textContent='Clear';
    left.appendChild(clear);
  }

  if(document.activeElement!==search&&search.value!==FILTER_STATE.search)search.value=FILTER_STATE.search;
  apply(root);
  return true;
}

function schedule(root){
  if(pending)return;
  pending=true;
  requestAnimationFrame(()=>{pending=false;ensureControls(root);});
}

export function installNflAllPlayersControlsV8921(){
  const root=document.getElementById('nflView');
  if(!root)return;
  ensureStyles();
  if(!installed){
    installed=true;
    root.addEventListener('input',e=>{
      if(e.target?.id!=='nflSearch')return;
      FILTER_STATE.search=e.target.value||'';
      apply(root);
    });
    root.addEventListener('change',e=>{
      if(e.target?.id==='nflAllTeam'){
        FILTER_STATE.team=e.target.value||'ALL';
        apply(root);
      }else if(e.target?.id==='nflAllPosition'){
        FILTER_STATE.position=e.target.value||'ALL';
        apply(root);
      }else if(e.target?.id==='nflAllSort'){
        queueMicrotask(()=>schedule(root));
      }
    });
    root.addEventListener('click',e=>{
      const clear=e.target?.closest?.('#nflAllClear');
      if(!clear)return;
      e.preventDefault();
      FILTER_STATE.search='';FILTER_STATE.team='ALL';FILTER_STATE.position='ALL';
      const search=root.querySelector('#nflSearch');if(search)search.value='';
      const team=root.querySelector('#nflAllTeam');if(team)team.value='ALL';
      const position=root.querySelector('#nflAllPosition');if(position)position.value='ALL';
      apply(root);
    });
    observer=new MutationObserver(()=>schedule(root));
    observer.observe(root,{childList:true,subtree:true});
  }
  schedule(root);
}
