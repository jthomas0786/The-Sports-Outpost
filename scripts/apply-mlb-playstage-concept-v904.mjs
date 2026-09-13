import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
function mustReplace(s,from,to,label){if(!s.includes(from))throw new Error(`Missing ${label}: ${from}`);return s.replace(from,to);}

// Wire the approved concept enhancer after the live-data PlayStage mounts.
{
 const p='sports/router.js';let s=read(p);
 s=mustReplace(s,
  "const [liveSwitcher,playerParity,playstage] = await Promise.all([",
  "const [liveSwitcher,playerParity,playstage,concept] = await Promise.all([",
  'router MLB Promise tuple');
 s=mustReplace(s,
  "        import('./mlb/playstage-v901.js?v=90.4')\n",
  "        import('./mlb/playstage-v901.js?v=90.4'),\n        import('./mlb/playstage-concept-v904.js?v=90.4')\n",
  'router PlayStage import');
 s=mustReplace(s,
  "      playstage.installMlbPlaystageV901?.();\n",
  "      playstage.installMlbPlaystageV901?.();\n      concept.installMlbPlaystageConceptV904?.();\n",
  'router PlayStage installer');
 write(p,s);
}

// Force browsers onto the new module graph.
{
 const p='index.html';let s=read(p);
 if(!/\.\/sports\/router\.js\?v=[A-Za-z0-9._-]+/.test(s))throw new Error('index router tag missing');
 s=s.replace(/\.\/sports\/router\.js\?v=[A-Za-z0-9._-]+/g,'./sports/router.js?v=90.11');
 write(p,s);
}

// Extend the existing PlayStage regression with the approved-concept contract.
{
 const p='scripts/mlb-playstage-selftest.mjs';let s=read(p);
 const anchor="const router=fs.readFileSync(new URL('../sports/router.js',import.meta.url),'utf8');\n";
 const extra=`const concept=fs.readFileSync(new URL('../sports/mlb/playstage-concept-v904.js',import.meta.url),'utf8');\nfor(const marker of [\n  'tso-mlb-concept-v904',\n  'ps3d-rig',\n  'ps3d-stadium',\n  'ps3d-scoreboard',\n  'ps3d-face',\n  'ps3d-bat',\n  'ps3d-glove',\n  'ps3dWindupBody',\n  'ps3dThrowArm',\n  'ps3dSwingBody',\n  'ps3dRunBob',\n  'ps3dCatchBody',\n  'img.mlbstatic.com',\n]) assert.ok(concept.includes(marker),\`Approved concept missing \${marker}\`);\n\n`;
 if(!s.includes(anchor))throw new Error('selftest router anchor missing');
 s=s.replace(anchor,extra+anchor);
 s=s.replace("assert.ok(router.includes(\"./mlb/playstage-v901.js?v=90.4\"),'Router must cache-bust MLB PlayStage');\n",
  "assert.ok(router.includes(\"./mlb/playstage-v901.js?v=90.4\"),'Router must cache-bust MLB PlayStage');\nassert.ok(router.includes(\"./mlb/playstage-concept-v904.js?v=90.4\"),'Router must load approved MLB concept');\n");
 s=s.replace("assert.ok(router.includes('installMlbPlaystageV901'),'Router must install MLB PlayStage');\n",
  "assert.ok(router.includes('installMlbPlaystageV901'),'Router must install MLB PlayStage');\nassert.ok(router.includes('installMlbPlaystageConceptV904'),'Router must install approved MLB concept');\n");
 write(p,s);
}

// Protect the outer cache chain and syntax in normal CI.
{
 const p='.github/workflows/nfl-gamecast-tests.yml';let s=read(p);
 if(!s.includes("      - 'sports/mlb/playstage-concept-v904.js'")){
  s=s.replace("      - 'sports/mlb/playstage-v901.js'\n","      - 'sports/mlb/playstage-v901.js'\n      - 'sports/mlb/playstage-concept-v904.js'\n");
 }
 s=s.replace("          node --check sports/mlb/playstage-v901.js\n","          node --check sports/mlb/playstage-v901.js\n          node --check sports/mlb/playstage-concept-v904.js\n");
 s=s.replace("grep -F './sports/router.js?v=90.10' index.html","grep -F './sports/router.js?v=90.11' index.html");
 if(!s.includes("grep -F \"./mlb/playstage-concept-v904.js?v=90.4\" sports/router.js")){
  s=s.replace("          grep -F \"./mlb/playstage-v901.js?v=90.4\" sports/router.js\n","          grep -F \"./mlb/playstage-v901.js?v=90.4\" sports/router.js\n          grep -F \"./mlb/playstage-concept-v904.js?v=90.4\" sports/router.js\n");
 }
 write(p,s);
}

console.log('Applied approved MLB PlayStage concept v904 wiring');
