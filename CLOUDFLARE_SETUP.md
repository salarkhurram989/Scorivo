# SCORIVO — Vercel + RapidAPI setup

SCORIVO now uses **Vercel Serverless Functions** instead of the Cloudflare Worker.

The RapidAPI key stays server-side as the Vercel environment variable `RAPIDAPI_KEY`. It is never placed in the frontend or GitHub source.

## RapidAPI endpoints

- `football-current-live` — live matches
- `football-get-standing-all` — standings
- `get-search-all-players` — player search

## Vercel deployment

1. Import `salarkhurram989/Scorivo` into Vercel.
2. Keep the repository root as the project root.
3. No build command is required.
4. Add an environment variable:
   - Name: `RAPIDAPI_KEY`
   - Value: your newly regenerated RapidAPI key
5. Deploy.

The repository already contains:
- `api/football.js` — secure RapidAPI proxy
- `api/health.js` — configuration health check
- `vercel.json` — serverless runtime configuration
- `scorivo-live.js` — live match/standings client

## Test

After deployment:

`/api/health`

should return `"keyConfigured": true`.

Then:

`/api/football?endpoint=football-current-live`

should return the RapidAPI live-football response.

## Security

Never put the RapidAPI key in `index.html`, `scorivo-live.js`, or any public environment variable.

The RapidAPI key previously pasted into chat should be revoked/regenerated before production use. Use only the newly generated key in Vercel's `RAPIDAPI_KEY` environment variable.

## Local development

If you run the project through Vercel's local development tooling, define `RAPIDAPI_KEY` in the local environment. A plain static file server will not execute `api/*.js`.
