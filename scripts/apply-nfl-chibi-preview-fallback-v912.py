from pathlib import Path
import re

preview_p=Path('sports/nfl/chibi-preview-private-v901.js')
router_p=Path('sports/router.js')
index_p=Path('index.html')
preview=preview_p.read_text()

if 'function chibiCompositeHTML(' not in preview:
    css_marker='.chibi-empty{grid-column:1/-1;padding:24px;border:1px dashed #2d7fff55;border-radius:14px;color:#8b95a8;text-align:center}'
    css_add='''.chibi-live-qa{width:min(430px,100%);position:relative;display:grid;justify-items:center;gap:8px}.chibi-live-qa svg{width:min(310px,86vw);height:auto;overflow:visible;filter:drop-shadow(0 22px 25px #0008)}.chibi-preview-badge{position:absolute;z-index:4;left:8px;top:8px;padding:5px 8px;border:1px solid #6edcff66;border-radius:999px;background:#031023e8;color:#6edcff;font:800 7px 'JetBrains Mono';letter-spacing:.08em}.chibi-preview-caption{display:grid;gap:3px;color:#dbeafe}.chibi-preview-caption b{font:900 11px 'JetBrains Mono';letter-spacing:.06em}.chibi-preview-caption span{font-size:10px;color:#8796ad;max-width:430px}.chibi-live-qa .chibi-limb{transform-box:fill-box;transition:transform .25s ease}.chibi-live-qa.is-throw .chibi-arm-r{transform-origin:50% 10%;transform:rotate(-112deg) translate(-5px,1px)}.chibi-live-qa.is-throw .chibi-arm-l{transform-origin:50% 10%;transform:rotate(26deg)}.chibi-live-qa.is-throw .chibi-ball{transform:translate(56px,-78px) rotate(-26deg)}.chibi-live-qa.is-run .chibi-arm-r{transform-origin:50% 10%;transform:rotate(-34deg)}.chibi-live-qa.is-run .chibi-arm-l{transform-origin:50% 10%;transform:rotate(35deg)}.chibi-live-qa.is-run .chibi-leg-r{transform-origin:50% 5%;transform:rotate(-19deg)}.chibi-live-qa.is-run .chibi-leg-l{transform-origin:50% 5%;transform:rotate(18deg)}.chibi-live-qa.is-catch .chibi-arm-r{transform-origin:50% 10%;transform:rotate(-155deg) translate(-1px,-5px)}.chibi-live-qa.is-catch .chibi-arm-l{transform-origin:50% 10%;transform:rotate(155deg) translate(1px,-5px)}.chibi-live-qa.is-contact{transform:rotate(-4deg)}.chibi-live-qa.is-contact .chibi-arm-r{transform-origin:50% 10%;transform:rotate(-58deg)}.chibi-live-qa.is-contact .chibi-arm-l{transform-origin:50% 10%;transform:rotate(58deg)}.chibi-live-qa.is-celebrate{animation:chibiQaCelebrate .9s ease-in-out infinite alternate}.chibi-live-qa.is-celebrate .chibi-arm-r{transform-origin:50% 10%;transform:rotate(-150deg)}.chibi-live-qa.is-celebrate .chibi-arm-l{transform-origin:50% 10%;transform:rotate(150deg)}.chibi-live-qa.is-low{transform:translateY(32px) scaleY(.86)}.chibi-live-qa.is-kick .chibi-leg-r{transform-origin:50% 5%;transform:rotate(-65deg) translateY(-4px)}@keyframes chibiQaCelebrate{from{transform:translateY(0)}to{transform:translateY(-8px)}}.chibi-action-stage,.chibi-celebration-stage{margin-top:12px}.chibi-signature .chibi-chip{margin-top:9px}'''
    if css_marker not in preview:
        raise SystemExit('preview CSS marker missing')
    preview=preview.replace(css_marker,css_marker+css_add,1)

    helper_marker="async function firstExisting(urls){for(const url of urls){try{const r=await fetch(`${url}?ts=${Date.now()}`,{method:'HEAD',cache:'no-store'});if(r.ok)return url}catch{}}return''}"
    helper=r'''
function chibiPoseKind(action='base'){const a=String(action||'base').toLowerCase();if(/throw|pass/.test(a))return'throw';if(/catch|interception|reception/.test(a))return'catch';if(/run|scramble|return|route|dropback/.test(a))return'run';if(/kick|punt/.test(a))return'kick';if(/tackle|sack|block|hit|press/.test(a))return'contact';if(/celebration|touchdown|first-down|dance|shuffle|spike/.test(a))return'celebrate';if(/kneel|slide/.test(a))return'low';return'idle'}
function chibiCompositeHTML(p,head,action='base'){const kind=chibiPoseKind(action),num=esc(p?.number||'—'),name=esc(p?.name||'Dallas player'),label=action==='base'?'BASE CHIBI':pretty(action),face=head?`<image href="${esc(head)}" x="69" y="18" width="102" height="112" preserveAspectRatio="xMidYMin slice" clip-path="url(#qaFaceClip)"/>`:`<circle cx="120" cy="73" r="48" fill="#17345f"/><text x="120" y="82" text-anchor="middle" fill="#fff" font-size="22" font-weight="900">${esc(initials(p?.name||''))}</text>`;return`<div class="chibi-live-qa is-${kind}" data-preview-action="${esc(action)}"><span class="chibi-preview-badge">LIVE QA PREVIEW</span><svg viewBox="0 0 240 305" role="img" aria-label="${name} ${esc(label)} preview"><defs><linearGradient id="qaJersey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="qaPants" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#94a3b8"/></linearGradient><clipPath id="qaFaceClip"><circle cx="120" cy="73" r="47"/></clipPath></defs><ellipse cx="120" cy="286" rx="66" ry="12" fill="#000" opacity=".34"/><g class="chibi-leg-l chibi-limb"><rect x="84" y="203" width="27" height="65" rx="13" fill="url(#qaPants)" stroke="#1d4ed8" stroke-width="3"/><rect x="80" y="258" width="34" height="17" rx="8" fill="#f8fafc" stroke="#1d4ed8" stroke-width="3"/></g><g class="chibi-leg-r chibi-limb"><rect x="129" y="203" width="27" height="65" rx="13" fill="url(#qaPants)" stroke="#1d4ed8" stroke-width="3"/><rect x="126" y="258" width="34" height="17" rx="8" fill="#f8fafc" stroke="#1d4ed8" stroke-width="3"/></g><g class="chibi-arm-l chibi-limb"><rect x="51" y="128" width="27" height="75" rx="13" fill="#f8fafc" stroke="#1d4ed8" stroke-width="4"/><circle cx="64" cy="202" r="12" fill="#a86f55"/></g><g class="chibi-arm-r chibi-limb"><rect x="162" y="128" width="27" height="75" rx="13" fill="#f8fafc" stroke="#1d4ed8" stroke-width="4"/><circle cx="176" cy="202" r="12" fill="#a86f55"/></g><path d="M75 121 Q120 103 165 121 L158 208 Q120 222 82 208Z" fill="url(#qaJersey)" stroke="#1d4ed8" stroke-width="5"/><path d="M77 124 Q62 128 57 145 L78 154Z" fill="#2563eb" opacity=".85"/><path d="M163 124 Q178 128 183 145 L162 154Z" fill="#2563eb" opacity=".85"/><rect x="89" y="196" width="62" height="19" rx="8" fill="#aab4c2" stroke="#1d4ed8" stroke-width="3"/><text x="120" y="174" text-anchor="middle" fill="#123e81" font-family="Arial,sans-serif" font-size="43" font-weight="900">${num}</text><text x="120" y="195" text-anchor="middle" fill="#2563eb" font-family="Arial,sans-serif" font-size="10" font-weight="900" letter-spacing="2">DALLAS</text><circle cx="120" cy="72" r="57" fill="#c8d0da" stroke="#1d4ed8" stroke-width="5"/><path d="M69 71 Q120 9 171 71 L166 45 Q120 4 74 45Z" fill="#d9e0e8"/><path d="M74 54 Q120 17 166 54" fill="none" stroke="#2563eb" stroke-width="5" opacity=".85"/>${face}<path d="M76 90 Q120 115 164 90" fill="none" stroke="#94a3b8" stroke-width="4" opacity=".75"/><g class="chibi-ball chibi-limb"><ellipse cx="173" cy="200" rx="15" ry="9" fill="#8b4a2b" transform="rotate(-25 173 200)"/><path d="M166 196 l11 7" stroke="#f8fafc" stroke-width="2"/></g></svg><div class="chibi-preview-caption"><b>${esc(label)}</b><span>Interactive QA composite from the official player reference and Dallas roster metadata. A real transparent production render automatically replaces this when published.</span></div></div>`}
'''.strip()
    if helper_marker not in preview:
        raise SystemExit('firstExisting marker missing')
    preview=preview.replace(helper_marker,helper_marker+'\n'+helper,1)

