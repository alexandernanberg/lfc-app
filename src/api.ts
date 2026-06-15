/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { config } from '~/config'
import { titleCase } from './utils'

const API_URL = config.get('apiUrl')

///////////////////////////////////////////////////////////
// Request layer
///////////////////////////////////////////////////////////

// The provider authenticates requests with a session token. On login it
// returns a `SessionId` in the body, which we then send back on subsequent
// requests via the `x-session` header. We also opt into the native cookie
// jar (`credentials: 'include'`) in case the server additionally relies on a
// session cookie.
let sessionToken: string | null = null

/**
 * Set (or clear) the session token used to authenticate API requests. The auth
 * layer is the source of truth and keeps this in sync with persisted storage.
 */
export function setSessionToken(token: string | null) {
  sessionToken = token
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  searchParams?: Record<string, string>
  body?: unknown
}

async function request(path: string, options: RequestOptions = {}) {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, value)
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (sessionToken) {
    headers['x-session'] = sessionToken
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }

  return res.json()
}

export async function getPost(id: string) {
  const data = await request('/News/GetNewsById', {
    searchParams: { NewsId: id },
  })

  return parsePost(data)
}

export async function listPosts(limit = 10, offset = 0) {
  // REST API doesn't have limit and offset but only limit/items.
  const data = (await request('/News/GetNewsList', {
    searchParams: { items: (limit + offset).toString() },
  })) as Array<unknown>

  return data.slice(offset).map((item) => parsePost(item))
}

export async function getComments(id: string) {
  const data = (await request('/Comment/GetCommentList', {
    searchParams: { NewsId: id },
  })) as Array<unknown>

  return data.map((item) => parseComment(item))
}

export async function listSeasons() {
  const data = (await request('/Fixture/GetSeasonList')) as Array<unknown>

  return data.map((item) => parseSeason(item))
}

export async function listFixtures() {
  const seasons = await listSeasons()
  const seasonId = seasons.at(0)?.id ?? '36'

  const data = (await request('/Fixture/GetFixture', {
    searchParams: { seasonId },
  })) as Array<unknown>

  return data.map((item) => parseFixtureSlim(item))
}

export async function getFixture(id: string) {
  const data = await request('/Fixture/GetFixtureById', {
    searchParams: { fixtureId: id },
  })

  return parseFixture(data)
}

export async function getFixtureStats(id: string) {
  const data = await request('/Fixture/GetFixtureTeamStats', {
    searchParams: { fixtureId: id },
  })

  return parseFixtureStats(data)
}

export async function getFixtureEvents(id: string) {
  const data = (await request('/Fixture/GetFixtureEvents', {
    searchParams: { fixtureId: id },
  })) as Array<unknown>

  return data.map((item) => parseFixtureEvents(item))
}

///////////////////////////////////////////////////////////
// Auth
///////////////////////////////////////////////////////////

/**
 * Thrown when the provider rejects a login attempt. `errors` holds the
 * field-level messages returned by the API (already localized in Swedish).
 */
export class AuthError extends Error {
  errors: Array<{ name: string | null; message: string }>

  constructor(
    message: string,
    errors: Array<{ name: string | null; message: string }> = [],
  ) {
    super(message)
    this.name = 'AuthError'
    this.errors = errors
  }
}

