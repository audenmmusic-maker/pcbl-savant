# PCBL Savant statistical-engine audit — 2026-10-31

## Source priority and validation
1. Official season totals come from Google Sheets; data.json is the saved fallback. Do not override season totals from reconstructed plays.
2. Individual situational results, game comparisons and trends come from canonical, uniquely identified game-log events in play-database.js.
3. When the two disagree, flag the discrepancy with provenance, and do not invent or delete PAs to make the numbers match.
4. Validate each incoming live game before adopting it; report any change in per-game event count.
5. Preserve regular-season vs postseason records; missing final scores are not wins, losses, or zeroes.

## Source-by-source audit
- S1: OFFICIAL GAME LOGS (1).docx includes a PCBL Statistics & Operations statement that S1 games 2, 4, 6, 7 and 8 contained known PA/AB discrepancies and the original logs were intentionally not rewritten. This is a documented historical limitation.
- S2: OFFICIAL GAME LOGS.docx was re-parsed with the site parser. Its 12 saved game-event sequences and counts matched the original. Auden S2 PA=96 matches. Jarvis's official K/BB still differ by one each.
- S3: The public Google Docs bridge exposed a CR-only line break before BOT 3 in Game 2. The previous parser missed that marker and assigned four Auden PAs to Najee, producing 88 live PA instead of 92. CR, CRLF and LF handling has been fixed. The separate 92 logged vs 109 official sheet mismatch remains unresolved.
- Official-sheet arithmetic: S1 Jarvis listed 81 PA vs AB+BB+HBP=82; S1 Coel 17 vs 18; S3 Auden 109 vs 110; S3 Najee 86 vs 88. Review original scorekeeping before editing those cells.
- Full saved archive reconciliation by player and season: reports/archived-reconciliation.json.

## Canonical calculation architecture
Saved or verified live game logs -> play-database.js validation -> canonical game/event IDs -> Situational / Rolling / Versus / Ranges / Ballpark / records.
Shared counting rules: each validated event = one logged PA, AB excludes BB/HBP, hit = 1B/2B/3B/HR, total bases 1/2/3/4, AVG/OBP/SLG/OPS computed consistently. Event-only PCBL IP based on counted outs is an estimate; official IP remains from sheet when available. The live game feed validates and reports changed play totals.

## S4/S5 source mapping
SEASON 4 __ G1 - Sheet1.pdf verifies the same regular-season player columns as S1-S3: Auden B (index 1), Jason D (3), Jarvis F (5), and postseason columns C/E/G. Validated S4 Game 1 fixture: Auden 16 PA, 9 AB, HR 1, ERA .75, record 1-0; Jarvis 16 PA, 11 AB, HR 0, ERA 2.25, record 0-1. The fixture is historical, NOT the final S4 standings.
If S4/S5 are added to the main official sheet's gid=0, the season-label parser discovers them automatically. If separate Google sheets/tabs are used, fill in spreadsheetId and gid in public/season-source-config.js; the same parser validates their expected season label. S5 is provisionally mapped to the same player columns until its actual source is supplied. Live IDs for S4/S5 are not available and have not been fabricated.

## Remaining source dependencies
To resolve outstanding discrepancies, review the live S3 Google Doc against the official scoring notes; obtain the S4/S5 sheet links to enable their separate live feeds.
Do not claim season-source statistical completeness merely because a game log was parsed successfully.

## Testing
Run: node --test tests/play-database.test.cjs tests/season-source-map.test.cjs tests/postseason-records.test.cjs tests/situational-audit.test.cjs.

## Unified site-wide data and automated refresh (Oct 31, 2026)
- Source resolver: `public/unified-data.js`. Player profiles, leaderboards, statistical databases, graphs, and the embedded MLB tools consume its same official regular-season/postseason profiles or clearly identified event-only splits.
- W–L records everywhere come from `record-store.js`: official regular-season sheet, official S1/S2 postseason summaries, then verified game scores. Historical missing finals stay unavailable.
- The official Google Sheets JSONP source is refreshed on page load, approximately every **five minutes while the site is open**, and when the tab becomes active or the device reconnects. Game logs follow the same refresh cadence via the verified Apps Script bridge. No code commit or Cloudflare redeployment is needed to display changed source data.
- Each update runs validation before adoption. Bad feeds retain the last good snapshot; the site displays source coverage and full reconciliation through the **Data Integrity** panel. A change not reflected in the official source is not silently invented.
- A read-only GitHub Actions audit additionally checks the Google Docs game-log bridge every six hours; CI checks code and the historical consistency regression tests on commits.
- The embedded calculators use the parent Savant's current normalized data if opened inside the site. They preserve a direct standalone Google Sheet fallback when used outside Savant.
- The last source-audit read of the live Docs bridge exposed **S1/S2/S3 tabs only**. If S4/S5 game logs are kept elsewhere or the bridge hasn't been updated, new S4/S5 *situational* splits remain unavailable until those sources are connected. This does not prevent the official S4/S5 season totals from being displayed when their Sheets sources are connected.
- If S4 and S5 are separate spreadsheet tabs or files, set the real spreadsheet IDs and `gid` in `public/season-source-config.js`. Empty entries are deliberately not considered connected. The main `gid=0` sheet is discovered automatically for season sections appended within it.
- Existing official S3 Auden and other archived discrepancies remain flagged for review. The site does **not** apply the unverified Game 6 duplicate hypothesis to remove official statistics.