old_base='''<div class="chibi-pane active" data-pane-id="base"><div class="chibi-stage">${base?`<img src="${esc(base)}" alt="${esc(p.name)} chibi">`:`<div class="chibi-stage-placeholder"><b>Base chibi render not published yet</b><span>This player is production-specified, but Preview will only call the Chibi rendered when a real transparent PNG/WebP exists in the player's base folder.</span></div>`}</div></div>'''
new_base='''<div class="chibi-pane active" data-pane-id="base"><div class="chibi-stage">${base?`<img src="${esc(base)}" alt="${esc(p.name)} chibi">`:chibiCompositeHTML(p,head,'base')}</div></div>'''
if old_base not in preview:
        raise SystemExit('base placeholder marker missing')
preview=preview.replace(old_base,new_base,1)

old_action_note='''<div class="chibi-note" id="actionNote">Click an action to preview its production asset.</div>'''
new_action_note='''<div class="chibi-stage chibi-action-stage" id="actionNote">${chibiCompositeHTML(p,head,(p.actions||[])[0]||'base')}</div>'''
if old_action_note not in preview:
    raise SystemExit('action note marker missing')
preview=preview.replace(old_action_note,new_action_note,1)

old_action_fallback="`<b>${esc(pretty(b.dataset.action))}</b> is planned, but its rendered pose/animation asset has not been published yet.`"
new_action_fallback="chibiCompositeHTML(p,head,b.dataset.action)"
if old_action_fallback not in preview:
    raise SystemExit('action fallback marker missing')
