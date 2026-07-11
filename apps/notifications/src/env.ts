import { DEFAULT_API_URL } from '@lfc/api'

/**
 * Runtime configuration, read from environment variables. Everything has a sane
 * default so the service boots locally with zero config (falling back to
 * in-memory storage and an unauthenticated cron endpoint).
 */
export interface Env {
  /** lfc.se web API base to poll. */
  apiUrl: string
  /** How many articles to request per poll. */
  pollItems: number
  /** Max notifications to emit in a single poll, so a backlog can't flood. */
  maxNotificationsPerPoll: number
  /** Upstash Redis REST URL, if configured. Enables durable storage. */
  upstashUrl: string | null
  /** Upstash Redis REST token, if configured. */
  upstashToken: string | null
  /**
   * Shared secret the cron endpoint requires. Vercel Cron sends it as
   * `Authorization: Bearer <CRON_SECRET>`. When unset the endpoint is open —
   * fine for local dev, but set it in production.
   */
  cronSecret: string | null
  /** Optional Expo access token, sent with push requests for extra security. */
  expoAccessToken: string | null
}

function num(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return {
    apiUrl: source.LFC_API_URL || DEFAULT_API_URL,
    pollItems: num(source.POLL_ITEMS, 10),
    maxNotificationsPerPoll: num(source.MAX_NOTIFICATIONS_PER_POLL, 5),
    upstashUrl: source.UPSTASH_REDIS_REST_URL || null,
    upstashToken: source.UPSTASH_REDIS_REST_TOKEN || null,
    cronSecret: source.CRON_SECRET || null,
    expoAccessToken: source.EXPO_ACCESS_TOKEN || null,
  }
}
