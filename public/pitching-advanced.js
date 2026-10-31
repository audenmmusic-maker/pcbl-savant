/* PCBL advanced pitching metrics.
   Official sheet totals remain authoritative for ERA/IP/K/BB/HBP/HRA.
   Game-log events supply opponent slash lines. Classified out types are used internally only for the PCBL SIERA estimate. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PCBLPitchingAdvanced=api;
})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const OUTS=new Set(['K','GO','FO','PO','LO']);
const HIT_TYPES=new Set(['1B','2B','3B','HR']);
let officialProvider=()=>root.PCBL_SNAPSHOT||{};
const safe=(n,d)=>Number.isFinite(n)&&Number.isFinite(d)&&d>0?n/d:undefined;

const catalog=[
  ['ERA+','League-relative ERA (100 = league average)'],
  ['FIP','PCBL fielding-independent pitching, scaled to the PCBL ERA environment'],
  ['FIP+','League-relative PCBL FIP (100 = league average)'],
  ['SIERA','PCBL-calibrated SIERA estimate from readable game-log outcomes'],
  ['K%','Strikeouts per logged batter faced'],
  ['BB%','Walks per logged batter faced'],
  ['K-BB%','Strikeout rate minus walk rate'],
  ['HBP%','Hit batters per logged batter faced'],
  ['HR%','Home runs allowed per logged batter faced'],
  ['OAVG','Opponent batting average from readable game-log PAs'],
  ['OOBP','Opponent on-base percentage from readable game-log PAs'],
  ['OSLG','Opponent slugging from readable game-log PAs'],
  ['OOPS','Opponent OPS from readable game-log PAs'],
  ['OISO','Opponent isolated power from readable game-log PAs']
];
const labels={
  'OAVG':'OPP AVG','OOBP':'OPP OBP','OSLG':'OPP SLG','OOPS':'OPP OPS','OISO':'OPP ISO'
};
const lowerBetter=new Set(['FIP','SIERA','BB%','HBP%','HR%','OAVG','OOBP','OSLG','OOPS','OISO']);
const neutral=new Set();

function setOfficialProvider(fn){if(typeof fn==='function')officialProvider=fn;}
function games(){return root.PCBL_VERSUS||[];}
function parkFor(game,event){return root.PCBLParkData?.resolve?.(game,event)||null;}
function entries(season='ALL TIME',phase='regular',park='ALL',pitcher=null){
  return games().filter(g=>(season==='ALL TIME'||g.season===season)&&(phase==='both'||g.phase===phase))
    .flatMap(game=>game.events.map(event=>({game,event,park:parkFor(game,event)})))
    .filter(x=>(park==='ALL'||park==='all'||x.park===park)&&(!pitcher||x.event.pitcher===pitcher));
}
function tally(list){
  const s={BF:0,AB:0,H:0,HR:0,BB:0,HBP:0,K:0,TB:0,GO:0,FO:0,PO:0,LO:0,OUTS:0};
  for(const x of list){
    const e=x.event||x,r=e?.result;if(!r)continue;s.BF++;
    if(r==='BB')s.BB++;else if(r==='HBP')s.HBP++;else s.AB++;
    if(r==='K')s.K++;
    if(HIT_TYPES.has(r)){s.H++;s.TB+=({['1B']:1,['2B']:2,['3B']:3,HR:4})[r];if(r==='HR')s.HR++;}
    if(['GO','FO','PO','LO'].includes(r))s[r]++;
    if(OUTS.has(r))s.OUTS++;
  }
  s.IP=s.OUTS/2;
  s['K%']=safe(s.K*100,s.BF);s['BB%']=safe(s.BB*100,s.BF);s['K-BB%']=Number.isFinite(s['K%'])&&Number.isFinite(s['BB%'])?s['K%']-s['BB%']:undefined;
  s['HBP%']=safe(s.HBP*100,s.BF);s['HR%']=safe(s.HR*100,s.BF);
  s.OAVG=safe(s.H,s.AB);s.OOBP=safe(s.H+s.BB+s.HBP,s.BF);s.OSLG=safe(s.TB,s.AB);s.OOPS=Number.isFinite(s.OOBP)&&Number.isFinite(s.OSLG)?s.OOBP+s.OSLG:undefined;s.OISO=Number.isFinite(s.OSLG)&&Number.isFinite(s.OAVG)?s.OSLG-s.OAVG:undefined;
  return s;
}
function officialLeague(season='ALL TIME'){
  const source=officialProvider()||root.PCBL_SNAPSHOT||{},profiles=source[season]||root.PCBL_SNAPSHOT?.[season]||[];
  const t={IP:0,HRA:0,BB:0,HBP:0,K:0,RA:0};
  for(const p of profiles){const pi=p?.stats?.pitching||{};if(!(pi.IP>0))continue;for(const k of Object.keys(t))t[k]+=Number(pi[k])||0;}
  if(!(t.IP>0))return {};
  const era=safe(t.RA*3,t.IP);
  // MLB FIP event weights are divided by three because PCBL ERA is runs per 3 innings, not per 9.
  const raw=safe((13*t.HRA+3*(t.BB+t.HBP)-2*t.K),t.IP*3);
  return {era,rawFIP:raw,fipConstant:Number.isFinite(era)&&Number.isFinite(raw)?era-raw:undefined,totals:t};
}
function fipRaw(pi){return pi?.IP>0?safe(13*(Number(pi.HRA)||0)+3*((Number(pi.BB)||0)+(Number(pi.HBP)||0))-2*(Number(pi.K)||0),Number(pi.IP)*3):undefined;}
function rawSIERA(line){
  if(!(line?.BF>0))return undefined;
  const k=line.K/line.BF,bb=line.BB/line.BF,net=(line.GO-line.FO-line.PO)/line.BF;
  if(!(line.GO+line.FO+line.PO+line.LO))return undefined;
  const signedSquare=(net>=0?-1:1)*6.664*net*net;
  return 6.145-16.986*k+11.434*bb-1.858*net+7.653*k*k+signedSquare+10.130*k*net-5.195*bb*net;
}
function sieraConstant(season='ALL TIME'){
  const base=officialLeague(season),leagueLine=tally(entries(season,'regular','ALL',null)),raw=rawSIERA(leagueLine);
  return Number.isFinite(base.era)&&Number.isFinite(raw)?base.era-raw:undefined;
}
function metricsFromLine(profile,season,log){
  if(!profile)return {};
  const pi=profile.stats?.pitching||{},base=officialLeague(season),out={};
  if(Number.isFinite(pi.ERA)&&pi.ERA>0&&Number.isFinite(base.era))out['ERA+']=100*base.era/pi.ERA;
  const raw=fipRaw(pi);
  if(Number.isFinite(raw)&&Number.isFinite(base.fipConstant)){
    out.FIP=raw+base.fipConstant;
    if(out.FIP>0&&Number.isFinite(base.era))out['FIP+']=100*base.era/out.FIP;
  }
  const sRaw=rawSIERA(log),sConst=sieraConstant(season);
  if(Number.isFinite(sRaw)&&Number.isFinite(sConst))out.SIERA=sRaw+sConst;
  for(const k of ['K%','BB%','K-BB%','HBP%','HR%','OAVG','OOBP','OSLG','OOPS','OISO'])if(Number.isFinite(log[k]))out[k]=log[k];
  out.__log=log;out.__baseline=base;return out;
}
function metrics(profile,season='ALL TIME',opts={}){
  if(!profile)return {};
  const name=opts.name||profile.name,phase=opts.phase||profile.phase||'regular',park=opts.park||profile.park||'ALL';
  return metricsFromLine(profile,season,tally(entries(season,phase,park,name)));
}
function metricsFromEntries(profile,season='ALL TIME',list=[]){return metricsFromLine(profile,season,tally(list));}
function display(key){return labels[key]||key;}
function isLowerBetter(key){return lowerBetter.has(key);}
function isNeutral(key){return neutral.has(key);}
function supports(key){return catalog.some(([k])=>k===key);}
return {catalog,labels,display,isLowerBetter,isNeutral,supports,setOfficialProvider,entries,tally,officialLeague,metrics,metricsFromEntries,rawSIERA};
});
