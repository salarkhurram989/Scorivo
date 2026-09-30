(() => {
  "use strict";

  const API = "/api/football";
  const BACKEND_TIMEOUT = 8000;
  const TZ = "Asia/Karachi";
  let liveFixtures = [];

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  async function api(endpoint, params = {}) {
    const qs = new URLSearchParams({ endpoint, ...params });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
    try {
      const response = await fetch(`${API}?${qs.toString()}`, {
        headers: { accept: "application/json" },
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.errors && Object.keys(data.errors).length) {
        throw new Error(data.message || data.error || JSON.stringify(data.errors || `HTTP ${response.status}`));
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function rawLive(data) {
    const value = data?.response?.live ?? data?.response ?? data?.live ?? [];
    return Array.isArray(value) ? value : [];
  }

  function scoreParts(value) {
    const match = String(value ?? "").match(/(-?\d+)\s*[-:]\s*(-?\d+)/);
    return match ? [Number(match[1]), Number(match[2])] : [null, null];
  }

  function normalizeMatch(m) {
    const home = m?.home || {};
    const away = m?.away || {};
    const status = m?.status || {};
    const liveTime = status?.liveTime || {};
    const [homeScore, awayScore] = scoreParts(status?.scoreStr);
    const minute = liveTime.short ?? liveTime.long ?? status?.short ?? "";
    const isHalf = /^(HT|half)/i.test(String(minute));
    const isFinished = /^(FT|AET|PEN)/i.test(String(minute));

    return {
      fixture: {
        date: m?.time || m?.date || new Date().toISOString(),
        status: {
          short: isFinished ? "FT" : isHalf ? "HT" : "LIVE",
          elapsed: typeof liveTime.minute === "number" ? liveTime.minute : null
        }
      },
      teams: {
        home: { name: home?.name || "Home", logo: home?.logo || home?.image || "" },
        away: { name: away?.name || "Away", logo: away?.logo || away?.image || "" }
      },
      goals: { home: homeScore, away: awayScore },
      league: { name: m?.league?.name || m?.tournament?.name || m?.competition?.name || "Live Football" },
      _rapid: m
    };
  }

  function statusText(fixture) {
    const s = fixture?.fixture?.status || {};
    if (s.short === "HT") return "HT";
    if (s.short === "FT") return "FT";
    if (s.elapsed != null) return `${s.elapsed}'`;
    return s.short || "LIVE";
  }

  function isLive(f) {
    return ["1H", "2H", "ET", "P", "LIVE", "HT"].includes(f?.fixture?.status?.short);
  }

  function renderMatches(items) {
    const list = document.getElementById("matchList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div style="padding:22px;text-align:center;color:var(--muted);font-size:12px">No live matches right now.</div>';
      return;
    }

    list.innerHTML = items.slice(0, 30).map((m) => {
      const home = m.teams?.home?.name || "Home";
      const away = m.teams?.away?.name || "Away";
      const hs = m.goals?.home;
      const as = m.goals?.away;
      const live = isLive(m);
      const state = statusText(m);
      const league = m.league?.name || "Football";
      return `<div class="match-row" data-search="${esc(`${home} ${away} ${league}`.toLowerCase())}">
        <div class="match-time" style="color:${live ? 'var(--red)' : 'var(--muted)'}">${esc(state)}</div>
        <div class="teams">
          <div class="team-line"><span>${esc(home)}</span><span>${hs == null ? "—" : hs}</span></div>
          <div class="team-line"><span>${esc(away)}</span><span>${as == null ? "—" : as}</span></div>
          <div class="league-label">${esc(league)}</div>
        </div><span>›</span>
      </div>`;
    }).join("");
  }

  function renderLiveHero(items) {
    const center = document.querySelector("#live .match-center");
    const label = document.querySelector("#live .live-label");
    if (!center) return;

    const match = items.find(isLive) || items[0];
    if (!match) {
      if (label) label.innerHTML = "<i></i> NO LIVE MATCHES";
      center.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#b9d8d4;padding:25px">No live matches right now.</div>';
      return;
    }

    const live = isLive(match);
    if (label) label.innerHTML = `<i></i> ${live ? "LIVE NOW" : "LATEST LIVE DATA"}`;
    const home = match.teams?.home || {};
    const away = match.teams?.away || {};
    const hs = match.goals?.home;
    const as = match.goals?.away;
    const hLogo = home.logo ? `<img src="${esc(home.logo)}" alt="" style="width:42px;height:42px;object-fit:contain">` : "H";
    const aLogo = away.logo ? `<img src="${esc(away.logo)}" alt="" style="width:42px;height:42px;object-fit:contain">` : "A";
    center.innerHTML = `<div><div class="club-badge">${hLogo}</div><div class="club-name">${esc(home.name || "Home")}</div></div>
      <div><div class="score">${hs == null ? "—" : hs} : ${as == null ? "—" : as}</div><div class="minute">${esc(statusText(match))}</div></div>
      <div><div class="club-badge">${aLogo}</div><div class="club-name">${esc(away.name || "Away")}</div></div>`;
  }

  function renderStandings(data) {
    const box = document.querySelector("#leagues .standings");
    if (!box) return;
    const rows = data?.response?.standing ?? data?.response ?? data?.standing ?? [];
    if (!Array.isArray(rows) || !rows.length) return;

    const html = rows.slice(0, 20).map((t, i) => {
      const rank = t.idx ?? t.rank ?? i + 1;
      const name = t.name ?? t.team?.name ?? "Team";
      const played = t.played ?? t.all?.played ?? t.p ?? "—";
      const gd = t.goalConDiff ?? t.goalsDiff ?? t.gd ?? "—";
      const pts = t.pts ?? t.points ?? "—";
      return `<div class="stand-row"><b>${esc(rank)}</b><span>${esc(name)}</span><span>${esc(played)}</span><span>${esc(gd)}</span><b>${esc(pts)}</b></div>`;
    }).join("");

    box.innerHTML = '<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div>' + html;
  }

  async function loadMatches() {
    try {
      const data = await api("football-current-live");
      liveFixtures = rawLive(data).map(normalizeMatch);
      renderLiveHero(liveFixtures);
      renderMatches(liveFixtures);
      setStatus(`LIVE DATA · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (error) {
      console.warn("SCORIVO RapidAPI football:", error);
      setStatus("API ERROR · CHECK CLOUDFLARE / RAPIDAPI");
      renderLiveHero([]);
      renderMatches([]);
    }
  }

  async function loadStandings() {
    try {
      const data = await api("football-get-standing-all", { leagueid: "47" });
      renderStandings(data);
    } catch (error) {
      console.warn("SCORIVO standings:", error);
    }
  }

  function setStatus(text) {
    let el = document.getElementById("scorivoApiStatus");
    if (!el) {
      el = document.createElement("span");
      el.id = "scorivoApiStatus";
      el.style.cssText = "font-size:9px;font-weight:800;color:#8feee2;white-space:nowrap;";
      document.querySelector(".top-actions")?.prepend(el);
    }
    el.textContent = text;
  }

  function setupSearch() {
    const search = (value) => {
      const q = value.trim().toLowerCase();
      document.querySelectorAll("#matchList .match-row").forEach((row) => {
        row.style.display = !q || (row.dataset.search || "").includes(q) ? "grid" : "none";
      });
    };
    document.getElementById("mainSearch")?.addEventListener("input", e => search(e.target.value));
    document.getElementById("topSearch")?.addEventListener("input", e => search(e.target.value));
  }

  window.SCORIVO = { api, refresh: loadMatches, loadStandings };

  document.addEventListener("DOMContentLoaded", () => {
    setupSearch();
    loadMatches();
    loadStandings();
    setInterval(loadMatches, 60000);
    setInterval(loadStandings, 300000);
  });
})();