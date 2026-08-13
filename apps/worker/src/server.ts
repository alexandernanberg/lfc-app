import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadEnv } from './env.js'
import { pollAndNotify } from './poll.js'
import { createStore } from './store.js'

// Standalone Node server for local development. In production the app is served
// by a Vercel function (see api/[...route].ts) and the recurring jobs are driven
// by Inngest; this file is only used when running `pnpm dev`.

const env = loadEnv()
// One store shared by the HTTP app and the poll loop below, so a device
// registered over HTTP is visible to the local poll.
const store = createStore(env)
const app = createApp(env, store)
const port = Number(process.env.PORT) || 8787

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[worker] listening on http://localhost:${info.port}`)
})

// Convenience: locally emulate Vercel Cron by polling on an interval when
// LOCAL_POLL_MS is set (e.g. LOCAL_POLL_MS=60000). Off by default.
const localPollMs = Number(process.env.LOCAL_POLL_MS)
if (Number.isFinite(localPollMs) && localPollMs > 0) {
  console.log(`[worker] local poll every ${localPollMs}ms`)
  setInterval(() => {
    pollAndNotify(store, env)
      .then((result) => console.log('[poll-news] result:', result))
      .catch((error) => console.error('[poll-news] failed:', error))
  }, localPollMs)
}
