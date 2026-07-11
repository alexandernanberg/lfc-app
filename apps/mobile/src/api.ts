import { createClient } from '@lfc/api'
import CookieManager from '@react-native-cookies/cookies'
import { config } from '~/config'

///////////////////////////////////////////////////////////
// Native API adapter
///////////////////////////////////////////////////////////
//
// The transport-agnostic API layer lives in `@lfc/api` (shared with the
// notifications backend). The only genuinely native concern is *session
// transport*: on iOS the networking layer manages cookies through its own
// store and silently drops a hand-set `Cookie` header, so the session has to
// live in the native cookie store and go out via `credentials: 'include'`.
//
// This module owns that native glue and re-exports the client's methods, so the
// rest of the app keeps importing everything from `~/api` as before.

const API_URL = config.get('apiUrl')
const COOKIE_ORIGIN = new URL(API_URL).origin

/**
 * Set (or clear) the session cookie used to authenticate API requests. The auth
 * layer is the source of truth and keeps this in sync with persisted storage.
 */
export async function setSessionToken(token: string | null) {
  if (token) {
    await CookieManager.set(COOKIE_ORIGIN, {
      name: 'lfc-se',
      value: token,
      path: '/',
    })
  } else {
    await CookieManager.clearAll()
  }
}

// Invoked whenever a request comes back 401, so the auth layer can drop an
// expired session. Registered by the auth store; see `setUnauthorizedHandler`.
let onUnauthorized: (() => void) | null = null

/**
 * Register a handler called whenever the API returns 401 (session expired or
 * revoked server-side).
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

const client = createClient({
  baseUrl: API_URL,
  // The session cookie lives in the native store (see `setSessionToken`);
  // `include` makes the native layer attach it on every request.
  credentials: 'include',
  onUnauthorized: () => onUnauthorized?.(),
})

export const {
  listPosts,
  getPost,
  getComments,
  listSeasons,
  listFixtures,
  getFixture,
  getFixtureStats,
  getFixtureEvents,
  listStanding,
  likeComment,
  login,
  logout,
  getMemberInformation,
} = client

export { AuthError, RequestError } from '@lfc/api'
export type {
  Comment,
  Fixture,
  FixtureEvent,
  FixtureSlim,
  FixtureStats,
  Member,
  Post,
  Season,
  Session,
  Standing,
} from '@lfc/api'
