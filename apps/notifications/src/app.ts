import { Hono } from 'hono'
import { serve as serveInngest } from 'inngest/hono'
import { readEnv, type Env } from './env'
import { createScheduledFunctions, inngest } from './inngest'
import { createStore, type Store } from './store'

/** Loose check that a string looks like an Expo push token. */
function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^Expo(nent)?PushToken\[.+\]$/.test(value.trim())
  )
}

/**
 * Build the Hono app. The runtime env is injected so tests can supply their
 * own; the store can be passed in so a caller (e.g. the local dev server's
 * poll loop) shares the exact same instance.
 */
export function createApp(
  env: Env = readEnv(),
  store: Store = createStore(env),
) {
  const app = new Hono()

  app.get('/', (c) =>
    c.json({
      service: 'lfc-notifications',
      status: 'ok',
      storage: env.upstashUrl ? 'redis' : 'memory',
    }),
  )

  // Register a device to receive new-article push notifications.
  app.post('/devices', async (c) => {
    const body = await c.req.json().catch(() => null)
    const token = (body as { token?: unknown } | null)?.token
    if (!isExpoPushToken(token)) {
      return c.json({ error: 'Invalid or missing Expo push token' }, 400)
    }
    await store.addDevice(token.trim())
    return c.json({ ok: true })
  })

  // Unregister a device (e.g. when the user turns notifications off).
  app.delete('/devices', async (c) => {
    const body = await c.req.json().catch(() => null)
    const token = (body as { token?: unknown } | null)?.token
    if (typeof token !== 'string') {
      return c.json({ error: 'Missing token' }, 400)
    }
    await store.removeDevice(token.trim())
    return c.json({ ok: true })
  })

  // Inngest's callback endpoint: how Inngest discovers this app's scheduled
  // functions and invokes them on their crons. It authenticates by request
  // signature (INNGEST_SIGNING_KEY). The recurring jobs run only through here —
  // there are no separate HTTP trigger routes. The functions share this app's
  // env and store.
  app.on(
    ['GET', 'PUT', 'POST'],
    '/api/inngest',
    serveInngest({
      client: inngest,
      functions: createScheduledFunctions(env, store),
    }),
  )

  return app
}

export type AppType = ReturnType<typeof createApp>
