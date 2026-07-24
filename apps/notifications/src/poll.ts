import { fetchLatestPosts, type NewsPost } from '@lfc/api'
import type { Env } from './env'
import type { Store } from './store'
import { sendPushNotifications, type ExpoPushMessage } from './push'

export interface PollResult {
  /** First-ever run: we recorded the current articles without notifying. */
  seeded: boolean
  /** Number of articles newly claimed for notification this poll. */
  newPosts: number
  /** Number of registered devices at poll time. */
  devices: number
  /** Push messages that Expo accepted. */
  sent: number
  /** Device tokens pruned because Expo reported them dead. */
  pruned: number
  /** Claims rolled back after a total send failure, to retry next poll. */
  rolledBack: number
}

const EMPTY: PollResult = {
  seeded: false,
  newPosts: 0,
  devices: 0,
  sent: 0,
  pruned: 0,
  rolledBack: 0,
}

/**
 * The core job, run on a schedule: fetch the latest articles, atomically claim
 * the ones not yet announced, and fan a push notification out to every
 * registered device for each. The per-article claim (see {@link Store}) makes
 * this idempotent — concurrent polls can't double-notify — and a total send
 * failure rolls its claims back so the next poll retries instead of dropping
 * the article.
 */
export async function pollAndNotify(
  store: Store,
  env: Env,
): Promise<PollResult> {
  const posts = await fetchLatestPosts({
    apiUrl: env.apiUrl,
    items: env.pollItems,
  })

  if (posts.length === 0) {
    return EMPTY
  }

  // First run: claim the current articles without notifying, so standing up the
  // service doesn't blast the whole backlog.
  if (!(await store.isSeeded())) {
    await Promise.all(posts.map((post) => store.claimPost(post.id)))
    await store.markSeeded()
    return { ...EMPTY, seeded: true }
  }

  // Claim candidates oldest-first (fetchLatestPosts sorts newest-first). Only
  // ids we win the atomic claim for are ours to notify; anything already claimed
  // by a previous or concurrent poll is skipped.
  const ordered = [...posts].sort(
    (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime(),
  )
  const claimed: NewsPost[] = []
  for (const post of ordered) {
    if (await store.claimPost(post.id)) {
      claimed.push(post)
    }
  }

  if (claimed.length === 0) {
    return EMPTY
  }

  const devices = await store.listDevices()
  if (devices.length === 0) {
    // Nothing to notify. Claims stand so a device that registers later doesn't
    // receive the backlog — matching "only notify articles published while
    // subscribed".
    return { ...EMPTY, newPosts: claimed.length }
  }

  // Cap so a long gap can't flood the tray, keeping the newest. Guard against a
  // 0/negative cap, where `slice(-0)` would otherwise return the whole array.
  const cap = Math.max(0, env.maxNotificationsPerPoll)
  const toNotify = cap === 0 ? [] : claimed.slice(-cap)

  const messages: ExpoPushMessage[] = []
  for (const post of toNotify) {
    for (const token of devices) {
      messages.push(buildMessage(token, post))
    }
  }

  const results = await sendPushNotifications(messages, {
    accessToken: env.expoAccessToken,
  })

  // Total failure (Expo/network down): nothing got through. Roll the claims back
  // so the next poll retries these articles rather than losing them.
  if (messages.length > 0 && !results.some((r) => r.ok)) {
    await Promise.all(toNotify.map((post) => store.releasePost(post.id)))
    return { ...EMPTY, newPosts: claimed.length, rolledBack: toNotify.length }
  }

  // Prune tokens Expo reports dead in the immediate ticket. Most dead tokens
  // are only reported later, in the delivery receipt — see checkReceipts.
  const dead = new Set<string>()
  for (const result of results) {
    if (!result.ok && result.error === 'DeviceNotRegistered') {
      dead.add(result.token)
    }
  }
  for (const token of dead) {
    await store.removeDevice(token)
  }

  // Stash the accepted receipt ids so a later pass can check delivery and prune
  // tokens Expo only reports as dead after the fact.
  const now = Date.now()
  const pending = results
    .filter((r) => r.ok && r.ticketId)
    .map((r) => ({ ticketId: r.ticketId!, token: r.token, ts: now }))
  await store.addPendingReceipts(pending)

  return {
    ...EMPTY,
    newPosts: claimed.length,
    devices: devices.length,
    sent: results.filter((r) => r.ok).length,
    pruned: dead.size,
  }
}

function buildMessage(token: string, post: NewsPost): ExpoPushMessage {
  return {
    to: token,
    title: post.title,
    body: post.excerpt,
    sound: 'default',
    data: { postId: post.id, url: post.url },
  }
}
