import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { config } from '~/config'

///////////////////////////////////////////////////////////
// New-article notifications
///////////////////////////////////////////////////////////
//
// The notifications backend (apps/worker) polls the news API server-side and
// pushes to us via Expo. We just register this device's Expo push token with
// it (registerDeviceForPush).

// User's on/off preference for new-article notifications. Defaults to on.
const ENABLED_KEY = 'notifications-enabled'
// The Expo push token last registered with the backend. Stored so we can
// unregister exactly that token later and skip re-posting an unchanged one.
const PUSH_TOKEN_KEY = 'notifications-push-token'

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
 * Request notification permission and, if granted, register this device's
 * push token with the backend. Idempotent — safe to call on every launch.
 * Returns whether notifications ended up active.
 */
export async function enableNewPostNotifications(): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) {
    return false
  }
  await registerDeviceForPush()
  return true
}

/** Tear down notifications (e.g. from the settings toggle). */
export async function disableNewPostNotifications(): Promise<void> {
  await unregisterDeviceForPush()
}

/**
 * Backend origin, normalised, or null when not configured. Trims a trailing
 * slash and a trailing `/api` — every documented endpoint is written as
 * `/api/...`, so pointing the env var at `https://host/api` is an easy mistake
 * and would otherwise produce `/api/api/devices` and a silent 404.
 */
function notificationsApiUrl(): string | null {
  const url = config.get('notificationsApiUrl')
  if (!url) {
    return null
  }
  return url.replace(/\/+$/, '').replace(/\/api$/, '')
}

/**
 * Obtain this device's Expo push token. Returns null off a real device / dev
 * build (e.g. simulators can't mint one) or when the EAS projectId is missing.
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
 * throws.
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
    // Offline or backend down — the next launch will retry.
  }
}

/**
 * Tell the backend to stop pushing to this device and forget the stored token.
 * Best-effort; the token is cleared locally regardless so we don't get stuck.
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
 * registers the push token; disabling tears it down. Returns whether
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
