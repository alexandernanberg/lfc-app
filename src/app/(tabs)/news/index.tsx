import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import { useScrollToTop } from '@react-navigation/native'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Link, Stack } from 'expo-router'
import { Suspense, memo, useCallback, useRef } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SFSymbol from 'sweet-sfsymbols'
import type { Article } from '~/api'
import { listArticles } from '~/api'
import { useTheme } from '~/components/theme-context'
import { RelativeTime } from '~/lib/use-relative-time-formatter'

export default function App() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nyheter' }} />
      <View style={styles.container}>
        <Suspense
          fallback={
            <View style={styles.loader}>
              <ActivityIndicator />
            </View>
          }
        >
          <List />
        </Suspense>
      </View>
    </>
  )
}

function List() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()

  const limit = 10

  const { data, isRefetching, refetch, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: ['articles'],
      queryFn: ({ pageParam }) => listArticles(limit, pageParam * limit),
      initialPageParam: 1,
      getNextPageParam: (firstPage, allPages, lastPageParam) =>
        lastPageParam + 1,
    })

  const onRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const onEndReched = useCallback(async () => {
    if (!isFetchingNextPage) {
      await fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const articles = data.pages.flat()

  const ref = useRef<FlatList<Article>>(null)
  useScrollToTop(
    useRef({
      scrollToTop: () =>
        ref.current?.scrollToOffset({
          offset: -headerHeight - insets.top,
        }),
    }),
  )

  return (
    <FlatList
      ref={ref}
      data={articles}
      keyExtractor={(item) => item.id}
      contentInset={{ top: headerHeight + insets.top, bottom: tabBarHeight }}
      contentOffset={{ y: -headerHeight - insets.top, x: 0 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
      style={{
        paddingHorizontal: 17,
      }}
      renderItem={({ item, index }) => (
        <MemoCard post={item} featured={index === 0} />
      )}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={{ marginTop: 32, marginBottom: 32 }} />
        ) : null
      }
      onEndReached={onEndReched}
      onEndReachedThreshold={0.5}
    />
  )
}

interface CardProps {
  post: Article
  featured: boolean
}

function Card({ post, featured }: CardProps) {
  const theme = useTheme()
  const href = `/news/${post.id}`

  if (featured) {
    return (
      <Link href={href} asChild>
        <Pressable
          style={{
            ...styles.card,
            flexDirection: 'column',
            borderBottomColor: theme.borderBase,
          }}
        >
          <Image
            source={post.imageUrl}
            recyclingKey={post.id}
            style={[styles.image, { width: '100%' }]}
            contentFit="cover"
          />
          <View>
            <Text
              style={[
                styles.title,
                {
                  fontSize: 21,
                  lineHeight: 27,
                  marginTop: 4,
                  marginBottom: 4,
                  fontWeight: '700',
                  color: theme.foregroundBase,
                },
              ]}
              numberOfLines={2}
            >
              {post.title}
            </Text>
            <Text
              style={[
                {
                  fontSize: 15,
                  lineHeight: 20,
                  marginBottom: 12,
                  color: theme.foregroundBase,
                },
              ]}
              numberOfLines={2}
            >
              {post.excerpt}
            </Text>

            <CardFooter post={post} />
          </View>
        </Pressable>
      </Link>
    )
  }

  return (
    <Link href={href} asChild>
      <Pressable
        style={{ ...styles.card, borderBottomColor: theme.borderBase }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: theme.foregroundBase }]}
            numberOfLines={2}
          >
            {post.title}
          </Text>
          <CardFooter post={post} />
        </View>
        <Image
          source={post.imageUrl}
          recyclingKey={post.id}
          style={styles.image}
          contentFit="cover"
        />
      </Pressable>
    </Link>
  )
}

const MemoCard = memo(Card)

interface CardFooterProps {
  post: Article
}

function CardFooter({ post }: CardFooterProps) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: theme.foregroundBaseFaded,
        }}
      >
        <RelativeTime date={new Date(post.publishedAt)} />
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          alignSelf: 'flex-start',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            lineHeight: 13,
            color: theme.foregroundBaseFaded,
          }}
        >
          {post.commentsCount}
        </Text>
        <SFSymbol
          name="bubble.left.and.bubble.right"
          weight="regular"
          scale="small"
          colors={[theme.foregroundBaseFaded]}
          size={15}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingVertical: 17,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    gap: 12,
    borderBottomWidth: 1,
  },
  image: {
    width: 100,
    aspectRatio: '4/3',
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    minWidth: 0,
    flexShrink: 1,
    marginBottom: 12,
  },
})
