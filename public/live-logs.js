(() => {
  'use strict';
  // The one Apps Script endpoint supplies complete game-log paragraphs.
  // Events and park labels are parsed independently from the SAME payload.
  const url=window.PCBL_LOG_SOURCE_URL;
  const show=message=>document.querySelectorAll('[data-log-sync]').forEach(el=>el.textContent=message);
  if(!url){show('VERIFIED GAME + PARK SNAPSHOT');return;}
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(url)){
    show('LOG SYNC SETUP ERROR · USING SNAPSHOT');return;
  }
  const initial=window.PCBL_VERSUS||[];
  let current=null,timer=null,refresh=null,live=false;
  function schedule(ms){clearTimeout(refresh);refresh=setTimeout(load,ms)}
  function finish(request){if(current!==request)return false;clearTimeout(timer);request.script.remove();current=null;return true}
  function failure(request,reason){if(!finish(request))return;show(live?'LIVE GAME LOGS + PARKS · LAST UPDATE RETAINED · REFRESH '+reason:'GAME LOG CONNECTION '+reason+' · VERIFIED GAME + PARK SNAPSHOT ACTIVE');schedule(900000)}
  window.PCBLReceiveLogTabs=payload=>{
    const request=current;if(!request)return;
    try{
      const result=window.PCBLLogParser.merge(payload,window.PCBL_VERSUS||initial);
      if(!result.updatedSeasons.length)throw Error('Missing season tabs');
      const check=window.PCBLPlayDB.replace(result.games,'live game logs');
            if(!check.ok)throw Error('Game log validation failed: '+check.issues.join('; '));
            const parkSync=window.PCBLParkData?.acceptTabs(payload.tabs,window.PCBLPlayDB.games())||{updated:0,issues:[]};
            window.PCBL_VERSUS=window.PCBLPlayDB.games();
      window.PCBL_PARK_SYNC={liveParks:parkSync.updated,parkIssues:parkSync.issues,gameIssues:result.issues,updatedAt:new Date().toISOString()};
      live=true;
      finish(request);
      const issues=result.issues.length+parkSync.issues.length+(accepted.drift?.length||0);
      const mapped=result.games.filter(g=>window.PCBLParkData?.gameParks(g).length).length;show('LIVE GAME LOGS · '+mapped+' GAME'+(mapped===1?'':'S')+' WITH VERIFIED PARKS · '+parkSync.updated+' FROM GAME PAGES · '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+(issues?' · '+issues+' NEED REVIEW':''));
      if(issues)console.warn('PCBL game and park review:',result.issues,parkSync.issues,'Changed game event counts:',accepted.drift);
      window.dispatchEvent(new Event('pcbl-logs-updated'));
      schedule(900000);
    }catch(e){console.warn('PCBL live game and park update rejected:',e);failure(request,'INVALID')}
  };
  function load(){if(current)return;const script=document.createElement('script'),request={script};current=request;
    timer=setTimeout(()=>failure(request,'TIMED OUT'),45000);
    script.onerror=()=>failure(request,'UNAVAILABLE');
    script.src=url+(url.includes('?')?'&':'?')+'v='+Date.now();
    document.head.appendChild(script);
    if(!live)show('CHECKING LIVE GAME LOGS · VERIFIED PARK SNAPSHOT ACTIVE');
  }
  window.PCBLRefreshLogs=()=>{clearTimeout(refresh);load()};
  load();
})();
