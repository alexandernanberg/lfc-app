import type { Env } from './env.js'
import type { Store } from './store.js'
import { getPushReceipts } from './push.js'

// Expo keeps delivery receipts for ~24h. An id we haven't resolved by then
// never will be, so drop it to keep the pending set bounded.
const RECEIPT_MAX_AGE_MS = 1000 * 60 * 60 * 24
// Expo needs time to deliver before a receipt exists (it suggests ~15-30 min).
// Looking one up sooner just burns a round-trip on a "not ready" answer, so hold
// ids until they're at least this old.
const RECEIPT_MIN_AGE_MS = 1000 * 60 * 15

export interface ReceiptCheckResult {
  /** Receipt ids Expo had resolved this pass (ok or error). */
  resolved: number
  /** Device tokens pruned because a receipt reported them dead. */
  pruned: number
  /** Ids still awaiting a receipt, kept for the next pass. */
  pending: number
  /** Stale ids dropped without ever resolving. */
  expired: number
}

/**
 * Second-stage delivery check, run on a schedule after {@link pollAndNotify}.
 * Sending only yields a *ticket* (accepted); a token that has since gone dead is
 * reported in the *receipt*, fetched here. Receipts that aren't ready yet stay
 * pending for the next pass; ones past {@link RECEIPT_MAX_AGE_MS} are dropped.
 */
export async function checkReceipts(
  store: Store,
  env: Env,
): Promise<ReceiptCheckResult> {
  const entries = await store.listPendingReceipts()
  if (entries.length === 0) {
    return { resolved: 0, pruned: 0, pending: 0, expired: 0 }
  }

  const now = Date.now()
  const staleCutoff = now - RECEIPT_MAX_AGE_MS
  const readyCutoff = now - RECEIPT_MIN_AGE_MS

  // Too old to ever resolve — drop them.
  const stale = entries.filter((e) => e.ts < staleCutoff)
  // Old enough that Expo should have a receipt — look these up now.
  const ready = entries.filter(
    (e) => e.ts >= staleCutoff && e.ts <= readyCutoff,
  )
  // Too recent to have a receipt yet — leave for a later pass.
  const tooRecent = entries.length - stale.length - ready.length

  if (stale.length > 0) {
    await store.removePendingReceipts(stale.map((e) => e.ticketId))
  }

  if (ready.length === 0) {
    return {
      resolved: 0,
      pruned: 0,
      pending: tooRecent,
      expired: stale.length,
    }
  }

  const tokenByTicket = new Map(ready.map((e) => [e.ticketId, e.token]))
  const receipts = await getPushReceipts([...tokenByTicket.keys()], {
    accessToken: env.expoAccessToken,
  })

  const dead = new Set<string>()
  const resolvedIds: string[] = []
  for (const receipt of receipts) {
    resolvedIds.push(receipt.ticketId)
    if (!receipt.ok && receipt.error === 'DeviceNotRegistered') {
      const token = tokenByTicket.get(receipt.ticketId)
      if (token) {
        dead.add(token)
      }
    }
  }

  for (const token of dead) {
    await store.removeDevice(token)
  }
  if (resolvedIds.length > 0) {
    await store.removePendingReceipts(resolvedIds)
  }

  return {
    resolved: resolvedIds.length,
    pruned: dead.size,
    // Ids Expo had no receipt for yet, plus the ones we held back as too recent.
    pending: ready.length - resolvedIds.length + tooRecent,
    expired: stale.length,
  }
}
