/* PCBL player-page season awards.
   Completed-season fallbacks mirror the official award definitions used by PCBL.
   A live Google Sheets parser attempts to replace those fallbacks whenever the
   official awards sheet is readable in-browser. Season 3 stays explicitly pending. */
(() => {
'use strict';
const SOURCE='https://docs.google.com/spreadsheets/d/1gezECkhcjpIDHBxClO9mLWrBK_2824lFabZFInJmCxo/edit?gid=0#gid=0';
const SHEET_ID='1gezECkhcjpIDHBxClO9mLWrBK_2824lFabZFInJmCxo';
const PLAYERS=['Auden','Jason','Jarvis','Najee','Coel'];
const COLORS={Auden:'#cbff87',Jason:'#fe9a74',Jarvis:'#9ac6ff',Najee:'#ceabff',Coel:'#ffce79'};
const META={
  'PCBL CHAMPION':{label:'PCBL CHAMPION',detail:'PETER COOPER CHAMPIONSHIP WINNER'},
  JUDGE:{label:'JUDGE',detail:'HIGHEST OPS',side:'hitting',stat:'OPS'},
  'DEMON FASTBALL':{label:'DEMON FASTBALL',detail:'LOWEST WHIP',side:'pitching',stat:'WHIP'},
  GIANCARLO:{label:'GIANCARLO',detail:'BEST AB/HR',side:'hitting',stat:'AB/HR'},
  'JOFUS SWOLE':{label:'JOFUS SWOLE',detail:'MOST HR',side:'hitting',stat:'HR'},
  'CY YOUNG':{label:'CY YOUNG',detail:'BEST OVERALL PITCHER'},
  BONDS:{label:'BONDS',detail:'BEST OVERALL HITTER'},
  'JOE CARTER':{label:'JOE CARTER',detail:'MOST 3RD+ INNING RUNS',side:'hitting',stat:'LATE RUNS'},
  SOTO:{label:'SOTO',detail:'HIGHEST OBP',side:'hitting',stat:'OBP'},
  GWYNN:{label:'GWYNN',detail:'HIGHEST AVG',side:'hitting',stat:'AVG'},
  MVP:{label:'MVP',detail:'BEST OVERALL PLAYER'}
};
const AWARD_ALIASES=[
  [/(?:PCBL|PETER\s+COOPER)?\s*CHAMPION(?:SHIP)?/i,'PCBL CHAMPION'],
  [/DEMON\s+FASTBALL/i,'DEMON FASTBALL'],[/JOFUS\s+SWOLE/i,'JOFUS SWOLE'],[/CY\s+YOUNG/i,'CY YOUNG'],[/JOE\s+CARTER/i,'JOE CARTER'],
  [/GIANCARLO/i,'GIANCARLO'],[/JUDGE/i,'JUDGE'],[/BONDS/i,'BONDS'],[/SOTO/i,'SOTO'],[/GWYNN/i,'GWYNN'],[/\bMVP\b/i,'MVP']
];
/* These are only used if the live awards sheet cannot be parsed. S1 used the
   league's original 20-PA rate qualifier; S2 used 30 PA. Shared statistical
   leads remain shared instead of inventing a tiebreaker. */
const FALLBACK={
  S1:{
    'PCBL CHAMPION':['Jarvis'],JUDGE:['Auden'],'DEMON FASTBALL':['Jarvis'],GIANCARLO:['Auden'],'JOFUS SWOLE':['Auden'],
    'CY YOUNG':['Jarvis'],BONDS:['Auden'],'JOE CARTER':['Jason','Jarvis'],SOTO:['Jarvis'],GWYNN:['Jarvis'],MVP:['Jarvis']
  },
  S2:{
    'PCBL CHAMPION':['Jarvis'],JUDGE:['Najee'],'DEMON FASTBALL':['Jarvis'],GIANCARLO:['Najee'],'JOFUS SWOLE':['Najee'],
    'CY YOUNG':['Jarvis'],BONDS:['Najee'],'JOE CARTER':['Auden'],SOTO:['Najee'],GWYNN:['Auden'],MVP:['Jarvis']
  }
};
let live=null, liveStatus='fallback';
const norm=s=>String(s??'').trim();
const upper=s=>norm(s).toUpperCase();
function seasonCode(text){const m=upper(text).match(/(?:SEASON|S)\s*([123])/);return m?'S'+m[1]:null}
function awardKey(text){for(const [rx,key] of AWARD_ALIASES)if(rx.test(String(text||'')))return key;return null}
function namesIn(text){const u=upper(text);return PLAYERS.filter(n=>new RegExp('\\b'+n.toUpperCase()+'\\b').test(u))}
function nearestSeason(rows,r,c){
  const same=(rows[r]||[]);for(let d=0;d<10;d++)for(const cc of [c-d,c+d])if(cc>=0&&cc<same.length){const s=seasonCode(same[cc]);if(s)return s}
  for(let rr=r;rr>=Math.max(0,r-18);rr--){for(let cc=Math.max(0,c-4);cc<=Math.min((rows[rr]||[]).length-1,c+4);cc++){const s=seasonCode(rows[rr][cc]);if(s)return s}}
  return null;
}
function nearbyNames(rows,r,c){
  const found=[]; const push=text=>{for(const n of namesIn(text))if(!found.includes(n))found.push(n)};
  push(rows[r]?.[c]);
  for(let d=1;d<=8;d++){push(rows[r]?.[c+d]);push(rows[r]?.[c-d]);}
  if(found.length)return found;
  for(let rr=r+1;rr<=Math.min(rows.length-1,r+4);rr++){
    let encounteredAward=false;
    for(let cc=Math.max(0,c-4);cc<=Math.min((rows[rr]||[]).length-1,c+8);cc++){
      const value=rows[rr][cc];if(awardKey(value)){encounteredAward=true;continue}push(value);
    }
    if(found.length||encounteredAward)break;
  }
  return found;
}
function parseRows(rows){
  const out={S1:{},S2:{},S3:{}};
  rows.forEach((row,r)=>row.forEach((cell,c)=>{
    const key=awardKey(cell);if(!key)return;
    const season=nearestSeason(rows,r,c);if(!season)return;
    const winners=nearbyNames(rows,r,c);if(winners.length)out[season][key]=winners;
  }));
  return out;
}
function snapshotProfile(name,season){return window.PCBL_SNAPSHOT?.[season]?.find(p=>p.name===name)||null}
function fmt(n,key){
  if(!Number.isFinite(n))return '';
  if(['AVG','OBP','SLG','OPS'].includes(key))return n.toFixed(3).replace(/^0\./,'.');
  if(['WHIP','AB/HR'].includes(key))return n.toFixed(2);
  return Number.isInteger(n)?String(n):n.toFixed(1);
}
function metricFor(name,season,key){const meta=META[key],p=snapshotProfile(name,season);if(!meta?.side||!p)return '';const n=p.stats?.[meta.side]?.[meta.stat];return Number.isFinite(n)?`${fmt(n,meta.stat)} ${meta.stat}`:''}
function awardsForSeason(season){return (live?.[season]&&Object.keys(live[season]).length?live[season]:FALLBACK[season])||{}}
function cardsFor(name,season){
  const source=awardsForSeason(season), cards=[];
  for(const key of Object.keys(META)){
    const winners=source[key]||[];if(!winners.includes(name))continue;
    cards.push({key,...META[key],shared:winners.length>1,metric:metricFor(name,season,key)});
  }
  return cards;
}
function cardHTML(a,season){return `<article class="season-award-card" style="--award-player:${COLORS[a.player]||'#cbff87'}"><div class="award-medallion" aria-hidden="true"><span>PCBL</span><b>${a.key==='MVP'?'MVP':'AWD'}</b></div><div class="season-award-copy"><small>${season.replace('S','SEASON ')} AWARD${a.shared?' · SHARED':''}</small><strong>${a.label}</strong><span>${a.detail}</span>${a.metric?`<em>${a.metric}</em>`:''}</div></article>`}
function renderSeason(name,season){
  if(season==='S3')return `<section class="season-awards-module pending"><div class="season-awards-head"><div><p class="eyebrow">SEASON 3</p><h3>SEASON AWARDS</h3></div><a class="export" href="${SOURCE}" target="_blank" rel="noopener">OFFICIAL AWARDS ↗</a></div><div class="award-pending"><strong>AWARDS PENDING</strong><span>Season 3 is still active. Final awards will appear here after they are awarded.</span></div></section>`;
  const cards=cardsFor(name,season).map(a=>cardHTML({...a,player:name},season));
  return `<section class="season-awards-module"><div class="season-awards-head"><div><p class="eyebrow">${season.replace('S','SEASON ')} / PLAYER HONORS</p><h3>SEASON AWARDS</h3></div><a class="export" href="${SOURCE}" target="_blank" rel="noopener">OFFICIAL AWARDS ↗</a></div>${cards.length?`<div class="season-awards-grid">${cards.join('')}</div>`:`<div class="award-empty">NO SEASON AWARDS RECORDED FOR ${name.toUpperCase()}.</div>`}<p class="season-awards-source">${liveStatus==='live'?'LIVE OFFICIAL AWARDS SHEET':'OFFICIAL-AWARD FALLBACK · LIVE SHEET CHECKING'} · Awards are season-level honors and do not change with park or postseason split filters.</p></section>`;
}
function render(name,season){
  if(season==='ALL TIME'){
    const groups=['S1','S2'].map(s=>({s,cards:cardsFor(name,s)})).filter(x=>x.cards.length);
    const total=groups.reduce((n,g)=>n+g.cards.length,0);
    return `<section class="season-awards-module career-awards"><div class="season-awards-head"><div><p class="eyebrow">CAREER / PLAYER HONORS</p><h3>SEASON AWARDS</h3></div><div class="career-award-count"><strong>${total}</strong><span>AWARD${total===1?'':'S'}</span></div></div>${groups.length?groups.map(g=>`<div class="career-award-group"><h4>${g.s.replace('S','SEASON ')}</h4><div class="season-awards-grid">${g.cards.map(a=>cardHTML({...a,player:name},g.s)).join('')}</div></div>`).join(''):`<div class="award-empty">NO COMPLETED-SEASON AWARDS RECORDED FOR ${name.toUpperCase()}.</div>`}<div class="award-pending compact"><strong>SEASON 3</strong><span>AWARDS PENDING</span></div><p class="season-awards-source">${liveStatus==='live'?'LIVE OFFICIAL AWARDS SHEET':'OFFICIAL-AWARD FALLBACK · LIVE SHEET CHECKING'}.</p></section>`;
  }
  return renderSeason(name,season);
}
function refreshPlayerIfOpen(){try{if(location.hash==='#players'&&typeof window.paintPlayers==='function')window.paintPlayers()}catch(_){} }
window.PCBL_AWARDS_LIVE=response=>{
  try{
    if(response?.status!=='ok'||!response.table?.rows)return;
    const rows=response.table.rows.map(row=>(row.c||[]).map(cell=>cell==null?'':String(cell.f??cell.v??'')));
    const parsed=parseRows(rows);
    if(Object.keys(parsed.S1||{}).length>=4||Object.keys(parsed.S2||{}).length>=4){live=parsed;liveStatus='live';refreshPlayerIfOpen();}
  }catch(_){/* fallback remains available */}
};
window.PCBLSeasonAwards={render,awardsForSeason,cardsFor,source:SOURCE,status:()=>liveStatus};
const script=document.createElement('script');
script.async=true;
script.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=0&tqx=responseHandler:PCBL_AWARDS_LIVE`;
script.onerror=()=>{liveStatus='fallback'};
document.head.appendChild(script);
})();
