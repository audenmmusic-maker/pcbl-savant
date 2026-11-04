/* Approved historical correction (2026-11-04).
 * PCBL scorer confirms Auden played 92 PA in S3. The six original
 * S3 regular-season game logs contain these 92 identified appearances.
 * Do not silently rewrite the original Google Sheet, pitching, runs,
 * other seasons, other players, or unverified situational plays.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLApprovedCorrections=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const approved={season:'S3',player:'Auden',PA:92,AB:57,H:23,K:17,BB:27,HBP:8,'2B':8,'3B':0,HR:10,gameIds:['S3:regular:1','S3:regular:2','S3:regular:4','S3:regular:6','S3:regular:7','S3:regular:9']};
const countKeys=['PA','AB','H','K','BB','HBP','2B','3B','HR'];
const round=(v,n)=>Number(v.toFixed(n));
function derive(h){
 const a=h.AB,pa=h.PA,hit=h.H,bb=h.BB,hbp=h.HBP,k=h.K,hr=h.HR,b2=h['2B'],b3=h['3B'];
 if([a,pa,hit,bb,hbp,k,hr,b2,b3].some(v=>typeof v!=='number'||!Number.isFinite(v)))return h;
 h.AVG=a?round(hit/a,3):0;
 h.OBP=pa?round((hit+bb+hbp)/pa,3):0;
 h.SLG=a?round((hit+b2+2*b3+3*hr)/a,3):0;
 h.OPS=round(h.OBP+h.SLG,3);
 h.ISO=round(h.SLG-h.AVG,3);
 h.XBH=b2+b3+hr;
 h['AB/HR']=hr?round(a/hr,2):0;
 h['K RATE']=pa?round(100*k/pa,2):0;
 h['K/BB']=bb?round(k/bb,2):0;
 return h;
}
function apply(data){
 if(!data||typeof data!=='object')return {applied:false,reason:'Missing stats'};
 const current=data[approved.season]?.find(p=>p.name===approved.player);
 if(!current?.stats?.hitting)return {applied:false,reason:'S3 Auden absent'};
 const h=current.stats.hitting;
 const before=h.PA;
 for(const key of countKeys)h[key]=approved[key];
 derive(h);
 current.correction='APPROVED 2026-11-04 · AUDEN S3 HISTORICAL 92 PA';
 // Career is a sum of season records for core batting counts, never
 // raw historical career figures with the old 109-PA S3 baked in.
 const career=data['ALL TIME']?.find(p=>p.name===approved.player);
 if(career?.stats?.hitting){
  const seasonCodes=Object.keys(data).filter(s=>/^S\d+$/.test(s)).sort((a,b)=>+a.slice(1)-+b.slice(1));
  const seasons=seasonCodes.map(s=>data[s]?.find(p=>p.name===approved.player)?.stats?.hitting).filter(p=>typeof p?.PA==='number'&&p.PA>0);
  const c=career.stats.hitting;
  for(const key of countKeys){
   if(seasons.length&&seasons.every(p=>typeof p[key]==='number'&&Number.isFinite(p[key])))c[key]=seasons.reduce((sum,p)=>sum+p[key],0);
  }
  derive(c);
  career.correction='CAREER BATTING TOTALS RECOMPUTED FROM CONFIRMED SEASON COUNTS';
 }
 return {applied:true,season:approved.season,player:approved.player,previousPA:before,approvedPA:approved.PA};
}
function lockedGames(original){
 const byId=new Map((original||[]).filter(g=>approved.gameIds.includes(g.id)&&g.phase==='regular'&&(g.top==='Auden'||g.bottom==='Auden')).map(g=>[g.id,g]));
 if(byId.size!==approved.gameIds.length)return {ok:false,reason:'Missing one or more S3 original Auden games'};
 const plays=[...byId.values()].flatMap(g=>g.events.filter(e=>e.batter==='Auden'));
 if(plays.length!==approved.PA)return {ok:false,reason:'Historical source does not contain exactly 92 Auden PA'};
 return {ok:true,byId,count:plays.length};
}
function lockGames(incoming,original){
 const pinned=lockedGames(original);
 if(!pinned.ok)return {ok:false,reason:pinned.reason};
 const seen=new Set();
 const games=(incoming||[]).map(g=>{if(pinned.byId.has(g.id)){seen.add(g.id);return pinned.byId.get(g.id);}return g;});
 for(const [id,game] of pinned.byId)if(!seen.has(id))games.push(game);
 return {ok:true,games,locked:seen.size,PA:pinned.count};
}
return {approved,apply,derive,lockGames,lockedGames};
});
