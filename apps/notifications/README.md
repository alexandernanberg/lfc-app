# @lfc/notifications

A [Hono](https://hono.dev) backend that pushes a notification to the LFC.se
mobile app whenever a new article is published — replacing the app's flaky
on-device background poll with prompt, server-driven delivery.

## How it works

- **Devices register** their [Expo push token](https://docs.expo.dev/push-notifications/overview/)
  via `POST /devices`. Tokens are stored in Redis.
- **Vercel Cron** calls `GET /cron/poll` on a schedule.
- Each poll fetches the latest articles from lfc.se (via `@lfc/shared`), diffs
  them against a stored "last seen" marker, and sends an
  [Expo push](https://docs.expo.dev/push-notifications/sending-notifications/)
  for anything new — pruning any tokens Expo reports as dead.

The first poll only records the current newest article (no notifications), so
standing up the service doesn't blast the whole backlog.

## Endpoints

| Method   | Path         | Description                                              |
| -------- | ------------ | -------------------------------------------------------- |
| `GET`    | `/`          | Health check + which storage backend is active.          |
| `POST`   | `/devices`   | Register an Expo push token. Body: `{ "token": "..." }`. |
| `DELETE` | `/devices`   | Unregister a token. Body: `{ "token": "..." }`.          |
| `GET`    | `/cron/poll` | Run one poll. Guarded by `CRON_SECRET` when set.         |

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
   `UPSTASH_REDIS_REST_TOKEN`. Without them the service uses in-memory storage
   and loses all device tokens on every cold start.
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

## Scheduling the poll

The service does nothing until something calls `GET`/`POST /cron/poll` on a
schedule. Any scheduler works — it just needs to send the
`Authorization: Bearer <CRON_SECRET>` header. Pick one:

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

### GitHub Actions (free, no signup)

[`.github/workflows/poll-notifications.yml`](../../.github/workflows/poll-notifications.yml)
pings the endpoint every 5 minutes. Add a repo **variable** `NOTIFICATIONS_URL`
(your deployment origin) and a repo **secret** `CRON_SECRET`. Note GitHub only
runs schedules on the default branch, queues/throttles cron runs, and disables
them after ~60 days of inactivity — reliable-ish, not punctual.

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
