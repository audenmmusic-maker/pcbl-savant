const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
const database=require(path.join(root,'play-database.js'));
const games=JSON.parse(fs.readFileSync(path.join(root,'versus-data.js'),'utf8').replace(/^window\.PCBL_VERSUS=/,'').replace(/;\s*$/,''));
const official=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
test('validated canonical snapshot has no duplicate plays',()=>{
 const result=database.replace(games,'historical test');
 assert.equal(result.ok,true);assert.equal(result.games,35);assert.equal(result.plays,1014);
 assert.equal(new Set(database.events().map(x=>x.id)).size,1014);
});
test('all pages share canonical event counts',()=>{
 const p=database.events({season:'S3',phase:'regular',player:'Auden'});
 const c=database.count(p);
 assert.equal(c.PA,92);assert.equal(c.H,23);assert.equal(c.HR,10);
 assert.equal(c.BB,27);assert.equal(c.HBP,8);
 assert.equal(database.count(database.events({season:'S2',phase:'regular',player:'Auden'})).PA,96);
});
test('reconciliation separates sheet arithmetic from game log mismatch',()=>{
 const rows=database.reconcile(official);
 const pick=(s,n)=>rows.find(x=>x.season===s&&x.player===n);
 assert.equal(pick('S1','Auden').officialPA,70);
 assert.equal(pick('S1','Auden').loggedPA,73);
 assert.equal(pick('S3','Auden').loggedPA,92);
 assert.equal(pick('S3','Auden').officialPA,109);
 assert.equal(pick('S3','Auden').minimumPA,110);
 assert.equal(pick('S3','Auden').status,'SHEET_ARITHMETIC');
 assert.equal(pick('S2','Auden').status,'MATCH');
 assert.equal(pick('S1','Jarvis').minimumPA,82);
 assert.equal(pick('S3','Najee').minimumPA,88);
});
test('duplicate events reject a live update without altering authoritative state',()=>{
 const v=database.status().revision;
 const corrupted=structuredClone(games);
 corrupted[0].events.push({...corrupted[0].events[0]});
 const result=database.replace(corrupted,'bad update');
 assert.equal(result.ok,false);
 assert.equal(database.status().revision,v);
 assert.equal(database.status().events,1014);
});
test('changes in live game event counts are reported, not silently concealed',()=>{
 const newer=structuredClone(games),g=newer.find(x=>x.id==='S3:regular:2');
 g.events.splice(g.events.findIndex(e=>e.batter==='Auden'),1);
 const result=database.replace(newer,'simulated revised game log');
 assert.equal(result.ok,true);
 assert.ok(result.drift.some(x=>x.game==='S3:regular:2'));
 assert.equal(database.count(database.events({season:'S3',player:'Auden'})).PA,91);
});