export async function login(
  username: string,
  password: string,
): Promise<Session> {
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

export async function logout(): Promise<void> {
  // Best-effort: clear the server-side session. We always clear locally
  // regardless of the result, so swallow network/server errors here.
  try {
    await request('/Logout', { method: 'POST', body: {} })
  } catch {
    // ignore
  }
}

///////////////////////////////////////////////////////////
// Normalizers
///////////////////////////////////////////////////////////

function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

function parsePost(input: unknown): Post {
  if (!isObject(input)) {
    throw new Error('Invalid post')
  }

  return {
    id: `${input.NewsId}`,
    title: input.Title,
    excerpt: input.Preamble.replace(/<[^>]*>/g, ''),
    imageUrl: input.ImageName.replace(/w_\d*/, 'w_600'),
    publishedAt: new Date(input.CreatedDate),
    commentsCount: input.NumberOfComments ?? 0,
    slug: input.Url,
    url: `https://lfc.nu${input.Url ?? ''}`,
    content: preprocessPostHtml(input.ContentText ?? ''),
    tags:
      input.TagList?.map((tag: any) => ({
        id: tag.TagId,
        value: tag.TagName,
      })) ?? [],
    author: {
      id: input.Admin?.AdminId,
      name: input.Admin?.AdminName,
      avatarUrl: input.Admin?.ImageName,
      url: input.Admin?.Url,
    },
  }
}

function preprocessPostHtml(html: string) {
  // Remove script tags
  let sanitizedHtml = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')

  // Twitter embeds
  sanitizedHtml = sanitizedHtml
    .replace(
      /<blockquote class="twitter-tweet"[^>]*>[\s\S]*?<\/blockquote>/gi,
      (match) => {
        // Extract the tweet ID from the blockquote
        const tweetIdMatch = match.match(/status\/(\d+)/)
        if (tweetIdMatch && tweetIdMatch[1]) {
          const tweetId = tweetIdMatch[1]
          // Return a custom tag with the tweet ID
          return `<tweet-embed id="${tweetId}"></tweet-embed>`
        }
        return '' // If no tweet ID is found, remove the blockquote
      },
    )
    .replace(
      /<iframe[^>]*src="[^"]*?\/Tweet\.html[^"]*?id=(\d+)[^>]*><\/iframe>/gi,
      (match, tweetId) => {
        return `<tweet-embed id="${tweetId}"></tweet-embed>`
      },
    )

  // Instagram embeds
  sanitizedHtml = sanitizedHtml.replace(
    /<figure>[\s\S]*?<blockquote class="instagram-media"[^>]*data-instgrm-permalink="[^"]*\/p\/([^/?]+)[^"]*"[^>]*>[\s\S]*?<\/blockquote>[\s\S]*?<\/figure>/gi,
    (match, postId) => {
      return `<instagram-embed id="${postId}"></instagram-embed>`
    },
  )

  // Remove annying banners
  sanitizedHtml = sanitizedHtml
    .replace(/<hr>[\s\S]*?<figure>[\s\S]*?data-emoji="🚩"[\s\S]*/g, '')
    .replace(/<p>\*&nbsp;(.|\s)+<\/p>\s<figure.+<\/figure>/g, '')
    .replace(/<hr>\s*<h2[^>]*>[\s\S]*?⛱️[\s\S]*?<\/ul>/g, '')

  // Ensure all iframes has a valid protocol
  sanitizedHtml = sanitizedHtml.replace(
    /(?<=\bsrc="?)\/\/(?<=[^"]+?)/gi,
    'https://',
  )

  // Remove empty <a>
  sanitizedHtml = sanitizedHtml.replace(/<a\b[^>]*>(\s|&nbsp;)*<\/a>/gm, '')

  // Remove empty <p>
  sanitizedHtml = sanitizedHtml.replace(/<p\b[^>]*>(\s|&nbsp;)*<\/p>/gm, '')

  return sanitizedHtml
}

function parseComment(input: unknown): Comment {
  if (!isObject(input)) {
    throw new Error('Invalid comment')
  }

  return {
    id: `${input.CommentId}`,
    parentId: input.ParentId,
    createdAt: new Date(input.CreatedDate),
    updatedAt: input.ChangedDate ? new Date(input.ChangedDate) : null,
    comment: input.Comment.replace(/^\s+|\s+$/g, '')
      .replace(/<br>/g, '\n')
      .replace(/\n\n\n/g, '\n\n')
      .trim(),
    author: {
      id: input.MemberId,
      name: input.UserName,
      avatarUrl: input.ImageName?.endsWith('default-avatar-generic.png')
        ? null
        : input.ImageName,
      url: input.Url,
    },
    numberOfLikes: input.NumberOfLikes,
    replies: input.SubList?.map((i: unknown) => parseComment(i)) ?? [],
  }
}

function parseFixtureSlim(input: unknown): FixtureSlim {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    oppoonent: input.Opponent,
    type: input.GameType,
    opponentLogoUrl: input.ImageName,
    result: input.ResultFinal,
    resultHalfTime: input.ResultHalfTime,
    playOffType: input.PlayOffType,
  }
}

function parseFixture(input: unknown): Fixture {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const [homeName, awayName] = input.Name.split(' - ')

  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    oppoonent: input.Opponent,
    type: input.GameType,
    result: input.ResultFinal,
    resultHalfTime: input.ResultHalfTime,
    playOffType: input.PlayOffType,
    arena: input.Arena,
    spectators: input.Spectators,
    name: input.Name,
    homeName,
    awayName,
    imageHomeUrl: input.ImageHome.replace(/w_\d*/, 'w_220'),
    imageAwayUrl: input.ImageAway.replace(/w_\d*/, 'w_220'),
    attendence: input.Spectators,
    referee: input.Referee
      ? {
          id: input.Referee.RefereeId,
          name: String(input.Referee.Name).trim(),
          imageUrl: input.Referee.ImageName,
        }
      : null,
  }
}

function parseTeamStats(input: unknown): TeamStats {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    shots: input.Shots,
    shotsOnGoal: input.ShotsOnGoal,
    possession: input.Possession / 100,
    passes: input.Passes,
    passingPercentage: input.PassingPercentage,
    misconduct: input.Misconduct,
    yellow: input.Yellow,
    red: input.Red,
    offsides: input.Offsides,
    corners: input.Corners,
  }
}

function parseFixtureStats(input: unknown): FixtureStats {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const [homeStats, awayStats] = input.ItemList

  return {
    homeTeam: parseTeamStats(homeStats),
    awayTeam: parseTeamStats(awayStats),
  }
}

