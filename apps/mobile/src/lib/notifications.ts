import * as BackgroundTask from 'expo-background-task'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import * as TaskManager from 'expo-task-manager'
import { listPosts } from '~/api'
import { config } from '~/config'

///////////////////////////////////////////////////////////
// New-article notifications
///////////////////////////////////////////////////////////
//
// Primary path: the notifications backend (apps/notifications) polls the news
// API server-side and pushes to us via Expo. We just register this device's
// Expo push token with it (registerDeviceForPush) — delivery is then prompt and
// doesn't depend on the app being woken.
//
// Fallback path: when no backend is configured (EXPO_PUBLIC_NOTIFICATIONS_API_URL
// unset) or it's unreachable, an OS background task periodically wakes the app,
// polls the news API, and fires a *local* notification for anything new. The OS
// controls when that task runs (a ~15min floor, often deferred), so it's
// best-effort — the server push is what makes notifications timely.

// Stable identifier the OS uses to invoke the headless task — must not change
// across releases or previously-registered tasks orphan.
const BACKGROUND_TASK = 'lfc-check-new-posts'
// Publish time (ISO) of the newest post we've already accounted for. We key off
// the timestamp rather than a post id because the list endpoint pins a featured
// article first regardless of date — so the first item isn't reliably the
// newest, and an id marker would let a pinned older post mask every genuinely
// new article behind it. Not sensitive, but SecureStore is already a dependency
// so we avoid pulling in AsyncStorage. (Key renamed from the old post-id marker,
// so existing installs harmlessly re-seed on first run.)
const LAST_SEEN_KEY = 'notifications-last-seen-published-at'
// User's on/off preference for new-article notifications. Defaults to on.
const ENABLED_KEY = 'notifications-enabled'
// The Expo push token last registered with the backend. Stored so we can
// unregister exactly that token later and skip re-posting an unchanged one.
const PUSH_TOKEN_KEY = 'notifications-push-token'
// Cap notifications per wakeup so a long offline gap can't flood the tray.
const MAX_NOTIFICATIONS = 5

// Present banners even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
})

/**
 * Payload attached to a new-post notification, read back when it's tapped. A
 * `type` (not `interface`) so it satisfies the `Record<string, unknown>` shape
 * `scheduleNotificationAsync`'s `data` expects.
 */
export type PostNotificationData = {
  postId: string
}

/**
 * Fetch the latest posts and fire a local notification for each one published
 * since the last check, advancing the stored marker. Driven by the background
 * task below.
 */
export async function checkForNewPosts(): Promise<void> {
  const posts = await listPosts(10, 0)
  if (posts.length === 0) {
    return
  }

  // The list endpoint pins a featured article first, so its order isn't
  // reliably chronological. Sort by publish time ourselves before doing any
  // newest/delta reasoning.
  const sorted = [...posts].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )
  const newest = sorted[0]!.publishedAt

  const lastSeenRaw = await SecureStore.getItemAsync(LAST_SEEN_KEY)
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null

  // First run (or a stale/invalid marker): record the current newest without
  // notifying, so enabling notifications doesn't dump the entire backlog.
  if (lastSeen == null || Number.isNaN(lastSeen.getTime())) {
    await SecureStore.setItemAsync(LAST_SEEN_KEY, newest.toISOString())
    return
  }

  // Everything published since the marker. Comparing by time (not array
  // position) means a pinned older article simply sorts below the marker
  // instead of hiding the real new posts.
  const fresh = sorted.filter(
    (post) => post.publishedAt.getTime() > lastSeen.getTime(),
  )
  if (fresh.length === 0) {
    return
  }

  // Advance the marker up front so a notification failure can't cause repeats
  // on the next wakeup.
  await SecureStore.setItemAsync(LAST_SEEN_KEY, newest.toISOString())

  // Notify oldest-first and capped, so the newest ends up on top of the tray
  // and a backlog can't spam the user.
  const toNotify = fresh.slice(0, MAX_NOTIFICATIONS).reverse()
  for (const post of toNotify) {
    const data: PostNotificationData = { postId: post.id }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: post.title,
        body: post.excerpt,
        data,
      },
      // Present immediately rather than scheduling for later.
      trigger: null,
    })
  }
}

// Defined at module scope so the task exists when the OS invokes it in a
// headless JS context — this module is imported from app.tsx for that reason.
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await checkForNewPosts()
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

/**
 * Request notification permission and, if granted, register the periodic
 * background check. Idempotent — safe to call on every launch. Returns whether
 * notifications ended up active.
 */
