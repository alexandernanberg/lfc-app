import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Suspense, useCallback, useRef } from 'react'
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
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { useTheme } from '~/components/theme-context'
import { newsArticleQuery, newsfeedQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { RelativeTime } from '~/lib/use-relative-time-formatter'

export function NewsfeedScreen() {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <List />
      </Suspense>
    </ScrollProvider>
  )
}

function List() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { onScroll, offsetY } = useScrollContext()

  const { data, isRefetching, refetch, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(newsfeedQuery)

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
          offset: offsetY,
        }),
    }),
  )

  return (
    <FlatList
      ref={ref}
      data={articles}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: tabBarHeight - insets.bottom }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      scrollToOverflowEnabled
      style={{
        paddingHorizontal: 17,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
      renderItem={({ item, index }) => (
        <Card post={item} featured={index === 0} />
      )}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={{ marginTop: 32, marginBottom: 32 }} />
        ) : null
      }
      onEndReached={onEndReched}
      onEndReachedThreshold={0.5}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  )
}

interface CardProps {
  post: Article
  featured: boolean
}

function Card({ post, featured }: CardProps) {
  const theme = useTheme()
  const navigation = useNavigation()

  const navigateToArticle = () => {
    navigation.navigate('Home', {
      screen: 'Newsfeed',
      params: {
        screen: 'NewsfeedArticle',
        params: {
          id: post.id,
        },
      },
    })
  }

  const prefetchArticle = () => {
    void queryClient.prefetchQuery(newsArticleQuery(post.id))
  }

  if (featured) {
    return (
      <Pressable
        style={{
          ...styles.card,
          flexDirection: 'column',
          borderBottomColor: theme.borderBase,
        }}
        onPress={navigateToArticle}
        onPressIn={prefetchArticle}
      >
        <Image
          source={post.imageUrl}
          style={[
            styles.image,
            { width: '100%', backgroundColor: theme.backgroundBaseElevated },
          ]}
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
    )
  }

  return (
    <Pressable
      style={{
        ...styles.card,
        borderBottomColor: theme.borderBase,
      }}
      onPress={navigateToArticle}
      onPressIn={prefetchArticle}
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
        style={[
          styles.image,
          { backgroundColor: theme.backgroundBaseElevated },
        ]}
        contentFit="cover"
      />
    </Pressable>
  )
}

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
  card: {
    paddingVertical: 17,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
