export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  return res.status(200).json({
    ok: true,
    service: "SCORIVO RapidAPI football proxy",
    keyConfigured: Boolean(process.env.RAPIDAPI_KEY)
  });
}
