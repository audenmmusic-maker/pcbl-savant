# PCBL Savant — GitHub / Cloudflare Workers Starter

This repository packages the existing Savant ZIP without changing its application behavior.

## Deploy

1. Create a GitHub repository called `pcbl-savant` (private is fine).
2. Upload **the contents of this starter ZIP** to the repository root, keeping `public/` and `wrangler.jsonc` at the root.
3. In Cloudflare > Workers & Pages > Create application > GitHub, authorize the repository and choose `pcbl-savant`.
4. Project name/Worker name: `pcbl-savant` (must match `wrangler.jsonc`). Branch: `main`. Build command: leave blank. Deploy command: `npx wrangler deploy`. Root directory: `/` (repository root).
5. Save and Deploy. The website is served from `public/`, including `public/index.html`.

## Live data caveats

- This is a **hosting migration of the original site**, not a completed live data upgrade.
- Official stat sheet reader currently targets `gid=0` in `public/app.js`. Separate S4/S5 tabs need integration.
- Google Doc log integration currently uses `public/live-log-config.js`, with Apps Script source in `integrations/google_doc_live_bridge.gs`. The ZIP's original README reported that deployment's `doGet` was missing. Redeploy/repair it if still broken.
- Static snapshots exist in `public/data.js`, `public/versus-data.js`, and other files, and should stay until the new data pipeline is tested.
- We will add a unified data API, historical records, and S4/S5 integration after the initial deployment.

## Development safety

This project is separate from `pcbl-world-beta`. Do not connect or deploy PCBL Savant into the PCBL WORLD Worker.

No GitHub or Cloudflare API tokens are needed for Cloudflare's native Git integration.
