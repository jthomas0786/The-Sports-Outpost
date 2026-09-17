let installed=false;

export function installNflReadabilityV8922(){
  if(installed&&document.getElementById('tso-nfl-readability-v8922'))return;
  installed=true;
  if(document.getElementById('tso-nfl-readability-v8922'))return;
  const style=document.createElement('style');
  style.id='tso-nfl-readability-v8922';
  style.textContent=`
    /* NFL readability pass v89.22 — keep the current layouts, remove eye-strain microtype. */
    #nflView{
      text-rendering:optimizeLegibility;
      -webkit-font-smoothing:antialiased;
      font-synthesis:none;
    }

    /* Main NFL navigation / prop controls. */
    #nflView .nfl-mlb-prop-tab{
      font-size:11px!important;
      line-height:1.2!important;
      letter-spacing:.035em!important;
      padding:9px 12px!important;
    }
    #nflView .ms-all-toolbar label{
      font-size:11px!important;
      line-height:1.35!important;
      color:#b9cce3!important;
    }
    #nflView .ms-all-toolbar label>span{
      font-size:11px!important;
      line-height:1.35!important;
    }
    #nflView .ms-all-toolbar select,
    #nflView .ms-all-toolbar input{
      min-height:40px!important;
      font-size:13px!important;
      line-height:1.3!important;
      color:#f2f7ff!important;
    }
    #nflView #nflAllClear{min-height:40px!important;font-size:11px!important}
    #nflView .ms-prop-note{font-size:11px!important;line-height:1.45!important;color:#a9bfd9!important}

    /* Player cards — this is where most of the 7–8px text lived. */
    #nflView .nfl-mlb-prop-name b{font-size:18px!important;line-height:1.08!important}
    #nflView .nfl-mlb-prop-name span,
    #nflView .nfl-mlb-prop-match{
      font-size:11px!important;
      line-height:1.35!important;
      color:#aec3dc!important;
    }
    #nflView .nfl-mlb-prop-detail>span{
      font-size:10.5px!important;
      line-height:1.35!important;
      color:#9fb8d6!important;
      padding:7px 8px!important;
    }
    #nflView .nfl-mlb-prop-detail b{font-size:12px!important;line-height:1.25!important;color:#edf5ff!important}
    #nflView .nfl-mlb-prop-market>span{font-size:10.5px!important;line-height:1.3!important;color:#8fc1f4!important}
    #nflView .nfl-mlb-prop-market>small{font-size:10.5px!important;line-height:1.4!important;color:#a8bfd9!important}
    #nflView .nfl-mlb-two-plus-inline{font-size:10.5px!important;line-height:1.25!important;padding:5px 8px!important}
    #nflView .nfl-mlb-prop-card small{line-height:1.4!important}

    /* Simulation/model strip added to prop cards. */
    #nflView .tso-nfl-prop-model-v8918__main strong{font-size:12px!important;line-height:1.3!important}
    #nflView .tso-nfl-prop-model-v8918__main span,
    #nflView .tso-nfl-prop-model-v8918__sub,
    #nflView .tso-nfl-prop-model-v8918__sub span{
      font-size:11px!important;
      line-height:1.4!important;
      color:#bdd0e6!important;
    }

    /* Research chips, modal details, odds and matchup context. */
    #nflView .tso-nfl-research-pill,
    .tso-nfl-player-card-v70 .tso-nfl-research-pill,
    .tso-nfl-player-card-v72 .tso-nfl-research-pill{
      font-size:10.5px!important;
      line-height:1.3!important;
      letter-spacing:.015em!important;
      padding:4px 7px!important;
      color:#c5d5e8!important;
    }
    #nflView .tso-nfl-board-fresh,
    .tso-nfl-player-card-v70 .tso-nfl-board-fresh,
    .tso-nfl-player-card-v72 .tso-nfl-board-fresh{
      font-size:10.5px!important;
      line-height:1.3!important;
      color:#adc3dc!important;
    }
    #nflView .tso-nfl-research-identity span,
    .tso-nfl-player-card-v70 .tso-nfl-research-identity span,
    .tso-nfl-player-card-v72 .tso-nfl-research-identity span{font-size:11px!important;line-height:1.3!important}
    #nflView .tso-nfl-research-updated,
    .tso-nfl-player-card-v70 .tso-nfl-research-updated,
    .tso-nfl-player-card-v72 .tso-nfl-research-updated{font-size:10.5px!important;line-height:1.35!important;color:#a4bad4!important}
    #nflView .tso-nfl-research-alert2 b,
    .tso-nfl-player-card-v70 .tso-nfl-research-alert2 b,
    .tso-nfl-player-card-v72 .tso-nfl-research-alert2 b{font-size:11px!important;line-height:1.3!important}
    #nflView .tso-nfl-research-kpi span,
    .tso-nfl-player-card-v70 .tso-nfl-research-kpi span,
    .tso-nfl-player-card-v72 .tso-nfl-research-kpi span{font-size:10.5px!important;line-height:1.3!important;color:#a6bdd8!important}
    #nflView .tso-nfl-research-kpi small,
    .tso-nfl-player-card-v70 .tso-nfl-research-kpi small,
    .tso-nfl-player-card-v72 .tso-nfl-research-kpi small{font-size:11px!important;line-height:1.35!important;color:#a9bdd5!important}
    #nflView .tso-nfl-research-card-head,
    .tso-nfl-player-card-v70 .tso-nfl-research-card-head,
    .tso-nfl-player-card-v72 .tso-nfl-research-card-head{font-size:11px!important;line-height:1.3!important;letter-spacing:.035em!important}
    #nflView .tso-nfl-role-grid span,
    .tso-nfl-player-card-v70 .tso-nfl-role-grid span,
    .tso-nfl-player-card-v72 .tso-nfl-role-grid span{font-size:10.5px!important;line-height:1.3!important;color:#a2bad6!important}
    #nflView .tso-nfl-prop-odds-chip span,
    .tso-nfl-player-card-v70 .tso-nfl-prop-odds-chip span,
    .tso-nfl-player-card-v72 .tso-nfl-prop-odds-chip span{font-size:10.5px!important;line-height:1.3!important;color:#9eb8d6!important}
    #nflView .tso-nfl-prop-odds-chip em,
    .tso-nfl-player-card-v70 .tso-nfl-prop-odds-chip em,
    .tso-nfl-player-card-v72 .tso-nfl-prop-odds-chip em{font-size:11px!important;line-height:1.3!important;color:#b4c9e0!important}
    #nflView .tso-nfl-prop-odds-pending,
    .tso-nfl-player-card-v70 .tso-nfl-prop-odds-pending,
    .tso-nfl-player-card-v72 .tso-nfl-prop-odds-pending{font-size:11px!important;line-height:1.4!important;color:#a9bfd8!important}
    #nflView .tso-nfl-matchup-copy span,
    .tso-nfl-player-card-v70 .tso-nfl-matchup-copy span,
    .tso-nfl-player-card-v72 .tso-nfl-matchup-copy span{font-size:10.5px!important;line-height:1.3!important}
    #nflView .tso-nfl-matchup-vs,
    .tso-nfl-player-card-v70 .tso-nfl-matchup-vs,
    .tso-nfl-player-card-v72 .tso-nfl-matchup-vs{font-size:11px!important;line-height:1.25!important}
    #nflView .tso-nfl-alt-select,
    .tso-nfl-player-card-v70 .tso-nfl-alt-select,
    .tso-nfl-player-card-v72 .tso-nfl-alt-select{font-size:12px!important;min-height:42px!important}
    #nflView .tso-nfl-alt-readout,
    .tso-nfl-player-card-v70 .tso-nfl-alt-readout,
    .tso-nfl-player-card-v72 .tso-nfl-alt-readout{font-size:10.5px!important;line-height:1.4!important;color:#b8cde4!important}

    /* Live selector + Gamecast chrome. */
    #nflView .tso-live-switcher label{font-size:11px!important;line-height:1.35!important;color:#a9bfd8!important}
    #nflView .tso-live-switcher select{min-height:42px!important;font-size:13px!important;line-height:1.25!important;color:#f2f7ff!important}
    #nflView .nxg-concept .nxg-tab{font-size:13px!important;line-height:40px!important;letter-spacing:.01em!important}
    #nflView .nxg-concept .nxg-livepill,
    #nflView .nxg-concept .nxg-feedpill,
    #nflView .nxg-concept .nxg-ghostbtn,
    #nflView .nxg-concept .nxg-dotbtn{font-size:12px!important;line-height:1.2!important}
    #nflView .nxg-concept .nxg-teamcopy small{font-size:14px!important;line-height:1.15!important;color:#b4d5ff!important}

    /* Halftime Parlay Lab — several labels were 6.5–9px. */
    #nflView .tso-ht-kicker{font-size:11px!important;line-height:1.3!important}
    #nflView .tso-ht-head p{font-size:11px!important;line-height:1.5!important;color:#a7bdd7!important}
    #nflView .tso-ht-livebar{font-size:11px!important;line-height:1.4!important;color:#aec4dd!important}
    #nflView .tso-ht-error{font-size:11px!important;line-height:1.5!important}
    #nflView .tso-ht-summary-grid span{font-size:10px!important;line-height:1.3!important;color:#9fb8d4!important}
    #nflView .tso-ht-actions button{font-size:11px!important;line-height:1.2!important}

    /* Improve contrast on common secondary copy without changing hierarchy. */
    #nflView .nfl-live-empty span,
    #nflView .nfl-live-empty small{color:#a9bfd8!important;line-height:1.45!important}

    /* Never shrink these back to 6–9px on phones. Inputs stay >=16px to avoid iOS zoom. */
    @media(max-width:760px){
      #nflView .nfl-mlb-prop-tab{font-size:10.5px!important;padding:8px 9px!important}
      #nflView .nfl-mlb-prop-name b{font-size:17px!important}
      #nflView .nfl-mlb-prop-name span,#nflView .nfl-mlb-prop-match{font-size:10.5px!important}
      #nflView .nfl-mlb-prop-detail>span{font-size:10px!important}
      #nflView .nfl-mlb-prop-detail b{font-size:11.5px!important}
      #nflView .ms-all-toolbar input,#nflView .ms-all-toolbar select,#nflView .tso-live-switcher select{font-size:16px!important}
      #nflView .tso-nfl-research-pill,.tso-nfl-player-card-v70 .tso-nfl-research-pill,.tso-nfl-player-card-v72 .tso-nfl-research-pill{font-size:10px!important}
      #nflView .tso-nfl-matchup-copy span,.tso-nfl-player-card-v70 .tso-nfl-matchup-copy span,.tso-nfl-player-card-v72 .tso-nfl-matchup-copy span{font-size:10px!important}
      #nflView .tso-nfl-alt-readout,.tso-nfl-player-card-v70 .tso-nfl-alt-readout,.tso-nfl-player-card-v72 .tso-nfl-alt-readout{font-size:10px!important}
    }
  `;
  document.head.appendChild(style);
}
