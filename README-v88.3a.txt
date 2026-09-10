TSO v88.3a — Corrective NFL Gamecast + TD Feed Hotfix
=====================================================

This corrects the v88.3 implementation after live-site review.

Fixes
-----
1. Removes the globally-mounted Current Drive panel that was appearing on NFL
   Live, TD Feed, Props, and other screens.
2. Replaces the ORIGINAL Game View field itself with the new flat drive tracker.
   There is only one Gamecast field after this patch.
3. The replacement field uses a compact ESPN-like drive-tracker mechanic in the
   TSO theme: flat field, actual team end-zone logos, LOS, first-down line, ball
   marker, play path, down/distance, ball-on, current drive, last play, Win %, and
   player stat card.
4. Keeps the existing score header layout. The only intentional header change is
   a small football emoji immediately inside the team name that has possession.
5. Live Game View updates in-place rather than rebuilding the whole NFL root on
   every poll. Client poll cadence is 2 seconds; animated field elements move
   smoothly between states.
6. Adds latest ESPN win-probability output to the TSO low-latency endpoint.
7. Rebuilds TD Feed cards to match the TSO dark/navy theme and show:
   - scorer headshot (team logo fallback)
   - touchdown play text / score / quarter / clock
   - stored pregame ATD odds and sportsbook when available
   - first-TD price on the first touchdown when available
8. Improves touchdown scorer matching, especially receiving TD text containing
   both the passer and receiver.

Important
---------
Because supabase/functions/nfl-live/index.ts changes, deploy nfl-live after the
installer succeeds:

  supabase functions deploy nfl-live

Do not keep the obsolete sports/nfl/gamecast-live-upgrade.js file. The installer
removes it intentionally.
