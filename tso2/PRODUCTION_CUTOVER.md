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


## Verified hosting facts (October 8, 2026)

- `main/CNAME` declares `thesportsoutpost.com` and the current production homepage returns HTTP 200.
- Production `/api/live` and `/api/props` return HTTP 404 (not routes used by the legacy site).
- TSO 2.0 Cloudflare preview Worker is `tso2-preview.jthomas0786-tso.workers.dev`. Its homepage, `/api/live`, and `/api/props` returned HTTP 200 in the GitHub launch preflight.
- Preview NFL model metadata confirms branch-isolated `tso2/data/nfl-sim.json`.
- The accessible Cloudflare account does **not** have a zone for `thesportsoutpost.com`; therefore a Worker custom-domain route cannot be created in that account without first setting up domain ownership and DNS.
- No production DNS modification, Pages-source modification, or domain cutover has occurred.

## Recommended launch architecture: one origin, one API

Keep GitHub as source of truth. Run a **pinned TSO 2.0 Cloudflare Worker deployment** at the apex domain so both HTML/assets and same-origin `/api/*` are served by the same host. The current preview dynamically fetches the moving GitHub branch, so for production replace moving branch reads with a pinned release SHA or immutable assets before the cutover. Preserve the TSO 1.0 GitHub Pages site as a fallback.

**Precondition:** Identify the registrar and authoritative DNS nameservers, and take an export/screenshot of all DNS records, especially MX, TXT, DKIM, SPF, and CAA. If moving DNS to Cloudflare is required, migrate records and verify email delivery BEFORE routing the website. Do not assume purchasing or transferring the domain is necessary.

**Alternative if DNS cannot change:** Continue GitHub Pages for the site and use a separate `api.` subdomain with explicit CORS and frontend URL configuration. This is *not* a drop-in launch path because TSO 2.0 currently calls relative `/api/*` and account/authentication paths require extra review. Do not flip GitHub Pages from 1.0 to 2.0 without implementing and validating this alternative.

## Cutover execution checklist

1. Verify latest preview smoke-test pass and manually test all sections, especially accounts, notifications, Game Edge, per-sport models, and owner-only controls.
2. Snapshot production Pages settings, domain mapping, `main` commit SHA, and active DNS records. Record the last-known-good TSO 1.0 URL.
3. Create an immutable TSO 2.0 release from a tested SHA. Ensure its Worker API uses branch-specific validated NFL models, and prevent stale embedded fallback from silently replacing missing production assets.
4. Set up Cloudflare zone/custom-domain routing only after confirming the DNS provider and preserving every existing record; check HTTPS and `www` behavior.
5. Perform a final read-only launch preflight. Ask for explicit cutover approval after *all* release gates pass.
6. Cut over the domain to the pinned 2.0 deployment. Test homepage, assets, four-sport live feeds, props, account state, and owner tools from external networks.
7. If critical checks fail, restore the captured 1.0 routing and DNS records or GitHub Pages mapping. Account for DNS TTL. Run the smoke checks again and keep 2.0 in staging.

**Do not change the production domain before the owner approves the validated, pinned release.**
