const {test}=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../public/live-log-parser.js');
const future=require('../public/future-stats.js');
const rows=[
 'SEASON 5',
 'REGULAR SEASON GAME 1 LOG (AUDEN 3-2 JARVIS)',
 'TOP 1','HR, K, GO',
 'BOTTOM 1','1B, BB, K, GO',
 'TOP 2','K, FO',
 'BOTTOM 2','K, GO',
 'TOP 3','HR, K, GO',
 'BOTTOM 3','HR, K, GO',
 'RUNS BY INNING: TOP=1,0,2; BOTTOM=1,0,1',
 'PITCHING OUTS: AUDEN=6; JARVIS=6'
];
function parse(lines=rows,season='SEASON 5'){
 const result=parser.parseTab({title:season,lines:lines.map((text,i)=>({text,paragraph:i+1}))},[]);
 assert.equal(result.issues.length,0,result.issues.join('; '));
 return result.games[0];
}
const game=parse();
test('new future game log parses 3-inning events plus runs and outs',()=>{
 assert.equal(game.events.length,17);
 assert.equal(game.events[0].batter,'Auden');
 assert.deepEqual(game.runsByInning,{top:[1,0,2],bottom:[1,0,1]});
 assert.deepEqual(game.pitcherOuts,{Auden:6,Jarvis:6});
 assert.deepEqual(game.score,[3,2]);
 assert.deepEqual(future.inspectGame(game).issues,[]);
});
test('one validated S5 game calculates both batting and pitching slash lines',()=>{
 const result=future.aggregate([game],'S5','regular');
 assert.equal(result.games,1);assert.equal(result.ready,1);
 const a=result.players.find(x=>x.name==='Auden'),j=result.players.find(x=>x.name==='Jarvis');
 assert.equal(a.record,'1-0');assert.equal(j.record,'0-1');
 assert.equal(a.stats.hitting.PA,8);
 assert.equal(a.stats.hitting.AB,8);
 assert.equal(a.stats.hitting.H,2);
 assert.equal(a.stats.hitting.HR,2);
 assert.equal(a.stats.hitting.R,3);
 assert.equal(a.stats.hitting['LATE RUNS'],2);
 assert.equal(a.stats.hitting.AVG,.25);
 assert.equal(a.stats.hitting.OBP,.25);
 assert.equal(a.stats.hitting.SLG,1);
 assert.equal(a.stats.hitting.OPS,1.25);
 assert.equal(a.stats.pitching.IP,3);
 assert.equal(a.stats.pitching.K,3);
 assert.equal(a.stats.pitching.BB,1);
 assert.equal(a.stats.pitching.HA,2);
 assert.equal(a.stats.pitching.RA,2);
 assert.equal(a.stats.pitching.ERA,2);
 assert.equal(a.stats.pitching.WHIP,1);
 assert.equal(j.stats.pitching.HRA,2);
});
test('incomplete runs and pitching inputs are not marked as authoritative',()=>{
 const partial=parse(rows.filter(x=>!x.startsWith('PITCHING OUTS:')));
 const checked=future.inspectGame(partial);
 assert.equal(checked.ok,false);
 assert.ok(checked.issues.some(x=>x.startsWith('Missing OUTS')));
 const calculated=future.aggregate([partial],'S5','regular');
 assert.equal(calculated.ready,0);
 assert.equal(calculated.players.find(x=>x.name==='Auden').record,null);
});
test('final score must agree with explicitly entered inning runs',()=>{
 const wrong=parse(rows.map(x=>x.startsWith('RUNS BY INNING:')?'RUNS BY INNING: TOP=1,1,2; BOTTOM=1,0,1':x));
 const checked=future.inspectGame(wrong);
 assert.equal(checked.ok,false);
 assert.ok(checked.issues.some(x=>x.includes('do not match final score')));
});
test('outs must cover at least the outs recorded in the game events',()=>{
 const wrong=parse(rows.map(x=>x.startsWith('PITCHING OUTS:')?'PITCHING OUTS: AUDEN=2; JARVIS=2':x));
 const checked=future.inspectGame(wrong);
 assert.equal(checked.ok,false);
 assert.ok(checked.issues.some(x=>x.includes('below recorded')));
});
test('season totals add results from multiple games instead of using an old sheet',()=>{
 const second={...structuredClone(game),id:'S5:regular:2',number:2,events:game.events.map(e=>({...e,id:e.id.replace(':1:',':2:')}))};
 const r=future.aggregate([game,second],'S5','regular');
 const a=r.players.find(p=>p.name==='Auden');
 assert.equal(a.stats.hitting.PA,16);
 assert.equal(a.stats.hitting.HR,4);
 assert.equal(a.stats.hitting.R,6);
 assert.equal(a.stats.pitching.IP,6);
 assert.equal(a.record,'2-0');
});
test('a postseason round is kept separate from regular season',()=>{
 const playoff={...structuredClone(game),id:'S5:championship:1',phase:'postseason',stage:'championship',events:game.events.map(e=>({...e,id:e.id.replace('S5:regular:1','S5:championship:1')}))};
 const reg=future.aggregate([game,playoff],'S5','regular');
 const post=future.aggregate([game,playoff],'S5','postseason');
 assert.equal(reg.ready,1);assert.equal(post.ready,1);
 assert.equal(reg.players.find(p=>p.name==='Auden').stats.hitting.PA,8);
 assert.equal(post.players.find(p=>p.name==='Auden').stats.hitting.PA,8);
});
