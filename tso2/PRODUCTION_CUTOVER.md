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

## Remaining launch blockers (updated 2026-10-08)

- **Run outcome not verified yet:** The GitHub workflow now checks full staging and release HTML, CSS, JS, logo, Game Edge SVG, 4-sport live feed, 2.0 NFL props source, and anonymous Admin access. Obtain a green workflow run for the **latest preflight code** before switching.
- **Browser QA:** Owner-approved sidebar and sign-in were reviewed, but full release mobile QA, sign-out, public notice save/display/disable, and logged-in/guest flows across all sections still need explicit confirmation.
- **Member authorization:** Owner dashboard RPCs are checked in Supabase, and anonymous access is covered by CI, but an actual signed-in non-owner negative test is still required.
- **Notifications:** In-app notification center is implemented; persisted saved alert preferences, background/device push, and full user account data integrations are still pending. Decide whether to mark these features clearly as unavailable at initial public launch or complete them before launch.
- **Sports & model QA:** Review NFL QB probability sanity, model identity/line matching, four-sport schedules, Game Edge reasons, and empty off-season behavior on the pinned release.
- **Cutover & rollback rehearsal:** Production domain is still on GitHub Pages TSO 1.0. Confirm exact Worker custom-domain change and `www` handling; take a final DNS snapshot and test recovery plan.
- **Owner approval:** Obtain new explicit approval only after all mandatory gates are green. Never interpret approval of a design element as permission to cut over.

Cloudflare DNS ownership is now **resolved**. The active zone, TSO 2.0 Workers, staging and release custom domains are in the same account. Render is not involved in The Sports Outpost hosting.

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


## Frozen candidate (October 8, 2026)

- Preview (moving development branch): `https://staging.thesportsoutpost.com` → Cloudflare Worker `tso2-preview`.
- **Pinned launch candidate:** `https://release.thesportsoutpost.com` → separate Worker `tso2-release-candidate`, frontend and production brand assets frozen at Git commit `a82ba6f2e903d409e1848674f53b2e8983d5f6f3` (owner-approved sidebar layout).
- The candidate intentionally retains `X-Robots-Tag: noindex, nofollow` while in prelaunch. Remove for public pages **before** or during an explicitly approved production deployment; preserve noindex for private staging hosts.
- Live NFL model JSON remains branch-specific at `tso-2.0-restructure/tso2/data/nfl-sim.json`, not `main`. The released frontend is immutable; validated model data is independently refreshable.
- The domain is now active in the Cloudflare account containing TSO 2.0 Workers; original GitHub Pages A records and `www` CNAME remain DNS-only, with Porkbun MX and TXT records preserved.
- `.github/workflows/tso2-launch-route-preflight.yml` probes staging **and** frozen release candidate for HTML, CSS, JS, live API, and branch-specific props/model metadata.
- Before approval, inspect the last successful workflow result, verify user account flows and notifications, and manually test both mobile and desktop on **release** (not just staging).

### Apex and www strategy / rollback

Apex `thesportsoutpost.com` currently has four DNS-only GitHub Pages A records:
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
`www.thesportsoutpost.com` has a DNS-only CNAME to `jthomas0786.github.io`.
Retain a record of DNS IDs and values before a cutover. Custom domain attachment may replace conflicting website DNS records. Plan apex and `www` together (custom domain plus redirect or separate custom-domain attachment) so users never see mixed TSO versions.
For emergency rollback, detach the TSO 2.0 custom-domain mapping and restore the four GitHub Pages A records and `www` CNAME exactly as captured; verify both HTTPS hosts and the legacy page. Do not change MX, SPF, or ACME TXT records.

## Final read-only production check (2026-10-08)

The authoritative Cloudflare zone is active with SSL mode `full` and **no production Worker routes**.

- Apex DNS: four DNS-only GitHub Pages A records for `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
- `www` DNS: DNS-only CNAME to `jthomas0786.github.io`.
- Email: two Porkbun MX records, priority 10 (`fwd1.porkbun.com`) and 20 (`fwd2.porkbun.com`), plus three unchanged TXT records in the zone. Do not touch them.
- Staging Worker: `tso2-preview` at `staging.thesportsoutpost.com`.
- Release Worker: `tso2-release-candidate` at `release.thesportsoutpost.com`; frontend/production icons pinned to `a82ba6f2e903d409e1848674f53b2e8983d5f6f3`.
- Release and staging now serve SVG assets with explicit `image/svg+xml` content type.
- Admin reports/settings use owner-verified Supabase RPCs; no public service-role token in frontend.

**No apex or www cutover, GitHub `main` changes, or DNS record deletions have occurred.**
