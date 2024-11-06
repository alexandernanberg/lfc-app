/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { config } from '~/config'

const API_URL = config.get('apiUrl')

export async function getArticle(id: string) {
  const url = new URL(`${API_URL}/News/GetNewsById`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = await res.json()

  return normalizeArticle(data)
}

export async function listArticles(limit = 10, offset = 0) {
  // REST API doesn't have limit and offset but only limit/items.
  const url = new URL(`${API_URL}/News/GetNewsList`)
  url.searchParams.set('items', (limit + offset).toString())
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.slice(offset).map((item) => normalizeArticle(item))
}

export async function getComments(id: string) {
  const url = new URL(`${API_URL}/Comment/GetCommentList`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => normalizeComment(item))
}

export async function listFixtures() {
  const url = new URL(`${API_URL}/Fixture/GetFixture`)
  url.searchParams.set('seasonId', '36')
  const res = await fetch(url.toString(), {
    headers: {
      // 'x-api-key': '522DD582EEE242D9B0E94978015C9D35',
    },
  })
  const data = (await res.json()) as Array<unknown>

  return data
    .map((item) => normalizeFixture(item))
    .sort((a, b) => {
      return a.startsAt.getTime() - b.startsAt.getTime()
    })
}

////////////////////////////////////////////////////////////////////////////////
// Normalizers

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

function normalizeArticle(input: unknown): Article {
  if (!isObject(input)) {
    throw new Error('Invalid article')
  }

  return {
    id: `${input.NewsId}`,
    title: input.Title,
    excerpt: input.Preamble,
    imageUrl: input.ImageName,
    publishedAt: new Date(input.CreatedDate),
    commentsCount: input.NumberOfComments ?? 0,
    slug: input.Url,
    content: input.ContentText,
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

export function normalizeComment(input: unknown): Comment {
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
    replies: input.SubList?.map((i: unknown) => normalizeComment(i)) ?? [],
    // "HasPermission": false,
    // "HasLiked": false,
    // "HasReply": false,
  }
}

export function normalizeFixture(input: unknown): Fixture {
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

export interface Article {
  id: string
  slug: string
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
