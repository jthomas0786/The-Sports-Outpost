TSO v80 — NFL Slate/Props Odds + MLB-Style Grade Rings

Changed files:
- sports/nfl-preview.js
- sports/router.js
- scripts/nfl-gameday-check.mjs

Highlights:
- Loads live slates/nfl-odds.json into the active NFL Slate/Props UI.
- Displays dynamic weekday/date above kickoff time.
- Displays game spread/total/moneyline context.
- Adds ATD / First TD odds to NFL Slate player rows and top-threat cards.
- Rebuilds NFL Props into MLB-style research cards with live line, best price/book,
  TSO projection, L5 average, opponent allowance, badges, headshot, matchup and grade ring.
- Uses the same 326.7 circumference grade-ring math as the MLB visual language.
- Removes deterministic seeded non-TD prop preview values from the active Props board.
- Adds stored pregame scorer odds to real TD Feed entries.
- Adds launch checks for odds UI, rings, date labels and TD Feed odds.
- Bumps nfl-preview browser module cache to v80.

Important:
The NFL ATD model itself is still the existing deterministic regressed-touchdown-rate
model. v80 does not claim to add Monte Carlo simulation.
