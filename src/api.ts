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
// API Response Types (what the server returns)
///////////////////////////////////////////////////////////

interface ApiTag {
  TagId: number
  TagName: string
}

interface ApiAdmin {
  AdminId: string
  AdminName: string
  ImageName: string
  Url: string
}

interface ApiPost {
  NewsId: number
  Title: string
  Preamble: string
  ImageName: string
  CreatedDate: string
  NumberOfComments: number
  NumberOfLikes: number
  Url: string
  ContentText: string
  TagList: ApiTag[] | null
  Admin: ApiAdmin | null
  IsLocked: boolean
  HasLiked: boolean
  IsCommentsDisabled: boolean
}

interface ApiComment {
  CommentId: number
  ParentId: string
  CreatedDate: string
  ChangedDate: string | null
  Comment: string
  MemberId: string
  UserName: string
  ImageName: string | null
  Url: string
  NumberOfLikes: number
  SubList: ApiComment[] | null
}

interface ApiSeason {
  SeasonId: string
  Name: string
}

interface ApiFixtureSlim {
  FixtureId: number
  GameTime: string
  GameDate: string
  IsAwayGame: boolean
  Opponent: string
  GameType: string
  ImageName: string
  PlayOffType: string | null
  ResultFinal: string | null
  ResultHalfTime: string | null
}

interface ApiReferee {
  RefereeId: number
  Name: string
  ImageName: string
}

interface ApiFixture {
  FixtureId: number
  GameTime: string
  GameDate: string
  IsAwayGame: boolean
  Opponent: string
  GameType: string
  PlayOffType: string | null
  ResultFinal: string | null
  ResultHalfTime: string | null
  Arena: string
  Spectators: number
  Name: string
  ImageHome: string
  ImageAway: string
  Referee: ApiReferee | null
}

interface ApiTeamStats {
  Shots: number
  ShotsOnGoal: number
  Possession: number
  Passes: number
  PassingPercentage: number
  Misconduct: number
  Yellow: number
  Red: number
  Offsides: number
  Corners: number
}

interface ApiFixtureStats {
  ItemList: [ApiTeamStats, ApiTeamStats]
}

interface ApiFixtureEvent {
  FixtureEventId: string
  EventTypeId: number
  IsPenalty: boolean
  Minute: number
  Name: string
  IsLiverpool: boolean
}

interface ApiStanding {
  Position: string
  Team: string
  ImageName: string
  Played: string
  Won: string
  Draw: string
  Lost: string
  Fore: string
  Against: string
  GoalDifference: string
  Points: string
  IsLiverpool: boolean
}

///////////////////////////////////////////////////////////
// Request layer
///////////////////////////////////////////////////////////

// The provider authenticates requests with the `lfc-se` session cookie. On
// login it returns a `SessionId` in the body (the same value that gets set as
// that cookie), which we persist and replay as `Cookie: lfc-se=<token>` on
// each request. We keep `credentials: 'include'` as well so the native cookie
// jar stays in sync.
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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, value)
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (sessionToken) {
    headers['Cookie'] = `lfc-se=${sessionToken}`
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

  return res.json() as Promise<T>
}

///////////////////////////////////////////////////////////
// API Functions
///////////////////////////////////////////////////////////

async function getPost(id: string) {
  const data = await request<ApiPost>('/News/GetNewsById', {
    searchParams: { NewsId: id },
  })
  return parsePost(data)
}

async function listPosts(limit = 10, offset = 0) {
  // REST API doesn't have limit and offset but only limit/items.
  const data = await request<ApiPost[]>('/News/GetNewsList', {
    searchParams: { items: (limit + offset).toString() },
  })
  return data.slice(offset).map(parsePost)
}

async function listComments(postId: string) {
  const data = await request<ApiComment[]>('/Comment/GetCommentList', {
    searchParams: { NewsId: postId },
  })
  return data.map(parseComment)
}

async function listSeasons() {
  const data = await request<ApiSeason[]>('/Fixture/GetSeasonList')
  return data.map(parseSeason)
}

async function listFixtures() {
  const seasons = await listSeasons()
  const seasonId = seasons.at(0)?.id ?? '36'

  const data = await request<ApiFixtureSlim[]>('/Fixture/GetFixture', {
    searchParams: { seasonId },
  })
  return data.map(parseFixtureSlim)
}

