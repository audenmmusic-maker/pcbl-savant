const {test}=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../public/live-log-parser.js');

test('Google Docs embedded CR-only inning labels change batting half',()=>{
 const tab={title:'SEASON 3',lines:[
  {paragraph:1,text:'SEASON 3'},
  {paragraph:2,text:'REGULAR SEASON GAME 2 LOG (N 15-11 A)'},
  {paragraph:3,text:'TOP 3'},
  {paragraph:4,text:'BB, K\r\rBOT 3'},
  {paragraph:5,text:'GO, 1B, BB, K\r\rNAJEE WIN'}
 ]};
 const parsed=parser.parseTab(tab,[]);
 assert.equal(parsed.issues.length,0);
 assert.equal(parsed.games.length,1);
 const events=parsed.games[0].events;
 assert.deepEqual(events.map(e=>e.batter),['Najee','Najee','Auden','Auden','Auden','Auden']);
 assert.deepEqual(events.map(e=>e.half),['top','top','bottom','bottom','bottom','bottom']);
 assert.deepEqual(events.map(e=>e.result),['BB','K','GO','1B','BB','K']);
 assert.equal(events[2].sourceParagraph,5);
});
