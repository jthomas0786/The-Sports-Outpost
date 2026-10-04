# TSO 2.0 Brand & Asset Library

This folder is the single source of truth for all visual identity in The Sports Outpost 2.0.

## Rule
No new TSO 2.0 logo, icon, sport mark, background, badge, share card, or promotional image should be dropped into a random folder and referenced directly.

Every visual asset must:
1. live in the correct category below,
2. follow the naming convention,
3. be registered in `asset-manifest.json`,
4. have a status: `draft`, `review`, `approved`, or `retired`,
5. have both dark/light variants where required,
6. be tested at desktop, mobile, and social sizes where relevant.

## Folder map

```
tso2/brand/
├── identity/        # Primary TSO logos, marks, wordmarks, favicon, app icon
├── sports/          # MLB / NFL / NHL / NBA family marks
├── products/        # Live, Research, Models, Props, Parlay Lab, Community, Rankings
├── badges/          # LIVE, HOT, EDGE, CONFIDENCE, WINNER, TRENDING, etc.
├── backgrounds/     # Broadcast hero textures, matchup art, sport textures
├── players/         # Player-photo treatment rules and reusable masks/frames
├── teams/           # Team-logo treatment rules and reusable masks/frames
├── social/          # 1200x675, 1080x1080, story/reel templates
├── ui/              # App-only graphic elements
├── tokens.css       # Color/visual tokens
└── asset-manifest.json
```

## Naming convention

`tso2-{category}-{subject}-{variant}.{ext}`

Examples:
- `tso2-identity-primary-dark.svg`
- `tso2-identity-mark-light.svg`
- `tso2-sport-nhl-primary.svg`
- `tso2-product-parlay-lab.svg`
- `tso2-badge-live.svg`
- `tso2-bg-nhl-matchup-dark.webp`
- `tso2-social-model-pick-1200x675.png`

## Core visual direction — Outpost Broadcast

TSO 2.0 should feel like:
- premium sports broadcast
- live scoreboard / command center
- sportsbook information density
- bold editorial sports graphics
- fast, high-energy live presentation

TSO 2.0 should NOT feel like:
- corporate SaaS
- logistics software
- generic startup dashboard
- ArborLine
- a neon cyberpunk app
- four unrelated sport mini-sites

## Asset approval workflow

**DRAFT** → concept exists  
**REVIEW** → shown in Brand Lab / preview  
**APPROVED** → allowed in production UI  
**RETIRED** → kept only for history / migration

The site should only consume `approved` assets once TSO 2.0 reaches production.
