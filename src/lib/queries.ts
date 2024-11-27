import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { getComments, getPost, listFixtures, listPosts } from '~/api'
import { queryClient } from './query-client'

const postsQuery = infiniteQueryOptions({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => listPosts(10, (pageParam - 1) * 10),
  initialPageParam: 1,
  getNextPageParam: (firstPage, allPages, lastPageParam) => lastPageParam + 1,
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
})

export { fixturesQuery, postCommentsQuery, postQuery, postsQuery }
