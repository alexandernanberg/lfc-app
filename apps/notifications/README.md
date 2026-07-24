# @lfc/notifications

A [Hono](https://hono.dev) backend that pushes a notification to the LFC.se
mobile app whenever a new article is published — replacing the app's flaky
on-device background poll with prompt, server-driven delivery.

## How it works

- **Devices register** their [Expo push token](https://docs.expo.dev/push-notifications/overview/)
  via `POST /devices`. Tokens are stored in Redis.
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

| Method   | Path             | Description                                                   |
| -------- | ---------------- | ------------------------------------------------------------- |
| `GET`    | `/`              | Health check + which storage backend is active.               |
| `POST`   | `/devices`       | Register an Expo push token. Body: `{ "token": "..." }`.      |
| `DELETE` | `/devices`       | Unregister a token. Body: `{ "token": "..." }`.               |
| `GET`    | `/cron/poll`     | Fetch news and push anything new. Guarded by `CRON_SECRET`.   |
| `GET`    | `/cron/receipts` | Check delivery receipts and prune dead tokens. Guarded.       |
| `*`      | `/api/inngest`   | Inngest callback. Signature-authenticated, not `CRON_SECRET`. |

The `/cron/*` endpoints are the same jobs Inngest runs, exposed for manual runs
and alternative schedulers. Inngest doesn't use them — it invokes the functions
directly through `/api/inngest`.

## Local development

```sh
cp .env.example .env        # optional; runs with in-memory storage otherwise
pnpm --filter @lfc/notifications dev
```

Trigger a job manually:

```sh
curl -X POST localhost:8787/devices -H 'content-type: application/json' \
  -d '{"token":"ExponentPushToken[xxxx]"}'
curl localhost:8787/cron/poll
curl localhost:8787/cron/receipts
```

To exercise the real schedules locally, run the Inngest dev server alongside
`pnpm dev` and point it at the app:

```sh
npx inngest-cli@latest dev -u http://localhost:8787/api/inngest
```

Or set `LOCAL_POLL_MS=60000` for a plain interval poll with no Inngest involved.

## Deploying to Vercel

1. **Create a Redis database.** [Upstash](https://upstash.com) (or the Vercel
   Marketplace integration) gives you `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`. These are **required on Vercel** — the service
   refuses to start there without them, because serverless invocations don't
   share memory (the in-memory fallback is local-dev only).
2. **Import the project** into Vercel with the **root directory set to
   `apps/notifications`**. `vercel.json` wires all routes to the function in
   `api/`.
3. **Set environment variables** (see `.env.example`):
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` — from
     [app.inngest.com](https://app.inngest.com); these drive the schedules.
   - `CRON_SECRET` — only needed to call the manual `/cron/*` endpoints.
   - `EXPO_ACCESS_TOKEN` — only if you enabled Expo's enhanced push security.
4. **Point the app at it.** Set `EXPO_PUBLIC_NOTIFICATIONS_API_URL` to the
   deployment URL when building the mobile app.
5. **Connect Inngest** (see below) — the deploy itself doesn't run on a timer.

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

### Alternatives

The `/cron/poll` and `/cron/receipts` endpoints run the same jobs over HTTP,
guarded by `Authorization: Bearer <CRON_SECRET>`, so another scheduler can drive
them instead — e.g. **Upstash QStash** (same vendor as the Redis; use
`Upstash-Forward-Authorization` to pass the secret through) or **Vercel Cron**
if you're on Pro. You'd then not need the Inngest env vars.
