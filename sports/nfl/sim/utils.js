export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
export const finite = (v, fallback = null) => Number.isFinite(Number(v)) ? Number(v) : fallback;
export const round = (v, digits = 2) => {
  if (!Number.isFinite(Number(v))) return null;
  const p = 10 ** digits;
  return Math.round(Number(v) * p) / p;
};

export function hash32(input = '') {
  let h = 2166136261 >>> 0;
  for (const ch of String(input)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7;
  h += h << 3; h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

export function makeRng(seed = 1) {
  let a = (Number(seed) >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function normal(rng, mean = 0, sd = 1) {
  let u = 0, v = 0;
  while (u <= Number.EPSILON) u = rng();
  while (v <= Number.EPSILON) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

export function logNormalFactor(rng, sigma = 0.1) {
  // centered around 1.0 rather than exp(sigma^2/2)
  return Math.exp(normal(rng, -0.5 * sigma * sigma, sigma));
}

export function poisson(rng, lambda) {
  lambda = Math.max(0, Number(lambda) || 0);
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const limit = Math.exp(-lambda);
    let p = 1, k = 0;
    do { k++; p *= rng(); } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(normal(rng, lambda, Math.sqrt(lambda))));
}

export function binomial(rng, n, p) {
  n = Math.max(0, Math.round(Number(n) || 0));
  p = clamp(p, 0, 1);
  if (!n || p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= 80) {
    let x = 0;
    for (let i = 0; i < n; i++) if (rng() < p) x++;
    return x;
  }
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return clamp(Math.round(normal(rng, mean, sd)), 0, n);
}

export function weightedIndex(rng, weights) {
  let total = 0;
  for (const w of weights) total += Math.max(0, Number(w) || 0);
  if (total <= 0) return Math.floor(rng() * weights.length);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, Number(weights[i]) || 0);
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

export function multinomial(rng, total, weights) {
  const out = new Array(weights.length).fill(0);
  for (let i = 0; i < total; i++) out[weightedIndex(rng, weights)]++;
  return out;
}

export function allocateCapped(rng, total, capacities, weights) {
  const out = new Array(capacities.length).fill(0);
  let left = Math.max(0, Math.round(total));
  const caps = capacities.map(x => Math.max(0, Math.round(Number(x) || 0)));
  while (left > 0) {
    const eligible = [];
    const ew = [];
    for (let i = 0; i < caps.length; i++) {
      if (out[i] >= caps[i]) continue;
      eligible.push(i);
      ew.push(Math.max(0.0001, Number(weights[i]) || 0.0001));
    }
    if (!eligible.length) break;
    const idx = eligible[weightedIndex(rng, ew)];
    out[idx]++;
    left--;
  }
  return out;
}

export function quantileSorted(sorted, q) {
  if (!sorted.length) return null;
  const pos = clamp(q, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarizeTyped(values, count = values.length) {
  const arr = Array.from(values.slice(0, count)).sort((a, b) => a - b);
  if (!arr.length) return {mean:null,median:null,p10:null,p25:null,p75:null,p90:null,min:null,max:null};
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  return {
    mean: round(mean, 2),
    median: round(quantileSorted(arr, 0.50), 2),
    p10: round(quantileSorted(arr, 0.10), 2),
    p25: round(quantileSorted(arr, 0.25), 2),
    p75: round(quantileSorted(arr, 0.75), 2),
    p90: round(quantileSorted(arr, 0.90), 2),
    min: arr[0],
    max: arr[arr.length - 1],
  };
}

export function probability(values, predicate, count = values.length) {
  if (!count) return null;
  let hits = 0;
  for (let i = 0; i < count; i++) if (predicate(values[i], i)) hits++;
  return hits / count;
}

export const normName = s => String(s ?? '')
  .toLowerCase()
  .replace(/\./g, '')
  .replace(/\s+(jr|sr|ii|iii|iv|v)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const normTeam = s => ({
  LAR:'LA', JAC:'JAX', WAS:'WSH', OAK:'LV', SD:'LAC', STL:'LA'
}[String(s ?? '').toUpperCase()] || String(s ?? '').toUpperCase());
