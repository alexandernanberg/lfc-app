import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { api } from '~/api'
import { queryClient } from './query-client'

const postsQuery = infiniteQueryOptions({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => api.posts.list(10, (pageParam - 1) * 10),
  initialPageParam: 1,
  getNextPageParam: (firstPage, allPages, lastPageParam) => lastPageParam + 1,
  staleTime: 5 * 60 * 1000,
})

function postQuery(id: string) {
  return queryOptions({
    queryKey: ['post', id],
    queryFn: () => api.posts.get(id),
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
    queryFn: () => api.comments.list(id),
    refetchInterval: 60_000,
  })
}

const fixturesQuery = queryOptions({
  queryKey: ['fixtures'],
  queryFn: () => api.fixtures.list(),
  // TODO: only stale when day has changed?
  staleTime: 5 * 60 * 1000,
})

const fixtureQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', id],
    queryFn: () => api.fixtures.get(id),
    staleTime: 5 * 60 * 1000,
  })
}

const fixtureStatsQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', 'stats', id],
    queryFn: () => api.fixtures.getStats(id),
    staleTime: 5 * 60 * 1000,
  })
}

const fixtureEventsQuery = (id: string) => {
  return queryOptions({
    queryKey: ['fixture', 'events', id],
    queryFn: () => api.fixtures.getEvents(id),
    staleTime: 5 * 60 * 1000,
  })
}

function memberQuery(token: string | undefined) {
  return queryOptions({
    queryKey: ['member', token],
    queryFn: () => api.auth.getMember(),
    enabled: token != null,
    staleTime: 5 * 60 * 1000,
  })
}

export {
  fixtureEventsQuery,
  fixtureQuery,
  fixturesQuery,
  fixtureStatsQuery,
  memberQuery,
  postCommentsQuery,
  postQuery,
  postsQuery,
}
