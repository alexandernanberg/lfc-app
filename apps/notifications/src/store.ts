import { Redis } from '@upstash/redis'
import type { Env } from './env'

/**
 * Persistence the notification service needs: the set of device push tokens,
 * and per-article "already announced" claims used to make polling idempotent.
 *
 * Idempotency is keyed off the article id (not a single timestamp marker) via
 * an atomic {@link Store.claimPost claim}: only the caller that first claims an
 * id notifies for it, so two concurrent polls can't double-notify, and a failed
 * send can be rolled back with {@link Store.releasePost} so the next poll
 * retries instead of silently dropping it.
 */
export interface Store {
  /** Register a device push token (idempotent). */
  addDevice(token: string): Promise<void>
  /** Remove a device push token (e.g. after Expo reports it's dead). */
  removeDevice(token: string): Promise<void>
  /** All currently-registered device push tokens. */
  listDevices(): Promise<string[]>
  /** Whether the initial seed (record current articles without notifying) ran. */
  isSeeded(): Promise<boolean>
  /** Mark the initial seed as done. */
  markSeeded(): Promise<void>
  /**
   * Atomically claim an article id for notification. Returns `true` only for
   * the first caller to claim it; subsequent callers get `false`. Claims expire
   * after a while so the keyspace stays bounded.
   */
  claimPost(id: string): Promise<boolean>
  /** Release a previously-claimed id so a later poll can retry it. */
  releasePost(id: string): Promise<void>
  /** Record accepted-push receipt ids to look up later (token + enqueue time). */
  addPendingReceipts(entries: PendingReceipt[]): Promise<void>
  /** All receipt ids still awaiting a delivery receipt. */
  listPendingReceipts(): Promise<PendingReceipt[]>
  /** Forget receipt ids once resolved (or aged out). */
  removePendingReceipts(ticketIds: string[]): Promise<void>
}

/** An accepted push whose delivery receipt we still need to check. */
export interface PendingReceipt {
  /** Expo receipt id from the send ticket. */
  ticketId: string
  /** The device token the push went to, so we can prune it if it's dead. */
  token: string
  /** When it was enqueued (ms), so stale entries can be dropped. */
  ts: number
}

const DEVICES_KEY = 'lfc:devices'
const SEEDED_KEY = 'lfc:seeded'
const CLAIM_PREFIX = 'lfc:sent:'
const RECEIPTS_KEY = 'lfc:receipts'

/** Value stored per pending receipt (the id is the hash field). */
interface ReceiptEntry {
  token: string
  ts: number
}
// Claims self-expire so the keyspace stays bounded. Comfortably longer than any
// article stays in the fetched list, so a claim never expires while the article
// could still be re-detected as new.
const CLAIM_TTL_SECONDS = 60 * 60 * 24 * 60 // 60 days

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

  async isSeeded(): Promise<boolean> {
    return (await this.redis.get<string>(SEEDED_KEY)) !== null
  }

  async markSeeded(): Promise<void> {
    await this.redis.set(SEEDED_KEY, '1')
  }

  async claimPost(id: string): Promise<boolean> {
    // SET NX is atomic: exactly one concurrent caller gets 'OK'.
    const res = await this.redis.set(`${CLAIM_PREFIX}${id}`, '1', {
      nx: true,
      ex: CLAIM_TTL_SECONDS,
    })
    return res === 'OK'
  }

  async releasePost(id: string): Promise<void> {
    await this.redis.del(`${CLAIM_PREFIX}${id}`)
  }

  async addPendingReceipts(entries: PendingReceipt[]): Promise<void> {
    if (entries.length === 0) {
      return
    }
    const fields: Record<string, ReceiptEntry> = {}
    for (const { ticketId, token, ts } of entries) {
      fields[ticketId] = { token, ts }
    }
    await this.redis.hset(RECEIPTS_KEY, fields)
  }

  async listPendingReceipts(): Promise<PendingReceipt[]> {
    const all =
      (await this.redis.hgetall<Record<string, ReceiptEntry>>(RECEIPTS_KEY)) ??
      {}
    return Object.entries(all).map(([ticketId, { token, ts }]) => ({
      ticketId,
      token,
      ts,
    }))
  }

  async removePendingReceipts(ticketIds: string[]): Promise<void> {
    if (ticketIds.length === 0) {
      return
    }
    await this.redis.hdel(RECEIPTS_KEY, ...ticketIds)
  }
}

/**
 * Build the {@link Store}. Redis is the only implementation: the service runs on
 * serverless invocations that share no memory and cold-start constantly, so an
 * in-process fallback could only ever pretend to work — it would drop device
 * tokens and poll state between requests while still returning 200s. Missing
 * credentials is a configuration error, so fail loudly here instead.
 *
 * Point `UPSTASH_REDIS_REST_URL` at a local Redis (or a free Upstash database)
 * for development; see apps/notifications/README.md.
 */
export function createStore(env: Env): Store {
  if (!env.upstashUrl || !env.upstashToken) {
    throw new Error(
      '[notifications] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are ' +
        'required. This service has no in-memory fallback — see ' +
        'apps/notifications/README.md.',
    )
  }

  return new RedisStore(
    new Redis({ url: env.upstashUrl, token: env.upstashToken }),
  )
}
