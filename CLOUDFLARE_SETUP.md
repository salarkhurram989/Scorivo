# SCORIVO — secure RapidAPI live football setup

SCORIVO now uses the RapidAPI Free API Live Football Data service through a Cloudflare Pages Advanced Mode Worker. The RapidAPI key is never sent to the browser and is not stored in GitHub.

## RapidAPI endpoints

- `football-current-live` — live matches
- `football-get-standing-all` — standings
- `get-search-all-players` — player search

## Cloudflare setup

1. Connect `salarkhurram989/Scorivo` to Cloudflare Workers & Pages.
2. Deploy the `main` branch.
3. Use the repository root as the output directory.
4. No framework or build command is required.

The repository's `_worker.js` handles `/api/football` and keeps the RapidAPI credential server-side.

## Add the secret

In Cloudflare Pages, add a **Secret** named:

`RAPIDAPI_KEY`

Paste your RapidAPI key there.

Do not put the key in `index.html`, `scorivo-live.js`, GitHub source, or a public environment variable.

## API route

SCORIVO calls:

`/api/football?endpoint=football-current-live`

The Worker forwards the request to:

`https://free-api-live-football-data.p.rapidapi.com/football-current-live`

and adds the RapidAPI authentication headers server-side.

## Test

After deployment:

`/api/health`

should report `"keyConfigured": true`.

Then test:

`/api/football?endpoint=football-current-live`

The response should contain the RapidAPI live-football data.

## Security

The RapidAPI key previously pasted into chat should be revoked/regenerated before production use. Store the newly generated key only as the Cloudflare `RAPIDAPI_KEY` secret.

The live client refreshes every 60 seconds and Cloudflare caches live responses briefly to reduce upstream requests.
