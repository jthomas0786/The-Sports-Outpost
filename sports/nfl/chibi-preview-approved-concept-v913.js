let installed=false;
let observer=null;

const DAK_HERO_B64='./sports/nfl/assets/chibis/DAL/dak-prescott/approved/hero-v001.part1.b64?v=91.3';
const DAK_ACTIONS_B64='./sports/nfl/assets/chibis/DAL/dak-prescott/approved/actions-v001.b64?v=91.3';
const dataCache=new Map();

async function dataUrl(path){
  if(!dataCache.has(path)){
    dataCache.set(path,fetch(path,{cache:'no-store'}).then(async r=>{
      if(!r.ok) throw new Error(`Approved concept asset failed: ${r.status}`);
      const b64=(await r.text()).trim();
      if(!b64.startsWith('/9j/')) throw new Error('Approved concept asset is not JPEG base64');
      return `data:image/jpeg;base64,${b64}`;
    }));
  }
  return dataCache.get(path);
}

function ensureStyles(){
  if(document.getElementById('nflChibiApprovedConceptV913Style')) return;
  const style=document.createElement('style');
  style.id='nflChibiApprovedConceptV913Style';
  style.textContent=`
    .tso-approved-chibi{width:min(900px,100%);display:grid;justify-items:center;gap:11px;position:relative;padding:8px}
    .tso-approved-chibi img{display:block;width:100%;height:auto;object-fit:contain;border-radius:14px;box-shadow:0 18px 42px #0008}
    .tso-approved-chibi--hero img{width:min(430px,100%);max-height:540px}
    .tso-approved-chibi--actions img{width:min(860px,100%);max-height:450px}
    .tso-approved-badge{position:absolute;z-index:3;left:18px;top:18px;padding:6px 9px;border:1px solid #6edcff88;border-radius:999px;background:#031023e8;color:#6edcff;font:800 8px 'JetBrains Mono';letter-spacing:.09em;box-shadow:0 4px 14px #0008}
    .tso-approved-caption{display:grid;gap:4px;text-align:center;max-width:720px;padding:2px 10px 4px}
    .tso-approved-caption b{color:#f8fafc;font:900 11px 'JetBrains Mono';letter-spacing:.08em}
    .tso-approved-caption span{color:#8b95a8;font-size:11px;line-height:1.45}
    .tso-approved-pending{width:min(650px,100%);min-height:260px;border:1px dashed #2d7fff66;border-radius:16px;background:radial-gradient(circle at 50% 35%,#2d7fff18,transparent 58%),#061020;display:grid;place-content:center;gap:10px;text-align:center;padding:32px}
    .tso-approved-pending b{font:800 19px 'Cabinet Grotesk';color:#f8fafc}
    .tso-approved-pending span{color:#8b95a8;line-height:1.55;max-width:520px}
    #nflChibiDetailModal .chibi-live-qa{visibility:hidden!important}
    @media(max-width:620px){.tso-approved-chibi--hero img{max-height:460px}.tso-approved-badge{left:12px;top:12px}}
  `;
  document.head.appendChild(style);
}

function playerName(modal){
  return modal.querySelector('.chibi-detail-head h3')?.textContent?.trim()||'';
}

function pendingHtml(name){
  const safe=String(name||'This player').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<div class="tso-approved-pending" data-approved-concept-v913="pending"><b>Approved-grade render pending</b><span>${safe} will not use the old flat mascot approximation. Preview stays locked to the approved realistic 3D chibi direction until a real production render is available.</span></div>`;
}

function conceptHtml(src,kind,action){
  const isHero=kind==='hero';
  const label=isHero?'APPROVED BASE CONCEPT':'APPROVED ACTION-POSE CONCEPT';
  const actionLabel=String(action||'').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
  return `<div class="tso-approved-chibi tso-approved-chibi--${kind}" data-approved-concept-v913="${kind}"><span class="tso-approved-badge">APPROVED 3D CONCEPT</span><img src="${src}" alt="Dak Prescott approved realistic 3D chibi concept"><div class="tso-approved-caption"><b>${label}${actionLabel&&action!=='base'?` · ${actionLabel.toUpperCase()}`:''}</b><span>Visual authority: realistic 3D chibi proportions, player likeness, detailed uniform/materials and stadium-quality lighting. The flat SVG QA mascot is intentionally disabled.</span></div></div>`;
}

async function replaceLegacyNode(node,modal){
  if(!node?.isConnected||node.dataset.approvedConceptReplacing==='1') return;
  node.dataset.approvedConceptReplacing='1';
  const name=playerName(modal);
  const action=node.dataset.previewAction||'base';
  if(name!=='Dak Prescott'){
    node.outerHTML=pendingHtml(name);
    return;
  }
  try{
    const kind=action==='base'?'hero':'actions';
    const src=await dataUrl(kind==='hero'?DAK_HERO_B64:DAK_ACTIONS_B64);
    if(node.isConnected) node.outerHTML=conceptHtml(src,kind,action);
  }catch{
    if(node.isConnected) node.outerHTML=pendingHtml(name);
  }
}

function scan(){
  ensureStyles();
  document.querySelectorAll('#nflChibiDetailModal').forEach(modal=>{
    modal.querySelectorAll('.chibi-live-qa').forEach(node=>replaceLegacyNode(node,modal));
    // Keep the gallery honest even if the legacy renderer changes its text/classes later.
    modal.querySelectorAll('.chibi-stage-placeholder').forEach(node=>{
      const txt=node.textContent||'';
      if(/Base chibi render not published yet|production-specified/i.test(txt)){
        const name=playerName(modal);
        node.outerHTML=pendingHtml(name);
      }
    });
  });
}

export function installNflChibiApprovedConceptV913(){
  if(installed||typeof document==='undefined') return;
  installed=true;
  ensureStyles();
  observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan();
  window.DW_NFL_CHIBI_APPROVED_CONCEPT='v91.3';
}
