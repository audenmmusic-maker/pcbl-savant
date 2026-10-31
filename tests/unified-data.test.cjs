const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../public');
const games=JSON.parse(fs.readFileSync(path.join(base,'versus-data.js'),'utf8').replace(/^window\.PCBL_VERSUS=/,'').replace(/;\s*$/,''));
const original=JSON.parse(fs.readFileSync(path.join(base,'data.json'),'utf8'));
const root={PCBL_VERSUS:games,PCBL_SNAPSHOT:original,Event:class Event{constructor(type){this.type=type}},dispatchEvent(e){this.received=(this.received||[]).concat(e.type)}};
function load(file){const m={exports:{}};new Function('window','module',fs.readFileSync(path.join(base,file),'utf8'))(root,m);return m.exports;}
root.PCBLPlayDB=load('play-database.js');
root.PCBLRecordStore=load('record-store.js');
root.PCBLParkStats={profile(name,season,park,phase){return {name,games:0,stats:{hitting:{},pitching:{}}}}};
const unified=load('unified-data.js');root.PCBLUnified=unified;
let official=structuredClone(original),post={};unified.configure({getOfficial:()=>official,getPostseason:()=>post});root.PCBLRecordStore.setOfficialProvider(()=>official);
test('season totals remain official while logged splits are separate',()=>{
 assert.equal(unified.profile('Auden','S3').stats.hitting.PA,109);
 assert.equal(root.PCBLPlayDB.count(root.PCBLPlayDB.events({season:'S3',player:'Auden',phase:'regular'})).PA,92);
 assert.equal(unified.profile('Auden','S3').record,'2-4');
 assert.equal(unified.report().regular.rows.find(x=>x.season==='S3'&&x.player==='Auden').status,'SHEET_ARITHMETIC');
});
test('historical and future postseason records resolve from the same record store',()=>{
 assert.equal(unified.profile('Jarvis','S1','postseason').record,'2-0');
 assert.equal(unified.profile('Jarvis','S1','postseason').source,'RECORD ONLY');
 const newGame={id:'S4:championship:1',season:'S4',phase:'postseason',stage:'championship',number:1,top:'Auden',bottom:'Jarvis',score:[3,1],events:[{id:'S4:championship:1:1',batter:'Auden',pitcher:'Jarvis',inning:1,half:'top',result:'HR'}]};
 const result=root.PCBLPlayDB.replace([...games,newGame]);assert.equal(result.ok,true);
 assert.equal(unified.profile('Auden','S4','postseason').record,'1-0');
});
test('official S4/S5 additions are included without changing archived S3',()=>{
 official.S4=[{name:'Auden',record:'1-0',stats:{hitting:{PA:12,AB:8,H:2,BB:4,HBP:0,HR:1,'2B':0,'3B':0,K:3},pitching:{IP:3,ERA:1,WHIP:2}}}];
 official.S5=[{name:'Jarvis',record:'0-1',stats:{hitting:{PA:9,AB:7,H:3,BB:2,HBP:0,HR:2,'2B':0,'3B':0,K:1},pitching:{IP:3,ERA:4,WHIP:1}}}];
 post.S4=[{name:'Auden',record:null,stats:{hitting:{PA:4,AB:3,H:1,BB:1,HBP:0,HR:1,'2B':0,'3B':0,K:1},pitching:{IP:1,ERA:0,WHIP:0}}}];
 const before=unified.status().revision;unified.signal('sheet');
 assert.equal(unified.status().revision,before+1);
 assert.ok(root.received.includes('pcbl-data-updated'));
 assert.deepEqual(unified.seasons().slice(-2),['S4','S5']);
 assert.equal(unified.profile('Auden','S4').stats.hitting.PA,12);
 assert.equal(unified.profile('Auden','S4','postseason').stats.hitting.PA,4);
 assert.equal(unified.profile('Auden','S3').stats.hitting.PA,109);
 assert.equal(unified.profile('Auden','ALL TIME').stats.hitting.PA,287);
 assert.equal(unified.profile('Auden','S4','postseason').record,'1-0');
});
test('both standalone calculators receive common data via export',()=>{
 const rows=unified.exportRows();const markers=rows.map(x=>x[0]).filter(x=>x==='CAREER'||/^SEASON \d+$/.test(x));
 assert.ok(markers.includes('SEASON 4'));assert.ok(markers.includes('SEASON 5'));
 const at=rows.findIndex(x=>x[0]==='SEASON 4');
 assert.equal(rows[at+2][0],'PA');assert.equal(rows[at+2][1],'12');assert.equal(rows[at+2][2],'4');
 const at3=rows.findIndex(x=>x[0]==='SEASON 3');
 assert.equal(rows[at3+2][1],'109');
});
test('bad spreadsheet values are rejected, known historical arithmetic differences are warned',()=>{
 assert.equal(unified.validate({S4:[{name:'Auden',stats:{hitting:{PA:-2},pitching:{IP:0}}}]}).ok,false);
 const report=unified.validate(official);
 assert.equal(report.ok,true);assert.ok(report.problems.some(x=>x.includes('S3 Auden')));
});
