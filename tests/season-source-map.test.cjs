const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const publicDir=path.join(__dirname,'../public');
const code=fs.readFileSync(path.join(publicDir,'app.js'),'utf8').split('\n').find(x=>x.startsWith('function parseSheet('));
const columns={Auden:1,Jason:3,Jarvis:5,Najee:11,Coel:13};
const fields={hitting:['PA','AB','AVG','OBP','SLG','OPS','K','H','2B','3B','HR','BB','HBP','R'],pitching:['ERA','WHIP','IP','K','BB','HA','HRA','RA']};
const catalog=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.map(x=>[x,x])]));
const parse=new Function('rows','columns','CATALOG','window','let missingCells=[];'+code+';return parseSheet(rows,columns);');
function row(a='',b='',d='',f=''){let arr=Array(15).fill('');arr[0]=a;arr[1]=b;arr[3]=d;arr[5]=f;return arr;}
const lines=[
 row('PLAYER','AUDEN (1-0)','JASON (0-0)','JARVIS (0-1)'),
 row('SEASON 4'),row('HITTING'),row('PA','16','0','16'),
 row('AB','9','0','11'),row('BA','.111','0','.273'),
 row('OBP','.500','0','.500'),row('SLG','.444','0','.545'),
 row('OPS','.944','0','1.045'),row('K','5','0','8'),
 row('H','1','0','3'),row('2B','0','0','1'),
 row('3B','0','0','1'),row('HR','1','0','0'),
 row('BB','5','0','3'),row('HBP','2','0','2'),
 row('PITCHING'),row('ERA','.75','0','2.25'),
 row('WHIP','1.5','0','1.5'),row('IP','4','0','4'),
 row('K','8','0','5'),row('BB','3','0','5'),
 row('HA (HITS AGAINST)','3','0','1'),
 row('HRA (HR AGAINST)','0','0','1'),
 row('RA (Runs-Against)','1','0','3')
];
test('S4 Game 1 sheet layout parses identical columns to S1-S3',()=>{
 const result=parse(lines,columns,catalog,{PCBL_SNAPSHOT:{}});
 assert.deepEqual(result.S4.map(x=>x.name),['Auden','Jarvis']);
 assert.equal(result.S4[0].record,'1-0');
 assert.equal(result.S4[0].stats.hitting.PA,16);
 assert.equal(result.S4[0].stats.hitting.AVG,.111);
 assert.equal(result.S4[0].stats.pitching.ERA,.75);
 assert.equal(result.S4[1].record,'0-1');
 assert.equal(result.S4[1].stats.hitting.H,3);
 assert.equal(result.S4[1].stats.pitching.IP,4);
});
test('S5 can use a separate season label with the same verified schema',()=>{
 const s5=lines.map(r=>[...r]);s5[1][0]='SEASON 5';
 const result=parse(s5,columns,catalog,{PCBL_SNAPSHOT:{}});
 assert.equal(result.S5[0].stats.hitting.PA,16);
 assert.equal(result.S5[1].stats.hitting.PA,16);
});
test('separate season source configuration has no invented URLs',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(publicDir,'season-source-config.js'),'utf8'),context);
 assert.equal(context.window.PCBL_SEASON_SOURCES.S4.columns.Auden,1);
 assert.equal(context.window.PCBL_SEASON_SOURCES.S4.columns.Jarvis,5);
 assert.equal(context.window.PCBL_SEASON_SOURCES.S5.spreadsheetId,'');
});
