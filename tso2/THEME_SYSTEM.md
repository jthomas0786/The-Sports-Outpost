# TSO 2.0 — Central Theme / CSS Dashboard

**Staging:** https://staging.thesportsoutpost.com/#theme

**Owner entry:** Profile menu > Theme / CSS Dashboard, or Owner Control Room > Theme / CSS Dashboard.

## Approved TSO 2.0 appearance

**The approved Outpost broadcast theme is not the older navy-and-blue generic dashboard.**

- Page background: near-black \`#05070A\`; cards \`#0A0D12\`; inset surfaces \`#0C1016\`.
- Primary UI actions and selection indicators: Outpost orange \`#FF4D1C\`.
- Editorial headers, highlights and secondary brand accents: Outpost gold \`#FFD84D\`.
- Model/data charts may use blue; positive/negative/push statuses may use meaningful green/red/yellow colors without changing the general UI branding.
- All TSO 2.0 routes inherit these tokens through \`theme-system.css\`. In particular \`games-board-v2.css\` maps its UI accents to \`--outpost-orange\` and \`--outpost-gold\`, not \`--blue\`.
- A regression test compares published-root values and the default editor controls against this approved baseline and tests the shared shell on Home, Games, Research, Models, Live, Game Edge, Props and Simulations.

## One source of truth

- \`theme-system.css\` is the final stylesheet loaded after \`styles.css\`, Simulations and Games styling. It owns the **structural appearance** of the shell, page cards, model/prop panels and controls.
- \`theme-studio.js\` defines the registry of 39 editable design tokens; its categories match the owner UI.
- \`tso2_get_published_theme()\` reads the current theme for **everyone** (anon and signed-in). Guest users cannot edit.
- \`tso2_save_published_theme()\` validates changes and enforces the **verified Supabase owner UID + owner app role**. Only this server operation publishes a change.
- \`tso2_theme_owner_history()\` lets the authenticated owner preview prior revisions; publishing a prior draft creates a new revision.
- \`tso2/migrations/20261017_theme_studio.sql\` describes the database structures and SQL access restrictions. This migration has been applied to the connected TSO Supabase project.
- No existing 1.0 route or main-branch stylesheet references Theme Studio. The editor currently lives only in TSO2.

## Editing the site yourself

1. Log in using the verified owner account, then open **Theme / CSS Dashboard**.
2. In **Visual Settings**, search a variable by label, e.g. "sidebar", "card", "nav", "blue", or "radius". Changing it applies a live **local preview**, not a publication.
3. In **Advanced CSS**, search any selector or property from same-origin stylesheets. Click "Add override to editor" to create an editable copy of that selector. The CSS inspector lists the real rules currently loaded in the browser.
4. Use **Export JSON** to keep an independent backup. **Import JSON** to preview a previous export. **Version History** restores a published earlier version into preview.
5. Use **Discard Preview** to revert to the active published configuration, or **Original TSO Colors** to load the site's baseline tokens. Changes only become public after **Publish Theme** confirms the revision number.

## Rules for new pages and redesigns

Do **not** copy colors, radii, sidebar widths, or button heights into page CSS. Use existing variables:

- Surfaces: \`var(--bg)\`, \`var(--surface)\`, \`var(--card)\`, \`var(--elev)\`
- Lines and text: \`var(--line)\`, \`var(--line-strong)\`, \`var(--text)\`, \`var(--muted)\`
- Accents: \`var(--blue)\`, \`var(--blue-2)\`, \`var(--outpost-orange)\`, \`var(--outpost-gold)\`
- Layout: \`var(--tso-page-max)\`, \`var(--tso-page-gutter)\`, \`var(--tso-card-padding)\`, \`var(--tso-grid-gap)\`
- Geometry: \`var(--r-sm)\`, \`var(--r)\`, \`var(--r-lg)\`, \`var(--tso-side-nav-width)\`
- Actions: \`var(--tso-primary-btn)\`, \`var(--tso-secondary-btn)\`, \`var(--tso-button-height)\`, \`var(--tso-focus)\`
- Typography: \`var(--tso-font-family)\`, \`var(--tso-body-size)\`, \`var(--tso-heading-size)\`

Live match charts may still use *semantic* positive / caution / loss colors. Avoid removing team identities or meaningful data colors merely to enforce cosmetic uniformity.

## Scope / honest limits

The shared layer covers the TSO2 **app shell and major cards/components**. Historical TSO pages contain many hard-coded declarations; advanced selector overrides exist for exceptions that aren't yet tokenized. It is not yet an automatic refactor of every declaration in the 500+ KB legacy stylesheet. The cross-origin Parlay Ping app embedded in TSO has its own styles and must implement these tokens separately for full parity.

Do not add unauthenticated raw CSS updates, service role keys, or credentials to the browser. The theme API intentionally disallows imports, external URLs, and style-tag markup. A user-made custom rule can still break layout, which is why the editor offers preview, export and revision history.