async function getFixture(id: string) {
  const data = await request<ApiFixture>('/Fixture/GetFixtureById', {
    searchParams: { fixtureId: id },
  })
  return parseFixture(data)
}

async function getFixtureStats(id: string) {
  const data = await request<ApiFixtureStats>('/Fixture/GetFixtureTeamStats', {
    searchParams: { fixtureId: id },
  })
  return parseFixtureStats(data)
}

async function getFixtureEvents(id: string) {
  const data = await request<ApiFixtureEvent[]>('/Fixture/GetFixtureEvents', {
    searchParams: { fixtureId: id },
  })
  return data.map(parseFixtureEvent)
}

async function getStandings() {
  const data = await request<ApiStanding[]>('/Standing/GetStanding')
  return data.map(parseStanding)
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

async function login(username: string, password: string): Promise<Session> {
  const data = await request<any>('/Login', {
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

async function logout(): Promise<void> {
  // Best-effort: clear the server-side session. We always clear locally
  // regardless of the result, so swallow network/server errors here.
  try {
    await request('/Logout', { method: 'POST', body: {} })
  } catch {
    // ignore
  }
}

async function getMemberInformation(): Promise<Member> {
  const data = await request<any>('/Member/GetMemberInformation')
  return parseMember(data)
}

///////////////////////////////////////////////////////////
// Helpers
///////////////////////////////////////////////////////////

function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

///////////////////////////////////////////////////////////
// Parsers / Transformers
///////////////////////////////////////////////////////////

function parsePost(input: ApiPost): Post {
  return {
    id: `${input.NewsId}`,
    title: input.Title,
    excerpt: input.Preamble.replace(/<[^>]*>/g, ''),
    imageUrl: input.ImageName.replace(/w_\d*/, 'w_600'),
    publishedAt: new Date(input.CreatedDate),
    commentsCount: input.NumberOfComments ?? 0,
    likesCount: input.NumberOfLikes ?? 0,
    slug: input.Url,
    url: `https://lfc.nu${input.Url ?? ''}`,
    content: preprocessPostHtml(input.ContentText ?? ''),
    tags:
      input.TagList?.map((tag) => ({
        id: tag.TagId,
        value: tag.TagName,
      })) ?? [],
    author: input.Admin
      ? {
          id: input.Admin.AdminId,
          name: input.Admin.AdminName,
          avatarUrl: input.Admin.ImageName,
          url: input.Admin.Url,
        }
      : null,
    isLocked: input.IsLocked,
    hasLiked: input.HasLiked,
    isCommentsDisabled: input.IsCommentsDisabled,
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
      (_match, tweetId: string) => {
        return `<tweet-embed id="${tweetId}"></tweet-embed>`
      },
    )

  // Instagram embeds
  sanitizedHtml = sanitizedHtml.replace(
    /<figure>[\s\S]*?<blockquote class="instagram-media"[^>]*data-instgrm-permalink="[^"]*\/p\/([^/?]+)[^"]*"[^>]*>[\s\S]*?<\/blockquote>[\s\S]*?<\/figure>/gi,
    (_match, postId: string) => {
      return `<instagram-embed id="${postId}"></instagram-embed>`
    },
  )

  // Remove annoying banners
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

function parseComment(input: ApiComment): Comment {
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
    replies: input.SubList?.map(parseComment) ?? [],
  }
}

function parseSeason(input: ApiSeason): Season {
  return {
    id: input.SeasonId,
    name: input.Name,
  }
}

function parseFixtureSlim(input: ApiFixtureSlim): FixtureSlim {
  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    opponent: input.Opponent,
    type: input.GameType,
    opponentLogoUrl: input.ImageName,
    result: input.ResultFinal,
    resultHalfTime: input.ResultHalfTime,
    playOffType: input.PlayOffType,
  }
}

function parseFixture(input: ApiFixture): Fixture {
  const [homeName = '', awayName = ''] = input.Name.split(' - ')

  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    opponent: input.Opponent,
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
    attendance: input.Spectators,
    referee: input.Referee
      ? {
          id: input.Referee.RefereeId,
          name: String(input.Referee.Name).trim(),
          imageUrl: input.Referee.ImageName,
        }
      : null,
  }
}

function parseTeamStats(input: ApiTeamStats): TeamStats {
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

function parseFixtureStats(input: ApiFixtureStats): FixtureStats {
  const [homeStats, awayStats] = input.ItemList

  return {
    homeTeam: parseTeamStats(homeStats),
    awayTeam: parseTeamStats(awayStats),
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
} as const satisfies Record<number, FixtureEventType>

type FixtureEventType =
  | 'goal'
  | 'yellow_card'
  | 'second_yellow_card'
  | 'red_card'
  | 'substitution'
  | 'penalty_miss'
  | 'penalty_goal'
  | 'own_goal'
  | 'unknown'

function parseFixtureEvent(input: ApiFixtureEvent): FixtureEvent {
  const type: FixtureEventType = input.IsPenalty
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

function parseName(input: string, type: FixtureEventType) {
  let player = input.trim()
  let assist: string | undefined
  let inPlayer: string | undefined
  let outPlayer: string | undefined

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

function parseStanding(input: ApiStanding): Standing {
  return {
    position: parseInt(input.Position, 10),
    team: input.Team,
    imageUrl: input.ImageName,
    played: parseInt(input.Played, 10),
    won: parseInt(input.Won, 10),
    draw: parseInt(input.Draw, 10),
    lost: parseInt(input.Lost, 10),
    goalsFor: parseInt(input.Fore, 10),
    goalsAgainst: parseInt(input.Against, 10),
    goalDifference: parseInt(input.GoalDifference, 10),
    points: parseInt(input.Points, 10),
    isLiverpool: input.IsLiverpool,
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

function parseMember(input: unknown): Member {
  if (!isObject(input)) {
    throw new Error('Invalid member')
  }

  const expirationDate = input.ExpirationDate
    ? new Date(input.ExpirationDate)
    : null

  return {
    id: `${input.MemberId}`,
    membershipNumber: input.MembershipNumber,
    firstName: input.FirstName,
    lastName: input.LastName,
    name: input.Name,
    username: input.Username,
    email: input.Email,
    avatarUrl: input.ImageName?.includes('default-avatar')
      ? null
      : (input.ImageName ?? null),
    signature: input.Signature || null,
    expirationDate:
      expirationDate && !Number.isNaN(expirationDate.getTime())
        ? expirationDate
        : null,
    daysLeft: input.DaysLeft ?? 0,
    numberOfComments: input.NumberOfComments ?? 0,
  }
}

///////////////////////////////////////////////////////////
// App Types (what the app uses)
///////////////////////////////////////////////////////////

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
  tags: Tag[]
  author: User | null
  commentsCount: number
  likesCount: number
  isLocked: boolean
  hasLiked: boolean
  isCommentsDisabled: boolean
}

export interface Comment {
  id: string
  parentId: string
  createdAt: Date
  updatedAt: Date | null
  author: User
  comment: string
  numberOfLikes: number
  replies: Comment[]
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

export interface Member {
  id: string
  membershipNumber: number
  firstName: string
  lastName: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  signature: string | null
  expirationDate: Date | null
  daysLeft: number
  numberOfComments: number
}

export interface FixtureSlim {
  id: string
  startsAt: Date
  startsAtTime: string | null
  isAwayGame: boolean
  opponent: string
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
  opponent: string
  result: string | null
  resultHalfTime: string | null
  type: string
  playOffType: string | null
  arena: string
  spectators: number
  name: string
  attendance: number
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
  type: FixtureEventType
  minute: number
  player: string
  assist?: string
  isLiverpool: boolean
  inPlayer?: string
  outPlayer?: string
}

export interface Standing {
  position: number
  team: string
  imageUrl: string
  played: number
  won: number
  draw: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  isLiverpool: boolean
}

///////////////////////////////////////////////////////////
// Namespaced API
///////////////////////////////////////////////////////////

export const api = {
  posts: {
    get: getPost,
    list: listPosts,
  },
  comments: {
    list: listComments,
  },
  seasons: {
    list: listSeasons,
  },
  fixtures: {
    get: getFixture,
    list: listFixtures,
    getStats: getFixtureStats,
    getEvents: getFixtureEvents,
  },
  standings: {
    get: getStandings,
  },
  auth: {
    login,
    logout,
    getMember: getMemberInformation,
    setSessionToken,
  },
}
