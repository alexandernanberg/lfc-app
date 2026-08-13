import { Hono } from 'hono'
import { serve as serveInngest } from 'inngest/hono'
import { loadEnv, type Env } from './env'
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
  env: Env = loadEnv(),
  store: Store = createStore(env),
) {
  // Everything lives under /api so Vercel's filesystem routing serves it
  // directly from api/[...route].ts — no vercel.json rewrite in the way, and the
  // function receives the original path. Local dev uses the same paths.
  const app = new Hono().basePath('/api')

  app.get('/health', (c) =>
    c.json({ service: 'lfc-worker', status: 'ok' }),
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

  // Inngest's callback endpoint (/api/inngest via the basePath above): how
  // Inngest discovers this app's scheduled functions and invokes them on their
  // crons. It authenticates by request signature (INNGEST_SIGNING_KEY). The
  // recurring jobs run only through here — there are no separate HTTP trigger
  // routes. The functions share this app's env and store.
  app.on(
    ['GET', 'PUT', 'POST'],
    '/inngest',
    serveInngest({
      client: inngest,
      functions: createScheduledFunctions(env, store),
    }),
  )

  return app
}

/**
 * Build the app, or — if the environment is invalid — a stand-in that keeps
 * `/api/health` answering with the validation error and fails everything else
 * with 503.
 *
 * Without this a misconfigured deploy throws while the module is still being
 * imported, so *every* route 500s with no body. That's especially confusing for
 * Inngest, which reads its function manifest from `/api/inngest` and would just
 * report that it can't reach the app — pointing at the scheduler instead of the
 * missing variable that actually caused it. Here, one GET to `/api/health` names
 * the offending keys.
 */
export function createAppOrDiagnostic() {
  try {
    return createApp()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[worker] invalid configuration:', message)

    const app = new Hono().basePath('/api')
    app.get('/health', (c) =>
      c.json(
        {
          service: 'lfc-worker',
          status: 'misconfigured',
          error: message,
        },
        503,
      ),
    )
    app.all('/*', (c) =>
      c.json({ error: 'Service is misconfigured', detail: message }, 503),
    )
    return app
  }
}

export type AppType = ReturnType<typeof createApp>

// Vercel's zero-config Hono support finds this default export directly (no
// api/ folder or hono/vercel adapter needed) and calls its native `.fetch`,
// which is a standard Request -> Response handler both the Node and Bun
// runtimes understand. `createAppOrDiagnostic` degrades to a 503-only app
// instead of throwing at import time — see its own comment above.
export default createAppOrDiagnostic()
