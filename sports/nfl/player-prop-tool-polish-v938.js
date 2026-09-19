const STYLE_ID='nfl-player-prop-tool-polish-v938-css';
const BAR_CLASS='nfl-ppt-xscroll-v938';
let installed=false;

function loadStyle(){
  if(document.getElementById(STYLE_ID))return;
  const link=document.createElement('link');
  link.id=STYLE_ID;
  link.rel='stylesheet';
  link.href='./sports/nfl/player-prop-tool-polish-v938.css?v=93.9';
  document.head.appendChild(link);
}

function removeLegacyScroller(){
  document.querySelectorAll(`.${BAR_CLASS}`).forEach(node=>node.remove());
  return !document.querySelector(`.${BAR_CLASS}`);
}

export function installNflPlayerPropToolPolishV938(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  loadStyle();
  removeLegacyScroller();
}

export const __NFL_PLAYER_PROP_TOOL_POLISH_V938_TEST__={removeLegacyScroller};