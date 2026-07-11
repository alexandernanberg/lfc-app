import { Hono } from 'hono'
import { readEnv, type Env } from './env'
import { pollAndNotify } from './poll'
import { getStore } from './store'

/** Loose check that a string looks like an Expo push token. */
function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^Expo(nent)?PushToken\[.+\]$/.test(value.trim())
  )
}

/**
 * Build the Hono app. The runtime env is injected so tests can supply their own
 * and the Vercel/Node entrypoints share one definition.
 */
export function createApp(env: Env = readEnv()) {
  const app = new Hono()
  const store = getStore(env)

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

  // The polling job. Invoked by Vercel Cron on a schedule; also callable
  // manually. Guarded by CRON_SECRET when one is configured.
  const runPoll = async (c: import('hono').Context) => {
    if (env.cronSecret) {
      const auth = c.req.header('Authorization')
      if (auth !== `Bearer ${env.cronSecret}`) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
    }
    const result = await pollAndNotify(store, env)
    return c.json(result)
  }

  app.get('/cron/poll', runPoll)
  app.post('/cron/poll', runPoll)

  return app
}

export type AppType = ReturnType<typeof createApp>
