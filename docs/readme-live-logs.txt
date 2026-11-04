PCBL SAVANT — LIVE GAME LOGS (ONE-TIME SETUP)

The site includes the verified game-log snapshot. To keep Versus and Ranges in sync whenever the official Google Doc changes, connect its Google Apps Script bridge once:

1. Open the Apps Script project behind the configured Web app URL (in the Google account that owns or can read the official game log document).
2. Replace the starter Code.gs text with the ENTIRE contents of GOOGLE_DOC_LIVE_BRIDGE.gs in this ZIP. Save the project.
3. Deploy > New deployment > Web app. Set Execute as: Me. Set Who has access: Anyone. Authorize the script. Copy the Web app URL that ends in /exec.
4. This ZIP already contains the Web app URL in live-log-config.js. Re-upload/redeploy these site files to Netlify once. Later edits to the Google Doc need no redeploy.
5. Visit Savant > Versus or Ranges. The status changes from CHECKING GAME LOGS to LIVE GAME LOGS. The site checks again on every page load. New document changes may take a short time to appear in Google's document service.

Editing the Apps Script itself later requires updating the existing Web app deployment in Apps Script. Editing the game logs does not. The updated bridge source also reads game-log text stored in Google Docs tables, in row/cell order. The earlier bridge version read paragraphs/list items only, so table content requires one update to the existing Web app deployment.

Routing safeguards:
- Season tabs are detected independently from their 'SEASON N' heading. No events from one season are merged into another.
- Each game needs a unique REGULAR SEASON, WILD CARD, or PETER COOPER CHAMPIONSHIP GAME N LOG (...) heading.
- The heading identifies the top batter first, bottom batter second. Existing game assignments are checked against the verified snapshot.
- For a new game, write a header like REGULAR SEASON GAME 12 LOG (NAJEE v JARVIS), or use clearly identifiable initials (JD, JM, A, N, C). A score heading like (N 4-3 JM) is also recognized. Avoid bare J for new seasons because it can mean Jason or Jarvis.
- Label each half TOP 1 (NAJEE BATTING) / BOT 1 (JARVIS BATTING), then write outcomes in order (1B, 2B, 3B, HR, BB, HBP, K, GO, FO, PO, LO). Short labels T1/B1 and established variations work too. The heading must include both player names and the final score in parentheses, e.g. REGULAR SEASON GAME 1 LOG (AUDEN 3-2 JARVIS).
- If an individual game's labels conflict or its new log is unusually short, the live parser retains that game's verified snapshot and reports a review notice. Other valid games still update. The official stat sheet remains authoritative for season totals.

If the live bridge is unreachable, the SAVANT site still displays the verified snapshot from the last deploy. If the Google Doc gains new season tabs, the bridge and parser detect them automatically.

DEPLOYMENT STATUS AT PACKAGING: The supplied URL returned "Script function not found: doGet." Its current deployment lacks the bridge code. Add GOOGLE_DOC_LIVE_BRIDGE.gs to the project and update that Web app deployment before live syncing can work. The site shows a verified snapshot until then.
