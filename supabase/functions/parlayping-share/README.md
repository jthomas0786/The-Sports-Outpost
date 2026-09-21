# ParlayPing external handoff

This Edge Function is the only server-side bridge used by The Sports Outpost button to create a ParlayPing-generated betslip.

The browser sends the current `dw_betslip` plus the current Sports Outpost URL. The Edge Function authenticates the Sports Outpost user, sanitizes the slip, and calls ParlayPing `POST /api/v1/share` using the private `PARLAYPING_API_KEY` stored only in the Edge Function environment.

The return URL is passed to ParlayPing as `returnUrl`/`returnLabel` and becomes part of the signed share token. ParlayPing itself allowlists Sports Outpost origins and renders both Back and X controls that return to that signed URL. Do not append an unsigned `?return=` parameter to the generated slip URL.
