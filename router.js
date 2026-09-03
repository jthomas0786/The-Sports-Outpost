/**
 * sports/router.js — sport switcher + #hash routing + view swapping.
 *
 * Reads location.hash to pick the active sport. Two flags govern behavior
 * (see sports/registry.js):
 *   adapterReady — the sport is blessed; its switcher pill is enabled.
 *   uiReady      — a view exists and can be rendered behind a #hash.
 *
 * So an unblessed-but-built sport (NFL right now) is reachable at #nfl for QA
 * and renders a "preview" banner, while its pill stays disabled so nobody is
 * routed there by accident.
 *
 * View swapping is additive: the MLB experience keeps its exact DOM, and we only
 * toggle `hidden` on its containers vs the #nflView container. No existing CSS
 * class or DOM id is renamed or removed.
 */
import { SPORTS, SPORT_ORDER, DEFAULT_SPORT, sportFromHash, isViewable, isPreview } from './registry.js';

/** MLB-owned containers that must hide when another sport's view is showing. */
const MLB_SELECTORS = ['.app-main > main', '.app-main > footer', '.app-main > .status-bar'];

function activeSport() {
  const requested = sportFromHash(location.hash);
  // A sport is routable if it has a view at all — adapterReady only gates the pill.
  return isViewable(requested) ? requested : DEFAULT_SPORT;
}

function setVisible(el, visible) {
  if (!el) return;
  if (visible) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

async function swapView(active) {
  const nflView = document.getElementById('nflView');
  const showingMlb = active === 'mlb';

  MLB_SELECTORS.forEach(sel => setVisible(document.querySelector(sel), showingMlb));
  setVisible(nflView, active === 'nfl');
  setVisible(document.getElementById('nflSideNav'), active === 'nfl');

  // Mark the shell so CSS can retint the accent per sport.
  document.documentElement.setAttribute('data-sport', active);
  const accent = SPORTS[active]?.accent;
  if (accent) document.documentElement.style.setProperty('--sport-accent', accent);

  // Chat is sport-scoped (room = sport key). If the floating panel is open
  // when the sport flips, reload it so the user lands in the new room rather
  // than still viewing the previous sport's messages.
  if (typeof window.DW_reloadChatForSport === 'function') window.DW_reloadChatForSport();

  if (active === 'nfl') {
    // Lazy-load the NFL view module only when it's actually needed, so the MLB
    // path pays nothing for it.
    try {
      const mod = await import('./nfl/ui.js');
      await mod.mount();
    } catch (e) {
      if (nflView) {
        nflView.innerHTML = '<div class="nfl-error"><div class="nfl-error-title">' +
          'Couldn\'t load the Touchdown Watch view</div><div>' +
          String(e && e.message ? e.message : e).replace(/[<>&]/g, '') + '</div></div>';
      }
    }
  }
}

function render() {
  const active = activeSport();
  window.DW_SPORT = active;
  window.DW_SPORT_PREVIEW = isPreview(active);
  window.renderSidebarSports?.();
  swapView(active);
}

window.DW_getSport = activeSport;
window.addEventListener('hashchange', render);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}
