TSO v89.1 — NFL Player Modal Alternate Prop Lines

Adds a second selector directly beneath Player Prop in the NFL player modal.

WHAT IT DOES
- Shows alternate sportsbook lines for rushing yards, receiving yards, receptions,
  passing yards, passing TDs and completions.
- Each dropdown option includes side, line, American odds and sportsbook.
- Keeps Anytime TD / First TD unchanged because they are binary markets.
- Selected alternate line shows its current best sportsbook price plus a TSO
  alternate-line probability/edge estimate based on the canonical projection.
- Stores the selected alternate market/side/line/price/book on the modal dataset
  for future wager-slip wiring.

ODDS PIPELINE
- The scheduled NFL odds workflow now runs nfl-odds-refresh-v891.mjs.
- It reuses the existing single paid ParlayAPI /props response and preserves every
  sportsbook line as slot.alternates[]. No extra paid API request is added.
- Existing top-level slot.line / over / under stays intact for compatibility.

TEST
npm run nfl:v89.1:test
