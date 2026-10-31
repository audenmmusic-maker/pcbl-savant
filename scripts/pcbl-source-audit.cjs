const fs=require('node:fs'),path=require('node:path');
const parser=require('../public/live-log-parser.js');
const games=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/versus-data.js'),'utf8').replace(/^window\.PCBL_VERSUS=/,'').replace(/;\s*$/,''));
const url='https://script.google.com/macros/s/AKfycbxSI52w-E4npPqCYLN9Cx6HLL28bczuOyjxbe0r2R4rqCtUSQg9Ssj56CMHA1cLUiU/exec';
async function run(){
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000)});
 const text=await response.text();
 console.log('Bridge:',response.status,response.url.replace(/\/\/[^/]+.*/, '//[Google endpoint]'), 'bytes',text.length);
 if(!response.ok)throw Error('Google Docs bridge HTTP '+response.status);
 const marker='PCBLReceiveLogTabs(';
 const pos=text.indexOf(marker);
 if(pos<0)throw Error('Bridge did not return expected JSONP receiver');
 let body=text.slice(pos+marker.length).trim().replace(/\);?\s*$/,'');
 const payload=JSON.parse(body);
 if(!Array.isArray(payload.tabs))throw Error('No documented season tabs received');
 console.log('Live season tabs:',payload.tabs.map(x=>x.title).join(', '));
 for(const tab of payload.tabs){
  let parsed;try{parsed=parser.parseTab(tab,games)}catch(e){console.log('Cannot parse tab '+tab.title+': '+e.message);continue;}
  console.log('Season',parsed.season,'games',parsed.games.length,'issues',parsed.issues.length);
  for(const live of parsed.games){
   const old=games.find(g=>g.id===live.id);
   const count=(g,n)=>g?g.events.filter(e=>e.batter===n).length:0;
   const names=[...new Set([live.top,live.bottom,old?.top,old?.bottom].filter(Boolean))];
   const diffs=names.map(n=>n+':'+count(old,n)+'->'+count(live,n)).filter(v=>{let a=v.split(':')[1].split('->');return a[0]!==a[1]});
   if(!old||old.events.length!==live.events.length||diffs.length){
    console.log(live.id,'total',old?.events.length??'missing','->',live.events.length,'batters',diffs.join(' '));
    const first=live.events.findIndex((e,i)=>!old?.events[i]||e.result!==old.events[i].result||e.batter!==old.events[i].batter||e.inning!==old.events[i].inning||e.half!==old.events[i].half);
    if(first>=0)console.log(' first divergent event index',first+1,'source paragraph',live.events[first]?.sourceParagraph??'unknown');
   }
  }
  if(parsed.issues.length)console.log('First parsing issues:',parsed.issues.slice(0,4));
 }
}
run().catch(e=>{console.error('Source audit unavailable: '+e.message);process.exitCode=1;});
