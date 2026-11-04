# Approved correction: Auden Season 3 — 92 plate appearances

Approved by the PCBL scorer on 2026-11-04 in the Savant development conversation.

## What is authoritative
- Six original regular-season Auden games in the archived reconstructed game logs: S3 games 1, 2, 4, 6, 7, and 9.
- Exactly **92** batter events across those six games, with stable event IDs and inning/half assignments.
- S3 batting counts from those events: PA 92, AB 57, H 23, K 17, BB 27, HBP 8, 2B 8, 3B 0, HR 10.
- Derived S3 rates are recalculated from these counts. W–L remains 2–4.

## How Savant applies it
- `public/approved-corrections.js` applies these approved figures to the in-memory official S3 player record, at boot and after live-sheet refreshes. It does **not** write to the Google Sheet.
- Auden's career batting totals are recomputed from available season-level batting counts, so the old S3 figure of 109 PA cannot remain baked into the career. With the saved S1–S3 records this changes his career from **275 to 258 PA**. Other career counting totals are recomputed from those season counts.
- `public/live-logs.js` retains the original six S3 game logs as an approved historical snapshot when refreshed. This locks the inning/half and batter-level results for those games, rather than guessing extra PAs or letting a revised parser change the accepted history.
- Other archived games and future S4/S5 game logs continue through the normal validation and live refresh path.
- The original `public/data.json` / `public/data.js` archives remain as historical source snapshots showing the pre-correction 109 PA; the authorized correction is explicit and testable rather than silently rewriting archived files.

## What remains unverified
- This correction **does not prove** why the original Google Sheet listed 109 PA. A duplicated Game 6 is a hypothesis, not a confirmed historical fact.
- Runs scored, late-inning runs, pitching figures, and other players' season counts are not replaced by this batting-event correction.
- The source Google Sheet still needs its own administrative update if it should match the corrected Savant figure in the document itself.

## Checks
Run `node --test tests/approved-corrections.test.cjs` to verify 92 logged PA, corrected derived totals, 258 career PA from saved S1–S3, unchanged W–L, idempotent updates, and pinning of the six games during live refresh.
