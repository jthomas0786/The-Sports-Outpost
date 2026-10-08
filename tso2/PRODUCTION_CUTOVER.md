# TSO 2.0 production cutover — gated release

**Target:** https://thesportsoutpost.com
**Candidate:** `tso-2.0-restructure`, app assets under `tso2/`
**Current production:** TSO 1.0. Do NOT alter DNS, custom domains, production routing, or `main` until explicit cutover approval following green checks.

## Launch gates (must all pass)

- [ ] Identify actual production hosting, DNS provider, custom-domain mapping and current 1.0 release ID; verify a restorable snapshot.
- [ ] TSO 2.0 smoke tests pass against actual staging/preview URL on desktop and mobile.
- [ ] MLB/NFL/NBA/NHL schedule, scores, game details, and play-by-play checked for correct games and gracefully empty off-season slates.
- [ ] Game Edge: spread, moneyline, and total confidence bars map to correct side; reasons are plain-language analysis, never no-vig math copy.
- [ ] Player props: correct player/team/game, book and exact line, valid model probabilities; reject implausible certainty and unknown identities.
- [ ] NFL 2.0 model runner uses isolated files only; run QB simulation regression, output validation, and inspect generated candidate artifact.
- [ ] TSO 2.0 preview reads the approved branch-specific NFL output rather than `main/slates/nfl-sim.json`.
- [ ] User login, access permissions, owner-only share tools, notifications and privacy verified; no secret exposed to browser.
- [ ] Navigation links, swipeable mobile menu, cards, ticker, image assets, console errors, and responsive breakpoints checked.
- [ ] Monitoring, health-check URL and rollback execution rehearsed.
- [ ] Explicit owner approval obtained **after** all gates green.

## Rollout sequence

1. Keep `main` and TSO 1.0 deployed. Capture current production response/headers, domain configuration, and previous deployment identifier.
2. Build/stage TSO 2.0 from a pinned commit (not a moving branch), on a separate preview hostname.
3. Run automated preflight and manual QA across all sports and user roles. Record passing commit and date.
4. Back up existing routing and preserve the last healthy TSO 1.0 artifact.
5. Announce a scheduled change window; only then repoint the identified production routing to the pinned, tested TSO 2.0 deployment.
6. Immediately verify HTTPS, homepage, APIs, mobile navigation, account sign-in, and 4-sport game pages.
7. On any critical failure, restore the exact captured TSO 1.0 route/deployment. Recheck HTTPS and API health; investigate TSO 2.0 in staging.

## Current known blockers

- Workflow outcome and 50K NFL output artifact have not been verified.
- The TSO 2.0 preview NFL feed previously consumed main's simulation slate; branch-specific integration still requires verification.
- Cloudflare account used for TSO 2.0 Worker does not list `thesportsoutpost.com` as a hosted zone. Determine authoritative domain/hosting control plane first.
- Render workspace has not been selected; production deployment ownership is unverified.
- Production cutover is not authorized until all launch gates pass.
