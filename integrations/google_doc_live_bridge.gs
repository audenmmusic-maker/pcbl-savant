/** PCBL SAVANT GAME LOG BRIDGE
 * One-time install in script.google.com. Deploy as Web app:
 * Execute as: Me; Who has access: Anyone.
 * The endpoint only reads the public PCBL game log document below.
 * It returns season-tab paragraphs; Savant validates games and players itself.
 */
const PCBL_GAME_LOG_DOCUMENT_ID = '1M9Xq86XXi_HrYJwnDLI8Pn608KZ_RBVzVc6UfwaZemo';

function pcblCollectTabs(tab, output) {
  if (tab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
    const body = tab.asDocumentTab().getBody();
    const lines = [];
    for (let i = 0; i < body.getNumChildren(); i++) {
      const child = body.getChild(i);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH ||
          child.getType() === DocumentApp.ElementType.LIST_ITEM) {
        lines.push({text: child.getText(), paragraph: i + 1});
      }
    }
    const first = lines.find(row => row.text.trim());
    if ((first && /^SEASON\s+[1-9]\d*\b/i.test(first.text.trim())) || /^SEASON\s*[1-9]\d*\b/i.test(tab.getTitle().trim())) {
      output.push({title: tab.getTitle(), lines: lines});
    }
  }
  tab.getChildTabs().forEach(child => pcblCollectTabs(child, output));
}

function doGet() {
  const tabs = [];
  DocumentApp.openById(PCBL_GAME_LOG_DOCUMENT_ID).getTabs()
    .forEach(tab => pcblCollectTabs(tab, tabs));
  // Fixed callback. No user-controlled JavaScript is written to the response.
  const payload = JSON.stringify({tabs: tabs, readAt: new Date().toISOString()});
  return ContentService.createTextOutput('window.PCBLReceiveLogTabs(' + payload + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
