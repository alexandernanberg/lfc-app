import type { Session } from '@lfc/api'
import CookieManager from '@react-native-cookies/cookies'
import * as SecureStore from 'expo-secure-store'
import { config } from '~/config'

///////////////////////////////////////////////////////////
// Session — single source of truth for the auth session
///////////////////////////////////////////////////////////
//
// One module owns the session token in every place it has to live:
//   • SecureStore          — durable persistence across launches
//   • the native cookie store — how the token actually rides on API requests
//     (`credentials: 'include'`); a hand-set `Cookie` header is dropped on iOS,
//     so the cookie store is the only viable transport there
//   • an in-memory snapshot — what the UI reads via `useSyncExternalStore`
//
// Every mutation goes through setSession/clearSession, which update all three
// together, so they can never drift out of sync. Consumers never touch the
// cookie store or SecureStore directly.

const SESSION_KEY = 'provider-session'
const COOKIE_ORIGIN = new URL(config.get('apiUrl')).origin

/** JSON-serialisable form of a {@link Session} (Dates as ISO strings). */
interface StoredSession {
  token: string
  memberId: string
  username: string
  validThru: string | null
  domain: string | null
}

let current: Session | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

/** Subscribe to session changes (for `useSyncExternalStore`). */
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The current session, or null when logged out (for `useSyncExternalStore`). */
export function getSession(): Session | null {
  return current
}

// Write (or clear) the transport cookie. The native store is the only place a
// cookie can live on iOS, so this is how the token reaches the API.
async function writeCookie(token: string | null) {
  if (token) {
    await CookieManager.set(COOKIE_ORIGIN, {
      name: 'lfc-se',
      value: token,
      path: '/',
    })
    return
  }

  // Clear only *our* cookie. `clearAll()` would also wipe cookies for every
  // other host — including the Twitter/Instagram embeds the app renders — which
  // is a surprising side effect of signing out.
  //
  // Capabilities are feature-detected rather than switched on `Platform.OS`:
  // `clearByName` is documented iOS-only and `flush` Android-only, but checking
  // for the method is both narrower than a platform guess and safe on any
  // platform the library may not fully support.
  if (typeof CookieManager.clearByName === 'function') {
    try {
      await CookieManager.clearByName(COOKIE_ORIGIN, 'lfc-se')
      return
    } catch {
      // Fall through to the overwrite below.
    }
  }

  // No scoped removal available: overwrite with an already-expired cookie so the
  // native jar drops it, then persist that where the platform requires it.
  await CookieManager.set(COOKIE_ORIGIN, {
    name: 'lfc-se',
    value: '',
    path: '/',
    expires: new Date(0).toISOString(),
  })
  if (typeof CookieManager.flush === 'function') {
    await CookieManager.flush()
  }
}

function serialize(session: Session): StoredSession {
  return {
    token: session.token,
    memberId: session.memberId,
    username: session.username,
    validThru: session.validThru ? session.validThru.toISOString() : null,
    domain: session.domain,
  }
}

function deserialize(stored: StoredSession): Session {
  return {
    token: stored.token,
    memberId: stored.memberId,
    username: stored.username,
    validThru: stored.validThru ? new Date(stored.validThru) : null,
    domain: stored.domain,
  }
}

/**
 * Restore the persisted session once, at startup: hydrate the in-memory
 * snapshot and prime the cookie so the first authenticated request has it.
 * Returns the restored session, or null when there's none / it's corrupt.
 */
export async function restoreSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY)
  if (!raw) {
    return null
  }

  // Parse *and* map inside the guard: a value that's valid JSON but the wrong
  // shape (`null`, `{}`, a truncated write) would otherwise throw here and take
  // the whole app down — this runs at module load and is consumed with `use()`,
  // so a rejection surfaces as a render error on every launch, and the bad entry
  // would never get cleared.
  let session: Session
  try {
    const stored = JSON.parse(raw) as StoredSession | null
    if (!stored || typeof stored.token !== 'string' || stored.token === '') {
      throw new Error('Stored session is missing a token')
    }
    session = deserialize(stored)
  } catch {
    // Corrupted entry, treat as logged out.
    await SecureStore.deleteItemAsync(SESSION_KEY)
    return null
  }

  await writeCookie(session.token)
  current = session
  emit()
  return session
}

/** Persist and activate a session (after sign-in). */
export async function setSession(session: Session): Promise<void> {
  await writeCookie(session.token)
  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(serialize(session)),
  )
  current = session
  emit()
}

/** Tear down the session everywhere (sign-out or a server-side 401). */
export async function clearSession(): Promise<void> {
  await writeCookie(null)
  await SecureStore.deleteItemAsync(SESSION_KEY)
  current = null
  emit()
}
