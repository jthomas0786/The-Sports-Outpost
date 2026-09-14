import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.env.MLB_V915_QA_URL || 'http://127.0.0.1:4173/visual-qa-v915.html';
fs.mkdirSync('qa', { recursive: true });

function fail(message, data) {
  console.error(`MLB v915 visual QA failed: ${message}`);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tso-mlb-concept-v915', { timeout: 30000 });
await page.waitForFunction(() => {
  const i = document.querySelector('.ps914-field');
  return i?.complete && i.naturalWidth > 0 && i.getAttribute('src') === './field-bg.jpg';
}, { timeout: 30000 });
await page.waitForTimeout(2200);

const inspect = () => {
  const root = document.querySelector('.tso-mlb-playstage-v901');
  const stage = document.querySelector('.ps-stage');
  const field = document.querySelector('.ps914-field');
  const left = document.querySelector('.ps-left');
  const center = document.querySelector('.ps-center');
  const right = document.querySelector('.ps-right');
  const atBat = document.querySelector('.v915-atbat-card');
  const pitcher = document.querySelector('.v915-pitcher-card');
  const onDeck = document.querySelector('.v915-ondeck-card');
  const metrics = document.querySelector('.ps-metrics');
  const banner = document.querySelector('.ps-play-banner');
  const callout = document.querySelector('.ps-callout');
  const sr = stage?.getBoundingClientRect();
  const cr = center?.getBoundingClientRect();
  const rr = right?.getBoundingClientRect();
  const ar = atBat?.getBoundingClientRect();
  const pr = pitcher?.getBoundingClientRect();
  const mr = metrics?.getBoundingClientRect();
  const br = banner?.getBoundingClientRect();
  const odr = onDeck?.getBoundingClientRect();
  const actors = [...document.querySelectorAll('.ps-chibi')];
  return {
    concept: root?.dataset?.approvedConcept,
    scale: Number(root?.dataset?.ps915Scale || 0),
    viewport: innerWidth,
    docWidth: document.documentElement.scrollWidth,
    rootWidth: root?.getBoundingClientRect().width || 0,
    fieldSrc: field?.getAttribute('src'),
    fieldNatural: [field?.naturalWidth || 0, field?.naturalHeight || 0],
    objectFit: getComputedStyle(field).objectFit,
    stageBox: sr ? [sr.width, sr.height] : [0, 0],
    stageAspect: sr?.height ? sr.width / sr.height : 0,
    imageAspect: field?.naturalHeight ? field.naturalWidth / field.naturalHeight : 0,
    leftDisplay: left ? getComputedStyle(left).display : 'missing',
    sameRow: !!(cr && rr && Math.abs(cr.top - rr.top) < 1 && cr.right <= rr.left + 1),
    centerWidth: cr?.width || 0,
    rightWidth: rr?.width || 0,
    parents: [atBat, pitcher, onDeck, metrics, banner].map(el => !!el?.parentElement?.classList.contains('ps-stage')),
    calloutDisplay: callout ? getComputedStyle(callout).display : 'missing',
    atBatLeft: ar && sr ? ar.left - sr.left : 999,
    pitcherRight: pr && sr ? sr.right - pr.right : 999,
    metricsCenter: mr && sr ? Math.abs((mr.left + mr.width / 2) - (sr.left + sr.width / 2)) : 999,
    metricsTop: mr && sr ? mr.top - sr.top : 999,
    bannerBottom: br && sr ? sr.bottom - br.bottom : 999,
    noTopOverlap: !!(ar && mr && pr && ar.right <= mr.left + 2 && mr.right <= pr.left + 2),
    onDeckBelowAtBat: !!(ar && odr && odr.top >= ar.bottom - 1),
    onDeckName: (onDeck?.querySelector('h3')?.textContent || '').trim(),
    onDeckHeadshot: onDeck?.querySelector('.ps-headshot') ? getComputedStyle(onDeck.querySelector('.ps-headshot')).display : 'missing',
    fonts: {
      atBat: parseFloat(getComputedStyle(atBat?.querySelector('h3') || document.body).fontSize),
      pitcher: parseFloat(getComputedStyle(pitcher?.querySelector('h3') || document.body).fontSize),
      event: parseFloat(getComputedStyle(banner?.querySelector('b') || document.body).fontSize),
      eventDesc: parseFloat(getComputedStyle(banner?.querySelector('span:not(.ball)') || document.body).fontSize),
      metric: parseFloat(getComputedStyle(metrics?.querySelector('b') || document.body).fontSize),
      railTab: parseFloat(getComputedStyle(document.querySelector('.ps-right-tabs button') || document.body).fontSize),
    },
    idleVisible: actors.filter(e => parseFloat(getComputedStyle(e).opacity) > .01).length,
  };
};

await page.locator('.tso-mlb-playstage-v901').screenshot({ path: 'qa/mlb-playstage-v915-current.png' });
await page.locator('.ps-stage').screenshot({ path: 'qa/mlb-playstage-v915-stage.png' });
const desktop = await page.evaluate(inspect);
fs.writeFileSync('qa/mlb-playstage-v915-current.json', JSON.stringify(desktop, null, 2));
console.log('desktop', desktop);

if (desktop.concept !== 'v915') fail('desktop concept marker', desktop);
if (desktop.fieldSrc !== './field-bg.jpg' || desktop.fieldNatural[0] !== 1536 || desktop.fieldNatural[1] !== 1024) fail('approved field asset changed', desktop);
if (desktop.objectFit !== 'contain' || Math.abs(desktop.stageAspect - desktop.imageAspect) > .005) fail('desktop field aspect', desktop);
if (Math.abs(desktop.scale - 1) > .001) fail('desktop scale', desktop);
if (desktop.leftDisplay !== 'none' || !desktop.sameRow || desktop.centerWidth < 1150 || desktop.rightWidth < 190) fail('desktop two-column geometry', desktop);
if (desktop.parents.some(v => !v) || desktop.calloutDisplay !== 'none') fail('desktop HUD parenting / duplicate callout', desktop);
if (Math.abs(desktop.atBatLeft - 12) > 2 || Math.abs(desktop.pitcherRight - 12) > 2 || desktop.metricsCenter > 2 || desktop.metricsTop > 15 || desktop.bannerBottom > 22) fail('desktop HUD placement', desktop);
if (!desktop.noTopOverlap || !desktop.onDeckBelowAtBat || !desktop.onDeckName || desktop.onDeckHeadshot !== 'none') fail('desktop card layout', desktop);
if (desktop.idleVisible) fail('desktop idle actors visible', desktop);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tso-mlb-concept-v915', { timeout: 30000 });
await page.waitForFunction(() => {
  const r = document.querySelector('.tso-mlb-playstage-v901');
  const i = document.querySelector('.ps914-field');
  return i?.complete && i.naturalWidth > 0 && i.getAttribute('src') === './field-bg.jpg' && Number(r?.dataset?.ps915Scale) === 1;
}, { timeout: 30000 });
await page.waitForTimeout(1400);
await page.locator('.tso-mlb-playstage-v901').screenshot({ path: 'qa/mlb-playstage-v915-mobile.png' });
const mobile = await page.evaluate(inspect);
fs.writeFileSync('qa/mlb-playstage-v915-mobile.json', JSON.stringify(mobile, null, 2));
console.log('mobile', mobile);

if (mobile.docWidth > mobile.viewport + 1 || Math.abs(mobile.scale - 1) > .001) fail('phone overflow / scale', mobile);
if (mobile.leftDisplay !== 'none' || !mobile.sameRow || mobile.centerWidth < 250 || mobile.rightWidth < 90 || mobile.stageBox[0] < 250) fail('phone horizontal composition', mobile);
if (mobile.fieldNatural[0] !== 1536 || mobile.fieldNatural[1] !== 1024 || Math.abs(mobile.stageAspect - mobile.imageAspect) > .005) fail('phone field asset/aspect', mobile);
if (mobile.parents.some(v => !v) || mobile.calloutDisplay !== 'none') fail('phone HUD parenting / duplicate callout', mobile);
if (mobile.metricsCenter > 2 || mobile.metricsTop > 7 || mobile.bannerBottom > 9 || !mobile.noTopOverlap || !mobile.onDeckBelowAtBat) fail('phone HUD placement', mobile);
if (mobile.fonts.atBat < 10 || mobile.fonts.pitcher < 10 || mobile.fonts.event < 11 || mobile.fonts.eventDesc < 8 || mobile.fonts.metric < 9 || mobile.fonts.railTab < 8) fail('phone readability fonts', mobile);
if (mobile.idleVisible) fail('phone idle actors visible', mobile);

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('MLB v915 visual QA: overlay HUD placement and readable 390px mobile layout OK');