function parseName(input: string, type: FixtureEvent['type']) {
  let player = input.trim()
  let assist: undefined | string
  let inPlayer: undefined | string
  let outPlayer: undefined | string

  if (type === 'substitution') {
    // Parse substitution formatting, e.g. In: SALAH, Ut: DIAZ
    const match = input.match(/In:\s*([\w\s-]+)\s*,\s*Ut:\s*([\w\s-]+)/)
    if (match) {
      inPlayer = match[1]?.trim()
      outPlayer = match[2]?.trim()
    }
  } else {
    // Parse goal formatting, e.g. SALAH (ALEXANDER-ARNOLD)
    const match = input.match(/^([\w\s-]+)(?:\s\(([\w\s-]+)\))?$/)
    if (match) {
      player = match[1]?.trim() ?? ''
      assist = match[2]?.trim()
    }
  }

  return {
    player,
    assist,
    inPlayer,
    outPlayer,
  }
}

const fixtureEventTypeIdMap = {
  1: 'goal',
  2: 'yellow_card',
  3: 'second_yellow_card',
  4: 'red_card',
  5: 'substitution',
  7: 'penalty_miss',
  10: 'own_goal',
} as const satisfies Record<number, FixtureEvent['type']>

function parseFixtureEvents(input: unknown): FixtureEvent {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const type = input.IsPenalty
    ? 'penalty_goal'
    : input.EventTypeId in fixtureEventTypeIdMap
      ? fixtureEventTypeIdMap[
          input.EventTypeId as keyof typeof fixtureEventTypeIdMap
        ]
      : 'unknown'

  const { player, assist, inPlayer, outPlayer } = parseName(input.Name, type)

  return {
    id: input.FixtureEventId,
    type,
    minute: input.Minute,
    player: titleCase(player),
    assist: assist ? titleCase(assist) : undefined,
    isLiverpool: input.IsLiverpool,
    inPlayer: inPlayer ? titleCase(inPlayer) : undefined,
    outPlayer: outPlayer ? titleCase(outPlayer) : undefined,
  }
}

function parseSeason(input: unknown): Season {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    id: input.SeasonId,
    name: input.Name,
  }
}

function parseSession(input: unknown): Session {
  if (!isObject(input)) {
    throw new Error('Invalid session')
  }

  const validThru = input.ValidThru ? new Date(input.ValidThru) : null

  return {
    token: input.SessionId,
    memberId: `${input.MemberId}`,
    username: input.Username,
    validThru:
      validThru && !Number.isNaN(validThru.getTime()) ? validThru : null,
    domain: input.Domain ?? null,
  }
}

interface Tag {
  id: number
  value: string
}

interface User {
  id: string
  name: string
  avatarUrl: string | null
  url: string
}

export interface Post {
  id: string
  slug: string
  url: string
  title: string
  excerpt: string
  publishedAt: Date
  imageUrl: string
  content: string
  tags: Array<Tag>
  author: User
  commentsCount: number
}

export interface Comment {
  id: string
  parentId: string
  createdAt: Date
  updatedAt: Date | null
  author: User
  comment: string
  numberOfLikes: number
  replies: Array<Comment>
}

export interface Season {
  id: string
  name: string
}

export interface Session {
  token: string
  memberId: string
  username: string
  validThru: Date | null
  domain: string | null
}

export interface FixtureSlim {
  id: string
  startsAt: Date
  startsAtTime: string | null
  isAwayGame: boolean
  oppoonent: string
  result: string | null
  resultHalfTime: string | null
  type: string
  opponentLogoUrl: string
  playOffType: string | null
}

export interface Fixture {
  id: string
  startsAt: Date
  startsAtTime: string | null
  isAwayGame: boolean
  oppoonent: string
  result: string | null
  resultHalfTime: string | null
  type: string
  playOffType: string | null
  arena: string
  spectators: number
  name: string
  attendence: number
  homeName: string
  awayName: string
  imageHomeUrl: string
  imageAwayUrl: string
  referee: {
    id: number
    name: string
    imageUrl: string
  } | null
}

interface TeamStats {
  shots: number
  shotsOnGoal: number
  possession: number
  passes: number
  passingPercentage: number
  misconduct: number
  yellow: number
  red: number
  offsides: number
  corners: number
}

export interface FixtureStats {
  homeTeam: TeamStats
  awayTeam: TeamStats
}

export interface FixtureEvent {
  id: string
  type:
    | 'goal'
    | 'yellow_card'
    | 'second_yellow_card'
    | 'red_card'
    | 'substitution'
    | 'penalty_miss'
    | 'penalty_goal'
    | 'own_goal'
    | ({} & string)
  minute: number
  player: string
  assist?: string
  isLiverpool: boolean
  inPlayer?: string
  outPlayer?: string
}
