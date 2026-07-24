# @lfc/notifications

A [Hono](https://hono.dev) backend that pushes a notification to the LFC.se
mobile app whenever a new article is published — replacing the app's flaky
on-device background poll with prompt, server-driven delivery.

## How it works

- **Devices register** their [Expo push token](https://docs.expo.dev/push-notifications/overview/)
  via `POST /devices`. Tokens are stored in Redis.
- **`/cron/poll`** is called on a schedule. Each poll fetches the latest articles
  from lfc.se (via `@lfc/api`) and, for any not yet announced, sends an
  [Expo push](https://docs.expo.dev/push-notifications/sending-notifications/).
  An atomic per-article claim in Redis makes this idempotent, so overlapping
  polls can't double-notify; a total send failure rolls its claims back so the
  next poll retries instead of dropping the article.
- **`/cron/receipts`** is called on a (slower) schedule to prune dead tokens.
  Sending only yields a _ticket_ (accepted); a token that has gone dead is
  reported later in the _delivery receipt_. This pass looks up the receipts for
  accepted pushes and removes any token Expo reports as `DeviceNotRegistered`.

The first poll only records the current articles (no notifications), so
standing up the service doesn't blast the whole backlog.

## Endpoints

| Method   | Path             | Description                                                 |
| -------- | ---------------- | ----------------------------------------------------------- |
| `GET`    | `/`              | Health check + which storage backend is active.             |
| `POST`   | `/devices`       | Register an Expo push token. Body: `{ "token": "..." }`.    |
| `DELETE` | `/devices`       | Unregister a token. Body: `{ "token": "..." }`.             |
| `GET`    | `/cron/poll`     | Fetch news and push anything new. Guarded by `CRON_SECRET`. |
| `GET`    | `/cron/receipts` | Check delivery receipts and prune dead tokens. Guarded.     |

## Local development

```sh
cp .env.example .env        # optional; runs with in-memory storage otherwise
pnpm --filter @lfc/notifications dev
```

Trigger a poll manually:

```sh
curl -X POST localhost:8787/devices -H 'content-type: application/json' \
  -d '{"token":"ExponentPushToken[xxxx]"}'
curl localhost:8787/cron/poll
```

Set `LOCAL_POLL_MS=60000` to have the dev server poll on an interval instead.

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
   - `CRON_SECRET` — the poll endpoint requires it as
     `Authorization: Bearer <CRON_SECRET>` and rejects requests without it.
   - `EXPO_ACCESS_TOKEN` — only if you enabled Expo's enhanced push security.
4. **Point the app at it.** Set `EXPO_PUBLIC_NOTIFICATIONS_API_URL` to the
   deployment URL when building the mobile app.
5. **Schedule the poll** (see below) — the deploy itself doesn't run on a
   timer.

## Scheduling

The service does nothing until something calls its cron endpoints on a schedule.
Any scheduler works — it just needs to send the
`Authorization: Bearer <CRON_SECRET>` header. Schedule two jobs:

- **`/cron/poll`** — often (e.g. every 5 min); this is your notification latency.
- **`/cron/receipts`** — occasionally (e.g. every 30 min) to reap dead tokens.
  It's cheap and non-urgent; skipping it just means dead tokens linger longer.

Pick a scheduler:

### Upstash QStash (recommended)

You're already on Upstash for storage, so no new vendor. Create a schedule
pointing at your deployment; the free tier (500 messages/day) comfortably covers
a 5-minute cadence (288/day):

```sh
curl -X POST https://qstash.upstash.io/v2/schedules/https://<your-app>.vercel.app/cron/poll \
  -H "Authorization: Bearer <QSTASH_TOKEN>" \
  -H "Upstash-Cron: */5 * * * *" \
  -H "Upstash-Forward-Authorization: Bearer <CRON_SECRET>"
```

`Upstash-Forward-*` headers are passed through to your endpoint, so QStash
forwards the `CRON_SECRET` bearer for you. Worst-case delivery lag: ~5 min.
Create a second schedule the same way for `/cron/receipts` (e.g.
`Upstash-Cron: */30 * * * *`).

### GitHub Actions (free, no signup)

[`.github/workflows/poll-notifications.yml`](../../.github/workflows/poll-notifications.yml)
pings `/cron/poll` (and `/cron/receipts`) every 5 minutes. Add a repo
**variable** `NOTIFICATIONS_URL` (your deployment origin) and a repo **secret**
`CRON_SECRET`. Note GitHub only runs schedules on the default branch,
queues/throttles cron runs, and disables them after ~60 days of inactivity —
reliable-ish, not punctual.

### Vercel Cron

Only if you're on Vercel **Pro** (Hobby caps cron at once/day). Add back to
`vercel.json`:

```json
"crons": [{ "path": "/cron/poll", "schedule": "*/2 * * * *" }]
```

Vercel injects the `CRON_SECRET` bearer automatically.

### Inngest

Also viable: add the `inngest` SDK, wrap `pollAndNotify` in a cron-triggered
Inngest function, and expose an Inngest `serve` route. More moving parts than
the above, but you get retries and a run dashboard. Not wired up here — ask if
you want it.
