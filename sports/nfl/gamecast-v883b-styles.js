export function ensureNflGamecastV883bStyles(){
  if(document.getElementById('tso-nfl-gamecast-v883b')) return;
  const style=document.createElement('style');
  style.id='tso-nfl-gamecast-v883b';
  style.textContent=`
  #tso-nfl-possession-pill{display:none!important}
  #nflView .tso-possession-football{display:inline-block!important;font-size:.42em!important;line-height:1!important;vertical-align:middle!important;margin:0 7px!important;transform:translateY(-1px)!important;filter:none!important}

  /* v88.3b: the Game View body aligns to the exact scoreboard width. */
  #nflView .nxg-concept .nxg-gameview-modern{margin:0!important;padding:0!important;width:100%!important;height:auto!important;min-height:0!important}
  #nflView .tso-espn-drive-v883b{box-sizing:border-box!important;width:auto!important;margin:0 15px!important;padding:0!important;height:auto!important;min-height:0!important;background:transparent!important}
  #nflView .tso-espn-drive-v883b .tso-espn-drive-card{box-sizing:border-box;width:100%;margin:0;border:1px solid #19568f;border-radius:0 0 15px 15px;background:linear-gradient(180deg,#081a31 0%,#061529 100%);padding:17px 18px 16px;color:#eef7ff;overflow:hidden;box-shadow:0 18px 32px rgba(0,0,0,.2)}
  #nflView .tso-drive-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
  #nflView .tso-drive-titlewrap{display:flex;align-items:center;gap:12px;min-width:0}
  #nflView .tso-drive-teamlogo{width:32px;height:32px;object-fit:contain;flex:0 0 auto}
  #nflView .tso-drive-title{font:900 20px/1 'Oswald',Arial,sans-serif;text-transform:uppercase;color:#fff;letter-spacing:.02em}
  #nflView .tso-drive-summary{margin-top:4px;font:600 11px/1.2 'Roboto Mono',monospace;color:#87a8ce}
  #nflView .tso-drive-expand{width:38px;height:38px;border-radius:10px;border:1px solid #1e568d;background:#091a31;color:#a9d1ff;font-size:17px;cursor:pointer}
  #nflView .tso-drive-rule{height:1px;margin:13px 0 12px;background:linear-gradient(90deg,rgba(72,143,218,.08),rgba(72,143,218,.38),rgba(72,143,218,.08))}
  #nflView .tso-play-state{text-align:center;padding:1px 0 2px}
  #nflView .tso-play-kind{font:900 19px/1.1 'Oswald',Arial,sans-serif;color:#fff}
  #nflView .tso-situation{display:flex;justify-content:center;gap:38px;margin-top:9px;color:#8faed2;font:500 12px/1.2 Inter,Arial,sans-serif}
  #nflView .tso-situation strong{display:block;color:#fff;font-size:16px;margin-top:3px}

  /* 3D ESPN-style field mechanics. End zones are separate grid columns. */
  #nflView .tso-3d-field-stage{position:relative;height:300px;margin-top:12px;border:1px solid rgba(77,143,211,.34);border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 0%,rgba(39,112,187,.16),transparent 48%),linear-gradient(180deg,#061326 0%,#081a31 100%);perspective:900px}
  #nflView .tso-3d-stadium-glow{position:absolute;inset:0;background:linear-gradient(180deg,rgba(43,113,189,.12),transparent 38%,rgba(0,0,0,.24));pointer-events:none}
  #nflView .tso-3d-field-plane{position:absolute;left:3.4%;right:3.4%;top:28px;height:218px;display:grid;grid-template-columns:12.5% 75% 12.5%;transform-origin:50% 100%;transform:rotateX(22deg) scaleY(.95);clip-path:polygon(4.2% 0,95.8% 0,100% 100%,0 100%);background:#e6edf5;box-shadow:0 24px 42px rgba(0,0,0,.3),inset 0 0 0 1px rgba(27,48,73,.18);will-change:transform}
  #nflView .tso-3d-endzone{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(180deg,#0d3e75 0%,#092a52 100%);border-right:1px solid rgba(255,255,255,.28);border-left:1px solid rgba(0,0,0,.12)}
  #nflView .tso-3d-endzone.home{border-left:1px solid rgba(255,255,255,.28);border-right:1px solid rgba(0,0,0,.12)}
  #nflView .tso-3d-endzone:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.04),transparent 22%,transparent 78%,rgba(0,0,0,.08))}
  #nflView .tso-3d-endzone img{position:relative;z-index:2;max-width:62%;max-height:48%;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.28))}
  #nflView .tso-3d-endzone span{position:absolute;z-index:2;left:8px;right:8px;bottom:8px;text-align:center;font:900 10px/1 'Oswald',Arial,sans-serif;color:#fff;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #nflView .tso-3d-playable{position:relative;overflow:hidden;background:linear-gradient(180deg,#eef3f8 0%,#dbe5ef 100%);box-shadow:inset 0 0 0 1px rgba(54,72,91,.16)}
  #nflView .tso-3d-grid{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(50,68,87,.18) 0 1px,transparent 1px 10%)}
  #nflView .tso-3d-grid:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.22),transparent 32%,rgba(28,53,77,.04) 100%)}
  #nflView .tso-3d-hash{position:absolute;left:0;right:0;height:1px;border-top:2px dotted rgba(47,68,90,.12)}
  #nflView .tso-3d-hash.top{top:36%}#nflView .tso-3d-hash.bottom{bottom:34%}
  #nflView .tso-3d-los,#nflView .tso-3d-first,#nflView .tso-3d-ball,#nflView .tso-3d-path,#nflView .tso-3d-yards{position:absolute;transition:left .36s cubic-bezier(.2,.75,.25,1),width .36s cubic-bezier(.2,.75,.25,1),transform .36s cubic-bezier(.2,.75,.25,1),opacity .2s ease;will-change:left,width,transform}
  #nflView .tso-3d-los{top:0;bottom:0;width:3px;background:#259bff;box-shadow:0 0 10px rgba(37,155,255,.46);z-index:4;transform:translateX(-1px)}
  #nflView .tso-3d-first{top:0;bottom:0;width:3px;background:#f7d600;box-shadow:0 0 10px rgba(247,214,0,.42);z-index:4;transform:translateX(-1px)}
  #nflView .tso-3d-path{top:52%;height:4px;border-radius:999px;background:#121922;z-index:5;transform-origin:left center}
  #nflView .tso-3d-path:after{content:'';position:absolute;right:-6px;top:-4px;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid #121922}
  #nflView .tso-3d-path.is-left:after{right:auto;left:-6px;border-left:0;border-right:10px solid #121922}
  #nflView .tso-3d-ball{top:29%;width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:rgba(248,250,253,.96);border:2px solid #4d6178;box-shadow:0 9px 16px rgba(0,0,0,.2);transform:translateX(-50%);z-index:7}
  #nflView .tso-3d-ball:after{content:'';position:absolute;left:50%;bottom:-9px;width:10px;height:10px;background:rgba(248,250,253,.96);border-right:2px solid #4d6178;border-bottom:2px solid #4d6178;transform:translateX(-50%) rotate(45deg)}
  #nflView .tso-3d-ball span{position:relative;z-index:2;font-size:17px;transform:rotate(-8deg)}
  #nflView .tso-3d-yards{top:59%;padding:4px 9px;border-radius:8px;background:#f3f6fa;color:#111923;font:800 11px/1 Inter,Arial,sans-serif;box-shadow:0 5px 10px rgba(0,0,0,.12);transform:translateX(-50%);z-index:7;white-space:nowrap}
  #nflView .tso-3d-yardnumbers{position:absolute;left:2%;right:2%;display:flex;justify-content:space-between;color:#7d8996;font:800 10px/1 Inter,Arial,sans-serif;opacity:.94;pointer-events:none}
  #nflView .tso-3d-yardnumbers.top{top:7px}#nflView .tso-3d-yardnumbers.bottom{bottom:7px}
  #nflView .tso-3d-field-legend{position:absolute;left:50%;bottom:11px;transform:translateX(-50%);display:flex;align-items:center;gap:18px;padding:7px 12px;border-radius:999px;background:rgba(4,15,29,.82);border:1px solid rgba(58,112,173,.38);color:#aac1dc;font:700 9px/1 Inter,Arial,sans-serif;white-space:nowrap}
  #nflView .tso-3d-field-legend i{display:inline-block;vertical-align:middle;margin-right:5px}.tso-3d-field-legend i.los{width:20px;height:3px;background:#259bff}.tso-3d-field-legend i.fd{width:20px;height:3px;background:#f7d600}.tso-3d-field-legend i.path{width:20px;height:0;border-top:3px solid #58baff}

  #nflView .tso-play-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;margin-top:12px;padding:15px 16px;border-radius:12px;border:1px solid rgba(65,123,188,.34);background:#071a31;align-items:start}
  #nflView .tso-play-card h3{margin:0;font:800 19px/1.15 'Oswald',Arial,sans-serif;color:#fff}
  #nflView .tso-play-card p{margin:7px 0 0;color:#adc1dc;font:500 13px/1.45 Inter,Arial,sans-serif}
  #nflView .tso-play-side{display:flex;gap:8px;align-items:center;white-space:nowrap}
  #nflView .tso-win-pct{display:flex;gap:6px;align-items:center;color:#cfe0f5;font:700 12px/1 Inter,Arial,sans-serif;padding:7px 9px;border-radius:8px;background:#061326;border:1px solid #1e4c7d}
  #nflView .tso-last-tag{padding:7px 10px;border-radius:8px;background:#e7ebf1;color:#101722;font:800 11px/1 Inter,Arial,sans-serif}
  #nflView .tso-play-player{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:12px;margin-top:10px;border:1px solid rgba(72,124,182,.3);border-radius:12px;padding:11px 13px;background:rgba(3,14,29,.42)}
  #nflView .tso-play-player-photo{width:54px;height:54px;border-radius:999px;overflow:hidden;background:#0b315f;display:grid;place-items:center;color:#fff;font:800 15px/1 Inter,Arial,sans-serif}
  #nflView .tso-play-player-photo img{width:100%;height:100%;object-fit:cover}
  #nflView .tso-play-player-copy b{display:block;color:#fff;font:800 16px/1.2 Inter,Arial,sans-serif}
  #nflView .tso-play-player-copy span{display:block;margin-top:4px;color:#9fb4d2;font:500 12px/1.2 Inter,Arial,sans-serif}
  #nflView .tso-play-player-stats{display:flex;align-items:stretch}
  #nflView .tso-play-player-stats>div{min-width:78px;text-align:center;border-left:1px solid rgba(97,137,184,.28)}
  #nflView .tso-play-player-stats b{display:block;color:#fff;font:800 16px/1.1 Inter,Arial,sans-serif}
  #nflView .tso-play-player-stats span{display:block;margin-top:5px;color:#87a2c5;font:700 9px/1 Inter,Arial,sans-serif;text-transform:uppercase}
  #nflView .tso-drive-footerline{margin-top:9px;font:500 10px/1.2 'Roboto Mono',monospace;color:#7d9fc8;padding:0 2px}


  #nflView .tso-ht-gamecast-banner{box-sizing:border-box;margin:8px 15px 0;padding:10px 13px;border:1px solid rgba(245,158,11,.46);border-radius:10px;background:linear-gradient(90deg,rgba(87,48,4,.34),rgba(8,31,59,.96));display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
  #nflView .tso-ht-gamecast-banner>div{min-width:0}
  #nflView .tso-ht-gamecast-banner strong{display:block;color:#ffd063;font:900 11px/1.1 'JetBrains Mono',monospace;letter-spacing:.04em}
  #nflView .tso-ht-gamecast-banner span{display:block;margin-top:4px;color:#91add0;font:700 8px/1.3 'JetBrains Mono',monospace}
  #nflView .tso-ht-gamecast-banner button{flex:0 0 auto;height:31px;padding:0 11px;border-radius:8px;border:1px solid #ffc04b;background:#f59e0b;color:#071326;font:900 8px/1 'JetBrains Mono',monospace;text-transform:uppercase;cursor:pointer}
  #nflView .tso-ht-gamecast-banner.pending{border-color:rgba(62,145,236,.36);background:linear-gradient(90deg,rgba(8,35,68,.92),rgba(7,24,48,.96))}
  #nflView .tso-ht-gamecast-banner.pending strong{color:#6fc7ff}
  #nflView .tso-ht-gamecast-wait{flex:0 0 auto!important;margin:0!important;padding:6px 8px;border-radius:7px;border:1px solid rgba(77,151,235,.38);color:#87c9ff!important;background:#071a34}

  @media(max-width:760px){
    #nflView .tso-espn-drive-v883b{margin:0 8px!important}
    #nflView .tso-espn-drive-v883b .tso-espn-drive-card{padding:14px 12px 13px}
    #nflView .tso-3d-field-stage{height:244px}
    #nflView .tso-3d-field-plane{left:2%;right:2%;top:24px;height:176px;transform:rotateX(18deg) scaleY(.96)}
    #nflView .tso-3d-endzone span{font-size:8px;bottom:5px}
    #nflView .tso-3d-yardnumbers{font-size:8px}
    #nflView .tso-3d-field-legend{gap:8px;padding:6px 9px;font-size:7px}
    #nflView .tso-play-card{grid-template-columns:1fr}
    #nflView .tso-play-side{justify-content:flex-start}
    #nflView .tso-play-player{grid-template-columns:46px minmax(0,1fr)}
    #nflView .tso-play-player-photo{width:46px;height:46px}
    #nflView .tso-play-player-stats{grid-column:1/-1}
    #nflView .tso-situation{gap:24px}
    #nflView .tso-ht-gamecast-banner{margin:7px 8px 0;padding:8px 9px;min-height:40px}
    #nflView .tso-ht-gamecast-banner strong{font-size:8px}
    #nflView .tso-ht-gamecast-banner span{font-size:6.5px}
    #nflView .tso-ht-gamecast-banner button{font-size:7px;height:28px;padding:0 8px}
  }
  `;
  document.head.appendChild(style);
}
