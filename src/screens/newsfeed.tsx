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
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SFSymbol from 'sweet-sfsymbols'
import type { Post } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { postQuery, postsQuery } from '~/lib/queries'
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
    useSuspenseInfiniteQuery(postsQuery)

  const onRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const onEndReched = useCallback(async () => {
    if (!isFetchingNextPage) {
      await fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const posts = data.pages.flat()

  const ref = useRef<FlatList<Post>>(null)
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
      data={posts}
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
  post: Post
  featured: boolean
}

function Card({ post, featured }: CardProps) {
  const theme = useTheme()
  const navigation = useNavigation()

  const navigateToPost = () => {
    navigation.navigate('Home', {
      screen: 'Newsfeed',
      params: {
        screen: 'Post',
        params: {
          id: post.id,
        },
      },
    })
  }

  const prefetchPost = () => {
    void queryClient.prefetchQuery(postQuery(post.id))
  }

  if (featured) {
    return (
      <Pressable
        style={{
          ...styles.card,
          flexDirection: 'column',
          borderBottomColor: theme.borderBase,
        }}
        onPress={navigateToPost}
        onPressIn={prefetchPost}
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
            variant="headingSmall"
            style={[
              {
                marginTop: 4,
                marginBottom: 4,
              },
            ]}
            numberOfLines={2}
          >
            {post.title}
          </Text>
          <Text
            variant="bodySmall"
            style={[{ marginBottom: 12 }]}
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
      onPress={navigateToPost}
      onPressIn={prefetchPost}
    >
      <View style={{ flex: 1 }}>
        <Text
          variant="headingXSmall"
          style={[{ marginBottom: 12 }]}
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
  post: Post
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
      <Text color="baseMuted" variant="captionLarge">
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
        <Text variant="captionLarge" color="baseMuted">
          {post.commentsCount}
        </Text>
        <SFSymbol
          name="bubble.left.and.bubble.right"
          weight="regular"
          scale="small"
          colors={[theme.foregroundBaseMuted]}
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
})
