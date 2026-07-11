import { fetchLatestPosts, type NewsPost } from '@lfc/shared'
import type { Env } from './env'
import type { Store } from './store'
import { sendPushNotifications, type ExpoPushMessage } from './push'

export interface PollResult {
  /** First-ever run: we recorded the current newest without notifying. */
  seeded: boolean
  /** Number of articles detected as new since the last poll. */
  newPosts: number
  /** Number of registered devices at poll time. */
  devices: number
  /** Push messages actually sent. */
  sent: number
  /** Device tokens pruned because Expo reported them dead. */
  pruned: number
}

/**
 * The core job, run on a schedule: fetch the latest articles, figure out what's
 * new since the last run, and fan a push notification out to every registered
 * device for each new article. Advances the last-seen marker before sending so
 * a send failure can't cause the same article to notify twice.
 */
export async function pollAndNotify(
  store: Store,
  env: Env,
): Promise<PollResult> {
  const posts = await fetchLatestPosts({
    apiUrl: env.apiUrl,
    items: env.pollItems,
  })

  const empty: PollResult = {
    seeded: false,
    newPosts: 0,
    devices: 0,
    sent: 0,
    pruned: 0,
  }

  if (posts.length === 0) {
    return empty
  }

  // fetchLatestPosts already sorts newest-first.
  const newest = posts[0]!.publishedAt

  const lastSeenRaw = await store.getLastSeen()
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null

  // First run (or a corrupted marker): record the current newest without
  // notifying, so standing up the service doesn't blast the whole backlog.
  if (!lastSeen || Number.isNaN(lastSeen.getTime())) {
    await store.setLastSeen(newest.toISOString())
    return { ...empty, seeded: true }
  }

  // Everything published strictly after the marker. Comparing by time (not
  // list position) means the endpoint's pinned featured article can't hide the
  // genuinely new posts behind it.
  const fresh = posts
    .filter((post) => post.publishedAt.getTime() > lastSeen.getTime())
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())

  if (fresh.length === 0) {
    return empty
  }

  // Advance the marker up front: if the push send below fails we'd rather drop
  // a notification than re-notify the same article on the next poll.
  await store.setLastSeen(newest.toISOString())

  // Oldest-first and capped so a long gap can't flood the tray; the newest
  // article ends up most recent in the notification list.
  const toNotify = fresh.slice(-env.maxNotificationsPerPoll)

  const devices = await store.listDevices()
  if (devices.length === 0) {
    return { ...empty, newPosts: fresh.length }
  }

  const messages: ExpoPushMessage[] = []
  for (const post of toNotify) {
    for (const token of devices) {
      messages.push(buildMessage(token, post))
    }
  }

  const results = await sendPushNotifications(messages, {
    accessToken: env.expoAccessToken,
  })

  // Prune tokens Expo says are gone (app uninstalled, token rotated) so we stop
  // trying to reach them.
  const dead = new Set<string>()
  for (const result of results) {
    if (!result.ok && result.error === 'DeviceNotRegistered') {
      dead.add(result.token)
    }
  }
  for (const token of dead) {
    await store.removeDevice(token)
  }

  return {
    seeded: false,
    newPosts: fresh.length,
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
