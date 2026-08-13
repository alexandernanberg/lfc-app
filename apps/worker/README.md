# @lfc/worker

A [Hono](https://hono.dev) backend, running scheduled jobs on [Inngest](https://www.inngest.com),
for background work the mobile app can't do on its own. Currently that's
pushing a notification to the LFC.se mobile app whenever a new article is
published — replacing the app's flaky on-device background poll with prompt,
server-driven delivery — but the app is meant to hold other background jobs
too as they come up.

## How it works

- **Devices register** their [Expo push token](https://docs.expo.dev/push-notifications/overview/)
  via `POST /api/devices`. Tokens are stored in Redis.
- **`poll-news`** runs every 5 min. Each poll fetches the latest articles from
  lfc.se (via `@lfc/api`) and, for any not yet announced, sends an
  [Expo push](https://docs.expo.dev/push-notifications/sending-notifications/).
  An atomic per-article claim in Redis makes this idempotent, so overlapping
  polls can't double-notify; an article that reached no device has its claim
  released so the next poll retries it rather than dropping it.
- **`reap-dead-tokens`** runs every 30 min to prune dead tokens.
  Sending only yields a _ticket_ (accepted); a token that has gone dead is
  reported later in the _delivery receipt_. This pass looks up the receipts for
  accepted pushes and removes any token Expo reports as `DeviceNotRegistered`.

The first poll only records the current articles (no notifications), so
standing up the service doesn't blast the whole backlog.

## Endpoints

| Method   | Path           | Description                                              |
| -------- | -------------- | -------------------------------------------------------- |
| `GET`    | `/api/health`  | Health check.                                            |
| `POST`   | `/api/devices` | Register an Expo push token. Body: `{ "token": "..." }`. |
| `DELETE` | `/api/devices` | Unregister a token. Body: `{ "token": "..." }`.          |
| `*`      | `/api/inngest` | Inngest callback. Authenticated by request signature.    |

Everything lives under `/api` on purpose, kept as a `basePath('/api')` on the
Hono app itself (see [`src/app.ts`](src/app.ts)) rather than routing. Vercel
finds the app via its zero-config Hono support — `src/app.ts`'s default export
— and calls its native `.fetch` directly, so there's no separate `api/`
folder or adapter in front of it. Local dev uses the identical paths.

The recurring jobs have no HTTP routes of their own — Inngest invokes them
through `/api/inngest`. To run one by hand, use the Inngest dashboard (or the
local dev server below), which can trigger any function on demand.

## Local development

There is **no in-memory store** — Redis is required, locally too. The simplest
option is a free [Upstash](https://upstash.com) database (a dev-only one is
fine); put its REST URL and token in `.env.local`.

```sh
cp .env.example .env.local  # fill in UPSTASH_REDIS_REST_*
```

Two ways to run it locally:

- **`pnpm --filter @lfc/worker dev` (fast day-to-day loop).** Runs
  [`src/server.ts`](src/server.ts) directly on [Bun](https://bun.sh) — native
  TypeScript, no build step, `.env.local` loaded automatically with no extra
  config. This does **not** go through Vercel's build/deploy pipeline, so it
  won't catch things that are specific to that (e.g. framework detection,
  build-time type-checking, the exact Bun function runtime shape).
- **`vercel dev` (prod parity).** Runs the actual Vercel Build Output pipeline
  locally — same framework detection, same `bunVersion` runtime, same
  build-time TypeScript pass production gets. Needs the project linked once
  (`vercel link` from `apps/worker`, interactive). Run `vercel dev` directly
  (not through a package.json script — Vercel's CLI refuses to run if its own
  `dev` script recursively invokes `vercel dev`).

Register a device:

```sh
curl -X POST localhost:8787/api/devices -H 'content-type: application/json' \
  -d '{"token":"ExponentPushToken[xxxx]"}'
```

(`vercel dev` defaults to port 3000 instead of 8787.)

To run the scheduled jobs, start the Inngest dev server alongside whichever dev
server you're using and point it at the app. Its UI (http://localhost:8288)
lists both functions and can trigger either on demand:

```sh
npx inngest-cli@latest dev -u http://localhost:8787/api/inngest
```

Or, with the Bun-direct `dev` server, set `LOCAL_POLL_MS=60000` for a plain
interval poll with no Inngest involved.

## Deploying to Vercel

1. **Create a Redis database.** [Upstash](https://upstash.com) (or the Vercel
   Marketplace integration) gives you `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`. These are **required** — the service has no
   in-memory fallback and throws at startup without them.
2. **Import the project** into Vercel with the **root directory set to
   `apps/worker`**. Vercel detects the **Hono** framework from the `hono`
   dependency and finds the app via its default export in
   [`src/app.ts`](src/app.ts) — no `api/` folder or manual adapter needed.
   `vercel.json` sets `bunVersion: "1.x"` so it runs on Bun rather than Node,
   in both `vercel dev` and production. Since this is a pnpm workspace, make
   sure Vercel's "Include files outside the root directory" is enabled so the
   `@lfc/api` workspace dependency resolves.
3. **Set environment variables** (see `.env.example`). They're validated on
   startup by the schema in `src/env.ts`, so a typo fails fast and says which key
   is wrong. **Set these before syncing Inngest** — without valid config the app
   serves 503s and Inngest has nothing to read.
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` — from
     [app.inngest.com](https://app.inngest.com); these drive the schedules.
   - `EXPO_ACCESS_TOKEN` — only if you enabled Expo's enhanced push security.
4. **Check `GET /api/health`.** It returns `{"status":"ok"}` when the config is
   valid, or a 503 naming the offending variables when it isn't.
5. **Point the app at it.** Set `EXPO_PUBLIC_NOTIFICATIONS_API_URL` to the
   deployment **origin** (no `/api` suffix) when building the mobile app.
6. **Connect Inngest** (see below) — the deploy itself doesn't run on a timer.

## Scheduling (Inngest)

Both recurring jobs are [Inngest](https://www.inngest.com) functions defined in
[`src/inngest.ts`](src/inngest.ts):

| Function           | Cron           | What it does                       |
| ------------------ | -------------- | ---------------------------------- |
| `poll-news`        | `*/5 * * * *`  | Fetch articles, push anything new. |
| `reap-dead-tokens` | `*/30 * * * *` | Check receipts, drop dead tokens.  |

Inngest calls back into the deployment at `/api/inngest` on those schedules, so
the service needs no cron support from the host — **this is what makes it work
on a Vercel Hobby plan**, where Vercel Cron is capped at once per day. Runs get
automatic retries and a dashboard trail, which a bare cron ping didn't provide.

To connect it: create an app at [app.inngest.com](https://app.inngest.com), set
`INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` in Vercel, then **sync** the app by
pointing Inngest at `https://<your-app>.vercel.app/api/inngest`. (The
[Vercel integration](https://www.inngest.com/docs/deploy/vercel) syncs
automatically on each deploy.) Inngest discovers both functions from that
endpoint; changing a cron means redeploying and re-syncing.

To change a schedule, edit `POLL_CRON` / `RECEIPTS_CRON` in `src/inngest.ts`.
