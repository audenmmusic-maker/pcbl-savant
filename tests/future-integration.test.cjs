const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../public');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const context={PCBL_VERSUS:[],PCBL_SNAPSHOT:{S5:[{name:'Auden',record:'2-0',stats:{hitting:{PA:100},pitching:{IP:8}}}]}};
function load(file){const m={exports:{}};new Function('window','module',read(file))(context,m);return m.exports;}
context.PCBLPlayDB=load('play-database.js');
const parser=load('live-log-parser.js');
context.PCBLFutureStats=load('future-stats.js');
function game(n){
 const source=['SEASON 5', 'REGULAR SEASON GAME '+n+' LOG (AUDEN 3-2 JARVIS)',
 'TOP 1','HR, K, GO','BOT 1','1B, BB, K, GO','TOP 2','K, FO','BOT 2','K, GO',
 'TOP 3','HR, K, GO','BOT 3','HR, K, GO',
 'RUNS BY INNING: TOP=1,0,2; BOTTOM=1,0,1',
 'PITCHING OUTS: AUDEN=6; JARVIS=6'];
 const p=parser.parseTab({title:'SEASON 5',lines:source.map((text,i)=>({text,paragraph:i+1}))},[]);
 assert.equal(p.issues.length,0,p.issues.join('; '));return p.games[0];
}
test('site declares future-log data source before app controller',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('src="future-stats.js"')>html.indexOf('src="play-database.js"'));
 assert.ok(html.indexOf('src="future-stats.js"')<html.indexOf('src="app.js"'));
 const app=read('app.js');
 assert.match(app,/PCBLFutureStats\?\.merge\(data,'regular'\)/);
 assert.match(app,/PCBLFutureStats\?\.merge\(postseasonData,'postseason'\)/);
});
test('one recorded game must not overwrite two existing official games',()=>{
 const one=game(1);
 assert.equal(context.PCBLPlayDB.replace([one]).ok,true);
 const actual=context.PCBLFutureStats.merge(context.PCBL_SNAPSHOT,'regular');
 assert.equal(actual.S5.find(p=>p.name==='Auden').stats.hitting.PA,100);
 const state=context.PCBLFutureStats.diagnostics(context.PCBL_SNAPSHOT).find(x=>x.name==='Auden');
 assert.equal(state.authoritative,false);
 assert.equal(state.logged,1);
});
test('once two complete games match source coverage, log totals become authoritative',()=>{
 const one=game(1),two=game(2);
 assert.equal(context.PCBLPlayDB.replace([one,two]).ok,true);
 const actual=context.PCBLFutureStats.merge(context.PCBL_SNAPSHOT,'regular');
 const a=actual.S5.find(p=>p.name==='Auden');
 assert.equal(a.stats.hitting.PA,16);
 assert.equal(a.stats.pitching.IP,6);
 assert.equal(a.record,'2-0');
 assert.equal(a.source,'VERIFIED GAME LOGS');
});
test('a missing scoreboard annotation retains the last official data',()=>{
 const g=game(1);delete g.runsByInning;
 assert.equal(context.PCBLPlayDB.replace([g]).ok,true);
 const actual=context.PCBLFutureStats.merge(context.PCBL_SNAPSHOT,'regular');
 assert.equal(actual.S5.find(p=>p.name==='Auden').stats.hitting.PA,100);
 assert.ok(context.PCBLFutureStats.diagnostics(context.PCBL_SNAPSHOT).find(x=>x.name==='Auden').pending.some(x=>x.includes('RUNS BY INNING')));
});
test('season without a sheet can publish complete game-log statistics',()=>{
 assert.equal(context.PCBLPlayDB.replace([game(1)]).ok,true);
 const actual=context.PCBLFutureStats.merge({},'regular');
 assert.equal(actual.S5.find(p=>p.name==='Auden').stats.hitting.PA,8);
 assert.equal(actual.S5.find(p=>p.name==='Jarvis').stats.pitching.ERA,3);
});


test('verified game logs replace computed fields but retain unsupported official metadata',()=>{
 const one=game(1),two=game(2);
 assert.equal(context.PCBLPlayDB.replace([one,two]).ok,true);
 const base={S5:[{name:'Auden',record:'2-0',award:'PCBL MVP',stats:{
  hitting:{PA:100,AB:90,BA:.4,customMetric:7},
  pitching:{IP:8,'NO HITTERS':2,customPitching:5},
  overall:{championships:1}
 }}]};
 const actual=context.PCBLFutureStats.merge(base,'regular');
 const a=actual.S5.find(p=>p.name==='Auden');
 assert.equal(a.stats.hitting.PA,16);
 assert.equal(a.stats.hitting.customMetric,7);
 assert.equal(a.stats.pitching.IP,6);
 assert.equal(a.stats.pitching['NO HITTERS'],2);
 assert.equal(a.stats.pitching.customPitching,5);
 assert.equal(a.stats.overall.championships,1);
 assert.equal(a.award,'PCBL MVP');
});
