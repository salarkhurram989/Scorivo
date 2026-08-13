(() => {
  "use strict";

  const API = "/api/football";
  const TZ = "Asia/Karachi";
  let liveFixtures = [];
  let todayFixtures = [];
  let injuriesLoaded = false;

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  const today = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());

  async function api(endpoint, params = {}) {
    const qs = new URLSearchParams({ endpoint, ...params });
    const response = await fetch(`${API}?${qs.toString()}`, { headers: { accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.errors && Object.keys(data.errors).length) {
      throw new Error(data.message || data.error || JSON.stringify(data.errors || "API request failed"));
    }
    return data;
  }

  function statusText(fixture) {
    const s = fixture?.fixture?.status || {};
    if (s.short === "HT") return "HT";
    if (s.short === "FT") return "FT";
    if (s.elapsed != null) return `${s.elapsed}'`;
    if (s.short === "NS") {
      return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(fixture.fixture.date));
    }
    return s.short || "—";
  }

  function isLive(f) {
    return ["1H", "2H", "ET", "P", "LIVE", "HT"].includes(f?.fixture?.status?.short);
  }

  function renderMatches(items) {
    const list = document.getElementById("matchList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div style="padding:22px;text-align:center;color:var(--muted);font-size:12px">No matches found for this period.</div>';
      return;
    }

    list.innerHTML = items.slice(0, 30).map((m) => {
      const home = m.teams?.home?.name || "Home";
      const away = m.teams?.away?.name || "Away";
      const hs = m.goals?.home ?? 0;
      const as = m.goals?.away ?? 0;
      const live = isLive(m);
      const state = statusText(m);
      const league = m.league?.name || "Football";
      return `<div class="match-row" data-search="${esc(`${home} ${away} ${league}`.toLowerCase())}">
        <div class="match-time" style="color:${live ? 'var(--red)' : 'var(--muted)'}">${esc(state)}</div>
        <div class="teams">
          <div class="team-line"><span>${esc(home)}</span><span>${m.goals?.home == null ? "—" : hs}</span></div>
          <div class="team-line"><span>${esc(away)}</span><span>${m.goals?.away == null ? "—" : as}</span></div>
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
    if (label) label.innerHTML = `<i></i> ${live ? "LIVE NOW" : "NEXT MATCH"}`;
    const home = match.teams?.home || {};
    const away = match.teams?.away || {};
    const hs = match.goals?.home ?? 0;
    const as = match.goals?.away ?? 0;
    const hLogo = home.logo ? `<img src="${esc(home.logo)}" alt="" style="width:42px;height:42px;object-fit:contain">` : "H";
    const aLogo = away.logo ? `<img src="${esc(away.logo)}" alt="" style="width:42px;height:42px;object-fit:contain">` : "A";
    center.innerHTML = `<div><div class="club-badge">${hLogo}</div><div class="club-name">${esc(home.name || "Home")}</div></div>
      <div><div class="score">${hs} : ${as}</div><div class="minute">${esc(statusText(match))}</div></div>
      <div><div class="club-badge">${aLogo}</div><div class="club-name">${esc(away.name || "Away")}</div></div>`;
  }

  async function loadMatches() {
    try {
      const [live, todayData] = await Promise.all([
        api("fixtures", { live: "all", timezone: TZ }),
        api("fixtures", { date: today(), timezone: TZ })
      ]);
      liveFixtures = live.response || [];
      todayFixtures = todayData.response || [];
      renderLiveHero(liveFixtures);
      renderMatches(todayFixtures.length ? todayFixtures : liveFixtures);
      setStatus(`LIVE DATA · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (error) {
      console.warn("SCORIVO football API:", error);
      setStatus("API NOT CONNECTED");
    }
  }

  async function loadInjuries() {
    if (injuriesLoaded) return;
    injuriesLoaded = true;
    const box = document.querySelector("#injuries");
    if (!box) return;
    const container = box.querySelector(".injury-row")?.parentElement || box;
    try {
      const data = await api("injuries", { date: today(), timezone: TZ });
      const rows = data.response || [];
      const existing = box.querySelectorAll(".injury-row");
      existing.forEach((r) => r.remove());
      if (!rows.length) {
        box.insertAdjacentHTML("beforeend", '<div class="injury-row"><div class="mini-avatar">—</div><div><div class="injury-name">No injury data</div><div class="injury-type">No reported absences for this date.</div></div><div class="status fit">—</div></div>');
        return;
      }
      rows.slice(0, 20).forEach((item) => {
        const p = item.player || {};
        const t = item.team || {};
        const reason = p.reason || p.type || "Unavailable";
        const type = p.type || "Missing fixture";
        const initials = (p.name || "Player").split(/\s+/).map(x => x[0]).join("").slice(0,2).toUpperCase();
        const status = /suspend/i.test(type) ? "SUSPENDED" : /question/i.test(type) ? "DOUBTFUL" : "OUT";
        const cls = status === "DOUBTFUL" ? "doubt" : "out";
        box.insertAdjacentHTML("beforeend", `<div class="injury-row"><div class="mini-avatar">${esc(initials)}</div><div><div class="injury-name">${esc(p.name || "Unknown player")}</div><div class="injury-type">${esc(t.name || "Unknown team")} · ${esc(reason)}</div></div><div class="status ${cls}">${status}</div></div>`);
      });
    } catch (error) {
      console.warn("SCORIVO injuries:", error);
      injuriesLoaded = false;
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
    const main = document.getElementById("mainSearch");
    const top = document.getElementById("topSearch");
    const search = (value) => {
      const q = value.trim().toLowerCase();
      document.querySelectorAll("#matchList .match-row").forEach((row) => {
        row.style.display = !q || (row.dataset.search || "").includes(q) ? "grid" : "none";
      });
    };
    main?.addEventListener("input", (e) => search(e.target.value));
    top?.addEventListener("input", (e) => search(e.target.value));
  }

  function setupInjuryObserver() {
    const target = document.getElementById("injuries");
    if (!target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        loadInjuries();
        observer.disconnect();
      }
    }, { rootMargin: "300px" });
    observer.observe(target);
  }

  window.SCORIVO = { api, refresh: loadMatches, loadInjuries };

  document.addEventListener("DOMContentLoaded", () => {
    setupSearch();
    setupInjuryObserver();
    loadMatches();
    // API-Football recommends frequent polling for competitions that have live games.
    // 60 seconds keeps the free 100-request/day plan from being exhausted by a single visitor.
    setInterval(loadMatches, 60000);
  });
})();
