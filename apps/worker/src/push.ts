const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts'
/** Expo accepts at most 100 messages per push request. */
const SEND_CHUNK_SIZE = 100
/** Expo accepts at most 1000 receipt ids per lookup. */
const RECEIPT_CHUNK_SIZE = 1000

export interface ExpoPushMessage {
  /** The recipient `ExponentPushToken[...]`. */
  to: string
  title: string
  body: string
  /** Arbitrary payload delivered to the client (deep-link info, etc.). */
  data?: Record<string, unknown>
  sound?: 'default' | null
}

/** Outcome of a single message send, keyed back to its device token. */
export interface PushResult {
  token: string
  ok: boolean
  /**
   * Expo receipt id for an accepted message. Delivery isn't confirmed yet — the
   * id must be checked later via {@link getPushReceipts} — but it's how a dead
   * token gets reported (as `DeviceNotRegistered`) after the fact.
   */
  ticketId?: string
  /** Expo error code (e.g. `DeviceNotRegistered`) when `ok` is false. */
  error?: string
}

/** Resolved delivery receipt for a previously-accepted push. */
export interface ReceiptResult {
  ticketId: string
  ok: boolean
  /** Expo error code (e.g. `DeviceNotRegistered`) when `ok` is false. */
  error?: string
}

interface ExpoTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

interface ExpoReceipt {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

export interface SendPushOptions {
  /** Optional Expo access token; sent as a bearer for enhanced push security. */
  accessToken?: string | null
  fetch?: typeof fetch
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/**
 * Send push notifications through Expo's push service, batching into chunks of
 * 100. Returns one {@link PushResult} per message so the caller can prune
 * tokens Expo reports as dead (`DeviceNotRegistered`).
 */
export async function sendPushNotifications(
  messages: ExpoPushMessage[],
  options: SendPushOptions = {},
): Promise<PushResult[]> {
  const { accessToken, fetch: fetchImpl = fetch } = options
  if (messages.length === 0) {
    return []
  }

  const results: PushResult[] = []

  for (const batch of chunk(messages, SEND_CHUNK_SIZE)) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    let tickets: ExpoTicket[] = []
    try {
      const res = await fetchImpl(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })
      if (!res.ok) {
        throw new Error(`Expo push responded ${res.status}`)
      }
      const json = (await res.json()) as { data?: ExpoTicket[] }
      tickets = json.data ?? []
    } catch (error) {
      // Network/transport failure for the whole batch — mark each as failed but
      // without a prune-worthy error code, so we retry them next poll.
      console.error('[notifications] push batch failed:', error)
      for (const message of batch) {
        results.push({ token: message.to, ok: false })
      }
      continue
    }

    batch.forEach((message, i) => {
      const ticket = tickets[i]
      if (ticket && ticket.status === 'ok') {
        results.push({ token: message.to, ok: true, ticketId: ticket.id })
      } else {
        results.push({
          token: message.to,
          ok: false,
          error: ticket?.details?.error,
        })
      }
    })
  }

  return results
}

/**
 * Look up delivery receipts for previously-accepted pushes, batching into
 * chunks of 1000. Returns a {@link ReceiptResult} only for ids Expo has a
 * receipt for — ids whose receipt isn't ready yet are simply omitted, so the
 * caller should keep them and check again later. This is where a token that has
 * gone dead since acceptance is reported (`DeviceNotRegistered`).
 */
export async function getPushReceipts(
  ticketIds: string[],
  options: SendPushOptions = {},
): Promise<ReceiptResult[]> {
  const { accessToken, fetch: fetchImpl = fetch } = options
  if (ticketIds.length === 0) {
    return []
  }

  const results: ReceiptResult[] = []

  for (const batch of chunk(ticketIds, RECEIPT_CHUNK_SIZE)) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    let receipts: Record<string, ExpoReceipt> = {}
    try {
      const res = await fetchImpl(EXPO_RECEIPTS_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: batch }),
      })
      if (!res.ok) {
        throw new Error(`Expo getReceipts responded ${res.status}`)
      }
      const json = (await res.json()) as { data?: Record<string, ExpoReceipt> }
      receipts = json.data ?? {}
    } catch (error) {
      // Transport failure for the batch — leave these ids pending and retry.
      console.error('[notifications] getReceipts batch failed:', error)
      continue
    }

    // Only ids present in the response are resolved; the rest aren't ready yet.
    for (const [ticketId, receipt] of Object.entries(receipts)) {
      results.push({
        ticketId,
        ok: receipt.status === 'ok',
        error: receipt.details?.error,
      })
    }
  }

  return results
}
