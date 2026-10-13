#!/usr/bin/env python3
"""TSO 2.0 NFL touchdown situation data from nflverse PBP.

Builds compact, audited player situational shares; does NOT infer scoring
probabilities, sportsbook prices, or another service's proprietary metrics.

Source: https://github.com/nflverse/nflverse-data/releases/tag/pbp
License: nflverse CC BY 4.0 (attribution kept in output).
Standard-library only. Explicitly isolated from TSO 1.0 / main.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

DATA_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz"
SOURCE = "nflverse / nflfastR play-by-play (CC BY 4.0)"
REQUIRED = {
    "game_id", "season_type", "posteam", "play_id", "yardline_100",
    "rush_attempt", "pass_attempt", "rusher_player_id",
    "receiver_player_id", "touchdown", "pass_touchdown",
    "rush_touchdown"
}


def value(row, key):
    try:
        s = row.get(key)
        if s is None or str(s).strip().upper() in ("", "NA", "NAN", "NULL"):
            return None
        return float(s)
    except (ValueError, TypeError):
        return None


def enabled(row, key):
    return value(row, key) == 1


def ratio(numerator, denominator):
    if not denominator:
        return None
    return round(100 * numerator / denominator, 1)


def season_data(rows):
    teams = defaultdict(lambda: defaultdict(int))
    players = defaultdict(lambda: defaultdict(int))
    names = {}
    player_teams = defaultdict(set)
    first_tds = {}  # earliest touchdown play, including defensive/ST scores
    games = set()
    rows_scanned = 0
    for row in rows:
        if row.get("season_type", "").strip().upper() != "REG":
            continue
        game_id = row.get("game_id", "").strip()
        if not game_id:
            continue
        rows_scanned += 1
        games.add(game_id)
        play_id = value(row, "play_id")
        team = (row.get("posteam") or "").strip().upper()
        position = value(row, "yardline_100")
        red_zone = position is not None and 0 <= position <= 20
        goal_line = position is not None and 0 <= position <= 5

        rush = enabled(row, "rush_attempt") and bool(row.get("rusher_player_id"))
        target = enabled(row, "pass_attempt") and bool(row.get("receiver_player_id"))
        # Do not count penalty-cancelled/no-play attempts.
        if str(row.get("play_type") or "").lower() == "no_play":
            rush = target = False

        if team and (rush or target):
            if rush:
                player_id = row["rusher_player_id"]
                name = row.get("rusher_player_name", "")
                action = "carries"
            else:
                player_id = row["receiver_player_id"]
                name = row.get("receiver_player_name", "")
                action = "targets"
            player_id = player_id.strip()
            if player_id:
                player_teams[player_id].add(team)
                if name:
                    names[player_id] = name
                players[player_id][action] += 1
                teams[team][action] += 1
                if red_zone:
                    players[player_id]["redZoneOpps"] += 1
                    teams[team]["redZoneOpps"] += 1
                if goal_line:
                    players[player_id]["goalLineOpps"] += 1
                    teams[team]["goalLineOpps"] += 1
                players[player_id]["games."+game_id] = 1

        if enabled(row, "touchdown") and play_id is not None:
            scorer = None
            if enabled(row, "pass_touchdown"):
                scorer = (row.get("receiver_player_id") or "").strip() or None
            elif enabled(row, "rush_touchdown"):
                scorer = (row.get("rusher_player_id") or "").strip() or None
            # The first TD can be defensive or special teams. It still counts
            # as the game's first TD even if no offensive scorer was credited.
            previous = first_tds.get(game_id)
            if previous is None or play_id < previous[0]:
                first_tds[game_id] = (play_id, scorer, team if scorer else None)
            if scorer and red_zone and team:
                players[scorer]["redZoneTds"] += 1
                player_teams[scorer].add(team)

    for game_id in games:
        parts = game_id.split("_")
        if len(parts) >= 4:
            away, home = parts[2], parts[3]
            if away and home and away != home:
                teams[away]["gamesPlayed"] += 1
                teams[home]["gamesPlayed"] += 1

    first_offense_count = 0
    for _, scorer, team in first_tds.values():
        if scorer:
            players[scorer]["firstTdGames"] += 1
            first_offense_count += 1
            if team:
                teams[team]["firstTdOffenseGames"] += 1

    by_player = {}
    for player_id, p in players.items():
        counts = {k: int(v) for k, v in p.items() if not k.startswith("games.")}
        involved = sorted(player_teams[player_id])
        # Season team splits matter for traded players. Never divide by one
        # team's totals if a player played on multiple teams.
        one_team = involved[0] if len(involved) == 1 else None
        t = teams[one_team] if one_team else {}
        denominator = counts.get("redZoneOpps", 0)
        by_player[player_id] = {
            "name": names.get(player_id) or None,
            "team": one_team,
            "teams": involved,
            "gamesWithOpportunities": sum(1 for k in p if k.startswith("games.")),
            "firstTdGames": counts.get("firstTdGames", 0),
            "carries": counts.get("carries", 0),
            "targets": counts.get("targets", 0),
            "redZoneOpps": denominator,
            "goalLineOpps": counts.get("goalLineOpps", 0),
            "redZoneTds": counts.get("redZoneTds", 0),
            "carrySharePct": ratio(counts.get("carries", 0), t.get("carries", 0)),
            "targetSharePct": ratio(counts.get("targets", 0), t.get("targets", 0)),
            "redZoneSharePct": ratio(denominator, t.get("redZoneOpps", 0)),
            "goalLineSharePct": ratio(counts.get("goalLineOpps", 0), t.get("goalLineOpps", 0)),
            "redZoneTdYieldPct": ratio(counts.get("redZoneTds", 0), denominator),
        }

    return {
        "gamesScanned": len(games), "regularSeasonPlaysScanned": rows_scanned,
        "offensiveFirstTdGames": first_offense_count,
        "playerCount": len(by_player),
        "teams": {team: dict(row) for team, row in sorted(teams.items())},
        "players": by_player,
    }


def read_csv(url):
    headers = {"User-Agent": "TheSportsOutpost/2.0 (+https://thesportsoutpost.com)",
               "Accept": "application/gzip,text/csv,*/*"}
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=65) as source:
                with gzip.GzipFile(fileobj=source) as raw:
                    with io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as stream:
                        reader = csv.DictReader(stream)
                        missing = REQUIRED - set(reader.fieldnames or [])
                        if missing:
                            raise ValueError("Missing required nflverse columns: " + ", ".join(sorted(missing)))
                        yield from reader
                        return
        except (OSError, TimeoutError, ValueError) as exc:
            last = exc
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Unable to retrieve verified play-by-play from {url}: {last}")


def build(seasons, output):
    data = {
        "schemaVersion": 1,
        "source": SOURCE,
        "license": "CC BY 4.0",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "definitions": {
            "firstTdGames": "Games in which this player scored the first touchdown of the game (regular season only). Defensive or return TDs are not attributed to an offensive player.",
            "carrySharePct": "Player carries divided by his single team's total carries for the regular season.",
            "targetSharePct": "Player targeted pass attempts divided by his single team's targeted pass attempts for the regular season.",
            "redZoneSharePct": "Player carries plus targets from at or inside opponent 20 divided by his team's equivalent opportunities.",
            "goalLineSharePct": "Player carries plus targets from at or inside opponent 5 divided by his team's equivalent opportunities.",
            "redZoneTdYieldPct": "Player rush/receiving touchdowns on plays at or inside opponent 20 divided by his carries plus targets in that zone."
        },
        "seasons": {},
    }
    for season in seasons:
        url = DATA_URL.format(season=season)
        print(f"Reading nflverse NFL {season} PBP: {url}", flush=True)
        current = season_data(read_csv(url))
        # Do not publish an empty or obviously incomplete season.
        if current["gamesScanned"] < 10 or current["playerCount"] < 100:
            raise ValueError(f"Unusable {season} source ({current['gamesScanned']} games, {current['playerCount']} players)")
        data["seasons"][str(season)] = {**current, "season": season, "url": url}
        print(f"  {season}: {current['gamesScanned']} games, {current['playerCount']} players", flush=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {output} ({output.stat().st_size} bytes)", flush=True)


def fixture_test():
    cols = ["game_id", "season_type", "play_id", "posteam", "yardline_100",
            "rush_attempt", "pass_attempt", "rusher_player_id", "receiver_player_id",
            "rusher_player_name", "receiver_player_name", "touchdown",
            "pass_touchdown", "rush_touchdown", "play_type"]
    data = [
        dict(game_id="G1", season_type="REG", play_id="1", posteam="DAL", yardline_100="25",
             rush_attempt="1", rusher_player_id="A", rusher_player_name="Player A"),
        dict(game_id="G1", season_type="REG", play_id="2", posteam="DAL", yardline_100="4",
             rush_attempt="1", rusher_player_id="A", rusher_player_name="Player A",
             touchdown="1", rush_touchdown="1"),
        dict(game_id="G1", season_type="REG", play_id="3", posteam="DAL", yardline_100="12",
             pass_attempt="1", receiver_player_id="B", receiver_player_name="Player B",
             touchdown="1", pass_touchdown="1"),
        dict(game_id="G2", season_type="REG", play_id="1", posteam="DAL", yardline_100="3",
             rush_attempt="1", rusher_player_id="A", touchdown="1", rush_touchdown="1"),
        dict(game_id="G2", season_type="REG", play_id="2", posteam="DAL", yardline_100="2",
             pass_attempt="1", receiver_player_id="B", touchdown="1", pass_touchdown="1"),
        dict(game_id="G3", season_type="REG", play_id="1", posteam="DAL", yardline_100="5",
             pass_attempt="1", receiver_player_id="B"),
        dict(game_id="G3", season_type="REG", play_id="2", posteam="DAL", yardline_100="6",
             pass_attempt="1", receiver_player_id="B"),
        dict(game_id="G4", season_type="POST", play_id="1", posteam="DAL", yardline_100="4",
             rush_attempt="1", rusher_player_id="A", touchdown="1", rush_touchdown="1"),
        dict(game_id="G5", season_type="REG", play_id="1", posteam="DAL", yardline_100="4",
             rush_attempt="1", rusher_player_id="A", play_type="no_play")
    ]
    complete = [{k: r.get(k, "") for k in cols} for r in data]
    result = season_data(complete)
    a, b = result["players"]["A"], result["players"]["B"]
    assert a["firstTdGames"] == 2, a
    assert b["firstTdGames"] == 0, b
    assert a["carries"] == 3 and b["targets"] == 4
    assert a["goalLineOpps"] == 2 and b["goalLineOpps"] == 2
    assert a["redZoneTds"] == 2 and b["redZoneTds"] == 2
    assert a["carrySharePct"] == 100
    assert b["targetSharePct"] == 100
    assert a["redZoneTdYieldPct"] == 100
    assert b["redZoneTdYieldPct"] == 50
    assert result["gamesScanned"] == 4
    assert result["offensiveFirstTdGames"] == 2
    assert result["teams"]["DAL"]["firstTdOffenseGames"] == 2
    print("PASS NFL PBP touchdown first-score, carry, target, red-zone, goal-line, cancelled-play, postseason exclusions")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("tso2/data/nfl-td-opportunities.json"))
    parser.add_argument("--seasons", type=int, nargs="+", default=[2025, 2026])
    args = parser.parse_args()
    if args.selftest:
        fixture_test()
    else:
        build(args.seasons, args.output)
