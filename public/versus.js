(() => {
  'use strict';
  let games=window.PCBL_VERSUS||[];const names=['Auden','Jason','Jarvis','Najee','Coel'];
  const byId=id=>document.getElementById(id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gameLabel=g=>`${g.season} · ${g.stage==='regular'?'REGULAR SEASON':g.stage==='wild_card'?'WILD CARD':'CHAMPIONSHIP'} GAME ${g.number}`;
  const scoreLabel=g=>g.score?`${g.top.toUpperCase()} ${g.score[0]}–${g.score[1]} ${g.bottom.toUpperCase()}`:'SCORE NOT LISTED IN LOG HEADING';
  const rate=n=>n===null?'—':n.toFixed(3).replace(/^0\./,'.');
  function selected(){return {b:byId('versusBatter').value,p:byId('versusPitcher').value,s:byId('versusSeason').value,phase:byId('versusPhase').value,game:byId('versusGame').value,park:byId('versusPark').value}}
  function tally(events){
    const a={PA:events.length,H:0,HR:0,BB:0,K:0,HBP:0,'1B':0,'2B':0,'3B':0,AB:0};
    for(const e of events){const r=e.result;if(r in a)a[r]++;if(['1B','2B','3B','HR'].includes(r))a.H++;if(!['BB','HBP'].includes(r))a.AB++}
    a.AVG=a.AB?a.H/a.AB:null;a.OBP=a.PA?(a.H+a.BB+a.HBP)/a.PA:null;
    a.SLG=a.AB?(a['1B']+2*a['2B']+3*a['3B']+4*a.HR)/a.AB:null;
    a.OPS=a.OBP!==null&&a.SLG!==null?a.OBP+a.SLG:null;return a;
  }
  function gameChoices(){
    const {s,phase,game}=selected();
    const available=games.filter(g=>(s==='ALL TIME'||g.season===s)&&(phase==='both'||g.phase===phase));
    const select=byId('versusGame');
    select.innerHTML='<option value="all">ALL MATCHING GAMES</option>'+available.map(g=>`<option value="${escape(g.id)}">${escape(gameLabel(g))}</option>`).join('');
    select.value=available.some(g=>g.id===game)?game:'all';
    return available;
  }
  function paint(){
    const available=gameChoices(),{b,p,s,phase,game,park}=selected();
    const scoped=available.filter(g=>game==='all'||g.id===game);
    const series=scoped.map(g=>({game:g,events:g.events.filter(e=>e.batter===b&&e.pitcher===p&&(park==='all'||window.PCBLParkData.resolve(g,e)===park))})).filter(x=>x.events.length);
    const a=tally(series.flatMap(x=>x.events));
    const source=typeof data!=='undefined'?data:(window.PCBL_SNAPSHOT||{});
    const official=source[s]?.find(x=>x.name===b)?.stats?.hitting;
    const opponent=source[s]?.find(x=>x.name===p)?.stats?.pitching;
    const blurb=series.length?`<span>${series.length} GAMES WITH RECORDED MATCHUP EVENTS</span><span>${a.PA} LOGGED PA</span>`:'<span>NO UNAMBIGUOUS GAME LOG EVENTS FOR THIS MATCHUP AND FILTER</span>';
    byId('versusContent').innerHTML=`<div class="versus-hero" style="--vb:${COLORS[b]};--vp:${COLORS[p]}"><div><small>AT THE PLATE</small><h3>${escape(b)}</h3></div><b>VS</b><div><small>ON THE MOUND</small><h3>${escape(p)}</h3></div></div><div class="versus-meta">${blurb}</div>${series.length?`<div class="versus-stat-grid">${[['PA',a.PA],['H',a.H],['HR',a.HR],['BB',a.BB],['K',a.K],['HBP',a.HBP],['AVG',rate(a.AVG)],['OBP',rate(a.OBP)],['SLG',rate(a.SLG)],['OPS',rate(a.OPS)]].map(([key,v])=>`<div class="versus-stat"><small>${key}</small><strong>${v}</strong></div>`).join('')}</div><details class="method"><summary>ADVANCED MATCHUP STATS</summary><div class="versus-stat-grid">${[["ISO",a.SLG===null||a.AVG===null?"—":rate(a.SLG-a.AVG)],["AB/HR",a.HR?(a.AB/a.HR).toFixed(2):"—"],["BABIP*",a.AB-a.K-a.HR>0?rate((a.H-a.HR)/(a.AB-a.K-a.HR)):"—"],["BB%",a.PA?(100*a.BB/a.PA).toFixed(1)+"%":"—"],["K%",a.PA?(100*a.K/a.PA).toFixed(1)+"%":"—"],["HR/PA",a.PA?rate(a.HR/a.PA):"—"],["TB",a["1B"]+2*a["2B"]+3*a["3B"]+4*a.HR]].map(([key,v])=>`<div class="versus-stat"><small>${key}</small><strong>${v}</strong></div>`).join("")}</div><p class="hint">Calculated only from recorded events in this matchup. BABIP* excludes sacrifice flies because they are not consistently logged.</p></details><div class="versus-game-head"><h3>GAME BY GAME</h3><button class="export" id="versusDownload">↓ DOWNLOAD CSV</button></div><div class="table-wrap"><table><thead><tr><th>GAME</th><th>RESULT</th><th>LOGGED PA</th><th>H</th><th>HR</th><th>BB</th><th>K</th><th>HBP</th><th>EVENTS</th></tr></thead><tbody>${series.map(({game:g,events})=>{const t=tally(events);return `<tr><td>${escape(gameLabel(g))}</td><td>${escape(scoreLabel(g))}</td><td>${t.PA}</td><td>${t.H}</td><td>${t.HR}</td><td>${t.BB}</td><td>${t.K}</td><td>${t.HBP}</td><td class="versus-events">${events.map(e=>`${e.inning}: ${e.result}`).join(' · ')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="versus-empty">TRY ANOTHER SEASON, GAME, OR OPPONENT. EXCLUDED OR UNRECORDED PLAYS ARE NOT ZEROES.</div>'}${s!=='ALL TIME'?`<p class="versus-context">OFFICIAL ${s} REGULAR SEASON CONTEXT FROM THE STAT SHEET: ${escape(b.toUpperCase())} OPS ${official?.OPS===undefined?'—':rate(official.OPS)} · ${escape(p.toUpperCase())} ERA ${opponent?.ERA===undefined?'—':Number(opponent.ERA).toFixed(2)}. THESE ARE FULL-SEASON STATS, NOT MATCHUP STATS.</p>`:''}`;
    const button=byId('versusDownload');
    if(button)button.onclick=()=>{
      const rows=[['Game ID','Season','Stage','Game','Header result','Event ID','Batter','Pitcher','Inning','Half','Event','Source paragraph']];
      for(const {game:g,events} of series)for(const e of events)rows.push([g.id,g.season,g.stage,g.number,scoreLabel(g),e.id,e.batter,e.pitcher,e.inning,e.half,e.result,e.sourceParagraph]);
      const body=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([body],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download=`pcbl-versus-${b}-${p}-${s}-${phase}-${game.replaceAll(':','-')}-${park.replaceAll(' ','_')}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
  for(const id of ['versusBatter','versusPitcher'])byId(id).innerHTML=names.map(n=>`<option value="${n}">${n.toUpperCase()}</option>`).join('');
  byId('versusBatter').value='Auden';byId('versusPitcher').value='Najee';
  for(const id of ['versusBatter','versusPitcher','versusSeason','versusPhase','versusGame','versusPark'])byId(id).addEventListener('change',paint);
  window.PCBLVersus={paint};
  window.addEventListener('pcbl-logs-updated',()=>{games=window.PCBL_VERSUS||[];const picker=byId('versusSeason'),value=picker.value;for(const s of [...new Set(games.map(g=>g.season))].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))))if(![...picker.options].some(o=>o.value===s))picker.add(new Option('SEASON '+s.slice(1),s));picker.value=value;if(location.hash==='#versus')paint()});
  if(location.hash==='#versus')paint();
})();
