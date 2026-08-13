import type { Session } from './types.js'
import { AuthError, RequestError } from './errors.js'
import {
  parseComment,
  parseFixture,
  parseFixtureEvents,
  parseFixtureSlim,
  parseFixtureStats,
  parseMember,
  parsePost,
  parseSeason,
  parseSession,
  parseStanding,
} from './parsers.js'

///////////////////////////////////////////////////////////
// Request layer
///////////////////////////////////////////////////////////
//
// Authenticated requests carry the `lfc-se` session cookie. On React Native the
// *native cookie store* is what attaches it — the platform networking layer
// sends cookies from its own jar automatically, and on iOS it silently drops a
// hand-set `Cookie` header, so putting the token in that store is the only
// thing that works. (`credentials` is a browser-fetch concept RN largely
// ignores; we pass 'include' as a conservative default, but it is not the
// mechanism.) Populating that store is the caller's job — see the app's
// `~/lib/session`.
//
// The notifications backend only ever calls public endpoints, so it needs no
// auth at all. Everything here — building requests, parsing responses — is
// portable, so the same client backs both.

export interface ClientConfig {
  /** API base URL, e.g. `https://www.lfc.se/webapi`. */
  baseUrl: string
  /** Fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /**
   * Credentials mode for requests. Defaults to `'include'` so a cookie-jar
   * environment (mobile/browser) sends the session automatically. Typed as a
   * literal union rather than the DOM's `RequestCredentials` so the shared
   * source compiles in Node consumers without the DOM lib.
   */
  credentials?: 'omit' | 'same-origin' | 'include'
  /**
   * Called whenever a request returns 401 (session expired or revoked
   * server-side). Centralising it here means every authenticated endpoint logs
   * the user out, not just the few a component happens to watch.
   */
  onUnauthorized?: () => void
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  searchParams?: Record<string, string>
  body?: unknown
}

function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

/**
 * Create an API client bound to a base URL and auth strategy. Returns plain
 * functions (safe to destructure) — one per endpoint.
 *
 * Endpoints marked _authenticated_ require a valid session (the `lfc-se`
 * cookie); the rest are public.
 */
export function createClient(config: ClientConfig) {
  const fetchImpl = config.fetch ?? fetch
  const credentials = config.credentials ?? 'include'

  async function request(
    path: string,
    options: RequestOptions = {},
  ): Promise<any> {
    const url = new URL(`${config.baseUrl}${path}`)
    for (const [key, value] of Object.entries(options.searchParams ?? {})) {
      url.searchParams.set(key, value)
    }

    const headers: Record<string, string> = {}
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetchImpl(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials,
    })

    if (!res.ok) {
      if (res.status === 401) {
        config.onUnauthorized?.()
      }
      throw new RequestError(path, res.status)
    }

    return res.json()
  }

  ///////////////////////////////////////////////////////////
  // Public endpoints
  ///////////////////////////////////////////////////////////

  async function listPosts(limit = 10, offset = 0) {
    // REST API doesn't have limit and offset but only limit/items.
    const data = (await request('/News/GetNewsList', {
      searchParams: { items: (limit + offset).toString() },
    })) as Array<unknown>

    return data.slice(offset).map((item) => parsePost(item))
  }

  async function getPost(id: string) {
    const data = await request('/News/GetNewsById', {
      searchParams: { NewsId: id },
    })

    return parsePost(data)
  }

  async function getComments(id: string) {
    const data = (await request('/Comment/GetCommentList', {
      searchParams: { NewsId: id },
    })) as Array<unknown>

    return data.map((item) => parseComment(item))
  }

  async function listSeasons() {
    const data = (await request('/Fixture/GetSeasonList')) as Array<unknown>

    return data.map((item) => parseSeason(item))
  }

  async function listFixtures() {
    const seasons = await listSeasons()
    const seasonId = seasons.at(0)?.id ?? '36'

    const data = (await request('/Fixture/GetFixture', {
      searchParams: { seasonId },
    })) as Array<unknown>

    return data.map((item) => parseFixtureSlim(item))
  }

  async function getFixture(id: string) {
    const data = await request('/Fixture/GetFixtureById', {
      searchParams: { fixtureId: id },
    })

    return parseFixture(data)
  }

  async function getFixtureStats(id: string) {
    const data = await request('/Fixture/GetFixtureTeamStats', {
      searchParams: { fixtureId: id },
    })

    return parseFixtureStats(data)
  }

  async function getFixtureEvents(id: string) {
    const data = (await request('/Fixture/GetFixtureEvents', {
      searchParams: { fixtureId: id },
    })) as Array<unknown>

    return data.map((item) => parseFixtureEvents(item))
  }

  async function listStanding() {
    const data = (await request('/Standing/GetStanding')) as Array<unknown>

    return data.map((item) => parseStanding(item))
  }

  ///////////////////////////////////////////////////////////
  // Authenticated endpoints
  ///////////////////////////////////////////////////////////

  /** _Authenticated._ Toggle a like on a comment; the liker is the session. */
  function likeComment(input: {
    newsId: string
    commentId: string
    hasLiked: boolean
  }) {
    // The endpoint toggles based on the comment's *current* like state: send the
    // current `HasLiked` and the server flips it (false -> liked, true -> unliked).
    return request('/Comment/LikeComment', {
      method: 'POST',
      body: {
        NewsId: Number(input.newsId),
        CommentId: Number(input.commentId),
        HasLiked: input.hasLiked,
      },
    })
  }

  /**
   * Establish a session. On success the provider returns a `SessionId` in the
   * body; the caller is responsible for persisting it (as the `lfc-se` cookie
   * on mobile, or via `getSessionToken` on the server).
   */
  async function login(username: string, password: string): Promise<Session> {
    const data = await request('/Login', {
      method: 'POST',
      body: { Username: username, Password: password },
    })

    if (!isObject(data) || !data.SessionId) {
      const errors = (Array.isArray(data?.ErrorList) ? data.ErrorList : []).map(
        (error: any) => ({
          name: error?.Name ?? null,
          message: error?.Value ?? '',
        }),
      )
      const message =
        errors.find((e: { message: string }) => e.message)?.message ??
        'Inloggningen misslyckades'
      throw new AuthError(message, errors)
    }

    return parseSession(data)
  }

  /** _Authenticated._ Clear the server-side session. Best-effort. */
  async function logout(): Promise<void> {
    // Best-effort: clear the server-side session. We always clear locally
    // regardless of the result, so swallow network/server errors here.
    try {
      await request('/Logout', { method: 'POST', body: {} })
    } catch {
      // ignore
    }
  }

  /** _Authenticated._ The signed-in member's profile. */
  async function getMemberInformation() {
    const data = await request('/Member/GetMemberInformation')

    return parseMember(data)
  }

  return {
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
  }
}

export type Client = ReturnType<typeof createClient>
