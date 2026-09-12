/**
 * sw.js — Dinger Watch service worker
 *
 * Runs independently of any open page, which is what makes notifications work
 * when the app is closed. It cannot poll on its own — browsers don't permit
 * that — so it sleeps until the push service wakes it.
 *
 * Deliberate design choice: pushes carry NO payload. Encrypting a Web Push
 * payload requires aes128gcm + ECDH key agreement, which is a lot of fragile
 * hand-rolled crypto. Instead the push is a bare "wake up" signal and the
 * worker fetches the actual home run from latest-hr.json. Simpler, and the
 * data is always current at display time rather than whenever it was queued.
 */

const VERSION = 'dw-sw-v1';
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

    // A payload is optional — use it if the sender included one, otherwise
    // fetch. cache:'no-store' matters here or we'd re-show a stale homer.
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

    if (!hrs.length) return;   // nothing to say — stay silent rather than show a placeholder

    const seen = await seenKeys();
    const fresh = hrs.filter(h => h.key && !seen.has(h.key)).slice(-5);

    for (const hr of fresh) {
      if (hr.sport === 'nfl') {
        if (!Number.isFinite(hr.ts) || Date.now()-hr.ts>120000 || hr.ts>Date.now()+60000) continue;
        await self.registration.showNotification(`🏈 ${hr.scorer} — TOUCHDOWN`, {
          body: `${hr.text}\n${hr.away} ${hr.awayScore} · ${hr.home} ${hr.homeScore} · Q${hr.period} ${hr.clock||''}`,
          icon: ICON, badge: ICON, tag: hr.key,
          data: { url: 'index.html#nfl', sport: 'nfl' }, vibrate: [200,100,200],
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
  const gamePk = event.notification.data?.gamePk;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Focus an existing tab rather than piling up new ones, then hand off
    // the Watch action to it — the service worker has no access to any of
    // the page's own state (openRadarGamecastModal, the live games list,
    // etc.), so it can only ask the real page to act on this, not do it
    // directly the way it can with clients.openWindow.
    for (const c of all) {
      if (c.url.includes('index.html') && 'focus' in c) {
        await c.focus();
        if (event.notification.data?.sport === 'nfl') c.postMessage({ type: 'open-nfl-td-feed' });
        if (isWatchAction && gamePk) c.postMessage({ type: 'watch-game', gamePk });
        return;
      }
    }
    if (clients.openWindow) {
      const client = await clients.openWindow(event.notification.data?.sport === 'nfl' ? 'index.html?nfl-feed=td#nfl' : (event.notification.data?.url || 'index.html'));
      // A freshly-opened window hasn't finished loading yet — postMessage
      // right away would land before this page's own message listener
      // exists to receive it. A short delay covers that without needing
      // the page itself to expose a "ready" signal back to the worker.
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
