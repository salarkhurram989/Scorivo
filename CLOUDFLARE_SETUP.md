# SCORIVO — secure live football API setup

SCORIVO now uses a Cloudflare Pages Advanced Mode Worker as a serverless proxy. The API-Football key is **never sent to the browser and is not stored in GitHub**.

## 1. Keep your API key private

Use the free API-Football plan. The current free plan is $0/month, includes the football endpoints, and has a 100 requests/day quota.

## 2. Create the Cloudflare Pages project

1. Open Cloudflare and go to **Workers & Pages**.
2. Create a **Pages** project.
3. Connect the GitHub repository `salarkhurram989/Scorivo`.
4. Use the `main` branch.
5. This is a plain static HTML site, so no framework/build command is required.
6. Set the output directory to the repository root (`/`).
7. Deploy the project.

The repository contains `_worker.js`, so Cloudflare Pages Advanced Mode will use it for the serverless API route while still serving the normal HTML/CSS/JS files.

## 3. Add the secret

In the Cloudflare Pages project:

**Settings → Variables and Secrets → Add → Secret**

Use exactly:

`API_FOOTBALL_KEY`

Paste your API-Football key as the value, save it, and redeploy.

Do **not** put the key in `index.html`, `scorivo-live.js`, GitHub, or a public environment variable.

## 4. What the server provides

The Worker exposes only the routes SCORIVO needs through:

`/api/football?endpoint=fixtures&live=all`

`/api/football?endpoint=fixtures&date=YYYY-MM-DD`

`/api/football?endpoint=leagues...`

`/api/football?endpoint=teams...`

`/api/football?endpoint=standings...`

`/api/football?endpoint=injuries...`

It also supports fixture events, lineups, and player statistics.

The API key is inserted server-side in the `x-apisports-key` header and is never returned to visitors.

## 5. Current SCORIVO behavior

- Live scores are requested from `/fixtures?live=all`.
- Today's fixtures use the Asia/Karachi timezone.
- The live hero card updates from real match data.
- The match list updates from today's fixtures.
- Injury data loads when the Injuries panel is brought into view.
- The browser refreshes match data once per minute.
- Cloudflare edge caching reduces repeated upstream requests.

## Important free-plan limitation

API-Football's free plan currently allows 100 requests/day. A public website with many visitors can use that quota quickly. The Cloudflare cache helps, but it cannot make the upstream quota unlimited.

The site is therefore designed to start safely on the free tier rather than polling every few seconds.
