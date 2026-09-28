export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export function pregameRefreshMs(hoursToNextStart) {
  const h = Number(hoursToNextStart);
  if (!Number.isFinite(h)) return 12 * HOUR;
  if (h <= 1.5) return 5 * MINUTE;
  if (h <= 3) return 15 * MINUTE;
  if (h <= 12) return 30 * MINUTE;
  if (h <= 48) return HOUR;
  if (h <= 7 * 24) return 4 * HOUR;
  return 12 * HOUR;
}

export function nextFutureStartMs(values, nowMs = Date.now()) {
  const starts = (values || [])
    .map(value => typeof value === 'number' ? value : Date.parse(String(value || '')))
    .filter(value => Number.isFinite(value) && value > nowMs)
    .sort((a, b) => a - b);
  return starts.length ? starts[0] : null;
}

export function refreshState({ lastFetchedAt, nextStartMs, nowMs = Date.now(), force = false } = {}) {
  if (force) return { due:true, thresholdMs:0, ageMs:Infinity, hoursToNextStart:null };
  const next = Number(nextStartMs);
  if (!Number.isFinite(next) || next <= nowMs) {
    return { due:false, thresholdMs:Infinity, ageMs:Infinity, hoursToNextStart:null };
  }
  const hoursToNextStart = (next - nowMs) / HOUR;
  const thresholdMs = pregameRefreshMs(hoursToNextStart);
  const fetched = Date.parse(String(lastFetchedAt || ''));
  const ageMs = Number.isFinite(fetched) ? Math.max(0, nowMs - fetched) : Infinity;
  return { due:ageMs >= thresholdMs, thresholdMs, ageMs, hoursToNextStart };
}
