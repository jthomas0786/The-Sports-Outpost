export function ensureNflGamecastV884Styles(){
  if(document.getElementById('tso-nfl-gamecast-v884'))return;
  const style=document.createElement('style');style.id='tso-nfl-gamecast-v884';
  style.textContent=`
  /* Possession: only the v88.4 football is visible, exactly beside the team name. */
  #nflView .tso-possession-football:not([data-v884-possession-football]){display:none!important}
  #nflView [data-v884-possession-football].tso-possession-football{display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:17px!important;line-height:1!important;vertical-align:middle!important;margin:0 8px!important;transform:translateY(-2px)!important;filter:none!important;width:auto!important;height:auto!important}
  #tso-nfl-possession-pill{display:none!important}

  /* Scorebar remains untouched in structure. Body border now lands on the exact same 16px gutter. */
  #nflView .tso-espn-drive-v883b{margin:0 16px!important;width:auto!important}
  #nflView .tso-espn-drive-v883b .tso-espn-drive-card{border-color:rgba(45,127,255,.52)!important;border-top:0!important;border-radius:0 0 14px 14px!important;box-shadow:0 18px 32px rgba(0,0,0,.2)!important}

  /* More pronounced perspective without turning the field into decorative stadium art. */
  #nflView .tso-3d-field-stage{height:330px!important;margin-top:14px!important;perspective:720px!important;overflow:hidden!important;background:
    radial-gradient(ellipse 70% 42% at 50% -8%,rgba(79,160,255,.20),transparent 62%),
    linear-gradient(180deg,#061326 0%,#07182f 58%,#031020 100%)!important}
  #nflView .tso-3d-field-stage:before{content:'';position:absolute;left:7%;right:7%;top:18px;height:72px;border-radius:50%;border-top:2px solid rgba(83,153,227,.13);box-shadow:0 -14px 40px rgba(60,142,232,.08);pointer-events:none}
  #nflView .tso-3d-field-stage:after{content:'';position:absolute;left:4%;right:4%;bottom:55px;height:30px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.22));filter:blur(9px);pointer-events:none}
  #nflView .tso-3d-field-plane{left:4.2%!important;right:4.2%!important;top:42px!important;height:222px!important;grid-template-columns:13% 74% 13%!important;transform-origin:50% 100%!important;transform:rotateX(42deg) scaleY(1.08)!important;clip-path:polygon(8% 0,92% 0,100% 100%,0 100%)!important;background:#e7eef5!important;box-shadow:0 30px 46px rgba(0,0,0,.34),inset 0 0 0 1px rgba(27,48,73,.18)!important}

  /* End zones: team palette + horizontal name across the paint. Logo is a watermark only. */
  #nflView .tso-3d-endzone{background:linear-gradient(180deg,var(--ez-primary,#0d3e75) 0%,var(--ez-secondary,#092a52) 100%)!important;border-color:rgba(255,255,255,.28)!important;isolation:isolate!important}
  #nflView .tso-3d-endzone:before{z-index:0!important;background:linear-gradient(90deg,rgba(255,255,255,.08),transparent 24%,transparent 76%,rgba(0,0,0,.16))!important}
  #nflView .tso-3d-endzone img{position:absolute!important;z-index:1!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;max-width:54%!important;max-height:54%!important;opacity:.26!important;filter:grayscale(.05) drop-shadow(0 3px 5px rgba(0,0,0,.18))!important}
  #nflView .tso-3d-endzone span{position:absolute!important;z-index:3!important;left:6%!important;right:6%!important;top:50%!important;bottom:auto!important;transform:translateY(-50%) scaleX(.90)!important;text-align:center!important;font:900 16px/1 'Oswald',Arial,sans-serif!important;color:#fff!important;text-transform:uppercase!important;letter-spacing:.07em!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;text-shadow:0 2px 5px rgba(0,0,0,.48)!important}

  /* The playable 100 yards remain their own clipping surface. */
  #nflView .tso-3d-playable{overflow:hidden!important;z-index:2!important;background:linear-gradient(180deg,#f1f5f9 0%,#dbe5ef 100%)!important}
  #nflView .tso-3d-grid{background:repeating-linear-gradient(90deg,rgba(44,62,80,.20) 0 1px,transparent 1px 10%)!important}
  #nflView .tso-3d-los,#nflView .tso-3d-first{z-index:7!important}
  #nflView .tso-3d-path{z-index:8!important;background:#111923!important;box-shadow:0 1px 0 rgba(255,255,255,.16)!important}
  #nflView .tso-3d-ball{z-index:12!important;width:32px!important;height:32px!important;top:27%!important;border-width:2px!important;box-shadow:0 8px 16px rgba(0,0,0,.26),0 0 0 3px rgba(255,255,255,.18)!important}
  #nflView .tso-3d-ball span{font-size:16px!important}
  #nflView .tso-3d-yards{z-index:13!important;top:58%!important}
  #nflView .tso-3d-yardnumbers{z-index:3!important}
  #nflView .tso-3d-field-legend{z-index:20!important;bottom:12px!important}

  /* Rolling Q2/halftime banner aligns with the exact gamecast gutter too. */
  #nflView .tso-ht-gamecast-banner{margin-left:16px!important;margin-right:16px!important}

  @media(max-width:680px){
    #nflView [data-v884-possession-football].tso-possession-football{font-size:15px!important;margin:0 5px!important}
    #nflView .tso-3d-field-stage{height:300px!important}
    #nflView .tso-3d-field-plane{top:46px!important;height:200px!important;transform:rotateX(40deg) scaleY(1.06)!important}
    #nflView .tso-3d-endzone span{font-size:13px!important;letter-spacing:.04em!important}
  }
  `;
  document.head.appendChild(style);
}
