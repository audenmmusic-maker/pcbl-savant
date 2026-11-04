/* PCBL future-season game-log totals.
 * One finalized log -> every view, with no invented runs or pitching outs.
 * S1-S3 remain official historical seasons; future games can replace sheet totals
 * only when the new log covers every officially recorded game for that player.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLFutureStats=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const names=['Auden','Jason','Jarvis','Najee','Coel'];
const HIT=new Set(['1B','2B','3B','HR']),OUT=new Set(['K','GO','FO','PO','LO']);
const countFields=['PA','AB','H','2B','3B','HR','BB','HBP','K','R','LATE RUNS'];
const avg=(n,d)=>d>0?n/d:null, round=(n,d=3)=>n===null?null:Number(n.toFixed(d));
const number=x=>typeof x==='number'&&Number.isFinite(x);
function statH(events,side){
 const result={PA:events.length,AB:0,H:0,'2B':0,'3B':0,HR:0,BB:0,HBP:0,K:0};
 for(const e of events){const v=e.result;if(v!=='BB'&&v!=='HBP')result.AB++;
  if(HIT.has(v)){result.H++;if(v!=='1B')result[v]++}
  else if(['BB','HBP','K'].includes(v))result[v]++;
 }
 return result;
}
function rates(h){
 const stats={...h};
 stats.AVG=round(avg(h.H,h.AB));stats.OBP=round(avg(h.H+h.BB+h.HBP,h.PA));
 stats.SLG=round(avg(h.H+h['2B']+2*h['3B']+3*h.HR,h.AB));
 stats.OPS=stats.OBP===null||stats.SLG===null?null:round(stats.OBP+stats.SLG);
 stats.XBH=h['2B']+h['3B']+h.HR;
 stats['AB/HR']=round(avg(h.AB,h.HR),2);
 stats.ISO=stats.AVG===null||stats.SLG===null?null:round(stats.SLG-stats.AVG);
 stats['K RATE']=round(avg(h.K*100,h.PA),2);
 stats['K/BB']=round(avg(h.K,h.BB),2);
 return stats;
}
function score(g){const s=g.score;return Array.isArray(s)&&s.length===2&&s.every(v=>Number.isInteger(v)&&v>=0)&&s[0]!==s[1];}
function countResults(events){return events.filter(e=>HIT.has(e.result)).length;}
function inspectGame(g){
 const issues=[];
 if(!/^S([4-9]|[1-9]\d{1,})$/.test(g?.season||''))return {ok:false,issues:['Not a future-season game']};
 if(!score(g))issues.push('Missing or tied final score (A n-m B in game heading)');
 if(!Array.isArray(g.events)||!g.events.length)issues.push('No plate appearances');
 const innings=Math.max(0,...(g.events||[]).map(e=>Number(e.inning)||0));
 if(innings<3)issues.push('Game log does not reach the third inning');
 const runs=g.runsByInning||{};
 for(const side of ['top','bottom']){
  const scores=runs[side];
  if(!Array.isArray(scores)||!scores.length||!scores.every(n=>Number.isInteger(n)&&n>=0))issues.push('Missing RUNS BY INNING for '+side.toUpperCase());
  else if(score(g)&&scores.reduce((a,b)=>a+b,0)!==g.score[side==='top'?0:1])issues.push(side.toUpperCase()+' inning runs do not match final score');
  else if(scores.length!==innings)issues.push(side.toUpperCase()+' inning-run entries ('+scores.length+') do not match '+innings+' logged innings');
 }
 const outs=g.pitcherOuts||{};
 for(const name of [g.top,g.bottom]){
  const n=outs[name];
  if(!Number.isInteger(n)||n<=0)issues.push('Missing OUTS for '+name);
  else {
   const derived=g.events.filter(e=>e.pitcher===name&&OUT.has(e.result)).length;
   if(n<derived)issues.push('OUTS for '+name+' ('+n+') below recorded strikeouts/outs ('+derived+')');
   if(n>innings*2)issues.push('OUTS for '+name+' exceed 2 outs per recorded inning');
  }
 }
 const first=g.events?.find(e=>e.batter!==g.top&&e.batter!==g.bottom);
 if(first)issues.push('Unrecognized batter '+first.batter);
 const specialPitchers=[...new Set((g.events||[]).map(e=>e.pitcher).filter(n=>n!==g.top&&n!==g.bottom))];
 if(specialPitchers.length)issues.push('Relief pitcher(s) need separate run and outs attribution: '+specialPitchers.join(', '));
 return {ok:issues.length===0,issues};
}
function oneGame(g){
 const validated=inspectGame(g);
 const list={};
 if(!Array.isArray(g.events)||!g.events.length)return {game:g.id,ready:false,issues:validated.issues,players:list};
 for(const [name,side] of [[g.top,'top'],[g.bottom,'bottom']]){
  const batting=g.events.filter(e=>e.batter===name),pitching=g.events.filter(e=>e.pitcher===name);
  const h=statH(batting);
  if(score(g))h.R=g.score[side==='top'?0:1];
  if(Array.isArray(g.runsByInning?.[side]))h['LATE RUNS']=g.runsByInning[side].slice(2).reduce((a,b)=>a+b,0);
  const p={K:pitching.filter(e=>e.result==='K').length,BB:pitching.filter(e=>e.result==='BB').length,HBP:pitching.filter(e=>e.result==='HBP').length,
   HA:countResults(pitching),HRA:pitching.filter(e=>e.result==='HR').length};
  if(score(g))p.RA=g.score[side==='top'?1:0];
  if(Number.isInteger(g.pitcherOuts?.[name]))p.IP=g.pitcherOuts[name]/2;
  const mine=side==='top'?0:1,won=score(g)?Number(g.score[mine]>g.score[1-mine]):null;
  list[name]={name,stats:{hitting:h,pitching:p},won};
 }
 return {game:g.id,ready:validated.ok,issues:validated.issues,players:list};
}
function aggregate(games,season,phase){
 const filtered=games.filter(g=>g.season===season&&g.phase===phase);
 const checked=filtered.map(oneGame),issues=checked.flatMap(x=>x.issues.map(issue=>x.game+': '+issue));
 const ready=checked.filter(x=>x.ready),out=[];
 for(const name of names){
  const relevant=checked.filter(x=>x.players[name]);
  if(!relevant.length)continue;
  const completed=ready.filter(x=>x.players[name]);const h={},p={},w=completed.reduce((n,g)=>n+(g.players[name].won===1),0),l=completed.reduce((n,g)=>n+(g.players[name].won===0),0);
  for(const key of countFields){const values=completed.map(g=>g.players[name].stats.hitting[key]);if(values.length&&values.every(number))h[key]=values.reduce((a,b)=>a+b,0);}
  const pitchFields=['IP','K','BB','HBP','HA','HRA','RA'];
  for(const key of pitchFields){const values=completed.map(g=>g.players[name].stats.pitching[key]);if(values.length&&values.every(number))p[key]=values.reduce((a,b)=>a+b,0);}
  const hitting=completed.length?rates(h):{},pitching={...p};
  if(p.IP>0&&number(p.RA))pitching.ERA=round(p.RA*3/p.IP);
  if(p.IP>0&&[p.HA,p.BB,p.HBP].every(number))pitching.WHIP=round((p.HA+p.BB+p.HBP)/p.IP);
  if(p.IP>0&&number(p.K))pitching['K/3']=round(p.K*3/p.IP,2);
  // A no-hitter requires an explicit official scoring check; never infer.
  out.push({name,record:completed.length?w+'-'+l:null,stats:{hitting,pitching,overall:{}},
    source:'VERIFIED GAME LOGS',games:completed.length,loggedGames:relevant.length,
    partial:completed.length!==relevant.length,issues:relevant.filter(x=>!x.ready).flatMap(x=>x.issues.map(y=>x.game+': '+y))});
 }
 return {season,phase,players:out,games:filtered.length,ready:ready.length,issues};
}
let cache={revision:-1,games:[],reg:{},post:{},issues:[]};
function snapshot(){
 const state=root.PCBLPlayDB?.status(),revision=state?.revision||0;
 if(cache.revision===revision)return cache;
 const games=(root.PCBLPlayDB?.games()||[]).filter(g=>/^S(?:[4-9]|[1-9]\d{1,})$/.test(g.season));
 const keys=[...new Set(games.map(g=>g.season))],reg={},post={};
 for(const s of keys){reg[s]=aggregate(games,s,'regular');post[s]=aggregate(games,s,'postseason');}
 cache={revision,games,reg,post,issues:[...Object.values(reg),...Object.values(post)].flatMap(x=>x.issues)};
 return cache;
}
function readyToReplace(profile,official,report){
 if(!profile||profile.partial||!profile.games)return false;
 const rec=String(official?.record||'').match(/^(\d+)-(\d+)$/);
 const expected=rec?Number(rec[1])+Number(rec[2]):0;
 return profile.games>=expected&&report.ready===report.games&&report.games>0;
}
function merge(base,phase){
 const src={...base},section=phase==='postseason'?'post':'reg';
 const report=snapshot()[section];
 for(const [season,result] of Object.entries(report)){
  if(!result.players.length)continue;
  const old=base?.[season]||[];
  const merged=new Map(old.map(p=>[p.name,p]));
  let applied=0;
  for(const p of result.players){
   const existing=merged.get(p.name);
   if(readyToReplace(p,existing,result)){merged.set(p.name,p);applied++;}
  }
  if(applied)src[season]=[...merged.values()];
 }
 return src;
}
function diagnostics(base={},phase='regular'){
 const report=snapshot()[phase==='postseason'?'post':'reg'],items=[];
 for(const [s,r] of Object.entries(report)){
  for(const p of r.players){const old=base[s]?.find(x=>x.name===p.name);items.push({season:s,name:p.name,logged:p.games,known:p.loggedGames,
    officialGames:String(old?.record||'').match(/^(\d+)-(\d+)$/)?.slice(1).reduce((a,b)=>a+Number(b),0)??0,
    authoritative:readyToReplace(p,old,r),pending:p.issues});}
 }
 return items;
}
return {inspectGame,oneGame,aggregate,snapshot,merge,diagnostics,score};
});
