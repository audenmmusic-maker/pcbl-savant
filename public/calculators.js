(() => {
  'use strict';
  let active='player';
  const items={
    player:{tab:document.getElementById('calcPlayerTab'),panel:document.getElementById('calcPlayerPanel'),frame:document.getElementById('calcPlayerFrame')},
    stat:{tab:document.getElementById('calcStatTab'),panel:document.getElementById('calcStatPanel'),frame:document.getElementById('calcStatFrame')},
    team:{tab:document.getElementById('calcTeamTab'),panel:document.getElementById('calcTeamPanel'),frame:null}
  };
  const observers=new WeakMap();
  function fit(frame){
    try {
      const doc=frame.contentDocument;
      if(!doc?.body)return;
      const measure=()=>{if(frame.closest('[hidden]'))return;const children=[...doc.body.children].filter(el=>!['SCRIPT','STYLE'].includes(el.tagName)&&doc.defaultView.getComputedStyle(el).position!=='fixed');const bottom=Math.max(0,...children.map(el=>el.getBoundingClientRect().bottom+doc.defaultView.scrollY));frame.style.height=Math.min(Math.max(Math.ceil(bottom+18),660),6000)+'px'};
      if(!observers.has(frame)&&typeof ResizeObserver!=='undefined'){
        const observer=new ResizeObserver(measure);observer.observe(doc.body);observers.set(frame,observer);
      }
      measure();
    }catch(_){frame.style.height='940px'}
  }
  function select(which){
    active=which;
    for(const [key,item] of Object.entries(items)){
      const selected=key===which;
      item.tab.classList.toggle('active',selected);
      item.tab.setAttribute('aria-selected',String(selected));
      item.tab.tabIndex=selected?0:-1;
      item.panel.hidden=!selected;
    }
    const frame=items[which].frame;
    if(which==='team'){window.PCBLTeamComps?.paint();return}
    if(!frame.getAttribute('src'))frame.src=frame.dataset.src;
    fit(frame);
  }
  for(const [key,item] of Object.entries(items)){
    item.tab.addEventListener('click',()=>select(key));
    item.tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();const keys=Object.keys(items),next=keys[(keys.indexOf(key)+(event.key==='ArrowRight'?1:keys.length-1))%keys.length];select(next);items[next].tab.focus();
    });
    if(item.frame)item.frame.addEventListener('load',()=>fit(item.frame));
  }
  window.addEventListener('resize',()=>{if(items[active].frame)fit(items[active].frame)});
  window.PCBLCalculators={paint:()=>select(active)};
  if(location.hash==='#calculators')select(active);
})();
