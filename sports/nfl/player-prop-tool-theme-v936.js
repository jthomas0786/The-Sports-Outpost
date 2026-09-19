const STYLE_ID='nfl-player-prop-tool-theme-v936-css';

export function installNflPlayerPropToolThemeV936(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;
  link.rel='stylesheet';
  link.href='./sports/nfl/player-prop-tool-theme-v936.css?v=93.7';
  document.head.appendChild(link);
}
