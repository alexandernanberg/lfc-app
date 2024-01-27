import { config } from '~/config'
import type { Comment, Post } from '~/types'

const API_URL = config.get('apiUrl')

export async function getArticle(id: string) {
  const url = new URL(`${API_URL}/News/GetNewsById`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = await res.json()

  return normalizeArticle(data)
}

export async function listArticles(num = 10) {
  const url = new URL(`${API_URL}/News/GetNewsList`)
  url.searchParams.set('items', num.toString())
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  return data.map((item) => normalizeArticle(item))
}

export async function getComments(id: string) {
  const url = new URL(`${API_URL}/Comment/GetCommentList`)
  url.searchParams.set('NewsId', id)
  const res = await fetch(url.toString())
  const data = (await res.json()) as Array<unknown>

  console.log('fetch')

  return data.map((item) => normalizeComment(item))
}

////////////////////////////////////////////////////////////////////////////////
// Normalizers

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

function normalizeArticle(input: unknown): Post {
  if (!isObject(input)) {
    throw new Error('Invalid article')
  }

  return {
    id: input.NewsId,
    title: input.Title,
    excerpt: input.Preamble,
    imageUrl: input.ImageName,
    publishedAt: new Date(input.CreatedDate),
    commentsCount: input.NumberOfComments ?? 0,
    slug: input.Url,
    content: input.ContentText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: input.TagList?.map((tag: any) => ({
      id: tag.TagId,
      value: tag.TagName,
    })),
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
    id: input.CommentId,
    parentId: input.ParentId,
    createdAt: new Date(input.CreatedDate),
    updatedAt: new Date(input.ChangedDate),
    comment: input.Comment,
    author: {
      id: input.MemberId,
      name: input.UserName,
      avatarUrl: input.ImageName,
      url: input.Url,
    },
    numberOfLikes: input.NumberOfLikes,
    // "HasPermission": false,
    // "HasLiked": false,
    // "HasReply": false,
  }
}
