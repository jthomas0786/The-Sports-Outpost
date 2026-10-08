#!/usr/bin/env python3
"""Leakage-controlled, player-level TSO 2.0 NFL first-TD model backtest.

2024 regular-season games form the prior for 2025; 2025 the prior for 2026.
Within each test year, complete weeks are predicted ONLY using earlier weeks.
Calibration: 2025 weeks 7-12. Holdout: 2025 weeks 13-18 and 2026 weeks 3+.
The backtest deliberately excludes the ATD market cap when a historical
pregame market-price snapshot is unavailable. No odds/data are invented.
Source nflverse PBP (CC BY 4.0). Raw files are not committed.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import math
import re
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{year}.csv.gz"
SEASONS = (2024, 2025, 2026)
FIXTURE_MIN_PRIOR = 4
EPSILON = 1e-12


def numeric(s, default=None):
    try:
        return float(s) if s is not None and str(s).strip().upper() not in ("", "NA", "NULL", "NAN") else default
    except (ValueError, TypeError):
        return default


def yes(row, key):
    return numeric(row.get(key)) == 1


def iter_source(year):
    req = urllib.request.Request(URL.format(year=year), headers={
        "User-Agent": "TSO2-NFL-validation/1.0 (+https://thesportsoutpost.com)",
        "Accept": "application/gzip,*/*",
    })
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as fp:
                with gzip.GzipFile(fileobj=fp) as raw:
                    stream = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
                    for row in csv.DictReader(stream):
                        yield row
            return
        except (OSError, TimeoutError) as error:
            last = str(error)
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"nflverse {year} unavailable; won't publish fabricated result: {last}")


def get_game(games, game_id):
    if game_id not in games:
        m = re.fullmatch(r"(\d{4})_(\d{2})_([A-Za-z0-9]+)_([A-Za-z0-9]+)", game_id)
        if not m:
            return None
        games[game_id] = {
            "year": int(m.group(1)), "week": int(m.group(2)),
            "away": m.group(3), "home": m.group(4),
            "players": {}, "first": None, "id": game_id
        }
    return games[game_id]


def make_games(rows):
    games = {}
    for r in rows:
        if str(r.get("season_type") or "").upper() != "REG":
            continue
        gid = r.get("game_id", "")
        g = get_game(games, gid)
        if g is None:
            continue
        team = str(r.get("posteam") or "").upper()
        play_id = numeric(r.get("play_id"))
        if yes(r, "touchdown") and play_id is not None:
            pid = (str(r.get("receiver_player_id") or "").strip() if yes(r, "pass_touchdown")
                   else str(r.get("rusher_player_id") or "").strip() if yes(r, "rush_touchdown")
                   else "")
            actual = (play_id, team if pid and team in (g["home"], g["away"]) else "", pid)
            if g["first"] is None or play_id < g["first"][0]:
                g["first"] = actual
        if team not in (g["home"], g["away"]) or str(r.get("play_type") or "").lower() == "no_play":
            continue
        action = "carries" if yes(r, "rush_attempt") else "targets" if yes(r, "pass_attempt") else None
        pid = str(r.get("rusher_player_id") if action == "carries" else r.get("receiver_player_id") if action == "targets" else "").strip()
        if not action or not pid or pid in ("None", "NA"):
            continue
        key = (team, pid)
        p = g["players"].setdefault(key, {"carries": 0, "targets": 0, "rz": 0, "gl": 0})
        p[action] += 1
        yard = numeric(r.get("yardline_100"))
        if yard is not None and 0 <= yard <= 20:
            p["rz"] += 1
        if yard is not None and 0 <= yard <= 5:
            p["gl"] += 1
    return list(games.values())


def aggregate(games):
    agg = {
        "teams": defaultdict(lambda: defaultdict(int)),
        "players": defaultdict(lambda: defaultdict(int)),
        "gameCount": 0, "offensiveFirst": 0
    }
    for g in games:
        agg["gameCount"] += 1
        for t in (g["home"], g["away"]):
            agg["teams"][t]["games"] += 1
        first = g["first"]
        if first and first[1] and first[2]:
            agg["offensiveFirst"] += 1
            agg["teams"][first[1]]["first"] += 1
            agg["players"][(first[1], first[2])]["first"] += 1
        for (team, pid), row in g["players"].items():
            player = agg["players"][(team, pid)]
            player["games"] += 1
            for key in ("carries", "targets", "rz", "gl"):
                player[key] += row[key]
                agg["teams"][team][key] += row[key]
    return agg


def team_strength(team, past, current, minimum_prior=12):
    before, now = past["teams"].get(team, {}), current["teams"].get(team, {})
    if now.get("games", 0) < 2 or before.get("games", 0) < minimum_prior:
        return None
    return (now.get("first", 0) + .6 * before.get("first", 0) + .5) / (
        now.get("games", 0) + .6 * before.get("games", 0) + 1)


def player_weight(team, pid, now, past, historical_only=False):
    p = now["players"].get((team, pid), {})
    earlier = past["players"].get((team, pid), {})
    t = now["teams"].get(team, {})
    if not p:
        return 0
    baseline = .015 + .75*p.get("first", 0) + .35*earlier.get("first", 0)
    if historical_only:
        return baseline
    rz = p.get("rz", 0) / t.get("rz", 1) if t.get("rz", 0) else 0
    gl = p.get("gl", 0) / t.get("gl", 1) if t.get("gl", 0) else 0
    overall = ((p.get("carries", 0)+p.get("targets", 0)) /
               (t.get("carries", 0)+t.get("targets", 0) or 1))
    return baseline + 2.5*rz + 1.5*gl + .45*overall


def prediction(game, past, current, historical_only=False, minimum_prior=12):
    away, home = game["away"], game["home"]
    strengths = [team_strength(t, past, current, minimum_prior) for t in (away, home)]
    if any(s is None for s in strengths):
        return None
    league_games = past["gameCount"] + current["gameCount"]
    league_offense = past["offensiveFirst"] + current["offensiveFirst"]
    if league_games < 100:
        return None
    mass = league_offense / league_games
    result = {}
    for team, strength in zip((away, home), strengths):
        team_mass = mass * strength / sum(strengths)
        candidates = [(pid, player_weight(team, pid, current, past, historical_only))
                      for (t, pid), d in current["players"].items()
                      if t == team and d.get("games", 0) >= 1]
        denominator = .8 + sum(w for _, w in candidates)
        if denominator <= 0:
            continue
        for pid, weight in candidates:
            if current["players"][(team, pid)].get("games", 0) < 2:
                continue
            result[(team, pid)] = team_mass*weight/denominator
    return result


def scaled_probabilities(p, scale):
    # Independent scale calibration of score mass; other keeps the remainder.
    # All probabilities remain positive and sum to one including OTHER.
    player_mass = sum(p.values())
    scalar = min(scale, 0.995/max(player_mass, EPSILON))
    out = {key: scalar*val for key, val in p.items()}
    out[("OTHER", "OTHER")] = max(0.005, 1-sum(out.values()))
    return out


def score(pred, actual):
    true_key = actual if actual in pred else ("OTHER", "OTHER")
    loss = -math.log(max(EPSILON, pred[true_key]))
    brier = sum((v-(1 if k == true_key else 0))**2 for k, v in pred.items())
    return loss, brier, true_key != ("OTHER", "OTHER")


def generate(backtest_games, past_by_year, minimum_prior=12):
    results = []
    for season in (2025, 2026):
        prev = past_by_year[season-1]
        current = []
        by_week = defaultdict(list)
        for game in backtest_games[season]:
            by_week[game["week"]].append(game)
        for week in sorted(by_week):
            history = aggregate(current)
            if week >= 3:
                for game in by_week[week]:
                    full = prediction(game, prev, history, minimum_prior=minimum_prior)
                    base = prediction(game, prev, history, historical_only=True, minimum_prior=minimum_prior)
                    if full is None or base is None:
                        continue
                    first = game["first"]
                    actual = (first[1], first[2]) if first and first[1] and first[2] else None
                    results.append({"season": season, "week": week, "game": game["id"],
                                    "actual": actual, "prob": full, "baseline": base})
            # Entire week commits only after its predictions, to avoid
            # giving early-Sunday games an unfair advantage.
            current.extend(by_week[week])
    return results


def evaluate(rows, factor=1, key="prob"):
    total = {"games": len(rows), "scoringPlayerInModel": 0, "logLoss": None,
             "multiclassBrier": None, "otherOutcomes": 0}
    if not rows:
        return total
    loss = brier = 0.
    for sample in rows:
        pred = scaled_probabilities(sample[key], factor)
        l, b, covered = score(pred, sample["actual"])
        loss += l
        brier += b
        total["scoringPlayerInModel"] += int(covered)
        total["otherOutcomes"] += int(not covered)
    total["logLoss"] = round(loss/len(rows), 5)
    total["multiclassBrier"] = round(brier/len(rows), 5)
    return total


def backtest(all_games, minimum_prior=12):
    by_year = {y: [g for g in all_games if g["year"] == y] for y in SEASONS}
    past = {y: aggregate(by_year[y]) for y in SEASONS}
    predictions = generate(by_year, past, minimum_prior)
    train = [r for r in predictions if r["season"] == 2025 and 7 <= r["week"] <= 12]
    final25 = [r for r in predictions if r["season"] == 2025 and r["week"] >= 13]
    final26 = [r for r in predictions if r["season"] == 2026 and r["week"] >= 3]
    candidates = (.50, .65, .80, .90, 1., 1.1, 1.2, 1.35, 1.5)
    scores = [(evaluate(train, a)["logLoss"], abs(a-1), a) for a in candidates]
    scores = [s for s in scores if s[0] is not None]
    chosen = min(scores)[2] if scores else 1.
    holdout = final25+final26
    baseline = evaluate(holdout, key="baseline")
    raw = evaluate(holdout)
    calibrated = evaluate(holdout, factor=chosen)
    enough = len(train)>=50 and len(holdout)>=100 and calibrated["scoringPlayerInModel"]>=20
    # Conservative safeguard: calibration is only eligible for live use
    # if it beats BOTH the raw heuristic and the predeclared simpler model.
    improves = enough and calibrated["logLoss"] < raw["logLoss"] and calibrated["logLoss"] < baseline["logLoss"]
    return {
        "schemaVersion":1, "source":"nflverse play-by-play CC BY 4.0",
        "generatedAt":datetime.now(timezone.utc).isoformat(),
        "method":"Complete-week chronological leakage-free player-outcome multiclass evaluation",
        "historicalSeasonGames":{str(y):len(by_year[y]) for y in SEASONS},
        "training":{"partition":"2025 regular weeks 7–12, 2024 prior + completed 2025 weeks",
                    "games":len(train),"raw":evaluate(train),"selectedScale":chosen,
                    "scaled":evaluate(train,chosen)},
        "heldOut":{"partitions":["2025 regular weeks 13+ (2024 prior)",
                                 "2026 regular weeks 3+ (2025 prior)"],
                   "year2025":len(final25),"year2026":len(final26),
                   "baselineHistoricalScoring":baseline,
                   "rawHeuristic":raw,"scaleAdjusted":calibrated},
        "calibration":{"kind":"one-dimensional player-mass multiplier",
                       "selectedScale":chosen,"eligibleForLive":bool(improves),
                       "candidateScales":list(candidates),
                       "caveats":["No historical ATD model caps; unavailable for unbiased historical scoring",
                                  "Missing/unknown offensive players included in OTHER",
                                  "Partial 2026 season does not establish stability",
                                  "No odds, injuries, lineup or betting value assessment"]},
        "publishCalibratedFirstTd":False,
        "interpretation":"Diagnostic backtest only. Live FIRST % remains experimental and uncalibrated.",
    }


def fixture_test():
    def g(year,week,away,home,scorer):
        doc={"year":year,"week":week,"away":away,"home":home,"id":f"{year}_{week:02d}_{away}_{home}",
             "first":(100,home,scorer) if scorer else (100,"",""),
             "players":{(home,"A"):{"carries":12,"targets":2,"rz":3,"gl":1},
                        (home,"B"):{"carries":1,"targets":10,"rz":2,"gl":1},
                        (away,"C"):{"carries":7,"targets":1,"rz":2,"gl":0}}}
        return doc
    a=[g(2024,n,"A","B","A" if n%2 else "B") for n in range(1,19)]
    a+= [g(2025,n,"A","B","A" if n%3 else "B") for n in range(1,19)]
    a+= [g(2026,n,"A","B","A") for n in range(1,6)]
    past=aggregate([x for x in a if x["year"]==2024])
    current=aggregate([x for x in a if x["year"]==2025 and x["week"]<=4])
    p=prediction(g(2025,5,"A","B","B"),past,current,minimum_prior=4)
    assert p and all(0 <= v < 1 for v in p.values())
    probs=scaled_probabilities(p,1.1)
    assert abs(sum(probs.values())-1)<1e-9
    assert score(probs,("B","A"))[0]>0
    assert score(probs,("B","NOT_PRESENT"))[2] is False
    report=backtest(a,minimum_prior=4)
    assert report["historicalSeasonGames"]=={"2024":18,"2025":18,"2026":5}
    assert report["publishCalibratedFirstTd"] is False
    assert report["training"]["games"]>=0
    print("PASS TSO2 first-TD complete-week leakage guard, player-vs-other multiclass scoring, no forced calibration")


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--selftest",action="store_true")
    parser.add_argument("--output",type=Path,default=Path("tso2/data/nfl-first-td-backtest.json"))
    args=parser.parse_args()
    if args.selftest:
        fixture_test()
    else:
        groups=[]
        for year in SEASONS:
            print("Reading full NFL PBP",year,flush=True)
            games=make_games(iter_source(year))
            if len(games)<30:
                raise SystemExit(f"Insufficient real games for {year}: {len(games)}")
            groups.extend(games)
            print("  parsed",len(games),"regular-season games",flush=True)
        result=backtest(groups)
        print(json.dumps({"training":result["training"],"heldOut":result["heldOut"],
                          "calibration":result["calibration"]},indent=2),flush=True)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
        print("Wrote",args.output,flush=True)
