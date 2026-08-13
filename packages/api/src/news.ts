import type { NewsPost } from './types'

/** Default lfc.se web API base. Same origin the mobile app talks to. */
export const DEFAULT_API_URL = 'https://www.lfc.se/webapi'

export interface FetchLatestPostsOptions {
  /** Override the API base URL (defaults to {@link DEFAULT_API_URL}). */
  apiUrl?: string
  /** How many articles to request. The endpoint takes an `items` count. */
  items?: number
  /** Optional fetch implementation, for testing. Defaults to global `fetch`. */
  fetch?: typeof fetch
}

/**
 * Fetch the latest news articles from lfc.se and normalise them into
 * {@link NewsPost}s sorted newest-first by publish time.
 *
 * Unlike the mobile client this is framework-agnostic: no cookies, no native
 * modules — just `fetch`. It runs anywhere with a global `fetch` (Node 18+,
 * Vercel functions, edge runtimes).
 */
export async function fetchLatestPosts(
  options: FetchLatestPostsOptions = {},
): Promise<NewsPost[]> {
  const {
    apiUrl = DEFAULT_API_URL,
    items = 10,
    fetch: fetchImpl = fetch,
  } = options

  const url = new URL(`${apiUrl}/News/GetNewsList`)
  url.searchParams.set('items', String(items))

  const res = await fetchImpl(url.toString())
  if (!res.ok) {
    throw new Error(`GetNewsList failed with status ${res.status}`)
  }

  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('GetNewsList did not return an array')
  }

  const posts = data
    .map(parsePost)
    .filter((post): post is NewsPost => post !== null)

  // The list endpoint pins a featured article first, so its order isn't
  // reliably chronological. Sort by publish time ourselves so callers can rely
  // on index 0 being the genuinely newest article.
  posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  return posts
}

/** Strip HTML tags from a string (for turning the HTML preamble into text). */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null
}

/** Normalise one raw API item into a {@link NewsPost}, or `null` if malformed. */
function parsePost(input: unknown): NewsPost | null {
  if (!isObject(input)) {
    return null
  }

  const newsId = input.NewsId
  if (newsId == null) {
    return null
  }

  const publishedAt = new Date(String(input.CreatedDate ?? ''))
  if (Number.isNaN(publishedAt.getTime())) {
    return null
  }

  const slug = typeof input.Url === 'string' ? input.Url : ''
  const imageName = typeof input.ImageName === 'string' ? input.ImageName : null

  return {
    id: String(newsId),
    title: typeof input.Title === 'string' ? input.Title : '',
    excerpt:
      typeof input.Preamble === 'string' ? stripHtml(input.Preamble) : '',
    url: `https://lfc.nu${slug}`,
    imageUrl: imageName ? imageName.replace(/w_\d*/, 'w_600') : null,
    publishedAt,
  }
}
