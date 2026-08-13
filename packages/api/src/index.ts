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
} from './types.js'
export { AuthError, RequestError } from './errors.js'
export { createClient, type Client, type ClientConfig } from './client.js'
export {
  DEFAULT_API_URL,
  fetchLatestPosts,
  type FetchLatestPostsOptions,
} from './news.js'
