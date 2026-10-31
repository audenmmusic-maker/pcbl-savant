/* Optional separate S4/S5 Google Sheets. If seasons share the main
 * PCBL sheet's Sheet1, Savant discovers SEASON 4 and SEASON 5 there.
 * When they live in other spreadsheets/tabs, set spreadsheetId and gid here.
 * Empty IDs mean "not connected", not "0 stats". */
window.PCBL_SEASON_SOURCES={
 S4:{spreadsheetId:'',gid:0,columns:{Auden:1,Jason:3,Jarvis:5,Najee:11,Coel:13}},
 S5:{spreadsheetId:'',gid:0,columns:{Auden:1,Jason:3,Jarvis:5,Najee:11,Coel:13}}
};
