/* PCBL Savant common source resolver.
   Official sheet totals take precedence for unfiltered season/postseason totals.
   Filtered matchups, parks and situations use the validated event registry.
   This module never mutates official numbers to reconcile archived discrepancies. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.PCBLUnified=api;
})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
let official=()=>root.PCBL_SNAPSHOT||{},postseason=()=>root.PCBL_POSTSEASON||{},revision=0,lastUpdate=null;
const names=['Auden','Jason','Jarvis','Najee','Coel'];
const countingH=['PA','AB','H','2B','3B','HR','BB','HBP','K','R','LATE RUNS'];
const countingP=['IP','K','BB','HBP','HA','HRA','RA','SV','SVO','NO HITTERS'];
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
function seasons(){
 return [...new Set([...Object.keys(official()||{}),...Object.keys(postseason()||{}),
 ...(root.PCBLPlayDB?.seasons()||[])].filter(s=>/^S\d+$/.test(s)))].sort((a,b)=>+a.slice(1)-+b.slice(1));
}
function source(name,season,phase){
 const list=phase==='postseason'?postseason():official();
 return (list?.[season]||[]).find(x=>x.name===name)||null;
}
function sumSeason(name,phase){
 const parts=seasons().map(s=>source(name,s,phase)).filter(Boolean);
 if(!parts.length)return null;
 const stats={hitting:{},pitching:{},overall:{}};
 for(const [side,keys] of [['hitting',countingH],['pitching',countingP]]){
  for(const key of keys){const n=parts.map(p=>p.stats?.[side]?.[key]).filter(numeric);
   if(n.length)stats[side][key]=n.reduce((a,b)=>a+b,0);
  }
 }
 const h=stats.hitting,p=stats.pitching;
 if(h.AB>0&&numeric(h.H))h.AVG=h.H/h.AB;
 if(h.PA>0&&[h.H,h.BB,h.HBP].every(numeric))h.OBP=(h.H+h.BB+h.HBP)/h.PA;
 if(h.AB>0&&['H','2B','3B','HR'].every(k=>numeric(h[k])))h.SLG=(h.H+h['2B']+2*h['3B']+3*h.HR)/h.AB;
 if(numeric(h.OBP)&&numeric(h.SLG))h.OPS=h.OBP+h.SLG;
 if(numeric(h.SLG)&&numeric(h.AVG))h.ISO=h.SLG-h.AVG;
 if(numeric(h.AB)&&h.HR>0)h['AB/HR']=h.AB/h.HR;
 if(numeric(h.H)&&['2B','3B','HR'].every(k=>numeric(h[k])))h.XBH=h['2B']+h['3B']+h.HR;
 if(p.IP>0){
  // These are weighted estimates when no career official summary exists.
  for(const key of ['ERA','WHIP']){
   const pairs=parts.map(x=>({n:x.stats?.pitching?.[key],w:x.stats?.pitching?.IP})).filter(x=>numeric(x.n)&&numeric(x.w)&&x.w>0);
   if(pairs.length)p[key]=pairs.reduce((s,x)=>s+x.n*x.w,0)/pairs.reduce((s,x)=>s+x.w,0);
  }
  if(numeric(p.K))p['K/3']=p.K*3/p.IP;
 }
 return {name,season:'ALL TIME',stats,source:'DERIVED FROM AVAILABLE OFFICIAL SEASONS',partial:parts.length<seasons().filter(s=>(phase==='postseason'?postseason():official())[s]?.length).length};
}
function combineProfiles(reg,post){
 const parts=[reg,post].filter(Boolean);
 if(!parts.length)return null;
 const stats={hitting:{},pitching:{},overall:{}};
 for(const [side,keys] of [['hitting',countingH],['pitching',countingP]])
  for(const key of keys){
   const values=parts.map(p=>p.stats?.[side]?.[key]).filter(numeric);
   if(values.length===parts.length)stats[side][key]=values.reduce((a,b)=>a+b,0);
  }
 const h=stats.hitting,p=stats.pitching;
 if(h.AB>0&&numeric(h.H))h.AVG=h.H/h.AB;
 if(h.PA>0&&[h.H,h.BB,h.HBP].every(numeric))h.OBP=(h.H+h.BB+h.HBP)/h.PA;
 if(h.AB>0&&['H','2B','3B','HR'].every(k=>numeric(h[k])))h.SLG=(h.H+h['2B']+2*h['3B']+3*h.HR)/h.AB;
 if(numeric(h.OBP)&&numeric(h.SLG))h.OPS=h.OBP+h.SLG;
 if(numeric(h.SLG)&&numeric(h.AVG))h.ISO=h.SLG-h.AVG;
 if(h.HR>0&&numeric(h.AB))h['AB/HR']=h.AB/h.HR;
 if(['2B','3B','HR'].every(k=>numeric(h[k])))h.XBH=h['2B']+h['3B']+h.HR;
 if(p.IP>0){
  for(const key of ['ERA','WHIP']){
   const entries=parts.map(x=>({w:x.stats?.pitching?.IP,v:x.stats?.pitching?.[key]}));
   if(entries.every(x=>numeric(x.w)&&x.w>=0&&numeric(x.v)))p[key]=entries.reduce((sum,x)=>sum+x.w*x.v,0)/p.IP;
  }
  if(numeric(p.K))p['K/3']=p.K*3/p.IP;
 }
 return {stats};
}
function officialProfile(name,season,phase){
 if(season!=='ALL TIME')return source(name,season,phase);
 const career=source(name,'ALL TIME',phase),derived=sumSeason(name,phase);
 if(phase==='postseason')return career||derived;
 // Only replace a career summary when a new official season is absent from
 // that summary's data source. Otherwise retain official career totals.
 const known=seasons().filter(s=>source(name,s,phase));
 const snapshotYears=Object.keys(root.PCBL_SNAPSHOT||{}).filter(s=>/^S\d+$/.test(s)&&root.PCBL_SNAPSHOT[s]?.some(p=>p.name===name));
 const added=known.some(s=>!snapshotYears.includes(s));
 return added&&derived?derived:career||derived;
}
function profile(name,season='ALL TIME',phase='regular',park='ALL'){
 const record=root.PCBLRecordStore?.get(name,season,phase,park);
 let p=park==='ALL'&&phase!=='both'?officialProfile(name,season,phase):null;
 let sourceType=p?(p.correction?'APPROVED HISTORICAL CORRECTION':'OFFICIAL '+(phase==='postseason'?'POSTSEASON':'REGULAR')+' SHEET'):null;
 if(park==='ALL'&&phase==='both'){
  const regular=officialProfile(name,season,'regular');
  const officialPost=officialProfile(name,season,'postseason');
  const loggedPost=!officialPost?root.PCBLParkStats?.profile(name,season,'ALL','postseason'):null;
  const playoff=officialPost||(loggedPost?.games?loggedPost:null);
  if(regular||playoff){
   p=combineProfiles(regular,playoff);
   sourceType=playoff?(officialPost?'COMBINED OFFICIAL SHEET':'OFFICIAL REGULAR + POSTSEASON LOG SAMPLE'):'OFFICIAL REGULAR · POSTSEASON TOTALS UNAVAILABLE';
   p.partial=!officialPost&&!!root.PCBLRecordStore?.hasGames(name,season,'postseason','ALL');
  }
 }
 if(!p){
  const eventProfile=root.PCBLParkStats?.profile(name,season,park,phase);
  if(eventProfile?.games){p=eventProfile;sourceType='RECORDED GAME EVENTS';}
 }
 if(!p&&root.PCBLRecordStore?.hasGames(name,season,phase,park)){p={name,stats:{hitting:{},pitching:{},overall:{}},source:'RECORD ONLY'};sourceType='RECORD ONLY';}
 if(!p)return null;
 return {...p,name,season,phase,park,source:sourceType,record:record?.text&&record.text!=='—'?record.text:p.record||null,
  recordVerified:!!record?.complete,recordSource:record?.source||'UNVERIFIED'};
}
function profiles(season='ALL TIME',phase='regular',park='ALL'){
 return names.map(name=>profile(name,season,phase,park)).filter(Boolean);
}
function validate(sourceData,kind='regular'){
 const problems=[];
 if(!sourceData||typeof sourceData!=='object'||Array.isArray(sourceData))return {ok:false,problems:['Invalid sheet data object']};
 const validKeys=Object.keys(sourceData).filter(s=>s==='ALL TIME'||/^S\d+$/.test(s));
 if(!validKeys.length)return {ok:false,problems:['No recognizable seasons']};
 for(const s of validKeys){
  if(!Array.isArray(sourceData[s]))return {ok:false,problems:[s+' is not a list']};
  const seen=new Set();
  for(const p of sourceData[s]){
   if(!p?.name||seen.has(p.name)||!p.stats?.hitting||!p.stats?.pitching){
    problems.push(s+': duplicate or malformed player '+(p?.name||'unknown'));continue;
   }
   seen.add(p.name);
   for(const side of ['hitting','pitching'])for(const [key,value] of Object.entries(p.stats[side])){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)problems.push(s+' '+p.name+' '+side+'.'+key+': invalid number');
   }
   const h=p.stats.hitting;
   if([h.PA,h.AB,h.BB,h.HBP].every(numeric)&&h.AB+h.BB+h.HBP>h.PA)
    problems.push(s+' '+p.name+': official PA '+h.PA+' below AB+BB+HBP '+(h.AB+h.BB+h.HBP));
  }
 }
 const fatal=problems.some(x=>/duplicate or malformed|invalid number/.test(x));
 return {ok:!fatal,problems,kind};
}
function report(){
 const reg=root.PCBLPlayDB?.reconcile(official())||[];
 const bad=reg.filter(x=>x.status!=='MATCH');
 const warnings=[...validate(official()).problems];
 const post=validate(postseason(),'postseason');
 if(Object.values(postseason()||{}).some(v=>Array.isArray(v)&&v.length))warnings.push(...post.problems);
 return {revision,updatedAt:lastUpdate,regular:{checked:reg.length,disagreements:bad.length,rows:reg},
  postseason:{seasons:Object.keys(postseason()||{}).filter(x=>/^S\d+$/.test(x)),issues:post.problems},warnings,
  games:root.PCBLPlayDB?.status()||null};
}
function signal(kind){
 revision++;lastUpdate=new Date().toISOString();
 if(typeof root.dispatchEvent==='function'&&typeof root.Event==='function')root.dispatchEvent(new root.Event('pcbl-data-updated'));
 return report();
}
/* Compatibility export for the legacy standalone comparison/calculator embeds.
   These two tools can consume the same source without maintaining old spreadsheets. */
