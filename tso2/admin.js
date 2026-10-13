// TSO 2.0 Owner Control Room. All sensitive data and writes use restricted
// Supabase RPCs. Client-side owner checks are presentation only, never ACLs.
(() => {
  const sports=['nhl','nfl','mlb','nba'];
  const sportNames={nhl:'NHL',nfl:'NFL',mlb:'MLB',nba:'NBA'};
  let refreshRunning=false;
  let noticeRequestRunning=false;
  const auth=()=>window.TSO_AUTH;
  const isOwner=()=>auth()?.user?.isOwner===true;
  const $=(root,selector)=>root?.querySelector(selector);
  const text=(root,selector,value)=>{const node=$(root,selector);if(node)node.textContent=String(value??'—');};
  const formatNumber=value=>Number.isFinite(Number(value))?Number(value).toLocaleString():'—';
  const formatTime=value=>{
    const t=Date.parse(value||'');
    return Number.isFinite(t)?new Date(t).toLocaleString():'Unavailable';
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function setNotice(result){
    const box=document.querySelector('[data-tso2-public-notice]');
    const label=document.querySelector('[data-tso2-public-notice-text]');
    if(!box||!label)return;
    const visible=result?.enabled===true&&typeof result.text==='string'&&result.text.trim().length>0;
    label.textContent=visible?result.text:'';
    box.hidden=!visible;
  }
  async function refreshPublicNotice(){
    if(noticeRequestRunning||!auth()?.rpc||auth()?.status==='loading')return;
    noticeRequestRunning=true;
    try{setNotice(await auth().rpc('tso2_get_public_notice'));}
    catch(error){setNotice({enabled:false});console.warn('[TSO2 notice] Unavailable:',error?.message||error);}
    finally{noticeRequestRunning=false;}
  }
  function renderDashboard(root,report){
    if(!root?.isConnected||!isOwner())return;
    ['accountsTotal','accountsLast7Days','signedInLast7Days','postsTotal','picksTotal','pushSubscriptionsTotal'].forEach(key=>{
      text(root,'[data-admin-metric="'+key+'"]',formatNumber(report?.[key]));
    });
    const form=$(root,'[data-admin-settings-form]');
    if(form){
      form.elements.namedItem('announcement').value=report?.settings?.announcement||'';
      form.elements.namedItem('enabled').checked=report?.settings?.announcementEnabled===true;
      form.elements.namedItem('notes').value=report?.settings?.privateNotes||'';
      text(root,'[data-admin-updated]','Last saved: '+formatTime(report?.settings?.updatedAt));
    }
    const changes=$(root,'[data-admin-audit]');
    if(changes){
      const audit=Array.isArray(report?.audit)?report.audit:[];
      changes.innerHTML=audit.length?audit.map(item=>'<article><b>'+escapeHtml(item.action==='settings_updated'?'Settings saved':item.action)+'</b><span>'+escapeHtml(formatTime(item.changedAt))+'</span><small>'+escapeHtml(item.details?.announcementEnabled===true?'Public notice enabled':'Settings updated')+'</small></article>').join(''):'<p>No admin changes recorded yet.</p>';
    }
    text(root,'[data-admin-message]','Private owner reports loaded successfully.');
  }
  async function refreshStats(root){
    if(!isOwner()||!root?.isConnected||refreshRunning)return;
    refreshRunning=true;
    text(root,'[data-admin-message]','Refreshing owner reports…');
    try{
      const result=await auth().rpc('tso2_admin_get_dashboard');
      renderDashboard(root,result);
    }catch(error){
      text(root,'[data-admin-message]','Admin reports unavailable: '+(error?.message||'Please try again.'));
    }finally{refreshRunning=false;}
  }
  async function refreshFeed(root){
    if(!root?.isConnected||!isOwner())return;
    const summary=$(root,'[data-admin-feed-summary]');
    if(summary)summary.textContent='Checking live scores and player props…';
    try{
      const [liveResponse,propResponse]=await Promise.all([
        fetch('/api/live?league=all',{cache:'no-store'}),
        fetch('/api/props?league=all',{cache:'no-store'})
      ]);
      if(!liveResponse.ok||!propResponse.ok)throw new Error('API error: scores '+liveResponse.status+', props '+propResponse.status);
      const [live,props]=await Promise.all([liveResponse.json(),propResponse.json()]);
      if(!Array.isArray(live.games)||!Array.isArray(props.rows))throw new Error('Unexpected API response');
      const totals={games:live.games.length,props:props.rows.length,modeled:props.rows.filter(row=>row.model?.exact===true).length};
      const rows=sports.map(sport=>{
        const games=live.games.filter(g=>String(g.league||g.sport||'').toLowerCase()===sport);
        const propsBySport=props.rows.filter(p=>String(p.sport||p.league||'').toLowerCase()===sport);
        const matched=propsBySport.filter(p=>p.model?.exact===true).length;
        return '<tr><th>'+sportNames[sport]+'</th><td>'+formatNumber(games.length)+'</td><td>'+formatNumber(games.filter(g=>g.state==='in').length)+'</td><td>'+formatNumber(propsBySport.length)+'</td><td>'+formatNumber(matched)+'</td></tr>';
      }).join('');
      if(!root.isConnected||!isOwner())return;
      const tbody=$(root,'[data-admin-feed-table]');
      if(tbody)tbody.innerHTML=rows;
      text(root,'[data-admin-feed-summary]',formatNumber(totals.games)+' games · '+formatNumber(totals.props)+' prop rows · '+formatNumber(totals.modeled)+' exact model matches');
      text(root,'[data-admin-feed-state]','CONNECTED');
      const nfl=props.modelMeta?.nfl||{};
      const src=String(nfl.sourceFile||'');
      const version=String(nfl.engineVersion||nfl.version||'');
      text(root,'[data-admin-nfl-source]',src.includes('tso2/data/nfl-sim.json')?'NFL model: validated TSO 2.0 branch '+(version?('· '+version):''):'NFL model source: review required');
    }catch(error){
      text(root,'[data-admin-feed-state]','CHECK FAILED');
      text(root,'[data-admin-feed-summary]',error?.message||'Could not load live feed reports');
      text(root,'[data-admin-nfl-source]','Model source verification unavailable');
    }
  }
  function mount(){
    const root=document.querySelector('[data-admin-dashboard]');
    if(!root||root.dataset.adminMounted==='1')return;
    if(!isOwner())return;
    root.dataset.adminMounted='1';
    $(root,'[data-admin-refresh]')?.addEventListener('click',()=>{
      refreshStats(root);
      refreshFeed(root);
    });
    $(root,'[data-admin-settings-form]')?.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!isOwner())return;
      const form=event.currentTarget;
      const submit=$(root,'[data-admin-save]');
      const announcement=String(form.elements.namedItem('announcement').value||'').trim();
      const enabled=form.elements.namedItem('enabled').checked;
      const notes=String(form.elements.namedItem('notes').value||'');
      if(enabled&&!announcement){
        text(root,'[data-admin-message]','Write an announcement before enabling it.');
        return;
      }
      if(submit)submit.disabled=true;
      text(root,'[data-admin-message]','Saving settings…');
      try{
        const updated=await auth().rpc('tso2_admin_save_settings',{p_announcement:announcement,p_enabled:enabled,p_notes:notes});
        if(root.isConnected&&isOwner()){
          renderDashboard(root,updated);
          text(root,'[data-admin-message]','Saved. Your changes are active on TSO 2.0.');
        }
        await refreshPublicNotice();
      }catch(error){
        text(root,'[data-admin-message]','Save failed: '+(error?.message||'Try again.'));
      }finally{if(submit)submit.disabled=false;}
    });
    refreshStats(root);
    refreshFeed(root);
  }
  window.TSO2Admin={mount,refreshPublicNotice};
  window.addEventListener('tso2-auth-changed',()=>{
    refreshPublicNotice();
    if(isOwner())mount();
  });
  if(auth()?.status!=='loading')refreshPublicNotice();
  mount();
})();
