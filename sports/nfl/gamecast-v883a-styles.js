const STYLE_ID='tso-nfl-gamecast-v883a-styles';

export function ensureNflGamecastV883aStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  #nflView .nxg-scorebar .tso-possession-football{font-size:.68em;line-height:1;display:inline-block;vertical-align:.08em;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
  #nflView .nxg-scorebar .nxg-teamblock.away .tso-possession-football{margin-left:8px}
  #nflView .nxg-scorebar .nxg-teamblock.home .tso-possession-football{margin-right:8px}

  #nflView .tso-espn-drive{height:870px!important;padding:18px 22px 22px!important;background:linear-gradient(180deg,#061426 0%,#04101f 100%)!important;box-sizing:border-box!important;overflow:hidden!important}
  #nflView .tso-espn-drive-card{height:100%;border:1px solid #1e5a98;border-radius:14px;background:linear-gradient(180deg,#081d36,#06162b);box-shadow:0 14px 34px rgba(0,0,0,.28);padding:18px 20px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}
  #nflView .tso-drive-head{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:42px}
  #nflView .tso-drive-titlewrap{display:flex;align-items:center;gap:12px;min-width:0}
  #nflView .tso-drive-teamlogo{width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
  #nflView .tso-drive-title{font:800 22px/1 'Oswald',Arial,sans-serif;color:#fff;letter-spacing:.02em;text-transform:uppercase}
  #nflView .tso-drive-summary{font:500 12px/1.25 'Roboto Mono',monospace;color:#89a6ca;margin-top:5px}
  #nflView .tso-drive-expand{width:34px;height:34px;border-radius:8px;border:1px solid #22588d;background:#07182c;color:#c8ddf7;font-size:18px}
  #nflView .tso-drive-rule{height:1px;background:linear-gradient(90deg,rgba(89,154,230,.08),rgba(89,154,230,.45),rgba(89,154,230,.08))}
  #nflView .tso-play-state{text-align:center;padding:3px 0 0}
  #nflView .tso-play-kind{font:800 18px/1.1 'Oswald',Arial,sans-serif;color:#fff}
  #nflView .tso-situation{display:flex;justify-content:center;gap:34px;margin-top:10px;color:#9cb5d6;font:500 13px/1.2 Inter,Arial,sans-serif}
  #nflView .tso-situation strong{display:block;color:#fff;font-size:17px;margin-top:3px}

  #nflView .tso-flat-field{position:relative;height:250px;border-radius:13px;background:#e7edf4;border:1px solid rgba(255,255,255,.24);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
  #nflView .tso-flat-endzone{position:absolute;top:34px;bottom:42px;width:13%;background:linear-gradient(180deg,#0b3768,#08264e);display:flex;align-items:center;justify-content:center;overflow:hidden}
  #nflView .tso-flat-endzone.away{left:1.5%}.tso-flat-endzone.home{right:1.5%}
  #nflView .tso-flat-endzone img{max-width:58%;max-height:58%;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
  #nflView .tso-flat-endzone span{position:absolute;font:800 10px/1 'Oswald',Arial,sans-serif;color:#fff;letter-spacing:.08em;bottom:5px;text-transform:uppercase;opacity:.9}
  #nflView .tso-field-grid{position:absolute;left:14.5%;right:14.5%;top:34px;bottom:42px;background:repeating-linear-gradient(90deg,rgba(41,55,73,.18) 0 1px,transparent 1px 10%)}
  #nflView .tso-field-grid:before{content:'';position:absolute;left:0;right:0;top:50%;border-top:2px dotted rgba(48,61,78,.12)}
  #nflView .tso-field-los,#nflView .tso-field-first,#nflView .tso-field-ball,#nflView .tso-field-path,#nflView .tso-field-yards{position:absolute;transition:left .38s cubic-bezier(.2,.75,.25,1),width .38s cubic-bezier(.2,.75,.25,1),transform .38s cubic-bezier(.2,.75,.25,1),opacity .22s ease}
  #nflView .tso-field-los{top:25px;bottom:33px;width:3px;background:#2d9cff;box-shadow:0 0 10px rgba(45,156,255,.4)}
  #nflView .tso-field-first{top:25px;bottom:33px;width:3px;background:#f4d600;box-shadow:0 0 10px rgba(244,214,0,.35)}
  #nflView .tso-field-ball{top:78px;transform:translateX(-50%);width:38px;height:38px;border-radius:999px;background:#f5f7fa;border:2px solid #56616f;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 16px rgba(12,22,35,.22);z-index:5}
  #nflView .tso-field-path{top:96px;height:3px;background:#111820;border-radius:999px;transform-origin:left center;z-index:3}
  #nflView .tso-field-path:after{content:'';position:absolute;right:-5px;top:-4px;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #111820}
  #nflView .tso-field-path.is-left:after{right:auto;left:-5px;border-left:0;border-right:8px solid #111820}
  #nflView .tso-field-yards{top:118px;transform:translateX(-50%);padding:4px 9px;border-radius:8px;background:#f6f7f9;color:#101722;font:800 12px/1 Inter,Arial,sans-serif;z-index:6;box-shadow:0 5px 12px rgba(0,0,0,.12)}
  #nflView .tso-yardnumbers{position:absolute;left:15.5%;right:15.5%;bottom:13px;display:flex;justify-content:space-between;color:#7d8794;font:700 11px/1 Inter,Arial,sans-serif}
  #nflView .tso-field-side-label{position:absolute;bottom:12px;font:800 11px/1 Inter,Arial,sans-serif;color:#76818f}.tso-field-side-label.left{left:3.5%}.tso-field-side-label.right{right:3.5%}

  #nflView .tso-play-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:15px 16px;border-radius:13px;border:1px solid rgba(65,123,188,.34);background:#071a31;align-items:start}
  #nflView .tso-play-card h3{margin:0;font:800 20px/1.15 'Oswald',Arial,sans-serif;color:#fff}
  #nflView .tso-play-card p{margin:7px 0 0;color:#adc1dc;font:500 13px/1.45 Inter,Arial,sans-serif}
  #nflView .tso-play-side{display:flex;gap:8px;align-items:center;white-space:nowrap}
  #nflView .tso-win-pct{display:flex;gap:6px;align-items:center;color:#cfe0f5;font:700 12px/1 Inter,Arial,sans-serif;padding:7px 9px;border-radius:8px;background:#061326;border:1px solid #1e4c7d}.tso-last-tag{padding:7px 10px;border-radius:8px;background:#e7ebf1;color:#101722;font:800 11px/1 Inter,Arial,sans-serif}
  #nflView .tso-play-player{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid rgba(72,124,182,.3);border-radius:12px;padding:11px 13px;background:rgba(3,14,29,.42)}
  #nflView .tso-play-player-photo{width:54px;height:54px;border-radius:999px;overflow:hidden;background:#0b315f;display:grid;place-items:center;color:#fff;font:800 15px/1 Inter,Arial,sans-serif}.tso-play-player-photo img{width:100%;height:100%;object-fit:cover}
  #nflView .tso-play-player-copy b{display:block;color:#fff;font:800 16px/1.2 Inter,Arial,sans-serif}.tso-play-player-copy span{display:block;margin-top:4px;color:#9fb4d2;font:500 12px/1.2 Inter,Arial,sans-serif}
  #nflView .tso-play-player-stats{display:flex;align-items:stretch}.tso-play-player-stats>div{min-width:78px;text-align:center;border-left:1px solid rgba(97,137,184,.28)}.tso-play-player-stats b{display:block;color:#fff;font:800 16px/1.1 Inter,Arial,sans-serif}.tso-play-player-stats span{display:block;margin-top:5px;color:#87a2c5;font:700 9px/1 Inter,Arial,sans-serif;text-transform:uppercase}
  #nflView .tso-drive-footerline{font:500 11px/1.2 'Roboto Mono',monospace;color:#7d9fc8;padding:0 2px}

  #nflView .nfl-td-feed-modern{display:grid;gap:12px}
  #nflView .nfl-td-feed-card{display:grid;grid-template-columns:82px 68px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 16px;border:1px solid #173e70;border-radius:13px;background:linear-gradient(180deg,#071a31,#061427);box-shadow:0 10px 24px rgba(0,0,0,.16)}
  #nflView .nfl-td-feed-time{font:800 11px/1.3 'Roboto Mono',monospace;color:#f4b52c;text-transform:uppercase}
  #nflView .nfl-td-feed-photo{width:62px;height:62px;border-radius:12px;overflow:hidden;background:#0b2d55;display:grid;place-items:center;border:1px solid #24568e}.nfl-td-feed-photo img{width:100%;height:100%;object-fit:cover}.nfl-td-feed-photo img.team-logo{object-fit:contain;padding:9px;box-sizing:border-box}
  #nflView .nfl-td-feed-main{min-width:0}.nfl-td-feed-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nfl-td-feed-name b{font:800 17px/1.1 'Oswald',Arial,sans-serif;color:#fff;text-transform:uppercase}.nfl-td-feed-name span{padding:3px 7px;border-radius:999px;background:#14355f;color:#7fc2ff;font:800 9px/1 Inter,Arial,sans-serif;letter-spacing:.05em}
  #nflView .nfl-td-feed-main p{margin:6px 0 0;color:#a9bdd7;font:500 12px/1.4 Inter,Arial,sans-serif}.nfl-td-feed-score{margin-top:5px;color:#7f9ec5;font:700 10px/1.2 'Roboto Mono',monospace}
  #nflView .nfl-td-feed-prices{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;min-width:230px}.nfl-td-price{min-width:98px;border:1px solid #24548b;background:#091d37;border-radius:9px;padding:8px 10px;text-align:center}.nfl-td-price span{display:block;color:#79a1ce;font:700 8px/1 Inter,Arial,sans-serif;text-transform:uppercase}.nfl-td-price b{display:block;margin-top:4px;color:#fff;font:800 16px/1 Inter,Arial,sans-serif}.nfl-td-price em{display:block;margin-top:3px;color:#58d79a;font:700 8px/1 Inter,Arial,sans-serif;font-style:normal}.nfl-td-price.pending b{font-size:10px;color:#7994b6}.nfl-td-price.pending em{display:none}
  @media(max-width:760px){#nflView .nfl-td-feed-card{grid-template-columns:60px minmax(0,1fr);gap:10px}.nfl-td-feed-time{grid-column:1/-1}.nfl-td-feed-photo{width:54px!important;height:54px!important}.nfl-td-feed-prices{grid-column:1/-1;justify-content:flex-start;min-width:0!important}.tso-play-card{grid-template-columns:1fr!important}.tso-play-side{justify-content:flex-start}.tso-play-player{grid-template-columns:46px minmax(0,1fr)!important}.tso-play-player-photo{width:46px!important;height:46px!important}.tso-play-player-stats{grid-column:1/-1}.tso-flat-field{height:210px!important}}
  `;
  document.head.appendChild(style);
}