function exportRows(){
 const rows=[],cols={Auden:1,Jason:3,Jarvis:5,Najee:11,Coel:13};
 const sections=[['ALL TIME','CAREER'],...seasons().map(s=>[s,'SEASON '+s.slice(1)])];
 const hKeys=['PA','AB','BA','OBP','SLG','OPS','K','H','2B','3B','HR','BB','HBP','R','AB/HR','XBH','LATE RUNS','K RATE','ISO','K/BB'];
 const pKeys=['ERA','WHIP','IP','K','BB','K/3','HBP','HA (HITS AGAINST)','HRA (HR AGAINST)','RA (Runs-Against)','SV/SVO','NO HITTERS'];
 function row(label,side,key,season){
  const cells=Array(16).fill('');cells[0]=label;
  for(const [name,col] of Object.entries(cols)){
   for(const [phase,offset] of [['regular',0],['postseason',1]]){
    const profile=officialProfile(name,season,phase);
    const stats=profile?.stats?.[side]||{};
    const actual=key==='BA'?'AVG':key==='K RATE'?'K RATE':key==='HA (HITS AGAINST)'?'HA':key==='HRA (HR AGAINST)'?'HRA':key==='RA (Runs-Against)'?'RA':key;
    if(key==='SV/SVO'&&Number.isFinite(stats.SV)&&Number.isFinite(stats.SVO))cells[col+offset]=stats.SV+'/'+stats.SVO;
    else if(Number.isFinite(stats[actual]))cells[col+offset]=String(stats[actual]);
   }
  }
  rows.push(cells);
 }
 for(const [season,label] of sections){
  const head=Array(16).fill('');head[0]='PLAYER';for(const [name,col] of Object.entries(cols)){head[col]=name.toUpperCase();head[col+1]=name.toUpperCase()+' (PLAYOFFS)';}rows.push(head);
  rows.push([label]);
  rows.push(['HITTING']);
  for(const key of hKeys)row(key,'hitting',key,season);
  rows.push(['PITCHING']);
  for(const key of pKeys)row(key,'pitching',key,season);
 }
 return rows;
}
function configure({getOfficial,getPostseason}={}){
 if(typeof getOfficial==='function')official=getOfficial;
 if(typeof getPostseason==='function')postseason=getPostseason;
}
return {configure,source,profile,profiles,seasons,validate,report,signal,exportRows,official:()=>official(),postseason:()=>postseason(),status:()=>({revision,lastUpdate})};
});
