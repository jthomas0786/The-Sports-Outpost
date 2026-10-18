import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('tso2/app.js','utf8');
const start=app.indexOf('  const SIDE_SWIPE_OPEN_MIN_PX = 120;');
const end=app.indexOf('  let sideSwipeStart = null;',start);
assert.ok(start>0&&end>start,'Mobile gesture helpers exist');
const body=app.slice(start,end);
const doc={body:{},documentElement:{}};
const {mobileSideSwipeDecision: decide,isHorizontalScrollGestureTarget: inHorizontalArea}=
  new Function('document','getComputedStyle',body+
    ';return {mobileSideSwipeDecision,isHorizontalScrollGestureTarget};')(
      doc,el=>({overflowX:el.overflowX||'visible'}));
const startAt=(x=160,y=200,scroll=false)=>({x,y,horizontalScroll:scroll});
const endAt=(x,y)=>({x,y});
assert.equal(decide(startAt(),endAt(271,203),350,false),'',
  'An incidental 111px table-like swipe must not open the menu');
assert.equal(decide(startAt(),endAt(281,205),350,false),'open',
  'Intentional 121px mostly horizontal swipe opens from anywhere on the page');
assert.equal(decide(startAt(),endAt(300,300),350,false),'',
  'Diagonal/vertical scrolling must not open the menu');
assert.equal(decide(startAt(15,200,true),endAt(300,205),300,false),'',
  'Swipes inside a horizontally scrollable board must not open, even at screen edge');
assert.equal(decide(startAt(),endAt(290,200),901,false),'',
  'Slow drags must not open navigation');
assert.equal(decide(startAt(),endAt(60,200),250,false),'',
  'A left swipe cannot open a closed menu');
assert.equal(decide(startAt(),endAt(68,201),350,true),'close',
  'A deliberate 92px left swipe closes the open menu');
assert.equal(decide(startAt(),endAt(71,200),350,true),'',
  'Short drags do not close the open menu');
assert.equal(decide(startAt(),endAt(420,204),330,true),'',
  'Right swipes do not mistakenly close an already-open nav');
const plain={nodeType:1,parentElement:doc.body,scrollWidth:100,clientWidth:100,overflowX:'visible',matches:()=>false};
const board={nodeType:1,parentElement:doc.body,scrollWidth:720,clientWidth:340,overflowX:'auto',matches:()=>false};
const child={nodeType:1,parentElement:board,scrollWidth:80,clientWidth:80,overflowX:'visible',matches:()=>false};
assert.equal(inHorizontalArea(child),true,'Nested table rows inherit horizontal scroll exemption');
assert.equal(inHorizontalArea(plain),false,'Normal main page remains swipe-anywhere enabled');
const slider={nodeType:1,parentElement:plain,scrollWidth:60,clientWidth:60,overflowX:'hidden',
  matches:q=>q.includes('input[type="range"]')};
assert.equal(inHorizontalArea(slider),true,'Range inputs are not hijacked by navigation');
const overflowButNoScroll={...board,scrollWidth:340,clientWidth:340};
assert.equal(inHorizontalArea(overflowButNoScroll),false,
  'Non-scrollable elements with overflow:auto do not block nav');
assert.match(app,/addEventListener\('touchcancel'/,'Touch cancellation clears gesture state');
assert.match(app,/event\.touches\.length>0/,'Multifinger gesture cannot accidentally open on first finger lift');
assert.match(app,/event\.changedTouches\)\.find\(t=>t\.identifier===start\.id\)/,
  'Touchend must match the originating finger');
console.log('TSO2 mobile gesture: 120px deliberate open, 90px close, horizontal boards protected, pinch/touchcancel safeguards passed');
