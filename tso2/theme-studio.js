/* TSO 2.0 Theme Studio
 * One canonical site-wide token registry + inspectable CSS overrides.
 * Read-only public theme RPC; writes require verified owner on Supabase SQL.
 * No dangerous arbitrary CSS in token interpolation or unchecked file imports.
 */
(()=>{
 'use strict';
 const FONT_OPTIONS=[
 'Inter, ui-sans-serif, system-ui, sans-serif',
 'system-ui, -apple-system, sans-serif',
 'Arial, Helvetica, sans-serif',
 'Georgia, serif',
 '"Segoe UI", sans-serif',
 '"Trebuchet MS", sans-serif'
 ];
 const categories=[
  {id:'palette',name:'Main colors',help:'The shared backgrounds, text and borders used on every page.',items:[
   ['--bg','Page background','color','#070b12'],['--surface','Inset surfaces','color','#0c121d'],
   ['--card','Cards & panels','color','#101824'],['--elev','Raised inputs','color','#151f2e'],
   ['--text','Main text','color','#f5f8fc'],['--muted','Secondary text','color','#8e9bad'],
   ['--muted-2','Subtle text','color','#627087'],['--line','Dividers','color','#242c37'],
   ['--line-strong','Borders','color','#313b49']
  ]},
  {id:'brand',name:'Brand & highlights',help:'One source of truth for blue analysis, orange Outpost and gold highlights.',items:[
   ['--blue','Primary blue','color','#2d7fff'],['--blue-2','Blue highlights','color','#5aa0ff'],
   ['--outpost-orange','Outpost orange','color','#ff4d1c'],['--outpost-gold','Outpost gold','color','#ffd84d'],
   ['--outpost-violet','Violet accent','color','#7b5cff'],
   ['--green','Positive / available','color','#3fda9a'],['--yellow','Caution','color','#f1c85b'],
   ['--red','Negative / warning','color','#ff657a'],['--tso-focus','Focus outline','color','#5aa0ff']
  ]},
  {id:'navigation',name:'Sidebar & top navigation',help:'Applies to the TSO shell regardless of the selected sport or page.',items:[
   ['--tso-sidebar-bg','Sidebar background','color','#070a0f'],
   ['--tso-header-bg','Top bar background','color','#070b12'],
   ['--tso-nav-active','Selected menu item','color','#152338'],
   ['--tso-side-nav-width','Sidebar width','size','236px',170,360],
   ['--tso-header-height','Topbar height','size','68px',50,104],
   ['--tso-nav-item-height','Nav item height','size','52px',38,86]
  ]},
  {id:'buttons',name:'Buttons & actions',help:'The shared interactive controls across Games, Research, models and admin.',items:[
   ['--tso-primary-btn','Primary button','color','#2d7fff'],
   ['--tso-secondary-btn','Secondary button','color','#18263a'],
   ['--tso-btn-text','Button text','color','#ffffff'],
   ['--tso-button-height','Button height','size','38px',28,70]
  ]},
  {id:'layout',name:'Page & card layout',help:'Spacing and sizing tokens shared by all content areas.',items:[
   ['--tso-page-max','Content max width','size','1540px',900,2200],
   ['--tso-page-gutter','Page side padding','size','24px',8,80],
   ['--tso-card-padding','Panel padding','size','18px',8,48],
   ['--tso-grid-gap','Grid / panel gap','size','14px',4,44],
   ['--r-sm','Small corner radius','size','12px',0,36],
   ['--r','Default card radius','size','16px',0,44],
   ['--r-lg','Large card radius','size','22px',0,60],
   ['--r-xl','Extra large radius','size','28px',0,70]
  ]},
  {id:'type',name:'Typography',help:'Global font settings. Keep numeric sizes in pixels for clarity.',items:[
   ['--tso-font-family','Site font','font',FONT_OPTIONS[0]],
   ['--tso-body-size','Body font size','size','13px',10,20],
   ['--tso-heading-size','Page heading size','size','30px',22,50]
  ]}
 ];
 const definitions=categories.flatMap(c=>c.items.map(item=>({name:item[0],label:item[1],kind:item[2],initial:item[3],min:item[4],max:item[5],category:c.name})));
 const dictionary=new Map(definitions.map(x=>[x.name,x]));
 const defaults=Object.fromEntries(definitions.map(x=>[x.name,x.initial]));
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
 const validCSS=v=>typeof v==='string'&&v.length<=12000&&!/(@import|@font-face|url\s*\(|expression\s*\(|javascript:|data:|behavior\s*:|<\/?style|[<>])/i.test(v);
 const sanitize=(key,value)=>{
  const def=dictionary.get(key),v=String(value??'').trim();
  if(!def)return null;
  if(def.kind==='color')return /^#[a-fA-F0-9]{6}$/.test(v)?v.toLowerCase():null;
  if(def.kind==='size'){
   if(!/^\d{1,4}px$/.test(v))return null;
   const n=parseInt(v,10);
   return n>=def.min&&n<=def.max?v:null;
  }
  return FONT_OPTIONS.includes(v)?v:null;
 };
 const validated=from=>{
  const result={};if(!from||typeof from!=='object'||Array.isArray(from))return result;
  for(const def of definitions){
   const parsed=sanitize(def.name,from[def.name]);
   if(parsed!==null)result[def.name]=parsed;
  }
  return result;
 };
 let lastPublished={tokens:{},customCss:'',revision:0,updatedAt:null};
 let draft={...defaults};let customCss='',activeTab='visual',loaded=false,submitting=false;
 let ruleCache=[],fileSearch='',root=null,waiting=false;
 const auth=()=>window.TSO_AUTH;
 const owner=()=>auth()?.user?.isOwner===true;
 const $=sel=>root?.querySelector(sel);
 const $all=sel=>[...root?.querySelectorAll(sel)||[]];
 function setStatus(message,state=''){
  if(!root)return;
  const el=$('[data-theme-status]');if(!el)return;
  el.className='tso-theme-status'+(state==='good'?' is-good':state==='error'?' is-error':'');
  el.textContent=message;
 }
 function getDiffCount(){
  return definitions.filter(d=>draft[d.name]!==lastPublished.tokens?.[d.name]&&draft[d.name]!==((lastPublished.tokens||{})[d.name]||d.initial)).length+
   (customCss!==lastPublished.customCss?1:0);
 }
 function themeCSS(tokens,css){
  const text=definitions.map(d=>d.name+':'+(sanitize(d.name,tokens?.[d.name])||d.initial)+';').join('');
  return ':root{'+text+'}\n'+(validCSS(css)?css:'');
 }
 function apply(d=draft,advanced=customCss){
  let node=document.getElementById('tso-theme-published');
  if(!node){node=document.createElement('style');node.id='tso-theme-published';document.head.appendChild(node);}
  node.textContent=themeCSS(d,advanced);
  if(root)updatePreview();
 }
 function updatePreview(){
  if(!root)return;
  const swatches=['--bg','--surface','--card','--blue','--outpost-orange'];
  $all('[data-theme-swatch]').forEach((el,i)=>el.style.background=draft[swatches[i]]||defaults[swatches[i]]);
  const badge=$('[data-theme-revision]');if(badge)badge.textContent='Published v'+(lastPublished.revision||0)+' · '+getDiffCount()+' unsaved edits';
  const save=$('[data-theme-publish]');if(save)save.disabled=!owner()||!loaded||submitting||getDiffCount()===0;
 }
 async function loadPublished(){
  if(waiting||!auth()?.rpc||auth()?.status==='loading')return;
  waiting=true;
  try{
   const response=await auth().rpc('tso2_get_published_theme');
   const tokens=validated(response?.tokens);
   const css=validCSS(response?.customCss)?response.customCss:'';
   lastPublished={tokens,customCss:css,revision:Number(response?.revision)||0,updatedAt:response?.updatedAt||null};
   // Always use saved published tokens for visitors. Do not mix with another account's draft.
   draft={...defaults,...tokens};customCss=css;loaded=true;
   apply();
   if(root){renderFields();renderAdvancedValue();setStatus('Published theme loaded. Changes are previews until you click Publish.','good');}
  }catch(e){
   // Fail closed; defaults stay readable. Never replace stored theme on failure.
   loaded=false;if(root)setStatus('Theme service unavailable: '+String(e.message||e),'error');
  }finally{waiting=false;}
 }
 function renderFields(){
  const panel=$('[data-theme-controls]');if(!panel)return;
  const search=String($('[data-theme-search]')?.value||'').toLowerCase().trim();
  panel.innerHTML=categories.map(c=>{
   const fields=c.items.map(([name,label,kind])=>dictionary.get(name))
    .filter(d=>!search||[d.name,d.label,c.name].join(' ').toLowerCase().includes(search));
   if(!fields.length)return'';
   return '<section class="tso-theme-category"><h3>'+escapeHTML(c.name)+'</h3><div class="tso-theme-category-fields">'+
    fields.map(d=>{
     const value=draft[d.name],changed=value!==defaults[d.name];
     let control='';
     if(d.kind==='color')control='<input type="color" aria-label="'+escapeHTML(d.label)+' swatch" data-theme-swatch-input="'+escapeHTML(d.name)+'" value="'+escapeHTML(value)+'"><input type="text" aria-label="'+escapeHTML(d.label)+' hex value" spellcheck="false" maxlength="7" data-theme-token="'+escapeHTML(d.name)+'" value="'+escapeHTML(value)+'">';
     else if(d.kind==='font')control='<select data-theme-token="'+escapeHTML(d.name)+'" aria-label="'+escapeHTML(d.label)+'">'+FONT_OPTIONS.map(font=>'<option '+(font===value?'selected':'')+' value="'+escapeHTML(font)+'">'+escapeHTML(font)+'</option>').join('')+'</select>';
     else control='<input type="number" min="'+d.min+'" max="'+d.max+'" step="1" data-theme-number="'+escapeHTML(d.name)+'" value="'+parseInt(value,10)+'"><small>px</small>';
     return '<div class="tso-theme-field '+(changed?'is-edited':'')+'"><label>'+escapeHTML(d.label)+'</label><div class="tso-theme-field-row">'+control+'<button type="button" title="Restore original TSO default" aria-label="Reset '+escapeHTML(d.label)+'" data-theme-default="'+escapeHTML(d.name)+'">↺</button></div><small>'+escapeHTML(d.name)+'</small></div>';
    }).join('')+'</div></section>';
  }).join('')||'<p>No matching CSS variables. Try a different search.</p>';
  updatePreview();
 }
 function renderAdvancedValue(){const el=$('[data-theme-css]');if(el)el.value=customCss;}
 function setTab(name){
  if(!['visual','advanced','history'].includes(name))return;
  activeTab=name;
  $all('[data-theme-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.themeTab===name)));
  $all('[data-theme-panel]').forEach(panel=>panel.classList.toggle('tso-theme-hidden',panel.dataset.themePanel!==name));
  if(name==='advanced'){loadCssRules();renderRules();}
  if(name==='history')void loadHistory();
 }
 function updateVariable(name,value){
  const parsed=sanitize(name,value);
  if(parsed===null){setStatus('Invalid value for '+name+'. Use the allowed color or size range.','error');return false;}
  draft[name]=parsed;apply();renderFields();setStatus(getDiffCount()+' changes in preview (not published).');return true;
 }
 function copyCSS(){
  const content=themeCSS(draft,customCss);
  const api=navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if(api)api(content).then(()=>setStatus('Copied the active theme as CSS.','good')).catch(()=>setStatus('Clipboard blocked; use Export instead.','error'));
  else setStatus('Clipboard unavailable; use Export JSON.','error');
 }
 function download(name,type,content){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 function exportJSON(){
  download('tso-2-theme-'+new Date().toISOString().slice(0,10)+'.json','application/json',
   JSON.stringify({app:'The Sports Outpost 2.0',format:'tso-theme-v1',tokens:draft,customCss,exportedAt:new Date().toISOString()},null,2));
  setStatus('Theme backup exported.','good');
 }
 function inspectRules(){
  if(ruleCache.length)return ruleCache;
  const output=[],site=location.origin;
  function collect(list,file,context=''){
   for(const rule of [...list||[]]){
    if(rule.cssRules){collect(rule.cssRules,file,context+' '+(rule.conditionText||''));continue;}
    if(!rule.selectorText)continue;
    output.push({selector:rule.selectorText,properties:rule.style?.cssText||'',file,context});
   }
  }
  for(const sheet of [...document.styleSheets]){
   let url=sheet.href||'';if(url&&!url.startsWith(site))continue;
   try{collect(sheet.cssRules||[],url?new URL(url).pathname.split('/').at(-1):'inline CSS');}catch(_){}
  }
  ruleCache=output;return output;
 }
 function loadCssRules(){inspectRules();}
 function renderRules(){
  const el=$('[data-theme-rule-results]');if(!el)return;
  const q=String($('[data-theme-rule-search]')?.value||'').toLowerCase().trim();
  const rules=inspectRules().filter(r=>!q||(r.selector+' '+r.properties+' '+r.file).toLowerCase().includes(q));
  const display=rules.slice(0,65);
  const count=$('[data-theme-rule-count]');if(count)count.textContent=rules.length+' matching rules in loaded TSO stylesheets (showing '+display.length+').';
  el.innerHTML=display.map((r,i)=>'<article><code>'+escapeHTML(r.selector)+'</code><p>'+escapeHTML(r.file+(r.context?' · '+r.context:''))+'</p><pre>'+escapeHTML(r.properties.slice(0,1250))+'</pre><button class="tso-theme-btn" type="button" data-theme-use-rule="'+i+'">ADD OVERRIDE TO EDITOR</button></article>').join('')||'<p>No matching selectors found.</p>';
  el._matches=display;
 }
 async function loadHistory(){
  const el=$('[data-theme-history]');if(!el||!owner()||!auth()?.rpc)return;
  el.textContent='Loading saved revisions…';
  try{
   const response=await auth().rpc('tso2_theme_owner_history');
   if(!Array.isArray(response))throw Error('Unexpected history response');
   el.innerHTML=response.length?response.map((x,i)=>
    '<article><div><b>Revision '+Number(x.revision||0)+'</b><br><span>'+escapeHTML(new Date(x.changedAt||0).toLocaleString())+'</span></div><button type="button" class="tso-theme-btn" data-theme-history-restore="'+i+'">PREVIEW VERSION</button></article>'
   ).join(''):'<p>There are no previous published versions yet.</p>';
   el._versions=response;
  }catch(e){el.textContent='History unavailable: '+String(e.message||e);}
 }
 async function publish(){
  if(!owner()||submitting||!loaded)return;
  const sanitized=validated(draft),css=customCss;
  if(Object.keys(sanitized).length!==definitions.length){setStatus('Fix invalid field values before publishing.','error');return;}
  if(!validCSS(css)){setStatus('Advanced CSS contains a blocked network/executable construct or exceeds 12,000 characters.','error');return;}
  if(!window.confirm('Publish this theme to every page of TSO 2.0 staging for all visitors? A history version will be kept.'))return;
  submitting=true;updatePreview();setStatus('Publishing theme changes…');
  try{
   const result=await auth().rpc('tso2_save_published_theme',
    {p_tokens:sanitized,p_custom_css:css,p_expected_revision:lastPublished.revision});
   lastPublished={tokens:validated(result.tokens),customCss:result.customCss||'',revision:Number(result.revision)||0,updatedAt:result.updatedAt||null};
   draft={...defaults,...lastPublished.tokens};customCss=lastPublished.customCss;apply();
   renderFields();renderAdvancedValue();setStatus('Theme published — revision '+lastPublished.revision+'. All TSO 2.0 pages will load these settings.','good');
  }catch(e){setStatus('Publishing failed: '+String(e.message||e)+'. Preview has not been published.','error');}
  finally{submitting=false;updatePreview();}
 }
 function markup(){
  return '<div class="tso-theme-header"><div><span class="tso-theme-kicker">THE SPORTS OUTPOST · OWNER DESIGN CONTROLS</span><h1>Theme / CSS Dashboard</h1><p>Edit real CSS design tokens for all TSO 2.0 pages. Test changes live, publish safely and restore previous versions. Advanced mode shows actual loaded stylesheet selectors.</p></div>'+
   '<div class="tso-theme-actions"><button class="tso-theme-btn" data-theme-undo>DISCARD PREVIEW</button><button class="tso-theme-btn" data-theme-reset>ORIGINAL TSO COLORS</button><button class="tso-theme-btn" data-theme-export>EXPORT</button><button class="tso-theme-btn primary" data-theme-publish> PUBLISH THEME </button></div></div>'+
   '<div class="tso-theme-status" data-theme-status role="status" aria-live="polite">Connecting to saved theme…</div>'+
   '<div class="tso-theme-tabs" role="tablist"><button data-theme-tab="visual" role="tab" aria-selected="true">VISUAL SETTINGS</button><button data-theme-tab="advanced" role="tab" aria-selected="false">ADVANCED CSS</button><button data-theme-tab="history" role="tab" aria-selected="false">VERSION HISTORY</button></div>'+
   '<div data-theme-panel="visual" class="tso-theme-main"><section class="tso-theme-pane"><div class="tso-theme-pane-head"><h2>Global design tokens</h2><p>Colors, layouts, borders, navigation and typography. Every change is a preview until published.</p><input class="tso-theme-search" data-theme-search type="search" placeholder="Find a color, CSS variable or setting…"></div><div class="tso-theme-controls" data-theme-controls></div></section>'+
   '<aside class="tso-theme-preview"><div class="tso-theme-pane-head"><h2>Live component preview</h2><p>Same shared tokens used in the actual TSO pages.</p></div><div class="tso-theme-preview-inner"><div class="tso-theme-mini-nav"><div class="tso-theme-mini-sidebar"><b>THE OUTPOST</b><span>Today</span><span class="is-on">Games</span><span>Research</span><span>Models</span></div><div class="tso-theme-mini-content"><header>TSO 2.0 · NFL</header><div class="tso-theme-mini-card"><small>MATCHUP INSIGHT</small><h4>Team comparison</h4><p>Player models · spreads · current lines</p><button type="button">VIEW GAME →</button></div></div></div><div class="tso-theme-swatch-grid">'+Array.from({length:5},(_,i)=>'<div data-theme-swatch="'+i+'"></div>').join('')+'</div><p class="tso-theme-preview-help">Changes are also previewed in this browser on the real site. Use Discard Preview to restore the published design.</p><p class="tso-theme-preview-help" data-theme-revision></p><button class="tso-theme-btn" data-theme-copy> COPY GENERATED CSS </button></div></aside></div>'+
   '<section data-theme-panel="advanced" class="tso-theme-advanced tso-theme-hidden"><div class="tso-theme-pane-head"><h2>Advanced CSS editor & inspector</h2><p>Search the real CSS rules loaded from TSO 2.0. Click a rule to start an override. Edits preview immediately; publishing is owner protected.</p></div><div class="tso-theme-advanced-body"><label for="tso-css-overrides">Custom CSS overrides · up to 12,000 characters</label><textarea id="tso-css-overrides" data-theme-css spellcheck="false" placeholder=".my-component { background: var(--card); border-radius: var(--r); }"></textarea><p class="tso-theme-preview-help">Do not paste private URLs, @import, remote resources or HTML. The editor rejects unsafe CSS patterns and keeps a revision history.</p><div class="tso-theme-actions"><button class="tso-theme-btn" data-theme-copy>COPY ALL THEME CSS</button><button class="tso-theme-btn" data-theme-export>EXPORT JSON</button><label class="tso-theme-btn" for="tso-theme-import" style="cursor:pointer">IMPORT THEME JSON</label><input type="file" id="tso-theme-import" data-theme-import accept=".json,application/json" hidden></div><label for="tso-css-selector-search">Search current site CSS by selector, property or file</label><div class="tso-theme-rule-search"><input type="search" id="tso-css-selector-search" data-theme-rule-search placeholder="Example: .tso-side-item or background"><button class="tso-theme-btn" data-theme-inspect>REFRESH</button></div><small data-theme-rule-count class="tso-theme-preview-help"></small><div data-theme-rule-results class="tso-theme-rule-result"></div></div></section>'+
   '<section data-theme-panel="history" class="tso-theme-advanced tso-theme-hidden"><div class="tso-theme-pane-head"><h2>Published theme history</h2><p>Preview an earlier version; publish it again to restore across all TSO 2.0 pages.</p></div><div class="tso-theme-history" data-theme-history></div></section>';
 }
 function mount(){
  const target=document.querySelector('[data-theme-studio]');
  if(!target||!owner())return;
  if(root===target&&root.dataset.themeMounted==='1')return;
  root=target;root.dataset.themeMounted='1';root.innerHTML=markup();
  renderFields();setTab('visual');apply();
  root.addEventListener('input',event=>{
   const target=event.target;
   const key=target.dataset.themeToken||target.dataset.themeSwatchInput||target.dataset.themeNumber;
   if(key){
    let value=String(target.value||'');
    if(target.dataset.themeNumber)value=value+'px';
    if(target.dataset.themeToken?.startsWith('--')&&dictionary.get(key)?.kind==='color'&&value.length!==7)return;
    updateVariable(key,value);return;
   }
   if(target.matches('[data-theme-search]'))renderFields();
   if(target.matches('[data-theme-rule-search]'))renderRules();
   if(target.matches('[data-theme-css]')){
    customCss=String(target.value||'');
    if(validCSS(customCss)){apply();setStatus('Advanced CSS in preview (not published).');}
    else setStatus('Custom CSS contains unsafe constructs or exceeds 12,000 characters. Preview not updated.','error');
   }
  });
  root.addEventListener('change',async event=>{
   const file=event.target;
   if(!file.matches('[data-theme-import]')||!file.files?.[0])return;
   try{
    if(file.files[0].size>100000)throw Error('File is too large');
    const obj=JSON.parse(await file.files[0].text());
    if(obj.format!=='tso-theme-v1'||!obj.tokens||typeof obj.tokens!=='object')throw Error('This is not a TSO theme export');
    const checked=validated(obj.tokens);
    if(Object.keys(checked).length<definitions.length)throw Error('Theme export contains missing or invalid variables');
    if(!validCSS(obj.customCss||''))throw Error('Unsafe advanced CSS in export');
    draft={...defaults,...checked};customCss=obj.customCss||'';apply();renderFields();renderAdvancedValue();
    setStatus('Theme imported as preview; Publish to share it.','good');
   }catch(e){setStatus('Import failed: '+String(e.message||e),'error');}
   file.value='';
  });
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.themeTab)return setTab(button.dataset.themeTab);
   if(button.hasAttribute('data-theme-default'))return updateVariable(button.dataset.themeDefault,defaults[button.dataset.themeDefault]);
   if(button.hasAttribute('data-theme-undo')){draft={...defaults,...lastPublished.tokens};customCss=lastPublished.customCss;apply();renderFields();renderAdvancedValue();setStatus('Published version restored in preview.','good');return;}
   if(button.hasAttribute('data-theme-reset')){if(!confirm('Restore the original TSO 2.0 design tokens in preview? Publishing is a separate step.'))return;draft={...defaults};customCss='';apply();renderFields();renderAdvancedValue();setStatus('Original design restored in preview. Publish to save it.');return;}
   if(button.hasAttribute('data-theme-export'))return exportJSON();
   if(button.hasAttribute('data-theme-copy'))return copyCSS();
   if(button.hasAttribute('data-theme-publish'))return void publish();
   if(button.hasAttribute('data-theme-inspect')){ruleCache=[];return renderRules();}
   if(button.dataset.themeUseRule){
    const rule=$('[data-theme-rule-results]')?._matches?.[Number(button.dataset.themeUseRule)];
    if(!rule)return;
    customCss+=(customCss.trim()?'\n\n':'')+'/* '+rule.file+' */\n'+rule.selector+' {\n  '+rule.properties+'\n}';
    renderAdvancedValue();apply();setStatus('CSS selector copied into your editable preview.','good');
    const el=$('[data-theme-css]');el?.scrollIntoView({block:'center',behavior:'smooth'});el?.focus();
    return;
   }
   if(button.dataset.themeHistoryRestore){
    const rev=$('[data-theme-history]')?._versions?.[Number(button.dataset.themeHistoryRestore)];
    if(!rev)return;
    draft={...defaults,...validated(rev.tokens)};customCss=validCSS(rev.customCss)?rev.customCss:'';
    apply();renderFields();renderAdvancedValue();setTab('visual');
    setStatus('Revision '+Number(rev.revision)+' loaded in preview. Publish to restore for everyone.','good');
   }
  });
  if(!loaded)void loadPublished();
  else{renderFields();renderAdvancedValue();setStatus('Theme editor ready. Unpublished changes affect only your current browser.','good');}
 }
 window.TSO2ThemeStudio={mount,loadPublished,defaults,definitions,validate:validated};
 const init=()=>{if(auth()?.rpc&&auth()?.status!=='loading')void loadPublished();};
 window.addEventListener('tso2-auth-changed',()=>{
  if(root&&!owner()){root=null;}
  init();
  if(owner())mount();
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 setTimeout(init,1400);
})();
