/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { config } from '~/config'
import { titleCase } from './utils'

const API_URL = config.get('apiUrl')

export async function getPost(id: string) {
  const url = new URL(`${API_URL}/News/GetNewsById`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = await res.json()

  return parsePost(data)
}

export async function listPosts(limit = 10, offset = 0) {
  // REST API doesn't have limit and offset but only limit/items.
  const url = new URL(`${API_URL}/News/GetNewsList`)
  url.searchParams.set('items', (limit + offset).toString())
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.slice(offset).map((item) => parsePost(item))
}

export async function getComments(id: string) {
  const url = new URL(`${API_URL}/Comment/GetCommentList`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => parseComment(item))
}

export async function listSeasons() {
  const url = new URL(`${API_URL}/Fixture/GetSeasonList`)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => parseSeason(item))
}

export async function listFixtures() {
  const seasons = await listSeasons()
  const seasonId = seasons.at(0)?.id ?? '36'

  const url = new URL(`${API_URL}/Fixture/GetFixture`)
  url.searchParams.set('seasonId', seasonId)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => parseFixtureSlim(item))
}

export async function getFixture(id: string) {
  const url = new URL(`${API_URL}/Fixture/GetFixtureById`)
  url.searchParams.set('fixtureId', id)
  const res = await fetch(url.toString())
  const data = await res.json()

  return parseFixture(data)
}

export async function getFixtureStats(id: string) {
  const url = new URL(`${API_URL}/Fixture/GetFixtureTeamStats`)
  url.searchParams.set('fixtureId', id)
  const res = await fetch(url.toString())
  const data = await res.json()

  return parseFixtureStats(data)
}

export async function getFixtureEvents(id: string) {
  const url = new URL(`${API_URL}/Fixture/GetFixtureEvents`)
  url.searchParams.set('fixtureId', id)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => parseFixtureEvents(item))
}

///////////////////////////////////////////////////////////
// Normalizers
///////////////////////////////////////////////////////////

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
