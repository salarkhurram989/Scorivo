const API_BASE = "https://v3.football.api-sports.io/";
const ALLOWED_ENDPOINTS = new Set([
  "fixtures",
  "leagues",
  "teams",
  "standings",
  "countries",
  "injuries",
  "fixtures/events",
  "fixtures/lineups",
  "fixtures/players"
]);

const ALLOWED_PARAMS = new Set([
  "id", "ids", "live", "date", "league", "season", "team", "player",
  "fixture", "from", "to", "next", "last", "status", "timezone",
  "country", "name", "code", "venue", "search", "type"
]);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      ...extra
    }
  });
}

async function footballApi(request, env) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "fixtures";
  const key = env.API_FOOTBALL_KEY;

  if (!key) {
    return json({ ok: false, error: "API_FOOTBALL_KEY is not configured on the server." }, 500);
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return json({ ok: false, error: "Endpoint is not allowed." }, 400);
  }

  const target = new URL(endpoint, API_BASE);
  for (const [name, value] of url.searchParams) {
    if (name === "endpoint") continue;
    if (!ALLOWED_PARAMS.has(name)) {
      return json({ ok: false, error: `Parameter '${name}' is not allowed.` }, 400);
    }
    if (value.length > 120) {
      return json({ ok: false, error: "Parameter is too long." }, 400);
    }
    target.searchParams.set(name, value);
  }

  // Cache briefly at Cloudflare's edge so repeated visitors do not consume
  // an API-Football request for every page load.
  const cache = caches.default;
  const cacheKey = new Request(target.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return new Response(cached.body, cached);

  const upstream = await fetch(target.toString(), {
    headers: {
      "x-apisports-key": key,
      "accept": "application/json"
    }
  });

  const text = await upstream.text();
  const headers = {
    "content-type": upstream.headers.get("content-type") || "application/json; charset=UTF-8",
    "cache-control": endpoint === "fixtures" && url.searchParams.get("live") === "all"
      ? "public, max-age=20, s-maxage=20"
      : "public, max-age=120, s-maxage=120",
    "access-control-allow-origin": "*"
  };

  const response = new Response(text, { status: upstream.status, headers });
  if (upstream.ok) {
    // waitUntil is not available from every Pages context, so cache directly.
    try { await cache.put(cacheKey, response.clone()); } catch (_) {}
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/football" || url.pathname === "/api/football/") {
      if (request.method !== "GET") return json({ ok: false, error: "GET only" }, 405);
      return footballApi(request, env);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "SCORIVO football proxy", keyConfigured: Boolean(env.API_FOOTBALL_KEY) });
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

    // Inject the live-data client without changing the existing SCORIVO design.
    if (contentType.includes("text/html")) {
      return new HTMLRewriter()
        .on("body", {
          element(element) {
            element.append('<script src="/scorivo-live.js" defer></script>', { html: true });
          }
        })
        .transform(response);
    }

    return response;
  }
};
