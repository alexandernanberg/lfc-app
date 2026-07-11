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
   `api/` and registers the cron job.
3. **Set environment variables** (see `.env.example`):
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET` — Vercel sends this as `Authorization: Bearer <CRON_SECRET>`
     on cron requests; the poll endpoint rejects requests without it.
   - `EXPO_ACCESS_TOKEN` — only if you enabled Expo's enhanced push security.
4. **Point the app at it.** Set `EXPO_PUBLIC_NOTIFICATIONS_API_URL` to the
   deployment URL when building the mobile app.

### Cron frequency

`vercel.json` polls every 2 minutes (`*/2 * * * *`). Sub-daily cron schedules
require a Vercel **Pro** plan; on Hobby, reduce the frequency or trigger
`/cron/poll` from an external scheduler (e.g. Upstash QStash, GitHub Actions).
