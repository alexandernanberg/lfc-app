import { Redis } from '@upstash/redis'
import type { Env } from './env.js'

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
// Cap how many hash fields go into a single Redis command, so a busy sweep
// can't build a huge argument list / request body.
const FIELD_CHUNK_SIZE = 500

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
    // Chunked for the same reason as removePendingReceipts: one poll can enqueue
    // articles x devices entries.
    for (let i = 0; i < entries.length; i += FIELD_CHUNK_SIZE) {
      const fields: Record<string, ReceiptEntry> = {}
      for (const { ticketId, token, ts } of entries.slice(
        i,
        i + FIELD_CHUNK_SIZE,
      )) {
        fields[ticketId] = { token, ts }
      }
      if (Object.keys(fields).length > 0) {
        await this.redis.hset(RECEIPTS_KEY, fields)
      }
    }
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
    // Chunked so a large sweep doesn't spread thousands of arguments into one
    // call (or push an enormous request body at the REST API).
    for (let i = 0; i < ticketIds.length; i += FIELD_CHUNK_SIZE) {
      const batch = ticketIds.slice(i, i + FIELD_CHUNK_SIZE)
      if (batch.length > 0) {
        await this.redis.hdel(RECEIPTS_KEY, ...batch)
      }
    }
  }
}

/**
 * Build the {@link Store}. Redis is the only implementation: the service runs on
 * serverless invocations that share no memory and cold-start constantly, so an
 * in-process fallback could only ever pretend to work — it would drop device
 * tokens and poll state between requests while still returning 200s.
 *
 * The credentials are guaranteed present by the env schema (see `loadEnv`), so
 * there's nothing to check here.
 */
export function createStore(env: Env): Store {
  return new RedisStore(
    new Redis({ url: env.upstashUrl, token: env.upstashToken }),
  )
}
