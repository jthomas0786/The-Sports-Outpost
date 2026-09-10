TSO v88.5a — Demo Gamecast + NFL Odds Refresh Hotfix

Fixes two issues:

1) ?nflDemo=gamecast stopped behaving like a live game after the production Gamecast standardized on ESPN-style status='in' and liveScore fields. The demo fixture now writes the same shapes the real Gamecast uses and the v88.5 PlayStage gets a compatibility-normalized live object.

2) ParlayAPI now returns HTTP 400 UNKNOWN_BOOKMAKER when the bookmakers parameter contains stale aliases. The NFL weekly refresh had stale keys such as parxcasino, hardrockbet, betriversca, sportsbetau and espnbet. v88.5a narrows the paid request to currently documented sportsbook keys while retaining TSO's local sportsbook-only filtering.

After deploy:
- https://thesportsoutpost.com/?nflDemo=gamecast should open a forced live NE @ SEA demo Gamecast.
- manually rerun the NFL Odds Refresh GitHub Action with force=true.
