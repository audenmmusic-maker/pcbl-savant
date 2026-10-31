/* Canonical PCBL game/event registry; official sheet totals remain independent.
   Every derived module reads the same validated game and event identities. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLPlayDB=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const allowed=new Set(['BB','HBP','K','GO','FO','PO','LO','1B','2B','3B','HR']);
let state={games:[],plays:[],issues:[],revision:0,origin:'saved snapshot'};
function validate(input){
 const issues=[],games=[],plays=[],ids=new Set(),events=new Set();
 if(!Array.isArray(input))return {ok:false,issues:['Dataset not an array'],games,plays};
 for(const g of input){
  if(!g||!/^S[1-9]\d*:(regular|wild_card|championship):\d+$/.test(g.id||'')||
    g.id!==[g.season,g.stage,g.number].join(':')||!g.top||!g.bottom||g.top===g.bottom||
    !['regular','wild_card','championship'].includes(g.stage)||
    g.phase!==(g.stage==='regular'?'regular':'postseason')||!Array.isArray(g.events)){
   issues.push('Invalid game '+String(g?.id));continue;
  }
  if(ids.has(g.id)){issues.push('Duplicate game '+g.id);continue;}ids.add(g.id);
  let cleaned={...g,events:[]};
  for(let i=0;i<g.events.length;i++){
   const e=g.events[i],id=String(e?.id||'');
   if(!e||!id.startsWith(g.id+':')||!allowed.has(e.result)||!Number.isInteger(Number(e.inning))||
      Number(e.inning)<1||!['top','bottom'].includes(e.half)||!e.batter||!e.pitcher||events.has(id)){
    issues.push('Invalid or duplicate event '+(id||g.id+':'+(i+1)));continue;
   }
   events.add(id);
   const event={...e,gameId:g.id,season:g.season};
   cleaned.events.push(event);plays.push({game:cleaned,event,id,season:g.season,stage:g.stage,phase:g.phase});
  }
  games.push(cleaned);
 }
 return {ok:issues.length===0,issues,games,plays};
}
function replace(input,origin){
 const result=validate(input);
 if(!result.ok)return {ok:false,issues:result.issues,revision:state.revision};
 const prior=new Map(state.games.map(g=>[g.id,g]));
 const drift=result.games.filter(g=>prior.has(g.id)&&prior.get(g.id).events.length!==g.events.length).map(g=>({game:g.id,previous:prior.get(g.id).events.length,current:g.events.length}));
 state={...result,origin:origin||'verified source',revision:state.revision+1,drift};
 root.PCBL_VERSUS=state.games;
 return {ok:true,revision:state.revision,games:state.games.length,plays:state.plays.length,issues:[],drift};
}
function games(){return state.games;}
function events(f={}){
 return state.plays.filter(row=>(!f.season||f.season==='ALL'||f.season==='ALL TIME'||row.season===f.season)&&
 (!f.phase||f.phase==='both'||row.phase===f.phase)&&(!f.stage||row.stage===f.stage)&&
 (!f.game||row.game.id===f.game)&&(!f.player||f.player==='ALL'||row.event[f.side==='pitching'?'pitcher':'batter']===f.player)&&
 (!f.park||f.park==='ALL'||root.PCBLParkData?.resolve(row.game,row.event)===f.park));
}
function count(input){
 const c={PA:0,AB:0,H:0,'1B':0,'2B':0,'3B':0,HR:0,BB:0,HBP:0,K:0,OUT:0,TB:0};
 for(const row of input){const r=(row.event||row).result;
  c.PA++;if(r!=='BB'&&r!=='HBP')c.AB++;
  if(Object.prototype.hasOwnProperty.call(c,r))c[r]++;
  if(['1B','2B','3B','HR'].includes(r)){c.H++;c.TB+=r==='HR'?4:Number(r[0]);}
  if(['K','GO','FO','PO','LO'].includes(r))c.OUT++;
 }
 c.AVG=c.AB?c.H/c.AB:null;c.OBP=c.PA?(c.H+c.BB+c.HBP)/c.PA:null;c.SLG=c.AB?c.TB/c.AB:null;
 c.OPS=c.OBP===null||c.SLG===null?null:c.OBP+c.SLG;
 return c;
}
function seasons(){return [...new Set(games().map(g=>g.season))].sort((a,b)=>+a.slice(1)-+b.slice(1));}
function reconcile(official){
 const src=official||root.PCBLGetOfficialSeasonStats?.()||root.PCBL_SNAPSHOT||{},rows=[];
 const keys=[...new Set([...seasons(),...Object.keys(src).filter(s=>/^S\d+$/.test(s))])].sort((a,b)=>+a.slice(1)-+b.slice(1));
 for(const season of keys){
  const roster=src[season]||[],seasonGames=games().filter(g=>g.season===season&&g.phase==='regular');
  const names=new Set([...roster.map(p=>p.name),...seasonGames.flatMap(g=>[g.top,g.bottom])]);
  for(const name of names){
   const officialEntry=roster.find(p=>p.name===name),stats=officialEntry?.stats?.hitting||{};
   const actual=count(events({season,phase:'regular',player:name})),fields=['PA','AB','H','2B','3B','HR','BB','HBP','K'];
   const delta=Object.fromEntries(fields.filter(k=>Number.isFinite(stats[k])&&actual[k]!==stats[k]).map(k=>[k,actual[k]-stats[k]]));
   const officialPA=Number.isFinite(stats.PA)?stats.PA:null;
   const sum=['AB','BB','HBP'].every(k=>Number.isFinite(stats[k]))?stats.AB+stats.BB+stats.HBP:null;
   const record=String(officialEntry?.record||'').match(/^(\d+)-(\d+)$/),officialGames=record?+record[1]+ +record[2]:null;
   const loggedGames=seasonGames.filter(g=>g.top===name||g.bottom===name).length;
   const status=officialPA===null?'NO_OFFICIAL_SOURCE':sum!==null&&sum>officialPA?'SHEET_ARITHMETIC':Object.keys(delta).length||officialGames!==null&&officialGames!==loggedGames?'LOG_DISCREPANCY':'MATCH';
   rows.push({season,player:name,status,officialPA,loggedPA:actual.PA,differences:delta,minimumPA:sum,loggedGames,officialGames});
  }
 }
 return rows;
}
function status(){return {origin:state.origin,games:state.games.length,events:state.plays.length,issues:state.issues.slice(),drift:state.drift||[],revision:state.revision};}
replace(root.PCBL_VERSUS||[],'saved snapshot');
return {games,events,replace,validate,count,seasons,reconcile,status};
});
