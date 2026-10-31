(() => {
  'use strict';
  let source=window.PCBL_VERSUS||[];
  const archive=new Map(source.map(g=>[g.id,g]));
  const names=['Auden','Jason','Jarvis','Najee','Coel'];
  const excluded={};
  const slots=[];
  for(const season of [...new Set([1,2,3,...source.map(g=>Number(g.season.slice(1)))])].sort((a,b)=>a-b)){
    const code=`S${season}`;
    for(let game=1;game<=Math.max(season===3?12:9,...source.filter(g=>g.season===code&&g.stage==='regular').map(g=>g.number));game++)slots.push({season:code,stage:'regular',number:game,id:`${code}:regular:${game}`});
    slots.push({season:code,stage:'wild_card',number:1,id:`${code}:wild_card:1`});
    for(let game=1;game<=Math.max(2,...source.filter(g=>g.season===code&&g.stage==='championship').map(g=>g.number));game++)slots.push({season:code,stage:'championship',number:game,id:`${code}:championship:${game}`});
  }
  const byId=id=>document.getElementById(id);
  const A=()=>window.PCBLPitchingAdvanced;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slotLabel=s=>`${s.season} · ${s.stage==='regular'?'REG '+s.number:s.stage==='wild_card'?'WILD CARD':'CHAMPIONSHIP '+s.number}`;
  const status=s=>archive.has(s.id)?'logged':excluded[s.id]?'excluded':'upcoming';
  const outs=new Set(['K','GO','FO','PO','LO']);
  function runsAllowedFor(game,pitcher){
    if(!game||!Array.isArray(game.score))return null;
    if(game.top===pitcher)return Number(game.score[1]);
    if(game.bottom===pitcher)return Number(game.score[0]);
    return null;
  }
  function count(events,role){
    const c={PA:events.length,AB:0,H:0,HR:0,'1B':0,'2B':0,'3B':0,BB:0,HBP:0,K:0,outs:0,TB:0};
    for(const e of events){let r=e.result;if(r in c)c[r]++;if(['1B','2B','3B','HR'].includes(r)){c.H++;c.TB+=({'1B':1,'2B':2,'3B':3,HR:4})[r]}if(outs.has(r))c.outs++;if(!['BB','HBP'].includes(r))c.AB++}
    if(role==='hitting'){c.AVG=c.AB?c.H/c.AB:null;c.OBP=c.PA?(c.H+c.BB+c.HBP)/c.PA:null;c.SLG=c.AB?c.TB/c.AB:null;c.OPS=c.OBP!==null&&c.SLG!==null?c.OBP+c.SLG:null}
    else {c.BF=c.PA;c.IP=c.outs/2;c.HA=c.H;c.HRA=c.HR;c.WHIP=c.IP?(c.H+c.BB)/c.IP:null;c.K3=c.IP?c.K*3/c.IP:null}
    return c;
  }
  const rate=n=>n===null?'—':n.toFixed(3).replace(/^0\./,'.');
  const two=n=>n===null||n===undefined||!Number.isFinite(n)?'—':n.toFixed(2);
  const afmt=(n,k)=>{if(n===undefined||n===null||!Number.isFinite(n))return '—';if(['ERA+','FIP+'].includes(k))return n.toFixed(0);if(k.endsWith('%'))return n.toFixed(1)+'%';if(['OAVG','OOBP','OSLG','OOPS','OISO'].includes(k))return n.toFixed(3).replace(/^0\./,'.');return ['ERA','FIP','SIERA'].includes(k)?n.toFixed(2):Number.isInteger(n)?String(n):n.toFixed(2)};
  function stageMode(){return byId('rangeStage')?.value||'both'}
  function isStageMatch(slot,mode=stageMode()){return mode==='both'?true:mode==='regular'?slot.stage==='regular':slot.stage!=='regular'}
  function filteredSlots(){return slots.filter(s=>isStageMatch(s))}
  function inclusiveWindow(list,fromId,toId){
    const from=list.findIndex(s=>s.id===fromId),to=list.findIndex(s=>s.id===toId);
    if(from<0||to<0)return {selected:[],from:-1,to:-1};
    const lo=Math.min(from,to),hi=Math.max(from,to);
    // BOTH endpoints are intentionally included. A G1 → G11 range is G1,G2,…,G11.
    return {selected:list.filter((_,i)=>i>=lo&&i<=hi),from,to};
  }
  function selectOptions(preserve=false){
    const previousFrom=preserve?byId('rangeFrom').value:null,previousTo=preserve?byId('rangeTo').value:null;
    const visible=filteredSlots();
    const markup=visible.map(s=>`<option value="${s.id}" ${status(s)==='upcoming'?'disabled':''}>${esc(slotLabel(s))}${status(s)==='excluded'?' · LOG GAP':status(s)==='upcoming'?' · UPCOMING':''}</option>`).join('');
    for(const id of ['rangeFrom','rangeTo'])byId(id).innerHTML=markup;
    const firstPlayable=visible.find(s=>status(s)!=='upcoming')?.id||visible[0]?.id||'';
    const lastPlayable=[...visible].reverse().find(s=>status(s)!=='upcoming')?.id||visible.at(-1)?.id||firstPlayable;
    byId('rangeFrom').value=previousFrom&&visible.some(s=>s.id===previousFrom)?previousFrom:firstPlayable;
    byId('rangeTo').value=previousTo&&visible.some(s=>s.id===previousTo)?previousTo:lastPlayable;
    byId('rangePlayer').innerHTML='<option value="all">ALL PLAYERS</option>'+names.map(n=>`<option value="${n}">${n.toUpperCase()}</option>`).join('');
  }
  function scope(){
    const visible=filteredSlots();
    const rangeWindow=inclusiveWindow(visible,byId('rangeFrom').value,byId('rangeTo').value);
    const {selected,from,to}=rangeWindow;
    if(from<0||to<0)return {selected:[],gaps:[],events:[],from:0,to:0};
    const gaps=selected.filter(s=>!archive.has(s.id));
    const games=selected.map(s=>archive.get(s.id)).filter(Boolean);
    const player=byId('rangePlayer').value,park=byId('rangePark').value;
    const events=games.flatMap(g=>g.events.filter(e=>(player==='all'||e.batter===player||e.pitcher===player)&&(park==='all'||window.PCBLParkData.resolve(g,e)===park)).map(e=>({game:g,event:e})));
    return {selected,gaps,games,events,from,to};
  }
  function paint(){
    const {selected,gaps,games,events}=scope(),chosen=byId('rangePlayer').value;
    const featured=(chosen==='all'?names:[chosen]).map(name=>{
      const hit=events.filter(({event:e})=>e.batter===name).map(x=>x.event);
      const pitchedEntries=events.filter(({event:e})=>e.pitcher===name);
      const pitched=pitchedEntries.map(x=>x.event);
      let parkSets={};for(let x of events.filter(({event:e})=>e.batter===name||e.pitcher===name)){let park=window.PCBLParkData.resolve(x.game,x.event)||'UNASSIGNED';(parkSets[park]??=new Set()).add(x.game.id)}
      let hitLine=count(hit,'hitting'),pitLine=count(pitched,'pitching');
      const pitchedGames=[...new Map(pitchedEntries.map(x=>[x.game.id,x.game])).values()];
      pitLine.RA=pitchedGames.reduce((sum,g)=>{const ra=runsAllowedFor(g,name);return sum+(Number.isFinite(ra)?ra:0)},0);
      pitLine.ERA=pitLine.IP?(pitLine.RA*3/pitLine.IP):null;
      let seasonSet=[...new Set(pitchedEntries.map(x=>x.game.season))],baselineSeason=seasonSet.length===1?seasonSet[0]:'ALL TIME',profile={name,stats:{pitching:pitLine},source:'GAME LOG SPLIT'},adv=A()?.metricsFromEntries?.(profile,baselineSeason,pitched)||{};
      return {name,hit:hitLine,pit:pitLine,adv,parks:Object.entries(parkSets).map(([park,set])=>[park,set.size])};
    }).filter(x=>x.hit.PA||x.pit.PA);
    const logCount=games?.length||0;
    const endpointText=selected.length?`${slotLabel(selected[0])} → ${slotLabel(selected[selected.length-1])}`:'';
    byId('rangeCoverage').innerHTML=`<div class="range-coverage"><strong>${logCount} / ${selected.length} GAMES WITH READABLE PLAYS</strong><span>${events.length} COUNTED EVENTS${chosen==='all'?'':' INVOLVING '+esc(chosen.toUpperCase())}</span><span>INCLUSIVE RANGE · ${esc(endpointText)}</span></div>${gaps.length?`<div class="range-gaps"><strong>NOT COUNTED IN THIS WINDOW</strong><p>${gaps.map(s=>`${esc(slotLabel(s))} (${status(s)==='excluded'?'log gap':'not played / not logged'})`).join(' · ')}</p></div>`:''}`;
    byId('rangeContent').innerHTML=featured.length?`<div class="range-player-grid">${featured.map(({name,hit:h,pit:p,adv,parks})=>`<article class="range-player" style="--player:${COLORS[name]}"><button class="range-profile-trigger" type="button" aria-label="Toggle full profile for ${esc(name)}"><img src="assets/players/${name.toLowerCase()}.jpg" alt="" loading="lazy"><span><h3>${esc(name)}</h3><small>${parks.map(([park,count])=>`${esc(park)} ${count}`).join(" · ")}</small></span><b aria-hidden="true">↗</b></button><div class="range-sides"><div><small>HITTING · ${h.PA} LOGGED PA</small><div class="range-numbers">${[['OPS',rate(h.OPS)],['AVG',rate(h.AVG)],['HR',h.HR],['H',h.H],['BB',h.BB],['K',h.K]].map(([k,v])=>`<span><b>${v}</b>${k}</span>`).join('')}</div></div><div><small>PITCHING · ${p.PA} FACED</small><div class="range-numbers">${[['IP',p.PA?p.IP.toFixed(1):'—'],['ERA',two(p.ERA)],['WHIP',two(p.WHIP)],['K',p.K],['HA',p.H],['BB',p.BB]].map(([k,v])=>`<span><b>${v}</b>${k}</span>`).join('')}</div></div></div><details class="method range-detail"><summary>FULL ${esc(name.toUpperCase())} PROFILE</summary><div class="range-numbers">${[["PA",h.PA],["AB",h.AB],["OBP",rate(h.OBP)],["SLG",rate(h.SLG)],["ISO",h.SLG===null||h.AVG===null?"—":rate(h.SLG-h.AVG)],["AB/HR",h.HR?(h.AB/h.HR).toFixed(2):"—"],["BABIP*",h.AB-h.K-h.HR>0?rate((h.H-h.HR)/(h.AB-h.K-h.HR)):"—"],["BB%",h.PA?(100*h.BB/h.PA).toFixed(1)+"%":"—"],["K%",h.PA?(100*h.K/h.PA).toFixed(1)+"%":"—"],["ERA",two(p.ERA)],["RA",p.RA??'—'],["K/3",two(p.K3)],["HA/3",p.IP?(3*p.H/p.IP).toFixed(2):"—"],["HRA/3",p.IP?(3*p.HR/p.IP).toFixed(2):"—"],["BB/3",p.IP?(3*p.BB/p.IP).toFixed(2):"—"],["HBP/3",p.IP?(3*p.HBP/p.IP).toFixed(2):"—"],...(A()?.catalog||[]).map(([k])=>[A()?.display?.(k)||k,afmt(adv[k],k)])].map(([k,v])=>`<span><b>${v}</b>${k}</span>`).join("")}</div><p class="hint">From recorded plays within this range only. ERA in ranges is computed as official runs allowed from counted games × 3 ÷ logged IP. ERA+, FIP/FIP+, SIERA and opponent slash are then built from that selected window.</p></details></article>`).join('')}</div><div class="versus-game-head"><h3>COUNTED GAMES</h3></div><div class="table-wrap"><table><thead><tr><th>GAME</th><th>HEADER RESULT</th><th>PLAYER</th><th>PA</th><th>H</th><th>HR</th><th>BB</th><th>PITCH K</th><th>LOGGED IP</th></tr></thead><tbody>${games.flatMap(g=>(chosen==='all'?names:[chosen]).map(name=>{let h=count(g.events.filter(e=>e.batter===name&&(byId('rangePark').value==='all'||window.PCBLParkData.resolve(g,e)===byId('rangePark').value)),'hitting'),p=count(g.events.filter(e=>e.pitcher===name&&(byId('rangePark').value==='all'||window.PCBLParkData.resolve(g,e)===byId('rangePark').value)),'pitching');return h.PA||p.PA?`<tr><td>${esc(slotLabel(g))}</td><td>${g.score?`${esc(g.top)} ${g.score[0]}–${g.score[1]} ${esc(g.bottom)}`:'—'}</td><td style="color:${COLORS[name]}">${esc(name)}</td><td>${h.PA}</td><td>${h.H}</td><td>${h.HR}</td><td>${h.BB}</td><td>${p.K}</td><td>${p.PA?p.IP.toFixed(1):'—'}</td></tr>`:''})).join('')}</tbody></table></div>`:'<div class="versus-empty">NO READABLE PLAYS FOR THIS PLAYER IN THE SELECTED GAMES.</div>';
    byId('rangeDownload').disabled=!events.length;document.querySelectorAll('.range-profile-trigger').forEach(button=>button.onclick=()=>{let detail=button.closest('.range-player').querySelector('.range-detail');detail.open=!detail.open});
  }
  function download(){
    const {events}=scope(),rows=[['Game ID','Season','Stage','Game','Header result','Event ID','Batter','Pitcher','Inning','Half','Result','Source paragraph']];
    for(const {game:g,event:e} of events)rows.push([g.id,g.season,g.stage,g.number,g.score?`${g.top} ${g.score[0]}-${g.score[1]} ${g.bottom}`:'',e.id,e.batter,e.pitcher,e.inning,e.half,e.result,e.sourceParagraph]);
    const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download=`pcbl-range-${byId('rangeFrom').value.replaceAll(':','-')}-to-${byId('rangeTo').value.replaceAll(':','-')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  selectOptions();
  for(const id of ['rangeFrom','rangeTo'])byId(id).addEventListener('change',()=>{
    const visible=filteredSlots();
    const from=visible.findIndex(s=>s.id===byId('rangeFrom').value),to=visible.findIndex(s=>s.id===byId('rangeTo').value);
    if(from>to)byId(id==='rangeFrom'?'rangeTo':'rangeFrom').value=byId(id).value;
    paint();
  });
  byId('rangeStage').addEventListener('change',()=>{const player=byId('rangePlayer').value;selectOptions(true);byId('rangePlayer').value=player;paint()});
  byId('rangePlayer').addEventListener('change',paint);byId('rangePark').addEventListener('change',paint);
  byId('rangeDownload').addEventListener('click',download);
  window.PCBLRanges={paint,slots,scope};
  window.addEventListener('pcbl-logs-updated',()=>{
    source=window.PCBL_VERSUS||[];archive.clear();for(const game of source)archive.set(game.id,game);
    const next=[];for(const season of [...new Set([1,2,3,...source.map(g=>Number(g.season.slice(1)))])].sort((a,b)=>a-b)){
      const code=`S${season}`;
      for(let game=1;game<=Math.max(season===3?12:9,...source.filter(g=>g.season===code&&g.stage==='regular').map(g=>g.number));game++)next.push({season:code,stage:'regular',number:game,id:`${code}:regular:${game}`});
      next.push({season:code,stage:'wild_card',number:1,id:`${code}:wild_card:1`});
      for(let game=1;game<=Math.max(2,...source.filter(g=>g.season===code&&g.stage==='championship').map(g=>g.number));game++)next.push({season:code,stage:'championship',number:game,id:`${code}:championship:${game}`});
    }
    slots.splice(0,slots.length,...next);const player=byId('rangePlayer').value;selectOptions(true);byId('rangePlayer').value=player;
    if(location.hash==='#ranges')paint();
  });
  if(location.hash==='#ranges')paint();
})();
