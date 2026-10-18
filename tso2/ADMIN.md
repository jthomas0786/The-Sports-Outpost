# TSO 2.0 Owner Control Room

## Access
- Sign in on TSO 2.0 with the existing verified Sports Outpost account.
- Open the profile dropdown → **Admin Dashboard** (or navigate to `#admin` after sign-in).
- The admin route and menu are only displayed to the owner role. **This UI check is not the security boundary.**
- Supabase RPCs `tso2_admin_get_dashboard` and `tso2_admin_save_settings` check `auth.uid()`, the exact verified owner user ID, and `auth.users.raw_app_meta_data.role='owner'` on **every request**. Unauthenticated users and other members cannot access private reports or write settings.
- Database table privileges are revoked from anonymous/authenticated API roles, row-level security is enabled, and only restricted SECURITY DEFINER RPCs reach the data.
- No service-role secret is shipped to the browser. Never turn Admin data into a publicly readable REST table.

## Included controls and reports
- **Account activity:** registered profiles, new accounts over seven days, accounts signed in over seven days.
- **Community metrics:** post counts, saved picks, push-device subscriptions.
- **Sports-data health:** public live games and model prop feed counts for MLB, NFL, NBA, NHL; per-sport match coverage and current NFL model source.
- **Editable announcement:** text, enabled/disabled toggle. Announcements are visible on the TSO 2.0 site only; disabled notices never display.
- **Owner-only private notes:** saved with the settings, never returned by the public notice RPC.
- **Recent admin activity:** last eight settings changes with timestamps.
- **Shortcuts:** GitHub Actions, Cloudflare, Supabase, Brand Lab.

## Current limitations
- Account counts cover the existing shared Sports Outpost Supabase project, not a separate TSO 2.0 registration database.
- Feed report counts are current API responses, not historical traffic analytics or Cloudflare request/billing totals.
- No arbitrary user-role editing, deployment switch, secret management, production domain changes, odds modifications, or model overrides are available in the Admin page.
- These controls do **not** make background push and other pending TSO 2.0 services ready for launch.
- A successful CI preflight and real-browser tests with an owner AND a non-owner account are required before launch.

## Deployment
- App source on `tso-2.0-restructure`: `tso2/index.html`, `app.js`, `pages.js`, `admin.js`, `auth.js`, `styles.css`.
- Production `main` and DNS unchanged. Admin is deployed only to the TSO 2.0 preview and pinned release Workers.
- Supabase migration: `tso2_owner_admin_dashboard_and_notice` on project `hjhfbhpuuxnrexddplxd`.
- Regression checks: `node tso2/admin-ui-selftest.mjs` and `node tso2/auth-ui-selftest.mjs`.

## Launch QA checklist
- [ ] Owner sees Admin and can load account metrics, feed reports, private notes and audit history.
- [ ] Owner saves a notice, verifies it appears in TSO 2.0, then disables it.
- [ ] Owner's sign-out hides Admin immediately, and `#admin` cannot expose data when signed out.
- [ ] Non-owner member cannot see Admin, navigate into it, or access admin RPC results/write settings.
- [ ] Auth server enforces privilege after refreshed token; owner access is never granted by editing DOM/local storage.
- [ ] TSO 1.0 remains unaffected.
