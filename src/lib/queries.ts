import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import {
  getComments,
  getFixture,
  getFixtureEvents,
  getFixtureStats,
  getPost,
  listFixtures,
  listPosts,
} from '~/api'
import { queryClient } from './query-client'

const postsQuery = infiniteQueryOptions({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => listPosts(10, (pageParam - 1) * 10),
  initialPageParam: 1,
  getNextPageParam: (firstPage, allPages, lastPageParam) => lastPageParam + 1,
  staleTime: 5 * 60 * 1000,
})

function postQuery(id: string) {
  return queryOptions({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
    placeholderData: () => {
      return queryClient
        .getQueryData(postsQuery.queryKey)
        ?.pages.flat()
        .find((i) => i.id === id)
    },
    staleTime: 5 * 60 * 1000,
  })
}

function postCommentsQuery(id: string) {
  return queryOptions({
    queryKey: ['post-comments', id],
    queryFn: () => getComments(id),
    refetchInterval: 60_000,
  })
}

const fixturesQuery = queryOptions({
  queryKey: ['fixtures'],
  queryFn: () => listFixtures(),
  // TODO: only stale when day has changed?
  staleTime: 5 * 60 * 1000,
})

const fixtureQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', id],
    queryFn: () => getFixture(id),
    staleTime: 5 * 60 * 1000,
  })
}

const fixtureStatsQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', 'stats', id],
    queryFn: () => getFixtureStats(id),
    staleTime: 5 * 60 * 1000,
  })
}

const fixtureEventsQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', 'events', id],
    queryFn: () => getFixtureEvents(id),
    staleTime: 5 * 60 * 1000,
  })
}

export {
  fixtureEventsQuery,
  fixtureQuery,
  fixturesQuery,
  fixtureStatsQuery,
  postCommentsQuery,
  postQuery,
  postsQuery,
}
