import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const harness = path.join(root, 'global-info-button-qa.html');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;background:#061225;color:#fff;font-family:system-ui,sans-serif}
  .topbar{height:64px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #1e3658}
  #sportSwitch{min-width:180px}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}
  #refreshBtnTb{display:inline-grid}
  /* Reproduce the legacy mobile shell behavior that caused the regression. */
  @media (max-width:760px){#infoBtnTb,#refreshBtnTb{display:none!important}.topbar{height:54px;padding:0 10px}}
</style>
</head>
<body>
<header class="topbar" role="banner">
  <div id="sportSwitch"><button type="button">NFL</button></div>
  <div class="topbar-right"><button type="button" id="refreshBtnTb">Refresh</button></div>
</header>
<script type="module">
  import { installGlobalInfoButtonV956 } from '/sports/global-info-button-v956.js?v=qa';
  installGlobalInfoButtonV956();
</script>
</body>
</html>`;
fs.writeFileSync(harness, html);

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = http.createServer((req,res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'global-info-button-qa.html';
    const target = path.resolve(root, rel);
    if (!target.startsWith(root) || !fs.statSync(target).isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store' });
    fs.createReadStream(target).pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((resolve,reject) => { server.once('error', reject); server.listen(4173, '127.0.0.1', resolve); });

const browser = await chromium.launch({ headless:true });
try {
  for (const test of [
    { name:'desktop', width:1280, height:800, expectedSize:38 },
    { name:'mobile', width:390, height:844, expectedSize:30 }
  ]) {
    const page = await browser.newPage({ viewport:{ width:test.width, height:test.height }, deviceScaleFactor:1 });
    await page.goto('http://127.0.0.1:4173/global-info-button-qa.html', { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#infoBtnTb', { state:'visible', timeout:15000 });

    const initial = await page.evaluate(() => {
      const button = document.querySelector('#infoBtnTb');
      const host = button?.parentElement;
      const r = button?.getBoundingClientRect();
      const refresh = document.querySelector('#refreshBtnTb');
      return {
        visible: !!button && getComputedStyle(button).display !== 'none' && r.width > 0 && r.height > 0,
        width: r?.width || 0,
        height: r?.height || 0,
        hostClass: host?.className || '',
        ariaControls: button?.getAttribute('aria-controls') || '',
        refreshDisplay: refresh ? getComputedStyle(refresh).display : 'missing',
        docWidth: document.documentElement.scrollWidth
      };
    });
    if (!initial.visible) throw new Error(`${test.name}: Info button is not visible`);
    if (!initial.hostClass.includes('topbar-right')) throw new Error(`${test.name}: Info button not mounted in header actions: ${JSON.stringify(initial)}`);
    if (Math.abs(initial.width - test.expectedSize) > 1 || Math.abs(initial.height - test.expectedSize) > 1) throw new Error(`${test.name}: unexpected Info button size: ${JSON.stringify(initial)}`);
    if (initial.ariaControls !== 'sportsOutpostInfoModal') throw new Error(`${test.name}: modal linkage missing`);
    if (initial.docWidth > test.width) throw new Error(`${test.name}: horizontal overflow ${initial.docWidth}`);
    if (test.name === 'mobile' && initial.refreshDisplay !== 'none') throw new Error(`mobile: Refresh should remain hidden while Info is restored`);

    await page.click('#infoBtnTb');
    await page.waitForSelector('#sportsOutpostInfoModal:not([hidden])', { state:'visible' });
    const title = await page.textContent('#sportsOutpostInfoTitle');
    if (title?.trim() !== 'About The Sports Outpost') throw new Error(`${test.name}: incorrect modal title: ${title}`);
    await page.click('#sportsOutpostInfoModal .dw-info-close-v956');
    const closed = await page.evaluate(() => document.querySelector('#sportsOutpostInfoModal')?.hidden === true);
    if (!closed) throw new Error(`${test.name}: modal did not close`);

    await page.evaluate(() => document.querySelector('#infoBtnTb')?.remove());
    await page.waitForSelector('#infoBtnTb', { state:'visible', timeout:5000 });
    const rebound = await page.evaluate(() => document.querySelector('#infoBtnTb')?.dataset.dwInfoBoundV957 === '1');
    if (!rebound) throw new Error(`${test.name}: Info button was not remounted/rebound after shell replacement`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(harness, { force:true });
}

console.log('Global Info button desktop/mobile browser QA OK');
