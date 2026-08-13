export type {
  Comment,
  Fixture,
  FixtureEvent,
  FixtureSlim,
  FixtureStats,
  Member,
  NewsPost,
  Post,
  Season,
  Session,
  Standing,
  Tag,
  TeamStats,
  User,
} from './types'
export { AuthError, RequestError } from './errors'
export { createClient, type Client, type ClientConfig } from './client'
export {
  DEFAULT_API_URL,
  fetchLatestPosts,
  type FetchLatestPostsOptions,
} from './news'
