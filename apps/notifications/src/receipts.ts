import type { Env } from './env'
import type { Store } from './store'
import { getPushReceipts } from './push'

// Expo keeps delivery receipts for ~24h. An id we haven't resolved by then
// never will be, so drop it to keep the pending set bounded.
const RECEIPT_MAX_AGE_MS = 1000 * 60 * 60 * 24

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

  // Drop entries too old to ever resolve.
  const cutoff = Date.now() - RECEIPT_MAX_AGE_MS
  const stale = entries.filter((e) => e.ts < cutoff)
  const fresh = entries.filter((e) => e.ts >= cutoff)
  if (stale.length > 0) {
    await store.removePendingReceipts(stale.map((e) => e.ticketId))
  }

  if (fresh.length === 0) {
    return { resolved: 0, pruned: 0, pending: 0, expired: stale.length }
  }

  const tokenByTicket = new Map(fresh.map((e) => [e.ticketId, e.token]))
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
    pending: fresh.length - resolvedIds.length,
    expired: stale.length,
  }
}
