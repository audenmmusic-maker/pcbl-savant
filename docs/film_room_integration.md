# PCBL Film Room / Savant source contract

Official stat totals: live Google stat sheet. Season 4 and 5 templates may remain empty and should not be counted as player performances.
Game plays and outcomes: live Game Logs Google Doc, fetched by google_doc_live_bridge.gs. Tabs titled Season 4, Season 5, etc. are eligible.
Film Room: separate document managed independently. Do not ingest its timestamps as game events or official totals.

## Recommended Film Room join keys
season (S4), phase (regular/postseason), gameNumber, inning, half (top/bottom), plateAppearanceIndex, pitchIndex.
Join Film Room entries against Game Logs on those keys and attach video URL, video timestamp and notes. If the Film Room contains a pitch or result not present in logs, flag REVIEW rather than overwrite logs. If pitch indexes are absent from historical logs, use a human-confirmed play-to-video mapping.

## Sheet contract
Current official reader loads gid=0 using Google Visualization JSONP and searches first column for CAREER and SEASON N sections. Ensure newly plotted S4/S5 blocks use those exact labels and the same player-column structure. Populating a separate worksheet tab (new gid) will NOT automatically be read by the existing gid=0 feed; this requires a separate sheet-tab discovery integration.

## Important
The site refreshes live game logs every ~15 minutes, but the official stat sheet is fetched on page load. Refreshed game logs do not automatically write official stat totals back to Google Sheets. Film Room document polling requires an additional bridge and document ID after that doc is provided.