preview=preview.replace(old_action_fallback,new_action_fallback,1)

old_sig='''sigs.map(([event,name])=>`<div class="chibi-signature"><b>${esc(pretty(name))}</b><div class="chibi-player-actions">Trigger: ${esc(pretty(event))}</div></div>`).join('')'''
new_sig='''sigs.map(([event,name])=>`<div class="chibi-signature"><b>${esc(pretty(name))}</b><div class="chibi-player-actions">Trigger: ${esc(pretty(event))}</div><button class="chibi-chip" data-celebration-action="${esc(event)}">PREVIEW CELEBRATION</button></div>`).join('')'''
if old_sig not in preview:
    raise SystemExit('signature marker missing')
preview=preview.replace(old_sig,new_sig,1)

celebration_title='''<p class="chibi-section-title">Celebrations & signatures</p>'''
celebration_stage='''<p class="chibi-section-title">Celebrations & signatures</p><div class="chibi-stage chibi-celebration-stage" id="celebrationPreview">${chibiCompositeHTML(p,head,sigs[0]?.[0]||(p.actions||[]).find(a=>/celebration|touchdown|first-down|spike/i.test(a))||'base')}</div>'''
if celebration_title not in preview:
    raise SystemExit('celebration title marker missing')
preview=preview.replace(celebration_title,celebration_stage,1)

append_marker='''});document.body.appendChild(w)}'''
listener='''});w.querySelectorAll('[data-celebration-action]').forEach(b=>b.onclick=async()=>{const action=b.dataset.celebrationAction,url=await firstExisting(assetCandidates(p.slug,action)),n=w.querySelector('#celebrationPreview');n.innerHTML=url?`<img src="${esc(url)}" alt="${esc(p.name)} ${esc(pretty(action))}" style="max-height:340px;max-width:100%;object-fit:contain">`:chibiCompositeHTML(p,head,action)});document.body.appendChild(w)}'''
if append_marker not in preview:
    raise SystemExit('detail append marker missing')
preview=preview.replace(append_marker,listener,1)

preview=preview.replace("The viewer separates finished Chibi art from the official headshot reference and gives you tabs for Actions, Celebrations and Reference.","The viewer prefers finished transparent Chibi art and automatically falls back to an interactive live QA composite, so every player, action and celebration remains previewable while final PNG/WebP renders are produced.",1)
preview=preview.replace('''<div class="chibi-admin-k">Base chibis</div>''','''<div class="chibi-admin-k">Base specs</div>''',1)

# Defensive contract: the dead-end copy must be gone and the fallback must be wired.
for marker in ['function chibiCompositeHTML(', 'LIVE QA PREVIEW', "chibiCompositeHTML(p,head,'base')", 'data-celebration-action', 'chibi-action-stage']:
    if marker not in preview:
        raise SystemExit(f'missing preview fallback marker: {marker}')
if 'Base chibi render not published yet' in preview:
    raise SystemExit('dead-end base placeholder still present')
preview_p.write_text(preview)

# Cache-bust the private preview module.
router=router_p.read_text()
router2,n=re.subn(r"(chibi-preview-private-v901\.js\?v=)[A-Za-z0-9._-]+",r"\g<1>91.2",router,count=1)
if n!=1:
    raise SystemExit('router preview cache marker missing')
router_p.write_text(router2)

# Bump outer router cache while preserving any suffix/query flags.
index=index_p.read_text()
m=re.search(r'(\./sports/router\.js\?v=)(\d+)\.(\d+)',index)
if not m:
    raise SystemExit('index router cache marker missing')
major,minor=int(m.group(2)),int(m.group(3))
new=f'{m.group(1)}{major}.{minor+1}'
index=index[:m.start()]+new+index[m.end():]
index_p.write_text(index)

print('Applied NFL chibi live visual preview fallback and cache busts')
