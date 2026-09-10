TSO v88.5b — NFL Demo Gamecast Ordering Hotfix

Root cause:
The v88.5a demo hydrator ran before the normal nfl.json mapping finished. The normal mapping then replaced state.data, erasing the forced live demo game. The real live poller could also overwrite the demo state.

Fix:
- build canonical preview games/players first
- hydrate ?nflDemo=gamecast second
- disable real live polling while any nflDemo mode is active
- cache-bust index -> router -> nfl-preview -> demo/playstage to v88.5b

Expected result:
https://thesportsoutpost.com/?nflDemo=gamecast opens directly into the forced live Gamecast instead of showing no live game.
