// supabase/functions/nfl-live/index.ts
// Public low-latency NFL live endpoint for The Sports Outpost.
// Mirrors the data shape consumed by sports/nfl/live.js and falls back
// between ESPN's site.api and site.web.api hosts.

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100";
const SUMMARY = (id: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(id)}`;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "cache-control": "public, max-age=1, s-maxage=1",
  "content-type": "application/json; charset=utf-8",
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const norm = (t: unknown) =>
  ({
    LAR: "LA",
    JAC: "JAX",
    WAS: "WSH",
    OAK: "LV",
    SD: "LAC",
    STL: "LA",
  } as Record<string, string>)[String(t ?? "").toUpperCase()] ||
  String(t ?? "").toUpperCase();

async function json(url: string) {
  const urls = [url];
  if (url.includes("://site.api.espn.com/")) {
    urls.push(url.replace("://site.api.espn.com/", "://site.web.api.espn.com/"));
  }
  let last: unknown = null;
  for (const candidate of urls) {
    try {
      const r = await fetch(candidate, {
        headers: {
          "user-agent": "okhttp/4.12.0",
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
        },
      });
      if (r.ok) return await r.json();
      last = new Error(`${r.status} ${r.statusText} ${candidate}`);
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("ESPN request failed");
}

function clockMin(display: unknown) {
  if (!display) return null;
  const z = String(display).split(":");
  if (z.length === 2) return Number(z[0]) + Number(z[1]) / 60;
  return n(display);
}
function competitor(c: any, side: string) {
  return (c?.competitors || []).find((x: any) => x.homeAway === side) || null;
}

// Preserve ESPN's exact per-play start/end coordinates. These are the source of
// truth for the Gamecast pre-snap LOS and completed-play ending spot.
function play(p: any) {
  const s = p?.start || {};
  const e = p?.end || {};
  return {
    id: String(p?.id ?? p?.sequenceNumber ?? ""),
    text: p?.text || p?.shortText || "",
    shortText: p?.shortText || null,
    period: n(p?.period?.number ?? p?.period),
    clock: p?.clock?.displayValue || p?.displayClock || null,
    down: n(s.down),
    distance: n(s.distance),
    downDistanceText: s.shortDownDistanceText || p?.shortDownDistanceText || null,
    yardLine: n(s.yardLine),
    startDown: n(s.down),
    startDistance: n(s.distance),
    startYardLine: n(s.yardLine),
    startYardsToEndzone: n(s.yardsToEndzone),
    startPossessionText: s.possessionText || s.shortDownDistanceText || null,
    startTeam: norm(s.team?.abbreviation || p?.team?.abbreviation || ""),
    endDown: n(e.down),
    endDistance: n(e.distance),
    endYardLine: n(e.yardLine),
    endYardsToEndzone: n(e.yardsToEndzone),
    endPossessionText: e.possessionText || e.shortDownDistanceText || null,
    endTeam: norm(e.team?.abbreviation || ""),
    team: norm(p?.team?.abbreviation || s.team?.abbreviation || ""),
    scoring: !!p?.scoringPlay,
    type: p?.type?.text || p?.type?.abbreviation || null,
    homeScore: n(p?.homeScore),
    awayScore: n(p?.awayScore),
  };
}

function base(event: any) {
  const c = event?.competitions?.[0];
  if (!c) return null;
  const h = competitor(c, "home");
  const a = competitor(c, "away");
  if (!h || !a) return null;

  const s = c.status || event.status || {};
  const t = s.type || {};
  const sit = c.situation || {};
  const possId = sit.possession != null ? String(sit.possession) : null;

  let possession: "home" | "away" | null = null;
  if (possId === String(h.team?.id)) possession = "home";
  else if (possId === String(a.team?.id)) possession = "away";

  let yardFromOwn = null;
  let isRedZone = !!sit.isRedZone;
  const bl = sit.ballLocation;
  if (bl && Number.isFinite(Number(bl.yardLine)) && bl.team?.id != null && possId) {
    const own = String(bl.team.id) === possId;
    yardFromOwn = own ? Number(bl.yardLine) : 100 - Number(bl.yardLine);
    if (!own) isRedZone = yardFromOwn >= 80;
  }

  return {
    status: t.state || "pre",
    statusDetail: t.shortDetail || t.detail || null,
    period: n(s.period) || 0,
    clockMin: clockMin(s.displayClock || s.shortClock),
    awayScore: n(a.score),
    homeScore: n(h.score),
    awayAbbr: norm(a.team?.abbreviation),
    homeAbbr: norm(h.team?.abbreviation),
    possession,
    yardFromOwn,
    isRedZone,
    down: n(sit.down),
    distance: n(sit.distance),
    downDistanceText:
      sit.shortDownDistanceText || sit.downDistanceText || sit.possessionText || null,
    lastPlayText: sit.lastPlay?.text || sit.lastPlay?.shortText || null,
    linescores: {
      away: (a.linescores || []).map((x: any) => n(x.value ?? x.displayValue)),
      home: (h.linescores || []).map((x: any) => n(x.value ?? x.displayValue)),
    },
  };
}

function recent(summary: any) {
  const out: any[] = [];
  const d = summary?.drives || {};
  for (const dr of d.previous || []) for (const p of dr.plays || []) out.push(play(p));
  if (d.current) for (const p of d.current.plays || []) out.push(play(p));
  if (!out.length && Array.isArray(summary?.plays)) {
    for (const p of summary.plays) out.push(play(p));
  }
  return out.filter((x) => x.text).slice(-30);
}

function currentDrive(summary: any) {
  const d = summary?.drives || {};
  const prev = d.previous || [];
  const dr = d.current || prev[prev.length - 1];
  if (!dr) return null;
  return {
    id: String(dr.id ?? dr.sequenceNumber ?? ""),
    team: norm(dr.team?.abbreviation || ""),
    description: dr.description || dr.displayResult || null,
    result: dr.displayResult || dr.result || null,
    playCount: n(dr.offensivePlays) ?? (dr.plays || []).length,
    yards: n(dr.yards),
    elapsedDisplay: dr.timeElapsed?.displayValue || dr.timeElapsed || null,
    startText: dr.start?.text || dr.start?.shortText || null,
    endText: dr.end?.text || dr.end?.shortText || null,
    plays: (dr.plays || []).map(play).filter((x: any) => x.text),
  };
}

function latestWinProbability(summary: any) {
  const rows = Array.isArray(summary?.winprobability) ? summary.winprobability : [];
  const last = rows.at(-1);
  const home = n(last?.homeWinPercentage);
  if (home == null) return null;
  const h = home > 1 ? home / 100 : home;
  return { home: h, away: Math.max(0, 1 - h), tie: n(last?.tiePercentage) };
}

function playerStats(summary: any) {
  const out: any = { byId: {}, byName: {} };
  for (const tb of summary?.boxscore?.players || []) {
    const team = norm(tb?.team?.abbreviation || "");
    for (const cat of tb.statistics || []) {
      const labels = cat.labels || cat.descriptions || cat.keys || [];
      const lower = labels.map((x: unknown) => String(x).toLowerCase());
      for (const row of cat.athletes || []) {
        const a = row.athlete || {};
        const stats = row.stats || row.statistics || [];
        const key = String(a.id || "");
        const obj = out.byId[key] || {
          id: a.id ? String(a.id) : null,
          name: a.displayName || a.fullName || a.shortName || "",
          team,
          position: a.position?.abbreviation || "",
          jersey: a.jersey || null,
          headshot: a.headshot?.href || null,
          categories: {},
          flat: {},
        };
        obj.team = team || obj.team;
        obj.categories[cat.name || cat.type || "stats"] = {};
        labels.forEach((label: unknown, i: number) => {
          obj.categories[cat.name || cat.type || "stats"][String(label)] = stats[i] ?? null;
        });
        const val = (names: string[], idx?: number) => {
          for (const name of names) {
            const j = lower.findIndex((x: string) => x === name || x.includes(name));
            if (j >= 0) return stats[j] ?? null;
          }
          return idx != null ? stats[idx] ?? null : null;
        };
        if (cat.name === "rushing") {
          obj.flat.carries = val(["car", "rushing attempts", "att"], 0);
          obj.flat.rushYds = val(["yds", "rushing yards"], 1);
          obj.flat.rushTds = val(["td", "rushing touchdowns"], 3);
        } else if (cat.name === "receiving") {
          obj.flat.receptions = val(["rec", "receptions"], 0);
          obj.flat.targets = val(["tgts", "targets"], 1);
          obj.flat.recYds = val(["yds", "receiving yards"], 2);
          obj.flat.recTds = val(["td", "receiving touchdowns"], 4);
        } else if (cat.name === "passing") {
          obj.flat.compAtt = val(["c/att", "comp/att", "completions/attempts"], 0);
          obj.flat.passYds = val(["yds", "passing yards"], 1);
          obj.flat.passTds = val(["td", "passing touchdowns"], 3);
          obj.flat.interceptions = val(["int", "interceptions"], 4);
        }
        if (obj.id) out.byId[obj.id] = obj;
        if (obj.name) out.byName[`${team}|${obj.name.toLowerCase()}`] = obj;
      }
    }
  }
  return out;
}

function fullBoxScore(summary: any) {
  const teams: Record<string, any> = {};
  for (const tb of summary?.boxscore?.players || []) {
    const t = tb?.team || {};
    const abbr = norm(t.abbreviation || "");
    if (!abbr) continue;
    const sections = [];
    for (const cat of tb.statistics || []) {
      const labels = (cat.labels || cat.descriptions || cat.keys || []).map((x: unknown) => String(x));
      const rows = (cat.athletes || []).map((row: any) => {
        const a = row.athlete || {};
        return {
          id: a.id ? String(a.id) : null,
          name: a.displayName || a.fullName || a.shortName || "Player",
          jersey: a.jersey || null,
          position: a.position?.abbreviation || null,
          headshot: a.headshot?.href || null,
          stats: Array.isArray(row.stats) ? row.stats : Array.isArray(row.statistics) ? row.statistics : [],
        };
      });
      sections.push({
        name: cat.name || cat.type || "statistics",
        displayName: cat.displayName || cat.label || cat.name || cat.type || "Statistics",
        labels,
        rows,
        totals: Array.isArray(cat.totals) ? cat.totals : [],
      });
    }
    teams[abbr] = {
      team: {
        id: t.id ? String(t.id) : null,
        abbr,
        name: t.displayName || t.shortDisplayName || t.name || abbr,
        logo: t.logo || null,
      },
      sections,
    };
  }
  return { teams };
}

function teamStats(summary: any) {
  const out: Record<string, any> = {};
  for (const tb of summary?.boxscore?.teams || []) {
    const abbr = norm(tb?.team?.abbreviation || "");
    if (!abbr) continue;
    const s: Record<string, unknown> = {};
    for (const x of tb.statistics || []) s[x.name || x.label] = x.displayValue ?? x.value ?? null;
    out[abbr] = {
      totalYards: s.totalYards ?? s["Total Yards"] ?? null,
      passingYards: s.netPassingYards ?? s.passingYards ?? null,
      rushingYards: s.rushingYards ?? null,
      turnovers: s.turnovers ?? null,
      firstDowns: s.firstDowns ?? null,
      timeOfPossession: s.possessionTime ?? s.timeOfPossession ?? null,
      thirdDownEff: s.thirdDownEff ?? null,
    };
  }
  return out;
}

function scoringPlays(summary: any) {
  return (summary?.scoringPlays || []).map((p: any) => ({
    id: String(p.id ?? ""),
    text: p.text || p.shortText || "",
    period: n(p.period?.number ?? p.period),
    clock: p.clock?.displayValue || null,
    team: norm(p.team?.abbreviation || ""),
    homeScore: n(p.homeScore),
    awayScore: n(p.awayScore),
    type: p.type?.text || null,
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "GET only" }), { status: 405, headers: CORS });
  }

  try {
    const board = await json(SCOREBOARD);
    const games: Record<string, any> = {};

    await Promise.all(
      (board?.events || []).map(async (event: any) => {
        const id = String(event?.id || "");
        let g: any = base(event);
        if (!id || !g) return;

        if (g.status === "in" || g.status === "post") {
          try {
            const summary = await json(SUMMARY(id));
            const plays = recent(summary);
            g = {
              ...g,
              currentDrive: currentDrive(summary),
              winProbability: latestWinProbability(summary),
              plays,
              playerStats: playerStats(summary),
              boxScore: fullBoxScore(summary),
              teamStats: teamStats(summary),
              scoringPlays: scoringPlays(summary),
              lastPlayText: plays.at(-1)?.text || g.lastPlayText,
            };
          } catch (err) {
            g.summaryError = String((err as Error)?.message || err);
          }
        }

        g.lastFetchedAt = Date.now();
        games[id] = g;
      }),
    );

    return new Response(
      JSON.stringify({
        schemaVersion: 5,
        lastFetchedAt: Date.now(),
        generatedAt: new Date().toISOString(),
        games,
      }),
      { status: 200, headers: CORS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err), games: {} }),
      { status: 502, headers: CORS },
    );
  }
});
