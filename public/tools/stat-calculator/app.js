(() => {
  "use strict";

  const SHEET_ID = "1-wyh_XRSgYGF8GIynNH1ZYvm__1bf0m7bs0WNNWRmuk";
  const SHEET_GID = "0";
  const MLB_API = "https://statsapi.mlb.com/api/v1";
  const CURRENT_YEAR = new Date().getFullYear();
  const PLAYERS = [
    { key:"AUDEN",column:1 },
    { key:"JASON",column:3 },
    { key:"JARVIS",column:5 },
    { key:"NAJEE",column:11 },
    { key:"COEL",column:13 }
  ];
  const STATS = {
    BA:{ label:"BA",pcblKey:"BA",mlbKey:"BA",placeholder:".400",format:decimal3,inputHint:"Enter a decimal such as .400.",description:"batting average" },
    OBP:{ label:"OBP",pcblKey:"OBP",mlbKey:"OBP",placeholder:".500",format:decimal3,inputHint:"Enter a decimal such as .500.",description:"on-base percentage" },
    SLG:{ label:"SLG",pcblKey:"SLG",mlbKey:"SLG",placeholder:".750",format:decimal3,inputHint:"Enter a decimal such as .750.",description:"slugging percentage" },
    OPS:{ label:"OPS",pcblKey:"OPS",mlbKey:"OPS",placeholder:"1.250",format:decimal3,inputHint:"Enter a decimal such as 1.250.",description:"OPS" },
    K_RATE:{ label:"K%",pcblKey:"K_RATE",mlbKey:"K_RATE",placeholder:"25.0",format:percent1,inputHint:"Enter 25 or 25% for a 25% strikeout rate.",description:"hitting strikeout rate",percent:true },
    ERA:{ label:"ERA",pcblKey:"ERA",mlbKey:"ERA",placeholder:"4.50",format:number2,inputHint:"Enter an ERA such as 4.50.",description:"earned run average" },
    WHIP:{ label:"WHIP",pcblKey:"WHIP",mlbKey:"WHIP",placeholder:"1.30",format:number2,inputHint:"Enter a WHIP such as 1.30.",description:"WHIP" },
    KFG:{ label:"K/3 → K/9",pcblKey:"K3",mlbKey:"K9",placeholder:"5.00",format:number2,inputHint:"Enter the PCBL strikeouts-per-three-innings rate. It will be multiplied by 4.5.",description:"strikeout rate",directScale:4.5 },
    BBFG:{ label:"BB/3 → BB/9",pcblKey:"BB3",mlbKey:"BB9",placeholder:"2.00",format:number2,inputHint:"Enter the PCBL walks-per-three-innings rate. It will be multiplied by 4.5.",description:"walk rate",directScale:4.5 }
  };
  const MLB_FALLBACK = { BA:.248,OBP:.320,SLG:.410,OPS:.730,K_RATE:.225,ERA:4.20,WHIP:1.30,K9:8.60,BB9:3.20 };

  const dom = {
    form:document.getElementById("calculatorForm"),stat:document.getElementById("statSelect"),value:document.getElementById("statValue"),
    valueLabel:document.getElementById("valueLabel"),inputSuffix:document.getElementById("inputSuffix"),inputHint:document.getElementById("inputHint"),
    pcblRange:document.getElementById("pcblRange"),mlbSeason:document.getElementById("mlbSeason"),button:document.getElementById("calculateButton"),
    error:document.getElementById("formError"),status:document.getElementById("dataStatus"),results:document.getElementById("resultSection"),
    resultTitle:document.getElementById("resultTitle"),pcblResultLabel:document.getElementById("pcblResultLabel"),mlbResultLabel:document.getElementById("mlbResultLabel"),pcblInput:document.getElementById("pcblInputValue"),pcblContext:document.getElementById("pcblInputContext"),
    mlbEquivalent:document.getElementById("mlbEquivalentValue"),mlbContext:document.getElementById("mlbOutputContext"),relativeBadge:document.getElementById("relativeBadge"),
    conversionMode:document.getElementById("conversionModeLabel"),
    scaleTitle:document.getElementById("scaleTitle"),scaleLow:document.getElementById("scaleLow"),scaleMiddle:document.getElementById("scaleMiddle"),scaleHigh:document.getElementById("scaleHigh"),
    marker:document.getElementById("scaleMarker"),markerLabel:document.getElementById("scaleMarkerLabel"),explanation:document.getElementById("resultExplanation"),
    copy:document.getElementById("copyResult"),another:document.getElementById("calculateAnother")
  };
  const state = { pcbl:null,source:"snapshot",mlbCache:{},latest:null };

  function cleanNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const text = String(value ?? "").trim().replace(/,/g,"").replace(/\.$/,"");
    if (!text || /^(X+|-|N\/A)$/i.test(text)) return null;
    if (/^-?\d+(\.\d+)?%$/.test(text)) return Number.parseFloat(text) / 100;
    const number = Number.parseFloat(text);
    return Number.isFinite(number) ? number : null;
  }
  function ratio(a,b) { return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null; }
  function weightedAverage(pairs) {
    let total=0,weight=0;
    pairs.forEach(([value,amount]) => { if (Number.isFinite(value) && Number.isFinite(amount) && amount > 0) { total += value * amount; weight += amount; } });
    return weight ? total / weight : null;
  }
  function decimal3(value) { return Number.isFinite(value) ? value.toFixed(3).replace(/^0/,"") : "—"; }
  function number2(value) { return Number.isFinite(value) ? value.toFixed(2) : "—"; }
  function percent1(value) { return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—"; }

  function canonicalLabel(label) {
    const text=String(label||"").trim().toUpperCase();
    if (!text || text.includes("TWR") || text.includes("TWO-WAY") || text === "K/BB") return null;
    if (text === "K RATE") return "K_RATE";
    if (text === "K/3") return "K3";
    return text.replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"");
  }
  function findLabel(rows,start,end,wanted) {
    for (let i=start;i<end;i+=1) if (String(rows[i]?.[0]||"").trim().toUpperCase()===wanted) return i;
    return -1;
  }
  function readSection(rows,start,end,column) {
    const output={};
    for (let i=start;i<end;i+=1) {
      const key=canonicalLabel(rows[i]?.[0]);
      if (!key || key === "HITTING" || key === "PITCHING" || key.startsWith("SEASON")) continue;
      const value=cleanNumber(rows[i]?.[column]);
      if (value != null) output[key]=value;
    }
    return output;
  }
  function derivePlayer(hitting,pitching) {
    const h={...hitting},p={...pitching};
    if (!Number.isFinite(h.BA)) h.BA=ratio(h.H,h.AB);
    if (!Number.isFinite(h.OBP) && h.PA) h.OBP=((h.H||0)+(h.BB||0)+(h.HBP||0))/h.PA;
    if (!Number.isFinite(h.SLG) && h.AB) h.SLG=((h.H||0)+(h["2B"]||0)+2*(h["3B"]||0)+3*(h.HR||0))/h.AB;
    if (!Number.isFinite(h.OPS) && Number.isFinite(h.OBP) && Number.isFinite(h.SLG)) h.OPS=h.OBP+h.SLG;
    if (!Number.isFinite(h.K_RATE)) h.K_RATE=ratio(h.K,h.PA);
    if (!Number.isFinite(p.K3) && p.IP) p.K3=(p.K||0)*3/p.IP;
    if (!Number.isFinite(p.BB3) && p.IP) p.BB3=(p.BB||0)*3/p.IP;
    return { hitting:h,pitching:p };
  }
  function parseSheet(inputRows) {
    const rows=inputRows.map((row)=>Array.from({length:16},(_,index)=>row?.[index]??""));
    const markers=[];
    rows.forEach((row,index)=>{ const label=String(row[0]||"").trim().toUpperCase(); if (label==="CAREER" || /^SEASON \d+$/.test(label)) markers.push({label,index}); });
    const blocks={};
    markers.forEach((marker,index)=>{
      const end=markers[index+1]?.index??rows.length;
      const hittingStart=findLabel(rows,marker.index,end,"HITTING");
      const pitchingStart=findLabel(rows,marker.index,end,"PITCHING");
      if (hittingStart<0 || pitchingStart<0) return;
      blocks[marker.label]=PLAYERS.map((player)=>({ key:player.key,...derivePlayer(readSection(rows,hittingStart+1,pitchingStart,player.column),readSection(rows,pitchingStart+1,end,player.column)) }));
    });
    if (!blocks.CAREER) throw new Error("PCBL career data could not be read.");
    return blocks;
  }
  function pcblBaseline(blockLabel) {
    const players=state.pcbl[blockLabel]||state.pcbl.CAREER;
    const hitting={};
    ["BA","OBP","SLG","OPS","K_RATE"].forEach((key)=>{
      const weightKey=["BA","SLG"].includes(key)?"AB":"PA";
      hitting[key]=weightedAverage(players.map((player)=>[player.hitting[key],player.hitting[weightKey]]));
    });
    const pitching={};
    ["ERA","WHIP","K3","BB3"].forEach((key)=>{ pitching[key]=weightedAverage(players.map((player)=>[player.pitching[key],player.pitching.IP])); });
    return { ...hitting,...pitching };
  }

  function loadLiveSheet() {
    return new Promise((resolve,reject)=>{
      const callback=`pcblCalculator_${Date.now()}_${Math.floor(Math.random()*10000)}`;
      const script=document.createElement("script");
      const timeout=window.setTimeout(()=>cleanup(new Error("PCBL sheet timed out.")),10000);
      function cleanup(error,rows) { window.clearTimeout(timeout); script.remove(); try { delete window[callback]; } catch (_) {} error?reject(error):resolve(rows); }
      window[callback]=(response)=>{
        try {
          if (!response?.table?.rows) throw new Error("PCBL sheet returned no rows.");
          const width=Math.max(16,response.table.cols?.length||0);
          const rows=response.table.rows.map((row)=>Array.from({length:width},(_,index)=>{ const cell=row.c?.[index]; return cell?(cell.f??cell.v??""):""; }));
          cleanup(null,rows);
        } catch (error) { cleanup(error); }
      };
      script.onerror=()=>cleanup(new Error("PCBL sheet could not be reached."));
      script.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${new URLSearchParams({gid:SHEET_GID,tqx:`out:json;responseHandler:${callback}`})}`;
      document.head.appendChild(script);
    });
  }

  async function fetchJson(url) {
    const response=await fetch(url,{headers:{Accept:"application/json"}});
    if (!response.ok) throw new Error(`MLB data request failed (${response.status}).`);
    return response.json();
  }
  function inningsToOuts(value) {
    const [whole,partial="0"]=String(value??0).split(".");
    return (Number(whole)||0)*3+Math.min(2,Number(partial)||0);
  }
  function combineHitting(stats) {
    const sum=(key)=>stats.reduce((total,item)=>total+(Number(item[key])||0),0);
    const PA=sum("plateAppearances"),AB=sum("atBats"),H=sum("hits"),BB=sum("baseOnBalls"),HBP=sum("hitByPitch"),SF=sum("sacFlies"),TB=sum("totalBases"),K=sum("strikeOuts");
    const BA=ratio(H,AB),OBP=ratio(H+BB+HBP,AB+BB+HBP+SF),SLG=ratio(TB,AB);
    return { BA,OBP,SLG,OPS:Number.isFinite(OBP)&&Number.isFinite(SLG)?OBP+SLG:null,K_RATE:ratio(K,PA) };
  }
  function combinePitching(stats) {
    const sum=(key)=>stats.reduce((total,item)=>total+(Number(item[key])||0),0);
    const outs=stats.reduce((total,item)=>total+inningsToOuts(item.inningsPitched),0),IP=outs/3;
    const ER=sum("earnedRuns"),H=sum("hits"),BB=sum("baseOnBalls"),K=sum("strikeOuts");
    return { ERA:IP?ER*9/IP:null,WHIP:IP?(H+BB)/IP:null,K9:IP?K*9/IP:null,BB9:IP?BB*9/IP:null };
  }
  async function getMLBBaseline(year) {
    if (state.mlbCache[year]) return state.mlbCache[year];
    const cacheKey=`pcbl-stat-translator-mlb-${year}`;
    try { const cached=JSON.parse(localStorage.getItem(cacheKey)); if (cached?.savedAt && Date.now()-cached.savedAt<12*60*60*1000) { state.mlbCache[year]=cached.data; return cached.data; } } catch (_) {}
    const params=(group)=>new URLSearchParams({stats:"season",group,season:String(year),sportIds:"1",gameType:"R"});
    try {
      const [hittingData,pitchingData]=await Promise.all([fetchJson(`${MLB_API}/teams/stats?${params("hitting")}`),fetchJson(`${MLB_API}/teams/stats?${params("pitching")}`)]);
      const hittingStats=(hittingData.stats||[]).flatMap((entry)=>entry.splits||[]).map((split)=>split.stat).filter(Boolean);
      const pitchingStats=(pitchingData.stats||[]).flatMap((entry)=>entry.splits||[]).map((split)=>split.stat).filter(Boolean);
      if (!hittingStats.length || !pitchingStats.length) throw new Error("MLB league data was empty.");
      const data={...combineHitting(hittingStats),...combinePitching(pitchingStats)};
      if (!Object.values(data).every(Number.isFinite)) throw new Error("MLB league aggregate was incomplete.");
      state.mlbCache[year]=data;
      try { localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),data})); } catch (_) {}
      return data;
    } catch (_) {
      state.mlbCache[year]=MLB_FALLBACK;
      return MLB_FALLBACK;
    }
  }

  function updateStatUI() {
    const stat=STATS[dom.stat.value];
    dom.valueLabel.textContent=`PCBL ${stat.label.split(" → ")[0]}`;
    dom.value.placeholder=stat.placeholder;
    dom.inputHint.textContent=stat.inputHint;
    dom.inputSuffix.textContent=stat.percent?"%":"";
    const direct=Boolean(stat.directScale);
    dom.pcblRange.disabled=direct;
    dom.mlbSeason.disabled=direct;
    dom.pcblRange.closest?.(".field")?.classList.toggle("disabled",direct);
    dom.mlbSeason.closest?.(".field")?.classList.toggle("disabled",direct);
  }
  function parseInput(stat) {
    let text=dom.value.value.trim();
    if (!text) return null;
    const explicitlyPercent=text.includes("%");
    text=text.replace(/%/g,"").replace(/,/g,"");
    let value=Number.parseFloat(text);
    if (!Number.isFinite(value)) return null;
    if (stat.percent && (explicitlyPercent || value>1)) value/=100;
    return value;
  }
  function relativeText(ratioValue) {
    const change=(ratioValue-1)*100;
    return `${change>=0?"+":""}${change.toFixed(1)}%`;
  }
  function directionText(ratioValue) {
    const change=Math.abs((ratioValue-1)*100).toFixed(1);
    if (Math.abs(ratioValue-1)<.005) return "almost exactly at";
    return `${change}% ${ratioValue>1?"above":"below"}`;
  }
  function translateValue(statKey,input,pcblAverage,mlbAverage) {
    const stat=STATS[statKey];
    if (stat.directScale) return input*stat.directScale;
    return mlbAverage*(input/pcblAverage);
  }
  function renderResult(result) {
    const {stat,input,pcblAverage,mlbAverage,equivalent,ratioValue,range,year,direct}=result;
    dom.resultTitle.textContent=`PCBL ${stat.label.split(" → ")[0]} → MLB ${stat.label.includes("→")?stat.label.split("→")[1].trim():stat.label}`;
    dom.pcblInput.textContent=stat.format(input);
    dom.pcblResultLabel.textContent=direct?`PCBL ${stat.label.split(" → ")[0]} INPUT`:"PCBL INPUT";
    dom.pcblContext.textContent=direct?"3 PCBL INNINGS · 6 OUTS":`${range} · REGULAR SEASON`;
    dom.mlbEquivalent.textContent=stat.format(equivalent);
    dom.mlbResultLabel.textContent=direct?`MLB ${stat.label.split("→")[1].trim()} EQUIVALENT`:"MLB EQUIVALENT";
    dom.mlbContext.textContent=direct?"MLB STANDARD · 9 INNINGS · 27 OUTS":`${year} MLB REGULAR SEASON`;
    if (direct) {
      dom.relativeBadge.textContent="×4.5";
      dom.conversionMode.textContent="FULL-GAME SCALE";
      dom.scaleTitle.textContent="FULL-GAME OUT SCALE";
      dom.scaleLow.textContent="0 OUTS";
      dom.scaleMiddle.textContent="PCBL · 6 OUTS";
      dom.scaleHigh.textContent="MLB · 27 OUTS";
      dom.marker.style.left="96%";
      dom.markerLabel.textContent="27 OUTS";
      dom.explanation.textContent=`A three-inning PCBL game contains 6 outs; a nine-inning MLB game contains 27. Multiplying ${stat.format(input)} by 27 ÷ 6 converts the full-game ${stat.description} to ${stat.format(equivalent)}.`;
    } else {
      dom.relativeBadge.textContent=relativeText(ratioValue);
      dom.conversionMode.textContent="LEAGUE RELATIVE";
      dom.scaleTitle.textContent="LEAGUE-RELATIVE SCALE";
      dom.scaleLow.textContent="50% OF AVG";
      dom.scaleMiddle.textContent="LEAGUE AVG";
      dom.scaleHigh.textContent="150% OF AVG";
      const marker=Math.min(96,Math.max(4,(ratioValue-.5)*100));
      dom.marker.style.left=`${marker}%`;
      dom.markerLabel.textContent=relativeText(ratioValue);
      dom.explanation.textContent=`The entered PCBL ${stat.description} is ${directionText(ratioValue)} the ${range.toLowerCase()} PCBL aggregate. Applying that same relationship to the ${year} MLB aggregate produces ${stat.format(equivalent)}.`;
    }
    dom.results.hidden=false;
    dom.results.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function calculate(event) {
    event?.preventDefault();
    dom.error.hidden=true;
    const stat=STATS[dom.stat.value];
    const input=parseInput(stat);
    if (!Number.isFinite(input) || input<0) { dom.error.textContent="Enter a valid non-negative PCBL rate."; dom.error.hidden=false; return; }
    const range=dom.pcblRange.value||"CAREER";
    const year=Number(dom.mlbSeason.value);
    if (stat.directScale) {
      const equivalent=translateValue(dom.stat.value,input,null,null);
      state.latest={stat,input,equivalent,direct:true,range,year};
      renderResult(state.latest);
      return;
    }
    const pcbl=pcblBaseline(range);
    const pcblAverage=pcbl[stat.pcblKey];
    if (!Number.isFinite(pcblAverage) || pcblAverage<=0) { dom.error.textContent=`The selected PCBL sample does not contain enough ${stat.label} data.`; dom.error.hidden=false; return; }
    dom.button.disabled=true;
    dom.button.querySelector("span").textContent="READING MLB AGGREGATE...";
    try {
      const mlb=await getMLBBaseline(year);
      const mlbAverage=mlb[stat.mlbKey];
      if (!Number.isFinite(mlbAverage) || mlbAverage<=0) throw new Error("That MLB aggregate is unavailable.");
      const ratioValue=input/pcblAverage;
      const equivalent=translateValue(dom.stat.value,input,pcblAverage,mlbAverage);
      state.latest={stat,input,pcblAverage,mlbAverage,equivalent,ratioValue,range,year,direct:false};
      renderResult(state.latest);
    } catch (error) {
      dom.error.textContent=error?.message||"The conversion could not be calculated.";
      dom.error.hidden=false;
    } finally {
      dom.button.disabled=false;
      dom.button.querySelector("span").textContent="CALCULATE MLB EQUIVALENT";
    }
  }

  async function copyResult() {
    if (!state.latest) return;
    const r=state.latest;
    const sourceLabel=r.stat.label.split(" → ")[0];
    const targetLabel=r.stat.label.includes("→")?r.stat.label.split("→")[1].trim():r.stat.label;
    const text=r.direct
      ? `A PCBL ${sourceLabel} of ${r.stat.format(r.input)} translates to an MLB ${targetLabel} of ${r.stat.format(r.equivalent)} using the 27-out ÷ 6-out full-game scale (×4.5).`
      : `A PCBL ${sourceLabel} of ${r.stat.format(r.input)} translates to an MLB ${targetLabel} of ${r.stat.format(r.equivalent)} using the ${r.range.toLowerCase()} PCBL aggregate and ${r.year} MLB aggregate.`;
    try { await navigator.clipboard.writeText(text); dom.copy.textContent="COPIED"; window.setTimeout(()=>{dom.copy.textContent="COPY RESULT";},1600); }
    catch (_) { window.prompt("Copy result:",text); }
  }

  function populateControls() {
    const labels=Object.keys(state.pcbl).sort((a,b)=>a==="CAREER"?-1:b==="CAREER"?1:Number(a.match(/\d+/)?.[0])-Number(b.match(/\d+/)?.[0]));
    dom.pcblRange.innerHTML=labels.map((label)=>`<option value="${label}">${label}</option>`).join("");
    dom.mlbSeason.innerHTML=Array.from({length:7},(_,index)=>CURRENT_YEAR-index).map((year,index)=>`<option value="${year}">${year}${index===0?" · CURRENT":""}</option>`).join("");
  }
  async function init() {
    state.pcbl=parseSheet(window.PCBL_SNAPSHOT_ROWS||[]);
    populateControls();
    updateStatUI();
    dom.status.className="data-status fallback";
    dom.status.innerHTML="<i></i> SAVED PCBL DATA READY";
    try {
      const live=parseSheet(await loadLiveSheet());
      if (Object.keys(live).length>=Object.keys(state.pcbl).length) {
        state.pcbl=live; state.source="live"; populateControls();
        dom.status.className="data-status live";
        dom.status.innerHTML="<i></i> LIVE PCBL SHEET CONNECTED";
      }
    } catch (_) {}
  }

  dom.form.addEventListener("submit",calculate);
  dom.stat.addEventListener("change",updateStatUI);
  dom.copy.addEventListener("click",copyResult);
  dom.another.addEventListener("click",()=>{ dom.results.hidden=true; dom.value.focus(); window.scrollTo({top:0,behavior:"smooth"}); });

  window.PCBL_TRANSLATOR={ parseSheet,pcblBaseline,combineHitting,combinePitching,getMLBBaseline,translateValue,STATS,state };
  init().catch((error)=>{ dom.error.textContent=error?.message||"PCBL data could not be loaded."; dom.error.hidden=false; });
})();
