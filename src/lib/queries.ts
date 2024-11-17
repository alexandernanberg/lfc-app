import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { getArticle, getComments, listArticles, listFixtures } from '~/api'

const newsfeedQuery = infiniteQueryOptions({
  queryKey: ['articles'],
  queryFn: ({ pageParam }) => listArticles(10, (pageParam - 1) * 10),
  initialPageParam: 1,
  getNextPageParam: (firstPage, allPages, lastPageParam) => lastPageParam + 1,
})

function newsArticleQuery(id: string) {
  return queryOptions({
    queryKey: ['article', id],
    queryFn: () => getArticle(id),
  })
}

function newsArticleCommentsQuery(id: string) {
  return queryOptions({
    queryKey: ['article-comments', id],
    queryFn: () => getComments(id),
    refetchInterval: 60_000,
  })
}

const fixturesQuery = queryOptions({
  queryKey: ['fixtures'],
  queryFn: () => listFixtures(),
})

export {
  fixturesQuery,
  newsArticleCommentsQuery,
  newsArticleQuery,
  newsfeedQuery,
}
