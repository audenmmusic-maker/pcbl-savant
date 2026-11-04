/** PCBL SAVANT GAME LOG BRIDGE
 * One-time install in script.google.com. Deploy as Web app:
 * Execute as: Me; Who has access: Anyone.
 * The endpoint only reads the public PCBL game log document below.
 * It returns season-tab paragraphs and table-cell paragraphs in reading order.
 * Savant validates games and players itself.
 */
const PCBL_GAME_LOG_DOCUMENT_ID = '1M9Xq86XXi_HrYJwnDLI8Pn608KZ_RBVzVc6UfwaZemo';

function pcblAppendContainer(container, lines) {
  for (let i = 0; i < container.getNumChildren(); i++) {
    const child = container.getChild(i);
    const type = child.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH ||
        type === DocumentApp.ElementType.LIST_ITEM) {
      lines.push({text: child.getText(), paragraph: lines.length + 1});
    } else if (type === DocumentApp.ElementType.TABLE) {
      const table = child.asTable();
      for (let r = 0; r < table.getNumRows(); r++) {
        const row = table.getRow(r);
        for (let c = 0; c < row.getNumCells(); c++) {
          pcblAppendContainer(row.getCell(c), lines);
        }
      }
    }
  }
}

function pcblCollectTabs(tab, output) {
  if (tab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
    const body = tab.asDocumentTab().getBody();
    const lines = [];
    pcblAppendContainer(body, lines);
    const first = lines.find(row => row.text.trim());
    if ((first && /^SEASON\s+[1-9]\d*\b/i.test(first.text.trim())) ||
        /^SEASON\s*[1-9]\d*\b/i.test(tab.getTitle().trim())) {
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
