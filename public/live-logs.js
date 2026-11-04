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
  const initial=window.PCBLPlayDB?.games()||window.PCBL_VERSUS||[];
  const LOG_REFRESH_MS=300000;
  let current=null,timer=null,refresh=null,live=false,lastAttempt=0;
  function schedule(ms){clearTimeout(refresh);refresh=setTimeout(load,ms)}
  function finish(request){if(current!==request)return false;clearTimeout(timer);request.script.remove();current=null;return true}
  function failure(request,reason){if(!finish(request))return;show(live?'LIVE GAME LOGS + PARKS · LAST UPDATE RETAINED · REFRESH '+reason:'GAME LOG CONNECTION '+reason+' · VERIFIED GAME + PARK SNAPSHOT ACTIVE');schedule(LOG_REFRESH_MS)}
  window.PCBLReceiveLogTabs=payload=>{
    const request=current;if(!request)return;
    try{
      const result=window.PCBLLogParser.merge(payload,window.PCBL_VERSUS||initial);
      if(!result.updatedSeasons.length)throw Error('Missing season tabs');
      const protectedS3=window.PCBLApprovedCorrections?.lockGames(result.games,initial)||{ok:true,games:result.games};
      if(!protectedS3.ok)throw Error('Cannot retain approved S3 historical games: '+protectedS3.reason);
      const check=window.PCBLPlayDB.replace(protectedS3.games,'live game logs (approved S3 Auden history locked)');
            if(!check.ok)throw Error('Game log validation failed: '+check.issues.join('; '));
            const parkSync=window.PCBLParkData?.acceptTabs(payload.tabs,window.PCBLPlayDB.games())||{updated:0,issues:[]};
            window.PCBL_VERSUS=window.PCBLPlayDB.games();
      window.PCBL_PARK_SYNC={liveParks:parkSync.updated,parkIssues:parkSync.issues,gameIssues:result.issues,updatedAt:new Date().toISOString()};
      live=true;
      finish(request);
      const issues=result.issues.length+parkSync.issues.length+(check.drift?.length||0);
      const mapped=protectedS3.games.filter(g=>window.PCBLParkData?.gameParks(g).length).length;show('LIVE GAME LOGS · '+mapped+' GAME'+(mapped===1?'':'S')+' WITH VERIFIED PARKS · '+parkSync.updated+' FROM GAME PAGES · '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+(issues?' · '+issues+' NEED REVIEW':''));
      if(issues)console.warn('PCBL game and park review:',result.issues,parkSync.issues,'Changed game event counts:',check.drift);
      window.dispatchEvent(new Event('pcbl-logs-updated'));
      schedule(LOG_REFRESH_MS);
    }catch(e){console.warn('PCBL live game and park update rejected:',e);failure(request,'INVALID')}
  };
  function load(){if(current)return;if(document.hidden&&lastAttempt){schedule(LOG_REFRESH_MS);return;}lastAttempt=Date.now();const script=document.createElement('script'),request={script};current=request;
    timer=setTimeout(()=>failure(request,'TIMED OUT'),45000);
    script.onerror=()=>failure(request,'UNAVAILABLE');
    script.src=url+(url.includes('?')?'&':'?')+'v='+Date.now();
    document.head.appendChild(script);
    if(!live)show('CHECKING LIVE GAME LOGS · VERIFIED PARK SNAPSHOT ACTIVE');
  }
  window.PCBLRefreshLogs=()=>{clearTimeout(refresh);lastAttempt=0;load()};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastAttempt>LOG_REFRESH_MS)window.PCBLRefreshLogs()});
  window.addEventListener('online',()=>window.PCBLRefreshLogs());
  load();
})();
