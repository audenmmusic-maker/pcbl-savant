(() => {
  "use strict";

  const SHEET_ID = "1-wyh_XRSgYGF8GIynNH1ZYvm__1bf0m7bs0WNNWRmuk";
  const SHEET_GID = "0";
  const MLB_API = "https://statsapi.mlb.com/api/v1";
  const SHEET_START_ROW = 29;
  const MLB_CAREER_CACHE_HOURS = 12;
  const MLB_CAREER_MIN_PA = 300;
  const MLB_CAREER_MIN_IP = 50;
  const MLB_ESTABLISHED_MIN_PA = 1000;
  const MLB_ESTABLISHED_MIN_IP = 200;

  const PCBL_PLAYERS = [
    { key: "AUDEN", name: "Auden", regular: 1, postseason: 2, color: "#f2f2ec", face: "assets/faces/auden.jpg" },
    { key: "JASON", name: "Jason", regular: 3, postseason: 4, color: "#ff943d", face: "assets/faces/jason.jpg" },
    { key: "JARVIS", name: "Jarvis", regular: 5, postseason: 6, color: "#398cff", face: "assets/faces/jarvis.jpg" },
    { key: "NAJEE", name: "Najee", regular: 11, postseason: 12, color: "#ff414d", face: "assets/faces/najee.jpg" },
    { key: "COEL", name: "Coel", regular: 13, postseason: 14, color: "#41d279", face: "assets/faces/coel.jpg" }
  ];

  const FEATURE_INFO = {
    BA: { label: "BATTING AVG", short: "BA", group: "hitting", weight: .14, format: decimal3 },
    OBP: { label: "ON-BASE PERCENTAGE", short: "OBP", group: "hitting", weight: .18, format: decimal3 },
    SLG: { label: "SLUGGING", short: "SLG", group: "hitting", weight: .18, format: decimal3 },
    OPS: { label: "ON-BASE PLUS SLUGGING", short: "OPS", group: "hitting", weight: .18, format: decimal3 },
    K_RATE: { label: "STRIKEOUT RATE", short: "K%", group: "hitting", weight: .15, format: percent1 },
    ISO: { label: "ISOLATED POWER", short: "ISO", group: "hitting", weight: .17, format: decimal3 },
    ERA: { label: "EARNED RUN AVERAGE", short: "ERA", group: "pitching", weight: .30, format: number2 },
    WHIP: { label: "WALKS + HITS PER INNING", short: "WHIP", group: "pitching", weight: .25, format: number2 },
    KFG: { label: "STRIKEOUTS PER FULL GAME", short: "K/FULL GAME", group: "pitching", weight: .25, format: number2, mlbSuffix: " /9", pcblSuffix: " /3" },
    BBFG: { label: "WALKS PER FULL GAME", short: "BB/FULL GAME", group: "pitching", weight: .20, format: number2, mlbSuffix: " /9", pcblSuffix: " /3" }
  };

  const FALLBACK_MLB_BASELINE = {
    hitting: { BA: .248, OBP: .320, SLG: .410, OPS: .730, K_RATE: .225, ISO: .162 },
    pitching: { ERA: 4.20, WHIP: 1.30, KFG: 8.60, BBFG: 3.20 }
  };

  const dom = {
    form: document.getElementById("comparisonForm"),
    playerName: document.getElementById("playerName"),
    playerOptions: document.getElementById("playerOptions"),
    searchButton: document.getElementById("searchButton"),
    randomButton: document.getElementById("randomButton"),
    compareButton: document.getElementById("compareButton"),
    seasonField: document.getElementById("seasonField"),
    seasonYear: document.getElementById("seasonYear"),
    postseason: document.getElementById("postseason"),
    pcblRange: document.getElementById("pcblRange"),
    sheetStatus: document.getElementById("sheetStatus"),
    loadingPanel: document.getElementById("loadingPanel"),
    loadingText: document.getElementById("loadingText"),
    errorPanel: document.getElementById("errorPanel"),
    errorText: document.getElementById("errorText"),
    results: document.getElementById("results"),
    resultTitle: document.getElementById("resultTitle"),
    matchupCard: document.getElementById("matchupCard"),
    matchCenter: document.getElementById("matchCenter"),
    mainFireworks: document.getElementById("mainFireworks"),
    mlbPortrait: document.getElementById("mlbPortrait"),
    mlbFallback: document.getElementById("mlbFallback"),
    mlbName: document.getElementById("mlbName"),
    mlbMeta: document.getElementById("mlbMeta"),
    pcblPortrait: document.getElementById("pcblPortrait"),
    pcblName: document.getElementById("pcblName"),
    pcblMeta: document.getElementById("pcblMeta"),
    matchScore: document.getElementById("matchScore"),
    matchType: document.getElementById("matchType"),
    matchReasons: document.getElementById("matchReasons"),
    metricBars: document.getElementById("metricBars"),
    rankings: document.getElementById("rankings"),
    baseballReferenceLink: document.getElementById("baseballReferenceLink"),
    shareResult: document.getElementById("shareResult"),
    resetButton: document.getElementById("resetButton"),
    playerModal: document.getElementById("playerModal"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalClose: document.getElementById("modalClose"),
    careerCard: document.getElementById("careerCard"),
    careerPlayerFace: document.getElementById("careerPlayerFace"),
    careerPlayerName: document.getElementById("careerPlayerName"),
    careerRangeLabel: document.getElementById("careerRangeLabel"),
    careerProfileRange: document.getElementById("careerProfileRange"),
    careerPoolFilter: document.getElementById("careerPoolFilter"),
    careerHittingStats: document.getElementById("careerHittingStats"),
    careerPitchingStats: document.getElementById("careerPitchingStats"),
    careerMatchStatus: document.getElementById("careerMatchStatus"),
    absoluteMatchButton: document.getElementById("absoluteMatchButton"),
    absoluteResults: document.getElementById("absoluteResults"),
    mysteryStart: document.getElementById("mysteryStart"),
    mysteryStatus: document.getElementById("mysteryStatus"),
    mysteryStage: document.getElementById("mysteryStage"),
    mysteryPortrait: document.getElementById("mysteryPortrait"),
    mysteryRole: document.getElementById("mysteryRole"),
    mysteryName: document.getElementById("mysteryName"),
    mysteryStats: document.getElementById("mysteryStats"),
    mysteryChoices: document.getElementById("mysteryChoices"),
    mysteryFeedback: document.getElementById("mysteryFeedback"),
    mysteryNext: document.getElementById("mysteryNext")
  };

  const state = {
    pcbl: null,
    selectedMLB: null,
    latestResult: null,
    sheetSource: "snapshot",
    searchTimer: null,
    searchSerial: 0,
    mlbPool: null,
    mlbCareerModel: null,
    currentPreviewPlayer: null,
    currentPreviewRange: "CAREER",
    mysteryRound: null
  };

  function decimal3(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(3).replace(/^0/, "");
  }

  function number2(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(2);
  }

  function percent1(value) {
    if (!Number.isFinite(value)) return "—";
    return `${(value * 100).toFixed(1)}%`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cleanNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value == null) return null;
    const text = String(value).trim().replace(/\.$/, "");
    if (!text || /^(X+|-|N\/A)$/i.test(text)) return null;
    if (/^-?\d+(\.\d+)?%$/.test(text)) return Number.parseFloat(text) / 100;
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number.parseFloat(text);
    return null;
  }

  function canonicalLabel(label, section) {
    const text = String(label || "").trim().toUpperCase();
    if (!text || text.includes("TWR") || text.includes("TWO-WAY")) return null;
    if (text === "K RATE") return "K_RATE";
    if (text === "K/BB") return null;
    if (text === "AB/HR") return "AB_HR";
    if (text === "K/3") return "K3";
    if (text.startsWith("HA ")) return "HA";
    if (text.startsWith("HRA ")) return "HRA";
    if (text.startsWith("RA ")) return "RA";
    if (text.startsWith("3RD")) return "LATE_RUNS";
    if (text === "NO HITTERS") return "NO_HITTERS";
    if (text === "SV/SVO") return "SV_SVO";
    return text.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function deriveHitting(input = {}) {
    const s = { ...input };
    const valid = (n) => Number.isFinite(n);
    if (!valid(s.BA) && valid(s.H) && valid(s.AB) && s.AB > 0) s.BA = s.H / s.AB;
    if (!valid(s.OBP) && valid(s.PA) && s.PA > 0) s.OBP = ((s.H || 0) + (s.BB || 0) + (s.HBP || 0)) / s.PA;
    if (!valid(s.SLG) && valid(s.AB) && s.AB > 0 && valid(s.H)) {
      const totalBases = s.H + (s["2B"] || 0) + 2 * (s["3B"] || 0) + 3 * (s.HR || 0);
      s.SLG = totalBases / s.AB;
    }
    if (!valid(s.OPS) && valid(s.OBP) && valid(s.SLG)) s.OPS = s.OBP + s.SLG;
    if (!valid(s.K_RATE) && valid(s.K) && valid(s.PA) && s.PA > 0) s.K_RATE = s.K / s.PA;
    if (!valid(s.ISO) && valid(s.SLG) && valid(s.BA)) s.ISO = s.SLG - s.BA;
    if (!valid(s.AB_HR) && valid(s.AB) && valid(s.HR) && s.HR > 0) s.AB_HR = s.AB / s.HR;
    return s;
  }

  function derivePitching(input = {}) {
    const s = { ...input };
    if (!Number.isFinite(s.K3) && Number.isFinite(s.K) && Number.isFinite(s.IP) && s.IP > 0) s.K3 = s.K * 3 / s.IP;
    if (!Number.isFinite(s.KFG) && Number.isFinite(s.K3)) s.KFG = s.K3;
    if (!Number.isFinite(s.KFG) && Number.isFinite(s.K) && Number.isFinite(s.IP) && s.IP > 0) s.KFG = s.K * 3 / s.IP;
    if (!Number.isFinite(s.BBFG) && Number.isFinite(s.BB) && Number.isFinite(s.IP) && s.IP > 0) s.BBFG = s.BB * 3 / s.IP;
    return s;
  }

  function combineHitting(a, b) {
    if (!a && !b) return {};
    if (!a) return deriveHitting(b);
    if (!b) return deriveHitting(a);
    const countKeys = ["PA", "AB", "K", "H", "2B", "3B", "HR", "BB", "HBP", "R", "XBH", "LATE_RUNS"];
    const out = {};
    for (const key of countKeys) {
      const av = Number.isFinite(a[key]) ? a[key] : 0;
      const bv = Number.isFinite(b[key]) ? b[key] : 0;
      if (Number.isFinite(a[key]) || Number.isFinite(b[key])) out[key] = av + bv;
    }
    out.BA = safeRatio(out.H, out.AB);
    out.OBP = weightedAverage([[a.OBP, a.PA], [b.OBP, b.PA]]);
    out.SLG = weightedAverage([[a.SLG, a.AB], [b.SLG, b.AB]]);
    out.OPS = Number.isFinite(out.OBP) && Number.isFinite(out.SLG) ? out.OBP + out.SLG : null;
    out.K_RATE = safeRatio(out.K, out.PA);
    out.ISO = Number.isFinite(out.SLG) && Number.isFinite(out.BA) ? out.SLG - out.BA : null;
    out.AB_HR = safeRatio(out.AB, out.HR);
    return deriveHitting(out);
  }

  function combinePitching(a, b) {
    if (!a && !b) return {};
    if (!a) return derivePitching(b);
    if (!b) return derivePitching(a);
    const countKeys = ["IP", "K", "BB", "DP", "HBP", "HA", "HRA", "RA", "NO_HITTERS"];
    const out = {};
    for (const key of countKeys) {
      const av = Number.isFinite(a[key]) ? a[key] : 0;
      const bv = Number.isFinite(b[key]) ? b[key] : 0;
      if (Number.isFinite(a[key]) || Number.isFinite(b[key])) out[key] = av + bv;
    }
    out.ERA = weightedAverage([[a.ERA, a.IP], [b.ERA, b.IP]]);
    out.WHIP = weightedAverage([[a.WHIP, a.IP], [b.WHIP, b.IP]]);
    out.K3 = weightedAverage([[a.K3, a.IP], [b.K3, b.IP]]);
    return derivePitching(out);
  }

  function safeRatio(a, b) {
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;
  }

  function weightedAverage(pairs) {
    let sum = 0;
    let weight = 0;
    for (const [value, amount] of pairs) {
      if (Number.isFinite(value) && Number.isFinite(amount) && amount > 0) {
        sum += value * amount;
        weight += amount;
      }
    }
    return weight ? sum / weight : null;
  }

  function parseSheet(rows) {
    const padded = rows.map((row) => Array.from({ length: 16 }, (_, i) => row?.[i] ?? ""));
    const markers = [];
    padded.forEach((row, index) => {
      const label = String(row[0] || "").trim().toUpperCase();
      if (label === "CAREER" || /^SEASON \d+$/.test(label)) markers.push({ label, index });
    });
    const blocks = {};
    for (let m = 0; m < markers.length; m += 1) {
      const marker = markers[m];
      const nextIndex = markers[m + 1]?.index ?? padded.length;
      const hittingIndex = findLabel(padded, marker.index, nextIndex, "HITTING");
      const pitchingIndex = findLabel(padded, marker.index, nextIndex, "PITCHING");
      if (hittingIndex < 0 || pitchingIndex < 0) continue;
      const playerData = {};
      for (const player of PCBL_PLAYERS) {
        playerData[player.key] = {
          regular: {
            hitting: deriveHitting(readStatSection(padded, hittingIndex + 1, pitchingIndex, player.regular, "hitting")),
            pitching: derivePitching(readStatSection(padded, pitchingIndex + 1, nextIndex, player.regular, "pitching"))
          },
          postseason: {
            hitting: deriveHitting(readStatSection(padded, hittingIndex + 1, pitchingIndex, player.postseason, "hitting")),
            pitching: derivePitching(readStatSection(padded, pitchingIndex + 1, nextIndex, player.postseason, "pitching"))
          }
        };
      }
      blocks[marker.label] = playerData;
    }
    if (!blocks.CAREER) throw new Error("The PCBL career section could not be read.");
    return { blocks, rows: padded };
  }

  function findLabel(rows, start, end, wanted) {
    for (let i = start; i < end; i += 1) {
      if (String(rows[i]?.[0] || "").trim().toUpperCase() === wanted) return i;
    }
    return -1;
  }

  function readStatSection(rows, start, end, column, section) {
    const out = {};
    for (let i = start; i < end; i += 1) {
      const key = canonicalLabel(rows[i]?.[0], section);
      if (!key || key === "HITTING" || key === "PITCHING" || key.startsWith("SEASON")) continue;
      const value = cleanNumber(rows[i]?.[column]);
      if (value != null) out[key] = value;
    }
    return out;
  }

  function pcblStatsFor(blockLabel, scope) {
    const block = state.pcbl?.blocks?.[blockLabel] || state.pcbl?.blocks?.CAREER;
    return PCBL_PLAYERS.map((player) => {
      const record = block?.[player.key];
      let hitting = {};
      let pitching = {};
      if (scope === "regular") {
        hitting = record?.regular?.hitting || {};
        pitching = record?.regular?.pitching || {};
      } else if (scope === "postseason") {
        hitting = record?.postseason?.hitting || {};
        pitching = record?.postseason?.pitching || {};
      } else {
        hitting = combineHitting(record?.regular?.hitting, record?.postseason?.hitting);
        pitching = combinePitching(record?.regular?.pitching, record?.postseason?.pitching);
      }
      return { ...player, hitting, pitching };
    });
  }

  function parentUnified(){try{return window.parent!==window?window.parent.PCBLUnified:null}catch(_){return null}}
  function loadLiveSheet() {
    const hub=parentUnified();
    if(hub)return Promise.resolve(hub.exportRows());
    return new Promise((resolve, reject) => {
      const callback = `pcblSheet_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => cleanup(new Error("Google Sheet timed out.")), 10000);
      function cleanup(error, rows) {
        window.clearTimeout(timeout);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        if (error) reject(error); else resolve(rows);
      }
      window[callback] = (response) => {
        try {
          if (!response?.table?.rows) throw new Error("Google Sheet returned no rows.");
          const width = Math.max(16, response.table.cols?.length || 0);
          const rows = response.table.rows.map((row) => Array.from({ length: width }, (_, i) => {
            const cell = row.c?.[i];
            return cell ? (cell.f ?? cell.v ?? "") : "";
          }));
          cleanup(null, rows);
        } catch (error) {
          cleanup(error);
        }
      };
      const params = new URLSearchParams({
        gid: SHEET_GID,
        tqx: `out:json;responseHandler:${callback}`
      });
      script.onerror = () => cleanup(new Error("Google Sheet could not be reached."));
      script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
      document.head.appendChild(script);
    });
  }

  function sortedPCBLBlocks() {
    return Object.keys(state.pcbl.blocks).sort((a, b) => {
      if (a === "CAREER") return -1;
      if (b === "CAREER") return 1;
      return Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]);
    });
  }

  function populatePCBLBlocks() {
    const labels = sortedPCBLBlocks();
    dom.pcblRange.innerHTML = labels.map((label) => `<option value="${label}">${label}</option>`).join("");
  }

  function populateSeasons() {
    const current = new Date().getFullYear();
    const options = [];
    for (let year = current; year >= 1876; year -= 1) options.push(`<option value="${year}">${year}</option>`);
    dom.seasonYear.innerHTML = options.join("");
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`MLB data request failed (${response.status}).`);
    return response.json();
  }

  async function searchMLBPlayers(name) {
    const url = `${MLB_API}/people/search?names=${encodeURIComponent(name)}&sportIds=1`;
    const data = await fetchJson(url);
    return (data.people || []).filter((person) => person.isPlayer !== false).slice(0, 10);
  }

  async function getMLBPlayerPool() {
    if (state.mlbPool?.length) return state.mlbPool;
    const currentYear = new Date().getFullYear();
    let data = await fetchJson(`${MLB_API}/sports/1/players?season=${currentYear}&gameType=R`);
    if (!(data.people || []).length) data = await fetchJson(`${MLB_API}/sports/1/players?season=${currentYear - 1}&gameType=R`);
    state.mlbPool = (data.people || []).filter((person) => person.id && person.fullName && person.primaryPosition);
    if (!state.mlbPool.length) throw new Error("The MLB player pool is temporarily unavailable.");
    return state.mlbPool;
  }

  function chunk(items, size) {
    return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
  }

  function careerStatGroup(person, group) {
    const entry = (person.stats || []).find((item) => item.group?.displayName === group);
    return entry?.splits?.find((split) => !split.gameType || split.gameType === "R")?.stat || entry?.splits?.[0]?.stat || null;
  }

  function isPitcherPosition(person) {
    return person.primaryPosition?.type === "Pitcher" || person.primaryPosition?.code === "1";
  }

  function isTwoWayPosition(person) {
    return /two-way/i.test(person.primaryPosition?.type || person.primaryPosition?.name || "");
  }

  function careerThresholds(filter = "standard") {
    return filter === "established"
      ? { pa: MLB_ESTABLISHED_MIN_PA, ip: MLB_ESTABLISHED_MIN_IP }
      : { pa: MLB_CAREER_MIN_PA, ip: MLB_CAREER_MIN_IP };
  }

  function isCareerHitter(person, filter = "standard") {
    const { pa } = careerThresholds(filter);
    return Number.isFinite(person.hitting?.PA) && person.hitting.PA >= pa && (!isPitcherPosition(person) || isTwoWayPosition(person));
  }

  function isCareerPitcher(person, filter = "standard") {
    const { ip } = careerThresholds(filter);
    return Number.isFinite(person.pitching?.IP) && person.pitching.IP >= ip && (isPitcherPosition(person) || isTwoWayPosition(person));
  }

  function careerCandidate(person) {
    const hittingStat = careerStatGroup(person, "hitting");
    const pitchingStat = careerStatGroup(person, "pitching");
    return {
      id: person.id,
      fullName: person.fullName,
      active: person.active,
      primaryPosition: person.primaryPosition,
      hitting: hittingStat ? combineMLBHitting([hittingStat]) : {},
      pitching: pitchingStat ? combineMLBPitching([pitchingStat]) : {}
    };
  }

  function buildMLBCareerBaseline(candidates, filter = "standard") {
    const hitters = candidates.filter((person) => isCareerHitter(person, filter));
    const pitchers = candidates.filter((person) => isCareerPitcher(person, filter));
    if (!hitters.length || !pitchers.length) throw new Error("The MLB career aggregate could not be built.");
    const baseline = { hitting: {}, pitching: {} };
    for (const key of ["BA", "OBP", "SLG", "OPS", "K_RATE", "ISO"]) {
      const weightKey = ["BA", "SLG", "ISO"].includes(key) ? "AB" : "PA";
      baseline.hitting[key] = weightedAverage(hitters.map((player) => [player.hitting[key], player.hitting[weightKey]]));
    }
    for (const key of ["ERA", "WHIP", "KFG", "BBFG"]) {
      baseline.pitching[key] = weightedAverage(pitchers.map((player) => [player.pitching[key], player.pitching.IP]));
    }
    return baseline;
  }

  function readCareerModelCache(cacheKey) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      const maxAge = MLB_CAREER_CACHE_HOURS * 60 * 60 * 1000;
      if (cached?.candidates?.length && cached?.baseline && cached?.baselines?.established && Date.now() - cached.savedAt < maxAge) return cached;
    } catch (_) {}
    return null;
  }

  function writeCareerModelCache(cacheKey, model) {
    try { localStorage.setItem(cacheKey, JSON.stringify(model)); } catch (_) {}
  }

  async function getMLBCareerModel(onProgress = () => {}) {
    if (state.mlbCareerModel?.candidates?.length) {
      onProgress(100);
      return state.mlbCareerModel;
    }
    const currentYear = new Date().getFullYear();
    const cacheKey = `pcbl-mlb-career-model-v4-${currentYear}`;
    const cached = readCareerModelCache(cacheKey);
    if (cached) {
      state.mlbCareerModel = cached;
      onProgress(100);
      return cached;
    }

    const playerPool = await getMLBPlayerPool();
    const metadata = new Map(playerPool.map((person) => [person.id, person]));
    const batches = chunk(playerPool.map((person) => person.id), 100);
    const hydrated = [];
    for (let index = 0; index < batches.length; index += 5) {
      const group = batches.slice(index, index + 5);
      const responses = await Promise.all(group.map((ids) => {
        const hydrate = "stats(group=[hitting,pitching],type=[career])";
        return fetchJson(`${MLB_API}/people?personIds=${ids.join(",")}&hydrate=${encodeURIComponent(hydrate)}`);
      }));
      hydrated.push(...responses.flatMap((response) => response.people || []));
      onProgress(Math.min(96, Math.round((Math.min(index + 5, batches.length) / batches.length) * 96)));
    }
    const candidates = hydrated
      .map((person) => careerCandidate({ ...metadata.get(person.id), ...person }))
      .filter((person) => isCareerHitter(person) || isCareerPitcher(person));
    const baselines = {
      standard: buildMLBCareerBaseline(candidates, "standard"),
      established: buildMLBCareerBaseline(candidates, "established")
    };
    const model = { savedAt: Date.now(), season: currentYear, candidates, baseline: baselines.standard, baselines };
    state.mlbCareerModel = model;
    writeCareerModelCache(cacheKey, model);
    onProgress(100);
    return model;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  async function selectRandomMLBPlayer() {
    hideMessages();
    dom.randomButton.disabled = true;
    dom.randomButton.textContent = "ROLLING";
    try {
      const pool = await getMLBPlayerPool();
      selectMLBPlayer(randomItem(pool));
    } catch (error) {
      showError(error?.message || "A random MLB player could not be loaded.");
    } finally {
      dom.randomButton.disabled = false;
      dom.randomButton.textContent = "RANDOM";
    }
  }

  function scheduleSuggestions() {
    window.clearTimeout(state.searchTimer);
    const name = dom.playerName.value.trim();
    const serial = ++state.searchSerial;
    if (name.length < 2) {
      dom.playerOptions.hidden = true;
      return;
    }
    state.searchTimer = window.setTimeout(async () => {
      try {
        const players = await searchMLBPlayers(name);
        if (serial === state.searchSerial && dom.playerName.value.trim() === name) renderPlayerOptions(players);
      } catch (_) {
        if (serial === state.searchSerial) dom.playerOptions.hidden = true;
      }
    }, 320);
  }

  function renderPlayerOptions(players) {
    if (!players.length) {
      dom.playerOptions.innerHTML = `<div class="player-option"><strong>NO MLB PLAYERS FOUND</strong></div>`;
      dom.playerOptions.hidden = false;
      return;
    }
    dom.playerOptions.innerHTML = players.map((player, index) => {
      const meta = [player.primaryPosition?.abbreviation, player.active ? "ACTIVE" : "RETIRED"].filter(Boolean).join(" · ");
      return `<button class="player-option" type="button" data-index="${index}">
        <img src="${mlbHeadshot(player.id)}" alt="" onerror="this.style.visibility='hidden'">
        <span><strong>${escapeHtml(player.fullName)}</strong><small>${escapeHtml(meta)}</small></span>
        <span class="pick">SELECT</span>
      </button>`;
    }).join("");
    dom.playerOptions.hidden = false;
    dom.playerOptions.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectMLBPlayer(players[Number(button.dataset.index)]));
    });
  }

  function selectMLBPlayer(player) {
    window.clearTimeout(state.searchTimer);
    state.searchSerial += 1;
    state.selectedMLB = player;
    dom.playerName.value = player.fullName;
    dom.playerOptions.hidden = true;
    dom.compareButton.disabled = false;
    dom.searchButton.textContent = "CHANGE";
    dom.playerName.blur();
  }

  function mlbHeadshot(id) {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/w_480,q_auto:best/v1/people/${id}/headshot/67/current`;
  }

  function careerStat(label, value, wide = false) {
    return `<div class="career-stat ${wide ? "wide" : ""}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function formatCount(value) {
    return Number.isFinite(value) ? String(Math.round(value)) : "—";
  }

  function formatInnings(value) {
    if (!Number.isFinite(value)) return "—";
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function playerParticipated(playerKey, blockLabel) {
    const player = pcblStatsFor(blockLabel, "regular").find((item) => item.key === playerKey);
    return Boolean((player?.hitting?.PA || 0) > 0 || (player?.pitching?.IP || 0) > 0);
  }

  function resetCareerMatchSearch() {
    const filter = dom.careerPoolFilter.value || "standard";
    const thresholds = careerThresholds(filter);
    dom.absoluteResults.hidden = true;
    dom.absoluteResults.innerHTML = "";
    dom.absoluteMatchButton.textContent = "SEARCH";
    dom.careerMatchStatus.textContent = `Matches this PCBL ${state.currentPreviewRange.toLowerCase()} profile against MLB careers. Minimum ${thresholds.pa.toLocaleString()} PA for hitters and ${thresholds.ip} IP for pitchers.`;
  }

  function renderPCBLProfile(playerKey, blockLabel) {
    const player = PCBL_PLAYERS.find((item) => item.key === playerKey);
    const profile = pcblStatsFor(blockLabel, "regular").find((item) => item.key === playerKey);
    if (!player || !profile) return;
    state.currentPreviewRange = blockLabel;
    const hitting = profile.hitting;
    const pitching = profile.pitching;
    const xbh = Number.isFinite(hitting.XBH) ? hitting.XBH : [hitting["2B"], hitting["3B"], hitting.HR].reduce((sum, value) => sum + (value || 0), 0);
    const slash = [hitting.BA, hitting.OBP, hitting.SLG, hitting.OPS].map(decimal3).join(" / ");
    dom.careerRangeLabel.textContent = `PCBL ${blockLabel} · REGULAR SEASON`;
    dom.careerCard.style.setProperty("--player", player.color);
    dom.careerPlayerFace.src = player.face;
    dom.careerPlayerFace.alt = player.name;
    dom.careerPlayerName.textContent = player.name;
    dom.careerHittingStats.innerHTML = [
      careerStat("PA", formatCount(hitting.PA)),
      careerStat("BA / OBP / SLG / OPS", slash, true),
      careerStat("HR", formatCount(hitting.HR)),
      careerStat("XBH", formatCount(xbh)),
      careerStat("R", formatCount(hitting.R))
    ].join("");
    dom.careerPitchingStats.innerHTML = [
      careerStat("IP", formatInnings(pitching.IP)),
      careerStat("ERA", number2(pitching.ERA)),
      careerStat("WHIP", number2(pitching.WHIP)),
      careerStat("K / 3", number2(pitching.K3), true)
    ].join("");
    resetCareerMatchSearch();
  }

  function openCareerPreview(playerKey) {
    const player = PCBL_PLAYERS.find((item) => item.key === playerKey);
    if (!player) return;
    state.currentPreviewPlayer = playerKey;
    const labels = sortedPCBLBlocks().filter((label) => playerParticipated(playerKey, label));
    dom.careerProfileRange.innerHTML = labels.map((label) => `<option value="${label}">${label}</option>`).join("");
    dom.careerProfileRange.value = labels.includes("CAREER") ? "CAREER" : labels[0];
    dom.careerPoolFilter.value = "standard";
    renderPCBLProfile(playerKey, dom.careerProfileRange.value);
    dom.playerModal.hidden = false;
    document.body.classList.add("modal-open");
    dom.modalClose.focus();
  }

  function closeCareerPreview() {
    dom.playerModal.hidden = true;
    document.body.classList.remove("modal-open");
    const trigger = document.querySelector(`.pcbl-player[data-player="${state.currentPreviewPlayer}"]`);
    state.currentPreviewPlayer = null;
    state.currentPreviewRange = "CAREER";
    trigger?.focus?.();
  }

  function fireworksMarkup() {
    return `<span class="fireworks">${Array.from({ length: 18 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 18;
      const radius = 34 + (index % 4) * 10;
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      return `<span style="--x:${x}px;--y:${y}px;--delay:${(index % 3) * 35}ms"></span>`;
    }).join("")}</span>`;
  }

  function careerMatchCard(match, role) {
    const person = match.person;
    const position = person.primaryPosition?.name || role;
    const perfect = match.score === 100;
    const closest = [...match.features].sort((a, b) => a.difference - b.difference).slice(0, 3).map((feature) => feature.short).join(" · ");
    return `<article class="absolute-card ${perfect ? "perfect" : ""}">
      <img src="${mlbHeadshot(person.id)}" alt="${escapeHtml(person.fullName)}" onerror="this.style.visibility='hidden'">
      <div><span class="absolute-role">CLOSEST MLB CAREER ${role}</span><h4>${escapeHtml(person.fullName)}</h4><p>${escapeHtml(position)} · BEST LINKS: ${escapeHtml(closest)}</p></div>
      <strong class="${perfect ? "perfect-score" : "career-score"}">${match.score}%</strong>
      ${perfect ? fireworksMarkup() : ""}
    </article>`;
  }

  function closestCareerMatch(candidates, pcblPlayer, pcblBaseline, mlbBaseline, group, blockLabel = "CAREER") {
    const profile = group === "hitting"
      ? { mode: "hitting", hittingWeight: 1, pitchingWeight: 0 }
      : { mode: "pitching", hittingWeight: 0, pitchingWeight: 1 };
    const ranked = candidates.map((person) => {
      const mlb = group === "hitting" ? { hitting: person.hitting, pitching: {} } : { hitting: {}, pitching: person.pitching };
      const comparison = compareCandidate(mlb, mlbBaseline, pcblPlayer, pcblBaseline, profile, blockLabel);
      return { person, score: comparison.score, distance: comparison.distance, features: comparison.features, available: comparison.available };
    }).filter((item) => item.available).sort((a, b) => b.score - a.score || a.distance - b.distance);
    return ranked[0] || null;
  }

  async function findCareerMatches() {
    if (!state.currentPreviewPlayer) return;
    const playerKey = state.currentPreviewPlayer;
    const blockLabel = state.currentPreviewRange || "CAREER";
    const poolFilter = dom.careerPoolFilter.value || "standard";
    dom.absoluteMatchButton.disabled = true;
    dom.absoluteMatchButton.textContent = "0%";
    dom.careerMatchStatus.textContent = "Building the MLB career aggregate and scanning qualified career profiles...";
    try {
      const model = await getMLBCareerModel((progress) => { dom.absoluteMatchButton.textContent = `${progress}%`; });
      const pcblPlayers = pcblStatsFor(blockLabel, "regular");
      const pcblPlayer = pcblPlayers.find((player) => player.key === playerKey);
      const pcblBaseline = pcblLeagueBaseline(pcblPlayers);
      const mlbBaseline = model.baselines?.[poolFilter] || buildMLBCareerBaseline(model.candidates, poolFilter);
      const hitter = closestCareerMatch(model.candidates.filter((person) => isCareerHitter(person, poolFilter)), pcblPlayer, pcblBaseline, mlbBaseline, "hitting", blockLabel);
      const pitcher = closestCareerMatch(model.candidates.filter((person) => isCareerPitcher(person, poolFilter)), pcblPlayer, pcblBaseline, mlbBaseline, "pitching", blockLabel);
      if (!hitter || !pitcher) throw new Error("Qualified career hitter and pitcher matches could not be calculated.");
      if (state.currentPreviewPlayer !== playerKey) return;
      dom.absoluteResults.innerHTML = careerMatchCard(hitter, "HITTER") + careerMatchCard(pitcher, "PITCHER");
      dom.absoluteResults.hidden = false;
      dom.absoluteMatchButton.textContent = "RECHECK";
      const perfectCount = [hitter, pitcher].filter((match) => match.score === 100).length;
      dom.careerMatchStatus.textContent = perfectCount
        ? `${perfectCount === 2 ? "Two genuine 100% matches" : "One genuine 100% match"} found for ${blockLabel.toLowerCase()} using separate MLB and PCBL aggregates.`
        : `No profile reached a genuine 100%. These are the closest honest MLB career matches for ${blockLabel.toLowerCase()} in the ${poolFilter} pool.`;
    } catch (error) {
      dom.absoluteResults.innerHTML = `<div class="absolute-card"><div><h4>TRY AGAIN</h4><p>${escapeHtml(error?.message || "Career comps could not load.")}</p></div></div>`;
      dom.absoluteResults.hidden = false;
      dom.absoluteMatchButton.textContent = "SEARCH";
      dom.careerMatchStatus.textContent = "The MLB career model could not load. Try the search again.";
    } finally {
      dom.absoluteMatchButton.disabled = false;
    }
  }

  function mlbStatUrl(personId, group, range, year, gameType) {
    const params = new URLSearchParams({
      stats: range === "career" ? "career" : "season",
      group,
      gameType
    });
    if (range === "season") params.set("season", year);
    return `${MLB_API}/people/${personId}/stats?${params}`;
  }

  async function getMLBGroup(personId, group, range, year, scope) {
    const types = scope === "combined" ? ["R", "P"] : [scope === "postseason" ? "P" : "R"];
    const results = await Promise.all(types.map(async (gameType) => {
      const data = await fetchJson(mlbStatUrl(personId, group, range, year, gameType));
      return data.stats?.[0]?.splits?.[0]?.stat || null;
    }));
    if (group === "hitting") return combineMLBHitting(results);
    return combineMLBPitching(results);
  }

  function combineMLBHitting(stats) {
    const valid = stats.filter(Boolean);
    if (!valid.length) return {};
    const keys = ["plateAppearances", "atBats", "hits", "doubles", "triples", "homeRuns", "baseOnBalls", "hitByPitch", "strikeOuts", "totalBases", "sacFlies", "gamesPlayed"];
    const out = {};
    for (const key of keys) out[key] = valid.reduce((sum, stat) => sum + (Number(stat[key]) || 0), 0);
    const pa = out.plateAppearances;
    const ab = out.atBats;
    out.BA = safeRatio(out.hits, ab);
    out.OBP = safeRatio(out.hits + out.baseOnBalls + out.hitByPitch, ab + out.baseOnBalls + out.hitByPitch + out.sacFlies);
    out.SLG = safeRatio(out.totalBases, ab);
    out.OPS = Number.isFinite(out.OBP) && Number.isFinite(out.SLG) ? out.OBP + out.SLG : null;
    out.K_RATE = safeRatio(out.strikeOuts, pa);
    out.ISO = Number.isFinite(out.SLG) && Number.isFinite(out.BA) ? out.SLG - out.BA : null;
    out.PA = pa;
    out.AB = ab;
    return out;
  }

  function inningsToOuts(value) {
    if (value == null || value === "") return 0;
    const [whole, partial = "0"] = String(value).split(".");
    return (Number(whole) || 0) * 3 + clamp(Number(partial) || 0, 0, 2);
  }

  function combineMLBPitching(stats) {
    const valid = stats.filter(Boolean);
    if (!valid.length) return {};
    const keys = ["earnedRuns", "hits", "baseOnBalls", "strikeOuts", "homeRuns", "gamesPlayed"];
    const out = {};
    for (const key of keys) out[key] = valid.reduce((sum, stat) => sum + (Number(stat[key]) || 0), 0);
    out.outs = valid.reduce((sum, stat) => sum + inningsToOuts(stat.inningsPitched), 0);
    out.IP = out.outs / 3;
    out.ERA = out.IP > 0 ? out.earnedRuns * 9 / out.IP : null;
    out.WHIP = out.IP > 0 ? (out.hits + out.baseOnBalls) / out.IP : null;
    out.KFG = out.IP > 0 ? out.strikeOuts * 9 / out.IP : null;
    out.BBFG = out.IP > 0 ? out.baseOnBalls * 9 / out.IP : null;
    return out;
  }

  function representativeYear(person, range, selectedYear) {
    if (range === "season") return Number(selectedYear);
    const debut = Number(String(person.mlbDebutDate || "").slice(0, 4));
    const last = Number(String(person.lastPlayedDate || "").slice(0, 4)) || new Date().getFullYear();
    if (debut && last) return Math.round((debut + last) / 2);
    return last || new Date().getFullYear();
  }

  async function fetchLeagueGroup(year, group, gameType) {
    const params = new URLSearchParams({ stats: "season", group, season: String(year), sportIds: "1", gameType });
    const data = await fetchJson(`${MLB_API}/teams/stats?${params}`);
    return (data.stats || []).flatMap((entry) => entry.splits || []).map((split) => split.stat).filter(Boolean);
  }

  async function getMLBBaseline(year, scope) {
    const cacheKey = `pcbl-mlb-baseline-v2-${year}-${scope}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached?.hitting && cached?.pitching) return cached;
    } catch (_) {}

    const gameTypes = scope === "combined" ? ["R", "P"] : [scope === "postseason" ? "P" : "R"];
    try {
      const [hitGroups, pitchGroups] = await Promise.all([
        Promise.all(gameTypes.map((type) => fetchLeagueGroup(year, "hitting", type))),
        Promise.all(gameTypes.map((type) => fetchLeagueGroup(year, "pitching", type)))
      ]);
      const hitting = combineMLBHitting(hitGroups.flat());
      const pitching = combineMLBPitching(pitchGroups.flat());
      const baseline = {
        hitting: hasUsefulHitting(hitting) ? hitting : FALLBACK_MLB_BASELINE.hitting,
        pitching: hasUsefulPitching(pitching) ? pitching : FALLBACK_MLB_BASELINE.pitching
      };
      try { localStorage.setItem(cacheKey, JSON.stringify(baseline)); } catch (_) {}
      return baseline;
    } catch (_) {
      return FALLBACK_MLB_BASELINE;
    }
  }

  function hasUsefulHitting(stats) {
    return Number.isFinite(stats?.PA) && stats.PA > 0 && Number.isFinite(stats?.OBP);
  }

  function hasUsefulPitching(stats) {
    return Number.isFinite(stats?.IP) && stats.IP > 0 && Number.isFinite(stats?.ERA);
  }

  function determineProfile(hitting, pitching) {
    const hasHit = hasUsefulHitting(hitting);
    const hasPitch = hasUsefulPitching(pitching);
    if (!hasHit && !hasPitch) throw new Error("No MLB hitting or pitching stats were found for that selection.");
    if (!hasPitch) return { mode: "hitting", hittingWeight: 1, pitchingWeight: 0 };
    if (!hasHit) return { mode: "pitching", hittingWeight: 0, pitchingWeight: 1 };
    const hitLoad = hitting.PA;
    const pitchLoad = pitching.IP * 4.25;
    const hitShare = hitLoad / (hitLoad + pitchLoad);
    const pitchShare = 1 - hitShare;
    if (hitting.PA < 20 || hitShare < .16) return { mode: "pitching", hittingWeight: 0, pitchingWeight: 1 };
    if (pitching.IP < 5 || pitchShare < .16) return { mode: "hitting", hittingWeight: 1, pitchingWeight: 0 };
    return { mode: "two-way", hittingWeight: hitShare, pitchingWeight: pitchShare };
  }

  function pcblLeagueBaseline(players) {
    const baseline = { hitting: {}, pitching: {} };
    for (const key of ["BA", "OBP", "SLG", "OPS", "K_RATE", "ISO"]) {
      const weightKey = ["BA", "SLG", "ISO"].includes(key) ? "AB" : "PA";
      baseline.hitting[key] = weightedAverage(players.map((p) => [p.hitting[key], p.hitting[weightKey]]));
    }
    for (const key of ["ERA", "WHIP", "KFG", "BBFG"]) baseline.pitching[key] = weightedAverage(players.map((p) => [p.pitching[key], p.pitching.IP]));
    return baseline;
  }

  function relativeIndex(value, average) {
    if (!Number.isFinite(value) || !Number.isFinite(average) || value <= 0 || average <= 0) return null;
    return clamp(Math.log(value / average), -1.2, 1.2);
  }

  function buildFeatureRows(mlb, mlbBaseline, pcbl, pcblBaseline, profile) {
    const rows = [];
    for (const [key, info] of Object.entries(FEATURE_INFO)) {
      const groupWeight = info.group === "hitting" ? profile.hittingWeight : profile.pitchingWeight;
      if (groupWeight <= 0) continue;
      const mlbValue = mlb[info.group]?.[key];
      const mlbAverage = mlbBaseline[info.group]?.[key];
      const pcblValue = pcbl[info.group]?.[key];
      const pcblAverage = pcblBaseline[info.group]?.[key];
      const mlbIndex = relativeIndex(mlbValue, mlbAverage);
      const pcblIndex = relativeIndex(pcblValue, pcblAverage);
      if (![mlbValue, mlbAverage, pcblValue, pcblAverage, mlbIndex, pcblIndex].every(Number.isFinite)) continue;
      rows.push({ key, ...info, groupWeight, mlbValue, pcblValue, mlbIndex, pcblIndex, difference: Math.abs(mlbIndex - pcblIndex) });
    }
    return rows;
  }

  function sampleReliability(player, profile, blockLabel) {
    const paTarget = blockLabel === "CAREER" ? 110 : 45;
    const ipTarget = blockLabel === "CAREER" ? 24 : 10;
    const hit = clamp((player.hitting.PA || 0) / paTarget, 0, 1);
    const pitch = clamp((player.pitching.IP || 0) / ipTarget, 0, 1);
    return hit * profile.hittingWeight + pitch * profile.pitchingWeight;
  }

  function compareCandidate(mlb, mlbBaseline, player, pcblBaseline, profile, blockLabel) {
    const features = buildFeatureRows(mlb, mlbBaseline, player, pcblBaseline, profile);
    const expectedWeight = Object.values(FEATURE_INFO).reduce((sum, info) => sum + info.weight * (info.group === "hitting" ? profile.hittingWeight : profile.pitchingWeight), 0);
    const usedWeight = features.reduce((sum, f) => sum + f.weight * f.groupWeight, 0);
    if (!features.length || usedWeight < expectedWeight * .42) return { ...player, available: false, score: null, features: [] };
    const squared = features.reduce((sum, f) => sum + (f.difference ** 2) * f.weight * f.groupWeight, 0) / usedWeight;
    const reliability = sampleReliability(player, profile, blockLabel);
    const distance = Math.sqrt(squared) + (1 - reliability) * .18;
    const score = Math.round(clamp(100 - distance * 48, 8, 100));
    return { ...player, available: true, score, distance, reliability, features };
  }

  async function runComparison() {
    if (!state.selectedMLB || !state.pcbl) return;
    hideMessages();
    dom.results.hidden = true;
    dom.loadingPanel.hidden = false;
    dom.compareButton.disabled = true;
    dom.loadingText.textContent = "READING MLB AND PCBL STATS...";

    const range = document.querySelector('input[name="range"]:checked').value;
    const year = Number(dom.seasonYear.value);
    const scope = dom.postseason.value;
    const blockLabel = dom.pcblRange.value;
    try {
      const person = state.selectedMLB;
      const baselineYear = representativeYear(person, range, year);
      const careerAggregate = range === "career" && scope === "regular";
      const baselineRequest = careerAggregate
        ? getMLBCareerModel((progress) => { dom.loadingText.textContent = `BUILDING MLB CAREER AGGREGATE... ${progress}%`; }).then((model) => model.baseline)
        : getMLBBaseline(baselineYear, scope);
      const [hitting, pitching, mlbBaseline] = await Promise.all([
        getMLBGroup(person.id, "hitting", range, year, scope),
        getMLBGroup(person.id, "pitching", range, year, scope),
        baselineRequest
      ]);
      const profile = determineProfile(hitting, pitching);
      const pcblPlayers = pcblStatsFor(blockLabel, scope);
      const pcblBaseline = pcblLeagueBaseline(pcblPlayers);
      const mlb = { hitting, pitching };
      const rankings = pcblPlayers
        .map((player) => compareCandidate(mlb, mlbBaseline, player, pcblBaseline, profile, blockLabel))
        .sort((a, b) => {
          if (a.available !== b.available) return a.available ? -1 : 1;
          return (b.score || 0) - (a.score || 0);
        });
      const best = rankings.find((rank) => rank.available);
      if (!best) throw new Error("That selection does not overlap with enough PCBL data to calculate a match.");
      const result = { person, mlb, mlbBaseline, profile, rankings, best, range, year, scope, blockLabel };
      state.latestResult = result;
      renderResult(result);
      dom.loadingPanel.hidden = true;
      dom.results.hidden = false;
      dom.results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      dom.loadingPanel.hidden = true;
      showError(error?.message || "The statistics could not be loaded. Try again in a moment.");
    } finally {
      dom.compareButton.disabled = !state.selectedMLB;
    }
  }

  function renderResult(result) {
    result.viewed = result.best;
    renderSelectedComparison(result, result.best);
    renderRankings(result.rankings, result.best.key);
  }

  function renderSelectedComparison(result, selected) {
    const { person, profile, range, year, scope, blockLabel } = result;
    dom.matchupCard.style.setProperty("--match", selected.color);
    const perfect = selected.score === 100;
    dom.matchCenter.classList.toggle("perfect", perfect);
    dom.mainFireworks.hidden = !perfect;
    dom.mainFireworks.innerHTML = perfect ? fireworksMarkup() : "";
    dom.resultTitle.textContent = `${person.fullName} × ${selected.name}`;
    dom.mlbName.textContent = person.fullName;
    dom.mlbMeta.textContent = `${range === "career" ? "CAREER" : year} · ${scopeLabel(scope)}`;
    dom.pcblName.textContent = selected.name;
    dom.pcblMeta.textContent = `${blockLabel} · ${scopeLabel(scope)}`;
    dom.matchScore.textContent = `${selected.score}%`;
    dom.matchType.textContent = `${profileLabel(profile.mode)} PROFILE MATCH`;
    dom.mlbPortrait.src = mlbHeadshot(person.id);
    dom.mlbPortrait.alt = person.fullName;
    dom.mlbPortrait.style.display = "block";
    dom.mlbFallback.style.display = "grid";
    dom.mlbPortrait.onerror = () => { dom.mlbPortrait.style.display = "none"; };
    dom.pcblPortrait.src = selected.face;
    dom.pcblPortrait.alt = selected.name;
    dom.baseballReferenceLink.href = `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(person.fullName)}`;
    renderReasons(selected.features, selected);
    renderMetricBars(selected.features);
    result.viewed = selected;
  }

  function renderReasons(features, player) {
    const strongest = [...features].sort((a, b) => a.difference - b.difference).slice(0, 3);
    dom.matchReasons.innerHTML = strongest.map((feature, index) => {
      const mlbDirection = directionPhrase(feature.mlbIndex);
      const pcblDirection = directionPhrase(feature.pcblIndex);
      const agreement = mlbDirection === pcblDirection ? `Both profiles are ${mlbDirection} in ${feature.label.toLowerCase()}.` : `Their league-relative ${feature.label.toLowerCase()} marks land unusually close.`;
      return `<div class="reason">
        <span class="reason-number">0${index + 1}</span>
        <div><strong>${feature.label}</strong><p>${agreement} ${player.name}'s PCBL number is ${feature.format(feature.pcblValue)}.</p></div>
      </div>`;
    }).join("");
  }

  function directionPhrase(index) {
    if (index > .20) return "well above league average";
    if (index > .06) return "above league average";
    if (index < -.20) return "well below league average";
    if (index < -.06) return "below league average";
    return "near league average";
  }

  function renderMetricBars(features) {
    let previousGroup = null;
    dom.metricBars.innerHTML = features.map((feature) => {
      const mlbPosition = clamp(50 + feature.mlbIndex * 50, 4, 96);
      const pcblPosition = clamp(50 + feature.pcblIndex * 50, 4, 96);
      const grade = Math.round(clamp(100 - feature.difference * 48, 0, 100));
      const groupLabel = feature.group !== previousGroup ? `<div class="metric-group-label">${feature.group.toUpperCase()}</div>` : "";
      previousGroup = feature.group;
      return `${groupLabel}<div class="metric-row">
        <span class="metric-name">${feature.short}</span>
        <div class="metric-track">
          <span class="metric-dot mlb" style="left:${mlbPosition}%" title="MLB: ${feature.format(feature.mlbValue)}${feature.mlbSuffix || ""}"></span>
          <span class="metric-dot pcbl" style="left:${pcblPosition}%" title="PCBL: ${feature.format(feature.pcblValue)}${feature.pcblSuffix || ""}"></span>
        </div>
        <div class="metric-values"><span class="mlb-value">MLB ${feature.format(feature.mlbValue)}${feature.mlbSuffix || ""}</span><span class="pcbl-value">PCBL ${feature.format(feature.pcblValue)}${feature.pcblSuffix || ""}</span></div>
        <strong class="metric-grade ${grade === 100 ? "perfect" : ""}"><span>MATCH</span>${grade}%</strong>
      </div>`;
    }).join("");
  }

  function renderRankings(rankings, activeKey) {
    dom.rankings.innerHTML = rankings.map((rank, index) => `<button type="button" class="rank-card ${rank.available ? "" : "unavailable"} ${rank.score === 100 ? "perfect" : ""} ${rank.key === activeKey ? "active" : ""}" data-player="${rank.key}" style="--player:${rank.color}" ${rank.available ? "" : "disabled"}>
      <span class="rank-position">#${index + 1}</span>
      <img src="${rank.face}" alt="${rank.name}">
      <h4>${rank.name.toUpperCase()}</h4>
      <strong>${rank.available ? `${rank.score}%` : "N/A"}</strong>
      <small>${rank.available ? reliabilityLabel(rank.reliability) : "NO DATA FOR FILTER"}</small>
      ${rank.score === 100 ? fireworksMarkup() : ""}
    </button>`).join("");
    dom.rankings.querySelectorAll(".rank-card:not(:disabled)").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = state.latestResult?.rankings.find((rank) => rank.key === button.dataset.player);
        if (!selected) return;
        renderSelectedComparison(state.latestResult, selected);
        renderRankings(state.latestResult.rankings, selected.key);
        dom.matchupCard.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function reliabilityLabel(value) {
    if (value >= .8) return "FULL SAMPLE";
    if (value >= .45) return "LIMITED SAMPLE";
    return "SMALL SAMPLE";
  }

  function scopeLabel(scope) {
    if (scope === "postseason") return "POSTSEASON";
    if (scope === "combined") return "REGULAR + POSTSEASON";
    return "REGULAR SEASON";
  }

  function profileLabel(mode) {
    if (mode === "two-way") return "TWO-WAY";
    return mode.toUpperCase();
  }

  function hideMessages() {
    dom.errorPanel.hidden = true;
  }

  function showError(message) {
    dom.errorText.textContent = message;
    dom.errorPanel.hidden = false;
    dom.errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  async function handleSearch(event) {
    event.preventDefault();
    hideMessages();
    window.clearTimeout(state.searchTimer);
    state.searchSerial += 1;
    const name = dom.playerName.value.trim();
    if (name.length < 2) {
      showError("Enter at least two letters of an MLB player's name.");
      return;
    }
    state.selectedMLB = null;
    dom.compareButton.disabled = true;
    dom.searchButton.disabled = true;
    dom.searchButton.textContent = "SEARCHING";
    try {
      const players = await searchMLBPlayers(name);
      if (players.length === 1) selectMLBPlayer(players[0]);
      else renderPlayerOptions(players);
    } catch (error) {
      showError(error?.message || "MLB player search is temporarily unavailable.");
    } finally {
      dom.searchButton.disabled = false;
      if (!state.selectedMLB) dom.searchButton.textContent = "FIND PLAYER";
    }
  }

  async function copyResult() {
    if (!state.latestResult) return;
    const { person, best, viewed, range, year, scope, blockLabel } = state.latestResult;
    const selected = viewed || best;
    const text = `${person.fullName}'s PCBL comparison is ${selected.name} (${selected.score}% similarity) — ${range === "career" ? "career" : year}, ${scopeLabel(scope).toLowerCase()}, compared with PCBL ${blockLabel.toLowerCase()} stats.`;
    try {
      await navigator.clipboard.writeText(text);
      dom.shareResult.textContent = "COPIED";
      window.setTimeout(() => { dom.shareResult.textContent = "COPY RESULT"; }, 1800);
    } catch (_) {
      window.prompt("Copy your result:", text);
    }
  }

  function resetSearch() {
    state.selectedMLB = null;
    state.latestResult = null;
    dom.playerName.value = "";
    dom.searchButton.textContent = "FIND PLAYER";
    dom.compareButton.disabled = true;
    dom.results.hidden = true;
    dom.playerOptions.hidden = true;
    hideMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => dom.playerName.focus(), 350);
  }

  function mysteryStatLine(person, role) {
    if (role === "HITTER") {
      const stats = person.hitting || {};
      return `BA ${decimal3(stats.BA)} · OBP ${decimal3(stats.OBP)} · SLG ${decimal3(stats.SLG)} · OPS ${decimal3(stats.OPS)} · K% ${percent1(stats.K_RATE)} · ISO ${decimal3(stats.ISO)}`;
    }
    const stats = person.pitching || {};
    return `ERA ${number2(stats.ERA)} · WHIP ${number2(stats.WHIP)} · K/9 ${number2(stats.KFG)} · BB/9 ${number2(stats.BBFG)}`;
  }

  function buildMysteryRankings(person, role, model) {
    const profile = role === "HITTER"
      ? { mode: "hitting", hittingWeight: 1, pitchingWeight: 0 }
      : { mode: "pitching", hittingWeight: 0, pitchingWeight: 1 };
    const mlb = role === "HITTER"
      ? { hitting: person.hitting, pitching: {} }
      : { hitting: {}, pitching: person.pitching };
    const pcblPlayers = pcblStatsFor("CAREER", "regular");
    const pcblBaseline = pcblLeagueBaseline(pcblPlayers);
    return pcblPlayers
      .map((player) => compareCandidate(mlb, model.baselines.standard, player, pcblBaseline, profile, "CAREER"))
      .sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return (b.score || 0) - (a.score || 0) || (a.distance || 0) - (b.distance || 0);
      });
  }

  function renderMysteryRound(round) {
    dom.mysteryPortrait.src = mlbHeadshot(round.person.id);
    dom.mysteryPortrait.alt = round.person.fullName;
    dom.mysteryPortrait.style.visibility = "visible";
    dom.mysteryPortrait.onerror = () => { dom.mysteryPortrait.style.visibility = "hidden"; };
    dom.mysteryRole.textContent = `MLB CAREER ${round.role}`;
    dom.mysteryName.textContent = round.person.fullName;
    dom.mysteryStats.textContent = mysteryStatLine(round.person, round.role);
    dom.mysteryChoices.innerHTML = PCBL_PLAYERS.map((player) => `<button type="button" class="mystery-choice" data-player="${player.key}">${player.name.toUpperCase()}</button>`).join("");
    dom.mysteryFeedback.hidden = true;
    dom.mysteryFeedback.innerHTML = "";
    dom.mysteryNext.hidden = true;
    dom.mysteryStage.hidden = false;
    dom.mysteryChoices.querySelectorAll(".mystery-choice").forEach((button) => {
      button.addEventListener("click", () => answerMystery(button.dataset.player));
    });
  }

  function answerMystery(playerKey) {
    const round = state.mysteryRound;
    if (!round || round.answered) return;
    round.answered = true;
    const correct = round.answer.key === playerKey;
    dom.mysteryChoices.querySelectorAll(".mystery-choice").forEach((button) => {
      button.disabled = true;
      if (button.dataset.player === round.answer.key) button.classList.add("correct");
      else if (button.dataset.player === playerKey) button.classList.add("wrong");
    });
    const closest = [...round.answer.features]
      .sort((a, b) => a.difference - b.difference)
      .slice(0, 3)
      .map((feature) => feature.short)
      .join(" · ");
    dom.mysteryFeedback.innerHTML = `${correct ? "<strong>CORRECT.</strong>" : "NOT QUITE."} The closest career comp is <strong>${escapeHtml(round.answer.name.toUpperCase())}</strong> at <strong>${round.answer.score}%</strong>. Best stat links: ${escapeHtml(closest)}.`;
    dom.mysteryFeedback.hidden = false;
    dom.mysteryNext.hidden = false;
  }

  async function startMysteryRound() {
    dom.mysteryStart.disabled = true;
    dom.mysteryNext.disabled = true;
    dom.mysteryStage.hidden = true;
    dom.mysteryStatus.hidden = false;
    dom.mysteryStatus.textContent = "BUILDING MLB CAREER POOL...";
    try {
      const model = await getMLBCareerModel((progress) => {
        dom.mysteryStatus.textContent = `BUILDING MLB CAREER POOL... ${progress}%`;
      });
      const entries = model.candidates
        .filter((person) => isCareerHitter(person, "standard"))
        .map((person) => ({ person, role: "HITTER" }));
      if (!entries.length) throw new Error("No qualified MLB career hitter profiles are available.");
      let picked = null;
      let rankings = [];
      for (let attempt = 0; attempt < 12 && !rankings.some((rank) => rank.available); attempt += 1) {
        picked = randomItem(entries);
        rankings = buildMysteryRankings(picked.person, picked.role, model);
      }
      const answer = rankings.find((rank) => rank.available);
      if (!picked || !answer) throw new Error("A mystery comparison could not be built.");
      state.mysteryRound = { ...picked, rankings, answer, answered: false };
      renderMysteryRound(state.mysteryRound);
      dom.mysteryStatus.hidden = true;
    } catch (error) {
      dom.mysteryStatus.textContent = error?.message || "MYSTERY COMP COULD NOT LOAD. TRY AGAIN.";
    } finally {
      dom.mysteryStart.disabled = false;
      dom.mysteryNext.disabled = false;
    }
  }

  function bindEvents() {
    dom.form.addEventListener("submit", handleSearch);
    dom.compareButton.addEventListener("click", runComparison);
    dom.randomButton.addEventListener("click", selectRandomMLBPlayer);
    dom.shareResult.addEventListener("click", copyResult);
    dom.resetButton.addEventListener("click", resetSearch);
    dom.playerName.addEventListener("input", () => {
      if (state.selectedMLB && dom.playerName.value !== state.selectedMLB.fullName) {
        state.selectedMLB = null;
        dom.compareButton.disabled = true;
        dom.searchButton.textContent = "FIND PLAYER";
      }
      scheduleSuggestions();
    });
    document.querySelectorAll(".pcbl-player").forEach((button) => button.addEventListener("click", () => openCareerPreview(button.dataset.player)));
    dom.modalBackdrop.addEventListener("click", closeCareerPreview);
    dom.modalClose.addEventListener("click", closeCareerPreview);
    dom.absoluteMatchButton.addEventListener("click", findCareerMatches);
    dom.careerProfileRange.addEventListener("change", () => {
      if (state.currentPreviewPlayer) renderPCBLProfile(state.currentPreviewPlayer, dom.careerProfileRange.value);
    });
    dom.careerPoolFilter.addEventListener("change", resetCareerMatchSearch);
    dom.mysteryStart.addEventListener("click", startMysteryRound);
    dom.mysteryNext.addEventListener("click", startMysteryRound);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dom.playerModal.hidden) closeCareerPreview();
    });
    document.querySelectorAll('input[name="range"]').forEach((input) => {
      input.addEventListener("change", () => { dom.seasonField.hidden = input.value !== "season" || !input.checked; });
    });
    document.addEventListener("click", (event) => {
      if (!dom.playerOptions.contains(event.target) && event.target !== dom.playerName) dom.playerOptions.hidden = true;
    });
  }

  async function init() {
    populateSeasons();
    bindEvents();
    try {
      state.pcbl = parseSheet(window.PCBL_SNAPSHOT_ROWS || []);
      populatePCBLBlocks();
      dom.sheetStatus.classList.add("fallback");
      dom.sheetStatus.innerHTML = "<span></span> PCBL DATA READY";
    } catch (error) {
      showError(error.message);
      return;
    }
    try {
      const liveRows = await loadLiveSheet();
      const live = parseSheet(liveRows);
      if (Object.keys(live.blocks).length >= Object.keys(state.pcbl.blocks).length) {
        state.pcbl = live;
        state.sheetSource = "live";
        populatePCBLBlocks();
        dom.sheetStatus.className = "live-chip live";
        dom.sheetStatus.innerHTML = "<span></span> "+(parentUnified()?"SYNCED WITH PCBL SAVANT":"LIVE SHEET CONNECTED");
      }
    } catch (_) {
      dom.sheetStatus.className = "live-chip fallback";
      dom.sheetStatus.innerHTML = "<span></span> SAVED PCBL DATA";
    }
  }

  function onSharedDataUpdate() {
    const hub=parentUnified();if(!hub)return;
    try{
      const previous=dom.pcblRange.value;
      state.pcbl=parseSheet(hub.exportRows());state.sheetSource='shared';
      populatePCBLBlocks();
      if([...dom.pcblRange.options].some(o=>o.value===previous))dom.pcblRange.value=previous;
      dom.sheetStatus.className='live-chip live';
      dom.sheetStatus.innerHTML='<span></span> SYNCED WITH PCBL SAVANT';
    }catch(error){console.warn('Embedded comparison sync skipped',error)}
  }
  try{parentUnified()&&window.parent.addEventListener('pcbl-data-updated',onSharedDataUpdate)}catch(_){}
  window.PCBL_APP = {
    parseSheet,
    pcblStatsFor,
    pcblLeagueBaseline,
    compareCandidate,
    combineMLBHitting,
    combineMLBPitching,
    determineProfile,
    searchMLBPlayers,
    getMLBPlayerPool,
    getMLBCareerModel,
    buildMLBCareerBaseline,
    closestCareerMatch,
    getMLBGroup,
    getMLBBaseline,
    openCareerPreview,
    renderPCBLProfile,
    findCareerMatches,
    isCareerHitter,
    isCareerPitcher,
    buildMysteryRankings,
    startMysteryRound,
    answerMystery,
    state
  };

  init();
})();
