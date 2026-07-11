import { createClient } from '@lfc/api'
import { config } from '~/config'

///////////////////////////////////////////////////////////
// API client
///////////////////////////////////////////////////////////
//
// The transport-agnostic API layer lives in `@lfc/api` (shared with the
// notifications backend). This module binds it to the app's config and re-
// exports its methods, so the rest of the app keeps importing everything from
// `~/api`. Session handling — persisting the token and putting it in the native
// cookie store that `credentials: 'include'` reads — lives in `~/lib/session`,
// the single source of truth.

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
  baseUrl: config.get('apiUrl'),
  // The session cookie lives in the native store (managed by `~/lib/session`);
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
