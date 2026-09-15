/**
 * sw.js — Dinger Watch service worker
 *
 * Runs independently of any open page, which is what makes notifications work
 * when the app is closed. It cannot poll on its own — browsers don't permit
 * that — so it sleeps until the push service wakes it.
 */

const VERSION = 'dw-sw-v2';
const LATEST_URL = 'latest-hr.json';
const ICON = 'icon-192.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/** Keys already shown, so a duplicate push can't double-notify. */
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
    let hrs = [];

    try {
      if (event.data) {
        const parsed = event.data.json();
        hrs = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch {}

    if (!hrs.length) {
      try {
        const res = await fetch(LATEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          hrs = data.homeRuns || [];
        }
      } catch {}
    }

    if (!hrs.length) return;

    const seen = await seenKeys();
    const fresh = hrs.filter(h => h.key && !seen.has(h.key)).slice(-5);

    for (const hr of fresh) {
      if (hr.sport === 'nfl' && hr.kind === 'watchlist') {
        if (!Number.isFinite(hr.ts) || Date.now()-hr.ts>120000 || hr.ts>Date.now()+60000) continue;
        const score = hr.awayScore!=null&&hr.homeScore!=null ? `${hr.away} ${hr.awayScore} · ${hr.home} ${hr.homeScore}` : `${hr.away||''} @ ${hr.home||''}`;
        const gameState = hr.period ? `Q${hr.period}${hr.clock?` ${hr.clock}`:''}` : '';
        await self.registration.showNotification(`⭐ ${hr.playerName}`, {
          body: [hr.text, hr.totals, [score,gameState].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
          icon: ICON, badge: ICON, tag: hr.key,
          data: { url: 'index.html#nfl', sport: 'nfl', kind: 'watchlist', gameId: hr.gameId, playerId: hr.playerId },
          vibrate: [160,80,160],
        });
        await rememberKey(hr.key);
        continue;
      }
      if (hr.sport === 'nfl') {
        if (!Number.isFinite(hr.ts) || Date.now()-hr.ts>120000 || hr.ts>Date.now()+60000) continue;
        await self.registration.showNotification(`🏈 ${hr.scorer} — TOUCHDOWN`, {
          body: `${hr.text}\n${hr.away} ${hr.awayScore} · ${hr.home} ${hr.homeScore} · Q${hr.period} ${hr.clock||''}`,
          icon: ICON, badge: ICON, tag: hr.key,
          data: { url: 'index.html#nfl', sport: 'nfl', kind: 'touchdown' }, vibrate: [200,100,200],
        });
        await rememberKey(hr.key);
        continue;
      }
      const bits = [];
      if (hr.exitVelo) bits.push(`${hr.exitVelo} mph`);
      if (hr.distance) bits.push(`${hr.distance} ft`);
      if (hr.launchAngle != null) bits.push(`${hr.launchAngle}°`);

      await self.registration.showNotification(`💣 ${hr.batter} — HOME RUN`, {
        body: [bits.join(' · '), `${hr.half} ${hr.inning} · ${hr.battingTeam} vs ${hr.opponent}`]
                .filter(Boolean).join('\n'),
        icon: ICON,
        badge: ICON,
        tag: hr.key,
        data: { url: 'index.html' },
        vibrate: [200, 100, 200],
      });
      await rememberKey(hr.key);
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

/** Chrome may drop a subscription; re-subscribe so alerts don't silently stop. */
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.subscribe(
        event.oldSubscription?.options || { userVisibleOnly: true });
      await fetch(self.__DW_PUSH_API || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
    } catch {}
  })());
});
