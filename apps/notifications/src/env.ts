import { DEFAULT_API_URL } from '@lfc/api'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Validated runtime configuration.
 *
 * The schema is the single source of truth for what this service needs: a
 * missing or malformed variable fails here, at startup, with a message naming
 * every offending key — rather than surfacing later as a confusing runtime
 * error. The Upstash credentials have no defaults on purpose; there is no
 * in-memory fallback, so they are genuinely required.
 */
export interface Env {
  /** lfc.se web API base to poll. */
  apiUrl: string
  /** How many articles to request per poll. */
  pollItems: number
  /** Max notifications to emit in a single poll, so a backlog can't flood. */
  maxNotificationsPerPoll: number
  /** Upstash Redis REST URL. */
  upstashUrl: string
  /** Upstash Redis REST token. */
  upstashToken: string
  /** Optional Expo access token, sent with push requests for extra security. */
  expoAccessToken: string | null
}

const schema = {
  LFC_API_URL: z.url().default(DEFAULT_API_URL),
  POLL_ITEMS: z.coerce.number().int().positive().default(10),
  // 0 is allowed and means "notify about nothing" — a deliberate off switch.
  MAX_NOTIFICATIONS_PER_POLL: z.coerce.number().int().min(0).default(5),
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
}

/**
 * Parse and validate the environment, mapping it to the app's {@link Env}.
 *
 * Deliberately a function rather than a module-level constant: validation
 * throws, and doing that at import time would take down every route — including
 * the health check that's supposed to tell you what's misconfigured. Callers
 * decide when to load (see `api/[...route].ts`).
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const parsed = createEnv({
    server: schema,
    runtimeEnv: source,
    // Treat `FOO=` in a .env file as unset so it hits the default / required
    // check instead of failing a min(1) rule with a confusing message.
    emptyStringAsUndefined: true,
    // The default handler only prints the offending keys and throws a bare
    // "Invalid environment variables". Fold them into the message instead, so
    // whoever catches it — notably the /api/health diagnostic — can say which
    // variables are wrong rather than just that something is.
    onValidationError: (issues) => {
      const detail = issues
        .map((issue) => {
          const key = issue.path?.join('.') ?? '(unknown)'
          return `${key}: ${issue.message}`
        })
        .join('; ')
      throw new Error(`Invalid environment variables — ${detail}`)
    },
  })

  return {
    apiUrl: parsed.LFC_API_URL,
    pollItems: parsed.POLL_ITEMS,
    maxNotificationsPerPoll: parsed.MAX_NOTIFICATIONS_PER_POLL,
    upstashUrl: parsed.UPSTASH_REDIS_REST_URL,
    upstashToken: parsed.UPSTASH_REDIS_REST_TOKEN,
    expoAccessToken: parsed.EXPO_ACCESS_TOKEN ?? null,
  }
}
