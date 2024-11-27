/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { config } from '~/config'

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

  return data.map((item) => parseFixture(item))
}

////////////////////////////////////////////////////////////////////////////////
// Normalizers

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

  sanitizedHtml = sanitizedHtml.replace(
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

  // Remove annying banners
  sanitizedHtml = sanitizedHtml
    .replace(/<hr>[\s\S]*?<figure>[\s\S]*?data-emoji="🚩"[\s\S]*/g, '')
    .replace(/<p>\*&nbsp;(.|\s)+<\/p>\s<figure.+<\/figure>/g, '')

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
      avatarUrl: input.ImageName,
      url: input.Url,
    },
    numberOfLikes: input.NumberOfLikes,
    replies: input.SubList?.map((i: unknown) => parseComment(i)) ?? [],
    // "HasPermission": false,
    // "HasLiked": false,
    // "HasReply": false,
  }
}

function parseFixture(input: unknown): Fixture {
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
    // "Arena": "Wildpark Stadion",
    // "AfterPenalties": null,
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

export interface Fixture {
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
