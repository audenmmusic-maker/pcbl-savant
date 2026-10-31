/* PCBL W–L records: regular-season sheet totals + verified postseason summaries/game scores.
   Historical postseason summaries are transcribed from the official S1/S2 PCBL statistics.
   Do not infer a win from a game with no final score. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLRecordStore=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const historical={
  S1:{Auden:[1,2],Jason:[0,1],Jarvis:[2,0]},
  S2:{Auden:[0,1],Najee:[1,2],Jarvis:[2,0]}
};
let official=()=>root.PCBL_SNAPSHOT||{};
const valid=(score)=>Array.isArray(score)&&score.length===2&&score.every(x=>x!==null&&x!==''&&Number.isFinite(Number(x)))&&Number(score[0])!==Number(score[1]);
const seasons=()=>[...new Set([...Object.keys(official()||{}),...Object.keys(historical),...(root.PCBL_VERSUS||[]).map(g=>g.season)].filter(x=>/^S\d+$/.test(x)))].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
function games(name,season,phase,park){return (root.PCBL_VERSUS||[]).filter(g=>g.season===season&&g.phase===phase&&(g.top===name||g.bottom===name)&&(park==='ALL'||(g.events||[]).some(e=>root.PCBLParkData?.resolve(g,e)===park)));}
function fromScores(list,name){let w=0,l=0,missing=0;for(const g of list){if(!valid(g.score)){missing++;continue}const mine=Number(g.score[g.top===name?0:1]),them=Number(g.score[g.top===name?1:0]);if(mine>them)w++;else l++;}return {w,l,missing,known:w+l,total:list.length,source:'GAME SCORES',complete:missing===0};}
function one(name,season,phase,park){const logged=games(name,season,phase,park);
 if(park==='ALL'&&phase==='postseason'&&historical[season]?.[name]){const [w,l]=historical[season][name];return {w,l,known:w+l,total:Math.max(w+l,logged.length),missing:0,source:'OFFICIAL POSTSEASON SUMMARY',complete:true};}
 if(park==='ALL'&&phase==='regular'){
   const entry=(official()?.[season]||[]).find(p=>p.name===name);
   const match=String(entry?.record||'').match(/^(\d+)-(\d+)$/);
   if(match){const w=+match[1],l=+match[2];return {w,l,known:w+l,total:w+l,missing:0,source:'OFFICIAL REGULAR-SEASON SHEET',complete:true};}
 }
 return logged.length?fromScores(logged,name):null;
}
function get(name,season='ALL TIME',phase='regular',park='ALL'){
 const periods=season==='ALL TIME'?seasons():[season];let items=[];
 for(const s of periods){const phases=phase==='both'?['regular','postseason']:[phase];for(const p of phases){const part=one(name,s,p,park);if(part)items.push(part);}}
 if(!items.length)return {text:'—',w:null,l:null,known:0,missing:0,total:0,complete:false,source:'NO VERIFIED RECORD'};
 const w=items.reduce((x,r)=>x+r.w,0),l=items.reduce((x,r)=>x+r.l,0),missing=items.reduce((x,r)=>x+r.missing,0);
 const complete=missing===0,officialSources=items.every(r=>r.source.startsWith('OFFICIAL'));
 return {text:!w&&!l&&missing?'—':`${w}-${l}${complete?'':'*'}`,w,l,known:items.reduce((x,r)=>x+r.known,0),missing,total:items.reduce((x,r)=>x+r.total,0),complete,source:officialSources?'OFFICIAL SHEET / SUMMARY':'OFFICIAL + GAME LOGS'};
}
function hasGames(name,season,phase='postseason',park='ALL'){
 if(season==='ALL TIME')return seasons().some(s=>hasGames(name,s,phase,park));
 if(phase==='both')return hasGames(name,season,'regular',park)||hasGames(name,season,'postseason',park);
 return !!(phase==='postseason'&&park==='ALL'&&historical[season]?.[name])||games(name,season,phase,park).length>0;
}
return {get,seasons,hasGames,setOfficialProvider(fn){if(typeof fn==='function')official=fn;},historical};
});
