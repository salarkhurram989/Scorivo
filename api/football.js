const API_BASE = "https://free-api-live-football-data.p.rapidapi.com/";
const API_HOST = "free-api-live-football-data.p.rapidapi.com";

const ALLOWED_ENDPOINTS = new Set([
  "football-current-live",
  "football-get-standing-all",
  "get-search-all-players"
]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "RAPIDAPI_KEY is not configured on the server."
    });
  }

  const endpoint = typeof req.query.endpoint === "string"
    ? req.query.endpoint
    : "football-current-live";

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ ok: false, error: "Endpoint is not allowed." });
  }

  const target = new URL(endpoint, API_BASE);

  for (const [name, rawValue] of Object.entries(req.query)) {
    if (name === "endpoint") continue;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (typeof value !== "string") continue;
    if (value.length > 120) {
      return res.status(400).json({ ok: false, error: "Parameter is too long." });
    }
    target.searchParams.set(name, value);
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": API_HOST,
        "accept": "application/json"
      }
    });

    const body = await upstream.text();
    res.setHeader(
      "Cache-Control",
      endpoint === "football-current-live"
        ? "s-maxage=20, stale-while-revalidate=40"
        : "s-maxage=120, stale-while-revalidate=300"
    );
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=UTF-8");

    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({
      ok: false,
      error: "Could not connect to RapidAPI."
    });
  }
}
