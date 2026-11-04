# PCBL Savant — log-first automation for future games

The goal is to enter a game once in the existing official Google Docs game-log document, not maintain separate season totals by hand.

## Enter a future game

Create a SEASON 4, SEASON 5, etc. tab in the existing Official PCBL Game Logs Google Doc if one does not yet exist. Use exactly the same game numbering and top/bottom labels as the original logs. The bridge discovers newly added season tabs when available.

Illustrative example (**not a real PCBL game**):

    SEASON 5
    REGULAR SEASON GAME 1 LOG (AUDEN 3-2 JARVIS)

    TOP 1 (AUDEN BATTING)
    HR, K, GO
    BOT 1 (JARVIS BATTING)
    1B, BB, K, GO

    TOP 2
    K, FO
    BOT 2
    K, GO

    TOP 3
    HR, K, GO
    BOT 3
    HR, K, GO

    RUNS BY INNING: TOP=1,0,2; BOTTOM=1,0,1
    PITCHING OUTS: AUDEN=6; JARVIS=6

Top and bottom in the **score in the game header** must be in the same order as top and bottom in the play log. Use full player names to eliminate initials ambiguity. Game numbers must be unique for each season/stage.

## Two essential annotation lines

- RUNS BY INNING: List the runs scored in each inning for the top and bottom batter; include 0s. The sequence totals must match the game score. The 3rd+ runs are calculated from the third and later entries.
- PITCHING OUTS: List the number of defensive outs credited to **each pitcher**. PCBL uses **2 outs per inning**, so a complete 3-IP outing is 6 defensive outs. These counts are needed for special double plays, run downs, walk-offs and other outs missing from plain strings of hit/walk/strikeout results.

Postseason stages use the existing headings: WILD CARD GAME 1 LOG (AUDEN 3-2 JARVIS) or PETER COOPER CHAMPIONSHIP GAME 1 LOG (AUDEN 3-2 JARVIS).

## What Savant can compute

- **Batting:** PA, AB, H, 2B, 3B, HR, BB, HBP, K, R, 3RD+ INN. RUNS, BA, OBP, SLG, OPS, AB/HR, XBH, K RATE, ISO, K/BB.
- **Pitching:** IP, K, BB, HBP, HA, HRA, RA, ERA (= RA × 3 / IP), WHIP (= [HA + BB + HBP] / IP), K/3. This uses PCBL rules, not MLB's 9-inning ERA.
- **Records:** W–L from each game's score. Regular season and postseason are separate.
- **Situational:** Innings, parks, batters, pitchers and all recorded play-by-play splits continue using the single validated event database.

**Not automatically inferred:** Saves/attempts, verified no-hitters, unlogged baserunner actions, and advanced stats requiring base-state details not present in the log. These must stay unavailable or draw from separately verified records.

## Automatic verification and publication

1. A future game is considered complete if it has a unique identity, readable event sequence, a non-tied final score, at least three recorded innings, runs-by-inning for both players matching the score, and pitcher out counts consistent with the recorded outs and two-out inning rule.
2. If any required data are missing, the game is marked pending and the pipeline **does not replace existing official season statistics**.
3. Once every logged game in a season/stage is complete, a future player's game-derived stats can replace the sheet totals **only if the logs cover at least as many games as that player's current official W–L record**.
4. If no official source exists for a new season, complete game logs become authoritative immediately.
5. When the live game-log bridge sends a revision, Savant recalculates on the next website refresh (on load, about every five minutes while open, or when returning to the tab).
6. The historical S1–S3 data remain separately preserved. Auden's approved S3 92-PA game log stays locked.

## How to work with ChatGPT

You can paste a future game log here, including the two annotation lines. I can validate it and work with your connected repository. Sending a message alone does **not** schedule a background import; storing it in the connected Google Doc is the autonomous route.

The existing Google Docs bridge currently exposed S1–S3 only in the last verified read. S4/S5 will not appear until new tabs/logs are added and the bridge exposes them. Existing S4/S5 sheet totals remain the fallback in the meantime.

## Implementation

Client parser: public/live-log-parser.js. Future-season calculator: public/future-stats.js. Existing identity/validation registry: public/play-database.js. UI source integration: public/app.js and public/unified-data.js. Regression tests: tests/future-stats.test.cjs and tests/future-integration.test.cjs.
