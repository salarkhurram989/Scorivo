const API_BASE = "https://free-api-live-football-data.p.rapidapi.com/";
const API_HOST = "free-api-live-football-data.p.rapidapi.com";

const ALLOWED_ENDPOINTS = new Set([
  "football-current-live",
  "football-get-standing-all",
  "get-search-all-players"
]);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      ...extra
    }
  });
}

async function rapidApi(request, env) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "football-current-live";
  const key = env.RAPIDAPI_KEY;

  if (!key) {
    return json({
      ok: false,
      error: "RAPIDAPI_KEY is not configured on the server."
    }, 500);
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return json({ ok: false, error: "Endpoint is not allowed." }, 400);
  }

  const target = new URL(endpoint, API_BASE);
  for (const [name, value] of url.searchParams) {
    if (name === "endpoint") continue;
    if (value.length > 120) {
      return json({ ok: false, error: "Parameter is too long." }, 400);
    }
    target.searchParams.set(name, value);
  }

  const cache = caches.default;
  const cacheKey = new Request(target.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return new Response(cached.body, cached);

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": API_HOST,
        "accept": "application/json"
      }
    });
  } catch (error) {
    return json({ ok: false, error: "Could not connect to RapidAPI." }, 502);
  }

  const body = await upstream.text();
  const headers = {
    "content-type": upstream.headers.get("content-type") || "application/json; charset=UTF-8",
    "cache-control": endpoint === "football-current-live"
      ? "public, max-age=20, s-maxage=20"
      : "public, max-age=120, s-maxage=120",
    "access-control-allow-origin": "*"
  };

  const response = new Response(body, { status: upstream.status, headers });
  if (upstream.ok) {
    try { await cache.put(cacheKey, response.clone()); } catch (_) {}
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({ ok: true }, 204);
    }

    if (url.pathname === "/api/football" || url.pathname === "/api/football/") {
      if (request.method !== "GET") return json({ ok: false, error: "GET only" }, 405);
      return rapidApi(request, env);
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "SCORIVO RapidAPI football proxy",
        keyConfigured: Boolean(env.RAPIDAPI_KEY)
      });
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") || "";

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
