/**
 * sw.js — The Sports Outpost service worker
 *
 * Runs independently of any open page, which is what makes notifications work
 * when the app is closed. It sleeps until the push service wakes it.
 */

const VERSION = 'tso-sw-v3';
const LATEST_URL = 'latest-hr.json';
const ICON = 'icon-192.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function seenKeys() {
  try {
    const cache = await caches.open(VERSION);
    const res = await cache.match('seen');
    return res ? new Set(await res.json()) : new Set();
  } catch { return new Set(); }
}
async function rememberKey(key) {
  try {
    const cache = await caches.open(VERSION);
    const seen = await seenKeys();
    seen.add(key);
    const trimmed = [...seen].slice(-300);
    await cache.put('seen', new Response(JSON.stringify(trimmed)));
  } catch {}
}

let pushQueue = Promise.resolve();
self.addEventListener('push', event => {
  event.waitUntil(pushQueue = pushQueue.catch(() => {}).then(async () => {
    let events = [];

    try {
      if (event.data) {
        const parsed = event.data.json();
        events = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch {}

    if (!events.length) {
      try {
        const res = await fetch(LATEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          events = data.homeRuns || [];
        }
      } catch {}
    }

    if (!events.length) return;

    const seen = await seenKeys();
    const fresh = events.filter(e => e.key && !seen.has(e.key)).slice(-5);

    for (const item of fresh) {
      if (item.sport === 'nhl' && item.kind === 'plj') {
        if (!Number.isFinite(item.ts) || Date.now()-item.ts>5*60*1000 || item.ts>Date.now()+60000) continue;
        await self.registration.showNotification(item.title || '⚡ Puck Line Jesus', {
          body: item.body || `${item.favorite || 'Favorite'} -1.5 live puck-line alert`,
          icon: ICON, badge: ICON, tag: item.key,
          data: { url: item.url || 'index.html?plj=1#nhl', sport: 'nhl', kind: 'plj', gameId: item.gameId },
          vibrate: [220,90,220,90,300],
          renotify: true,
        });
        await rememberKey(item.key);
        continue;
      }
      if (item.sport === 'nfl' && item.kind === 'watchlist') {
        if (!Number.isFinite(item.ts) || Date.now()-item.ts>120000 || item.ts>Date.now()+60000) continue;
        const score = item.awayScore!=null&&item.homeScore!=null ? `${item.away} ${item.awayScore} · ${item.home} ${item.homeScore}` : `${item.away||''} @ ${item.home||''}`;
        const gameState = item.period ? `Q${item.period}${item.clock?` ${item.clock}`:''}` : '';
        await self.registration.showNotification(`⭐ ${item.playerName}`, {
          body: [item.text, item.totals, [score,gameState].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
          icon: ICON, badge: ICON, tag: item.key,
          data: { url: 'index.html#nfl', sport: 'nfl', kind: 'watchlist', gameId: item.gameId, playerId: item.playerId },
          vibrate: [160,80,160],
        });
        await rememberKey(item.key);
        continue;
      }
      if (item.sport === 'nfl') {
        if (!Number.isFinite(item.ts) || Date.now()-item.ts>120000 || item.ts>Date.now()+60000) continue;
        await self.registration.showNotification(`🏈 ${item.scorer} — TOUCHDOWN`, {
          body: `${item.text}\n${item.away} ${item.awayScore} · ${item.home} ${item.homeScore} · Q${item.period} ${item.clock||''}`,
          icon: ICON, badge: ICON, tag: item.key,
          data: { url: 'index.html#nfl', sport: 'nfl', kind: 'touchdown' }, vibrate: [200,100,200],
        });
        await rememberKey(item.key);
        continue;
      }
      const bits = [];
      if (item.exitVelo) bits.push(`${item.exitVelo} mph`);
      if (item.distance) bits.push(`${item.distance} ft`);
      if (item.launchAngle != null) bits.push(`${item.launchAngle}°`);

      await self.registration.showNotification(`💣 ${item.batter} — HOME RUN`, {
        body: [bits.join(' · '), `${item.half} ${item.inning} · ${item.battingTeam} vs ${item.opponent}`]
                .filter(Boolean).join('\n'),
        icon: ICON,
        badge: ICON,
        tag: item.key,
        data: { url: 'index.html' },
        vibrate: [200, 100, 200],
      });
      await rememberKey(item.key);
    }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const isWatchAction = event.action === 'watch';
  const data = event.notification.data || {};
  const gamePk = data.gamePk;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if(data.sport === 'nhl' && data.kind === 'plj'){
      const target = new URL(data.url || 'index.html?plj=1#nhl', self.location.origin).href;
      for(const c of all){
        if('navigate' in c){try{await c.navigate(target);}catch{} if('focus' in c)await c.focus();return;}
      }
      if(clients.openWindow) await clients.openWindow(target);
      return;
    }
    for (const c of all) {
      if (c.url.includes('index.html') && 'focus' in c) {
        await c.focus();
        if (data.sport === 'nfl' && data.kind !== 'watchlist') c.postMessage({ type: 'open-nfl-td-feed' });
        if (isWatchAction && gamePk) c.postMessage({ type: 'watch-game', gamePk });
        return;
      }
    }
    if (clients.openWindow) {
      const nflTarget = data.kind === 'watchlist' ? 'index.html#nfl' : 'index.html?nfl-feed=td#nfl';
      const client = await clients.openWindow(data.sport === 'nfl' ? nflTarget : (data.url || 'index.html'));
      if (isWatchAction && gamePk && client) {
        setTimeout(() => client.postMessage({ type: 'watch-game', gamePk }), 2500);
      }
    }
  })());
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      await self.registration.pushManager.subscribe(event.oldSubscription?.options || { userVisibleOnly: true });
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for(const c of all)c.postMessage?.({type:'push-subscription-changed'});
    } catch {}
  })());
});
