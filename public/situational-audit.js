/* PCBL Savant: non-destructive verification of game-log counting against official season totals.
 * Never adjust individual inning/base-state results to make totals match.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLSituationalAudit=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const hitTypes=new Set(['1B','2B','3B','HR']);
const counting=['PA','AB','H','2B','3B','HR','BB','HBP','K'];
function counts(events){const c=Object.fromEntries(counting.map(k=>[k,0]));for(const e of events){c.PA++;if(e.result!=='BB'&&e.result!=='HBP')c.AB++;if(hitTypes.has(e.result))c.H++;if(Object.hasOwn(c,e.result))c[e.result]++;}return c;}
function audit(games,official,requestedSeason='ALL',requestedPlayer='ALL'){
 const periods=[...new Set([...Object.keys(official||{}),...(games||[]).map(g=>g.season)])].filter(s=>/^S\d+$/.test(s)).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
 const out=[];
 for(const s of periods){if(requestedSeason!=='ALL'&&s!==requestedSeason)continue;
  const roster=official?.[s]||[],regular=(games||[]).filter(g=>g.season===s&&g.stage==='regular');
  const names=[...new Set([...roster.map(p=>p.name),...regular.flatMap(g=>[g.top,g.bottom])])].filter(Boolean);
  for(const name of names){if(requestedPlayer!=='ALL'&&name!==requestedPlayer)continue;
   const source=roster.find(p=>p.name===name),expected=source?.stats?.hitting||{};
   const participant=regular.filter(g=>g.top===name||g.bottom===name);
   const logged=counts(regular.flatMap(g=>g.events||[]).filter(e=>e.batter===name));
   const officialPA=Number(expected.PA),hasOfficial=expected.PA!=null&&Number.isFinite(officialPA);
   if(!participant.length&&!(hasOfficial&&officialPA>0))continue;
   const rec=String(source?.record||'').match(/^(\d+)\s*-\s*(\d+)$/);
   const recordGames=rec?Number(rec[1])+Number(rec[2]):null;
   const differences=Object.fromEntries(counting.filter(k=>expected[k]!=null&&Number.isFinite(Number(expected[k]))&&logged[k]!==Number(expected[k])).map(k=>[k,logged[k]-Number(expected[k])]));
   const parts=['AB','BB','HBP'].map(k=>expected[k]!=null?Number(expected[k]):NaN);
   const minimumPA=parts.every(Number.isFinite)?parts.reduce((a,b)=>a+b,0):null;
   const sheetOvercount=hasOfficial&&minimumPA!==null?Math.max(0,minimumPA-officialPA):0;
   out.push({season:s,player:name,logged,official:expected,officialPA:hasOfficial?officialPA:null,games:participant.length,recordGames,delta:hasOfficial?logged.PA-officialPA:null,differences,minimumPA,sheetOvercount,matched:hasOfficial&&sheetOvercount===0&&Object.keys(differences).length===0&&(!recordGames||recordGames===participant.length)});
  }
 }
 return out;
}
return {counts,audit};
});
