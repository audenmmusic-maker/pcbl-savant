/* Site-wide source status. Mismatches are warnings, not corrected data. */
(() => {
'use strict';
const el=document.getElementById('pcblDataHealth');
if(!el)return;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const hub=window.PCBLUnified;if(!hub)return;
 const audit=hub.report(),official=hub.official(),post=hub.postseason();
 const available=s=>Array.isArray(official[s])&&official[s].length>0;
 const missing=['S4','S5'].filter(s=>!available(s));
 const problems=audit.regular.rows.filter(r=>r.status!=='MATCH');
 const visible=problems.slice(0,40);
 const lines=visible.map(r=>'<tr><th>'+escape(r.season+' '+r.player)+'</th><td>'+escape(r.status.replaceAll('_',' '))+'</td><td>'+escape(r.officialPA??'—')+'</td><td>'+escape(r.loggedPA)+'</td></tr>').join('');
 const alert='OFFICIAL TOTALS · LOG-BASED SPLITS';
 const update=audit.updatedAt?new Date(audit.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'SAVED ARCHIVE';
 const present=['S4','S5'].filter(available);
 const previousOpen=!!el.querySelector('#pcblIntegrityDetails')?.open;
 el.innerHTML='<div class="pcbl-integrity-heading"><strong>DATA INTEGRITY</strong><span>'+escape(alert)+' · LAST SYNC '+escape(update)+'</span><button type="button" id="pcblRefreshNow">↻ REFRESH DATA</button></div>'+
 '<details id="pcblIntegrityDetails"><summary>VIEW SEASON COVERAGE & OPTIONAL SOURCE AUDIT</summary>'+
 '<p>Official statistics remain the published season totals; advanced splits use separately verified logged plays. No events or historical stats are fabricated to force agreement.</p>'+
 '<p>LIVE OFFICIAL SEASONS: '+escape(present.join(', ')||'S4/S5 NOT YET CONNECTED')+
 (missing.length?' · MISSING: '+escape(missing.join(', ')):'')+
 ' · POSTSEASON SHEET SEASONS: '+escape(Object.keys(post).filter(s=>Array.isArray(post[s])&&post[s].length).join(', ')||'NONE READABLE')+
 ' · GAME LOG SEASONS: '+escape((window.PCBLPlayDB?.seasons()||[]).join(', '))+'</p>'+
 '<table><thead><tr><th>PLAYER / SEASON</th><th>RECONCILIATION</th><th>OFFICIAL PA</th><th>LOGGED PA</th></tr></thead><tbody>'+
 (lines||'<tr><td colspan="4">No mismatches in the currently available seasons.</td></tr>')+
 '</tbody></table></details>';
 el.querySelector('#pcblRefreshNow').onclick=()=>window.PCBLRefreshAllData?.();
 el.querySelector('#pcblIntegrityDetails').open=previousOpen;
}
window.PCBLIntegrityUI={render};
window.addEventListener('pcbl-data-updated',render);
window.addEventListener('pcbl-logs-updated',render);
render();
})();
