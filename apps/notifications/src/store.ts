import { Redis } from '@upstash/redis'
import type { Env } from './env'

/**
 * Persistence the notification service needs: the set of device push tokens to
 * notify, and a marker of the newest article we've already announced.
 */
export interface Store {
  /** Register a device push token (idempotent). */
  addDevice(token: string): Promise<void>
  /** Remove a device push token (e.g. after Expo reports it's dead). */
  removeDevice(token: string): Promise<void>
  /** All currently-registered device push tokens. */
  listDevices(): Promise<string[]>
  /** ISO publish time of the newest article already announced, if any. */
  getLastSeen(): Promise<string | null>
  /** Persist the newest-announced marker. */
  setLastSeen(iso: string): Promise<void>
}

const DEVICES_KEY = 'lfc:devices'
const LAST_SEEN_KEY = 'lfc:last-seen'

/** Durable store backed by Upstash Redis (used in production on Vercel). */
class RedisStore implements Store {
  constructor(private readonly redis: Redis) {}

  async addDevice(token: string): Promise<void> {
    await this.redis.sadd(DEVICES_KEY, token)
  }

  async removeDevice(token: string): Promise<void> {
    await this.redis.srem(DEVICES_KEY, token)
  }

  async listDevices(): Promise<string[]> {
    return this.redis.smembers(DEVICES_KEY)
  }

  async getLastSeen(): Promise<string | null> {
    return this.redis.get<string>(LAST_SEEN_KEY)
  }

  async setLastSeen(iso: string): Promise<void> {
    await this.redis.set(LAST_SEEN_KEY, iso)
  }
}

/**
 * Process-memory store. Loses everything on restart, so it's only a fallback
 * for local dev / when Upstash isn't configured. A warning is logged at boot.
 */
class MemoryStore implements Store {
  private readonly devices = new Set<string>()
  private lastSeen: string | null = null

  addDevice(token: string): Promise<void> {
    this.devices.add(token)
    return Promise.resolve()
  }

  removeDevice(token: string): Promise<void> {
    this.devices.delete(token)
    return Promise.resolve()
  }

  listDevices(): Promise<string[]> {
    return Promise.resolve([...this.devices])
  }

  getLastSeen(): Promise<string | null> {
    return Promise.resolve(this.lastSeen)
  }

  setLastSeen(iso: string): Promise<void> {
    this.lastSeen = iso
    return Promise.resolve()
  }
}

let cached: Store | null = null

/**
 * Return the process-wide {@link Store}, picking Upstash Redis when configured
 * and otherwise an in-memory fallback. Cached so a single serverless invocation
 * reuses one client.
 */
export function getStore(env: Env): Store {
  if (cached) {
    return cached
  }

  if (env.upstashUrl && env.upstashToken) {
    cached = new RedisStore(
      new Redis({ url: env.upstashUrl, token: env.upstashToken }),
    )
  } else {
    console.warn(
      '[notifications] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory ' +
        'store. Device tokens and the last-seen marker will not survive a ' +
        'restart. Configure Upstash Redis for production.',
    )
    cached = new MemoryStore()
  }

  return cached
}
