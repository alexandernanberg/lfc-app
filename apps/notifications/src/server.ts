import { serve } from '@hono/node-server'
import { createApp } from './app'
import { readEnv } from './env'
import { pollAndNotify } from './poll'
import { getStore } from './store'

// Standalone Node server for local development. In production the app is served
// by Vercel functions (see api/index.ts) and polled by Vercel Cron; this file
// is only used when running `pnpm dev`.

const env = readEnv()
const app = createApp(env)
const port = Number(process.env.PORT) || 8787

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[notifications] listening on http://localhost:${info.port}`)
})

// Convenience: locally emulate Vercel Cron by polling on an interval when
// LOCAL_POLL_MS is set (e.g. LOCAL_POLL_MS=60000). Off by default.
const localPollMs = Number(process.env.LOCAL_POLL_MS)
if (Number.isFinite(localPollMs) && localPollMs > 0) {
  const store = getStore(env)
  console.log(`[notifications] local poll every ${localPollMs}ms`)
  setInterval(() => {
    pollAndNotify(store, env)
      .then((result) => console.log('[notifications] poll:', result))
      .catch((error) => console.error('[notifications] poll failed:', error))
  }, localPollMs)
}