export async function enableNewPostNotifications(): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) {
    return false
  }

  // Primary path: hand our push token to the backend so it can push directly.
  // Best-effort — a failure here just leaves us relying on the fallback below.
  await registerDeviceForPush()

  // Fallback path: the on-device background poll. Still registered so
  // notifications keep working when the backend is unset or unreachable.
  const status = await BackgroundTask.getStatusAsync()
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    // Background App Refresh disabled at the OS level — nothing to register, but
    // server push (if configured) still works, so notifications aren't dead.
    return true
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, {
      // OS-enforced floor is 15 min; treated as a minimum, not a guarantee.
      minimumInterval: 15,
    })
  }

  return true
}

/** Tear down both notification paths (e.g. from the settings toggle). */
export async function disableNewPostNotifications(): Promise<void> {
  await unregisterDeviceForPush()
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK)
  }
}

/** Backend base URL, trailing slash trimmed, or null when not configured. */
function notificationsApiUrl(): string | null {
  const url = config.get('notificationsApiUrl')
  return url ? url.replace(/\/+$/, '') : null
}

/**
 * Obtain this device's Expo push token. Returns null off a real device / dev
 * build (e.g. simulators can't mint one) or when the EAS projectId is missing,
 * so callers can degrade gracefully to the on-device fallback.
 */
async function getExpoPushToken(): Promise<string | null> {
  const eas = Constants.expoConfig?.extra?.eas as
    | { projectId?: string }
    | undefined
  const projectId = eas?.projectId
  if (!projectId) {
    return null
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch {
    return null
  }
}

/**
 * Register this device's Expo push token with the notifications backend so it
 * receives server-driven pushes. No-ops when no backend is configured. Skips the
 * network call when the token is unchanged, and is best-effort — a failure never
 * throws, it just falls back to the on-device background poll.
 */
export async function registerDeviceForPush(): Promise<void> {
  const apiUrl = notificationsApiUrl()
  if (!apiUrl) {
    return
  }
  const token = await getExpoPushToken()
  if (!token) {
    return
  }
  const existing = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (existing === token) {
    return
  }
  try {
    const res = await fetch(`${apiUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
    }
  } catch {
    // Offline or backend down — the fallback poll still covers us.
  }
}

/**
 * Tell the backend to stop pushing to this device and forget the stored token.
 * Best-effort; the local marker is cleared regardless so we don't get stuck.
 */
export async function unregisterDeviceForPush(): Promise<void> {
  const apiUrl = notificationsApiUrl()
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (apiUrl && token) {
    try {
      await fetch(`${apiUrl}/api/devices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch {
      // ignore — we still clear the local marker below
    }
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
}

/** Whether the user wants new-article notifications. Defaults to on. */
export async function getNewPostNotificationsEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ENABLED_KEY)
  return value !== '0'
}

/**
 * Persist the on/off preference and apply it: enabling requests permission and
 * registers the background check; disabling tears it down. Returns whether
 * notifications are actually active afterwards — `false` when enabling but the
 * OS permission was denied, which the settings screen surfaces as a warning.
 */
export async function setNewPostNotificationsEnabled(
  enabled: boolean,
): Promise<boolean> {
  await SecureStore.setItemAsync(ENABLED_KEY, enabled ? '1' : '0')
  if (!enabled) {
    await disableNewPostNotifications()
    return false
  }
  return enableNewPostNotifications()
}

/** Whether the OS-level notification permission is currently granted. */
export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync()
  return granted
}

/**
 * Advance the seen-marker to the publish time of a post the user has already
 * encountered in-app (e.g. the newest item in the loaded feed), without
 * notifying. Prevents the next background run from notifying about articles the
 * user has effectively already seen.
 */
export async function markLatestPostSeen(publishedAt: Date): Promise<void> {
  if (Number.isNaN(publishedAt.getTime())) {
    return
  }
  // Only ever advance the marker forward, so a stale/out-of-order entry in the
  // loaded feed can't drag it backwards and re-trigger notifications.
  const existingRaw = await SecureStore.getItemAsync(LAST_SEEN_KEY)
  const existing = existingRaw ? new Date(existingRaw) : null
  if (
    existing &&
    !Number.isNaN(existing.getTime()) &&
    existing.getTime() >= publishedAt.getTime()
  ) {
    return
  }
  await SecureStore.setItemAsync(LAST_SEEN_KEY, publishedAt.toISOString())
}

/** Extract the post id from a tapped notification, if it carries one. */
export function getPostIdFromResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as
    | Partial<PostNotificationData>
    | undefined
  return typeof data?.postId === 'string' ? data.postId : null
}

async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) {
    return true
  }
  if (!current.canAskAgain) {
    return false
  }
  const next = await Notifications.requestPermissionsAsync()
  return next.granted
}
