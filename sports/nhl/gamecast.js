// NHL Gamecast PlayStage. Event positions are schematic unless the feed supplies tracking.
if(typeof document!=='undefined'&&!document.getElementById('nhl-gamecast-v905')){
 const link=document.createElement('link');link.id='nhl-gamecast-v905';link.rel='stylesheet';link.href='./sports/nhl/gamecast.css?v=90.5';document.head.appendChild(link);
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS={
 ANA:['#F47A38','#FC4C02'],BOS:['#FFB81C','#000'],BUF:['#003087','#FFB81C'],CGY:['#D2001C','#FAAF19'],CAR:['#CC0000','#000'],CHI:['#CF0A2C','#000'],COL:['#6F263D','#236192'],CBJ:['#002654','#CE1126'],DAL:['#006847','#8F8F8C'],DET:['#CE1126','#fff'],EDM:['#041E42','#FF4C00'],FLA:['#041E42','#C8102E'],LA:['#111','#A2AAAD'],MIN:['#154734','#A6192E'],MTL:['#AF1E2D','#192168'],NSH:['#FFB81C','#041E42'],NJ:['#CE1126','#000'],NYI:['#00539B','#F47D30'],NYR:['#0038A8','#CE1126'],OTT:['#C52032','#C2912C'],PHI:['#F74902','#000'],PIT:['#FCB514','#000'],SJ:['#006D75','#EA7200'],SEA:['#001628','#99D9D9'],STL:['#002F87','#FCB514'],TB:['#002868','#fff'],TOR:['#003E7E','#fff'],UTA:['#69B3E7','#010101'],VAN:['#00205B','#00843D'],VGK:['#B4975A','#333F42'],WPG:['#041E42','#004C97'],WSH:['#041E42','#C8102E']
};
const palette=t=>COLORS[String(t?.abbr||'').toUpperCase()]||['#2d7fff','#9ed7ff'];
const kindText={goal:'Goal',shot:'Shot on goal',save:'Save',block:'Blocked shot',miss:'Missed shot',faceoff:'Faceoff',penalty:'Penalty',hit:'Hit',takeaway:'Takeaway',giveaway:'Giveaway',stoppage:'Stoppage',live:'Live play',pregame:'Pregame',intermission:'Intermission',final:'Final'};
export function eventKind(play={},game={}){
 if(game.status==='pre')return 'pregame';if(game.status==='post')return 'final';
 const s=`${play.type||''} ${play.text||''}`.toLowerCase();
 if(/intermission|end of.*period/.test(s))return 'intermission';
 if(/goal/.test(s))return 'goal';if(/blocked shot|shot blocked/.test(s))return 'block';if(/missed shot|shot missed/.test(s))return 'miss';if(/save/.test(s))return 'save';if(/shot/.test(s))return 'shot';if(/faceoff/.test(s))return 'faceoff';if(/penalty/.test(s))return 'penalty';if(/hit/.test(s))return 'hit';if(/takeaway/.test(s))return 'takeaway';if(/giveaway/.test(s))return 'giveaway';if(/stoppage|whistle/.test(s))return 'stoppage';return 'live';
}
const sideFor=(g,abbr)=>String(g?.away?.abbr)===String(abbr)?'away':String(g?.home?.abbr)===String(abbr)?'home':null;
const preferredParticipant=(p={})=>{
 const a=Array.isArray(p.participants)?p.participants:[];
 const order=['scorer','shooter','winner','player','hitter','blocker','goalie','assist'];
 for(const type of order){const x=a.find(v=>String(v.type||'').toLowerCase()===type);if(x)return x;}
 return a[0]||null;
};
export function gamecastState(g={}){
 const play=g.plays?.[0]||{};const kind=eventKind(play,g);
 const playSide=sideFor(g,play.team);const ppSide=g.away?.powerPlay?'away':g.home?.powerPlay?'home':null;
 const attacking=playSide||ppSide||(g.status==='pre'?'away':null);
 const featured=preferredParticipant(play);
 return {play,kind,attacking,ppSide,featured,period:play.period??g.period??null,clock:play.clock||g.clock||'',fresh:g.status==='in'};
}
function playerSvg(primary,accent,goalie=false){
 return `<svg viewBox="0 0 56 74" aria-hidden="true"><ellipse cx="28" cy="69" rx="17" ry="3" fill="rgba(0,0,0,.18)"/><circle cx="28" cy="14" r="10" fill="#e8d1b7"/><path d="M17 14 Q28 2 39 14 L38 20 L18 20Z" fill="${primary}" stroke="${accent}" stroke-width="2"/><path d="M19 25 Q28 20 37 25 L42 49 Q28 57 14 49Z" fill="${primary}" stroke="${accent}" stroke-width="2.4"/><path d="M18 30 L7 45" stroke="#e8d1b7" stroke-width="6" stroke-linecap="round"/><path d="M38 30 L48 43" stroke="#e8d1b7" stroke-width="6" stroke-linecap="round"/><path d="M22 49 L18 64 M34 49 L38 64" stroke="#182433" stroke-width="7" stroke-linecap="round"/><path d="M9 44 L50 67" stroke="#6a4b32" stroke-width="3" stroke-linecap="round"/>${goalie?'<rect x="8" y="35" width="10" height="19" rx="3" fill="#f6f7f8"/><rect x="38" y="35" width="10" height="19" rx="3" fill="#f6f7f8"/>':''}</svg>`;
}
const spots={
 away:[{x:34,y:27},{x:39,y:46},{x:46,y:66},{x:53,y:33},{x:58,y:61}],
 home:[{x:66,y:27},{x:61,y:46},{x:54,y:66},{x:47,y:33},{x:42,y:61}]
};
function eventSpots(side,kind){
 const right=side!=='home';
 if(['shot','save','goal','block','miss'].includes(kind)) return right?
  [{x:72,y:50},{x:66,y:27},{x:65,y:72},{x:56,y:39},{x:56,y:62}]:[{x:28,y:50},{x:34,y:27},{x:35,y:72},{x:44,y:39},{x:44,y:62}];
 if(kind==='faceoff')return right?[{x:51,y:50},{x:43,y:33},{x:43,y:68},{x:34,y:40},{x:34,y:61}]:[{x:49,y:50},{x:57,y:33},{x:57,y:68},{x:66,y:40},{x:66,y:61}];
 if(kind==='hit')return right?[{x:71,y:18},{x:63,y:28},{x:57,y:49},{x:52,y:68},{x:45,y:38}]:[{x:29,y:18},{x:37,y:28},{x:43,y:49},{x:48,y:68},{x:55,y:38}];
 return spots[side];
}
function actor(g,side,i,pos,{featured=false,short=false,goalie=false}={}){
 const [p,a]=palette(g[side]);const label=featured?esc(gamecastState(g).featured?.name||'Current player'):'';
 return `<div class="hk-gc-player ${featured?'is-featured':''} ${short?'is-short':''} ${goalie?'is-goalie':''}" style="--x:${pos.x};--y:${pos.y}">${label?`<span class="hk-gc-name">${label}</span>`:''}${playerSvg(p,a,goalie)}</div>`;
}
function rinkSvg(){return `<svg class="hk-gc-rink" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hkIce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#effaff"/><stop offset=".55" stop-color="#e4f3f8"/><stop offset="1" stop-color="#d7eaf1"/></linearGradient></defs><rect class="ice" x="13" y="13" width="974" height="404" rx="55"/><rect class="board" x="13" y="13" width="974" height="404" rx="55"/><rect class="glass" x="22" y="22" width="956" height="386" rx="47"/><line class="red" x1="500" y1="20" x2="500" y2="410"/><line class="blue" x1="335" y1="20" x2="335" y2="410"/><line class="blue" x1="665" y1="20" x2="665" y2="410"/><circle class="thin" cx="500" cy="215" r="60"/><circle class="dot" cx="500" cy="215" r="6"/><circle class="thin" cx="205" cy="125" r="48"/><circle class="thin" cx="205" cy="305" r="48"/><circle class="thin" cx="795" cy="125" r="48"/><circle class="thin" cx="795" cy="305" r="48"/><circle class="dot" cx="205" cy="125" r="5"/><circle class="dot" cx="205" cy="305" r="5"/><circle class="dot" cx="795" cy="125" r="5"/><circle class="dot" cx="795" cy="305" r="5"/><path class="crease" d="M75 175 Q145 215 75 255Z"/><path class="crease" d="M925 175 Q855 215 925 255Z"/><path class="goal" d="M45 180 L75 180 L75 250 L45 250Z"/><path class="goal" d="M955 180 L925 180 L925 250 L955 250Z"/></svg>`;}
function actors(g,s){
 const attack=s.attacking||'away',def=attack==='away'?'home':'away',aSpots=eventSpots(attack,s.kind),dSpots=eventSpots(def,['shot','save','goal','block','miss'].includes(s.kind)?'live':s.kind);
 const featuredSide=sideFor(g,s.play.team)||attack;let html='';
 for(let i=0;i<5;i++)html+=actor(g,attack,i,aSpots[i],{featured:i===0&&featuredSide===attack});
 for(let i=0;i<5;i++){const short=s.ppSide===attack&&i===4;html+=actor(g,def,i,dSpots[i],{featured:i===0&&featuredSide===def,short});}
 html+=actor(g,'away','g',{x:7,y:50},{goalie:true});html+=actor(g,'home','g',{x:93,y:50},{goalie:true});return html;
}
function puck(s){
 let px=50,py=50,cls='';const right=s.attacking!=='home';
 if(['shot','save','goal','block','miss'].includes(s.kind)){px=right?68:32;py=50;cls=right?'shot-right':'shot-left';}
 else if(s.kind==='faceoff'){px=50;py=50;cls='faceoff';}
 else if(s.attacking){px=right?58:42;py=50;}
 return `<span class="hk-gc-puck ${cls}" style="--px:${px};--py:${py}"></span>`;
}
const photo=p=>/^https:\/\//.test(String(p?.photo||''))?`<img src="${esc(p.photo)}" alt="${esc(p.name||'Player')}">`:'';
export function renderNhlGamecastHTML(g={}){
 const s=gamecastState(g),pp=s.ppSide?`${esc(g[s.ppSide].abbr)} power play`:'Even strength / manpower pending';
 const eventTeam=s.play.team||s.ppSide&&g[s.ppSide]?.abbr||'';
 const title=g.status==='pre'?'Gamecast ready for puck drop':g.status==='post'?'Final game state':kindText[s.kind]||'Live play';
 const text=s.play.text|| (g.status==='pre'?'Live rink events will begin at puck drop.':'Waiting for the next reported NHL event.');
 const atk=s.attacking?`${esc(g[s.attacking]?.abbr||'')} attacking`:'Neutral event';
 const goalFlash=s.kind==='goal'?`<span class="hk-gc-goal-flash ${s.attacking==='home'?'left':'right'}"></span>`:'';
 return `<section class="hk-gc-stage" data-hk-gamecast data-event-id="${esc(s.play.id||'pending')}"><div class="hk-gc-rink-wrap">${rinkSvg()}<span class="hk-gc-zone-label">${atk} · ${esc(kindText[s.kind]||'Live')}</span><span class="hk-gc-schematic">Schematic event view · not player tracking</span>${goalFlash}${actors(g,s)}${puck(s)}</div><div class="hk-gc-meta"><div class="hk-gc-play-card"><div class="hk-gc-chips"><span class="hk-gc-chip ${g.status==='in'?'live':''}">${esc(g.status==='in'?'● LIVE':g.status==='post'?'FINAL':'PREGAME')}</span><span class="hk-gc-chip">${s.period?`P${esc(s.period)}`:'—'} ${esc(s.clock||'')}</span><span class="hk-gc-chip">${esc(pp)}</span></div><h3>${esc(title)}${eventTeam?` · ${esc(eventTeam)}`:''}</h3><p>${esc(text)}</p>${s.featured?`<div class="hk-gc-feature">${photo(s.featured)}<div><span>Event player</span><b>${esc(s.featured.name||'Player')}</b></div></div>`:''}</div><div class="hk-gc-situation"><div class="hk-gc-stat"><span>Away shots</span><b>${esc(g.away?.shots??'—')}</b></div><div class="hk-gc-stat"><span>Home shots</span><b>${esc(g.home?.shots??'—')}</b></div><div class="hk-gc-stat"><span>Situation</span><b>${esc(s.ppSide?'Power Play':'5v5 / pending')}</b></div><div class="hk-gc-stat"><span>Last event</span><b>${esc(kindText[s.kind]||'Live')}</b></div></div></div></section>`;
}
