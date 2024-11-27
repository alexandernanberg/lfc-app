import IframeRenderer, { iframeModel } from '@native-html/iframe-plugin'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import type { StaticScreenProps } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as Sharing from 'expo-sharing'
import type { ReactNode } from 'react'
import { Suspense, useEffect } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import type {
  CustomTagRendererRecord,
  HTMLElementModelRecord,
} from 'react-native-render-html'
import { RenderHTML } from 'react-native-render-html'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'
import SFSymbol from 'sweet-sfsymbols'
import type { Comment } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { useTheme } from '~/components/theme-context'
import { newsArticleCommentsQuery, newsArticleQuery } from '~/lib/queries'
import { DistanceTime } from '~/lib/use-relative-time-formatter'

type Props = StaticScreenProps<{
  id: string
}>

export function NewsfeedArticleScreen({ route }: Props) {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <Content id={route.params.id} />
      </Suspense>
    </ScrollProvider>
  )
}

export function NewsfeedArticleShareButton({ url }: { url?: string }) {
  const theme = useTheme()

  return (
    <TouchableOpacity
      onPress={async () => {
        if (url) {
          await Sharing.shareAsync(url)
        }
      }}
    >
      <SFSymbol
        name="square.and.arrow.up"
        weight="light"
        scale="small"
        colors={[theme.foregroundAction]}
        size={25}
      />
    </TouchableOpacity>
  )
}

function Content({ id }: { id: string }) {
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const { onScroll } = useScrollContext()
  const navigation = useNavigation()

  // TODO: Use suspense query when it works with placeholder data
  const { data: article } = useQuery(newsArticleQuery(id))

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <NewsfeedArticleShareButton url={article?.url} />,
    })
  }, [article?.url, navigation])

  if (!article) {
    return null
  }

  const content = `<p><strong>${article.excerpt}</strong></p>${article.content}`

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: tabBarHeight - insets.bottom }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={{ padding: 17 }}>
        <Text
          style={{
            fontSize: 28,
            lineHeight: 34,
            fontWeight: '700',
            flexShrink: 1,
            marginBottom: 8,
            color: theme.foregroundBase,
          }}
        >
          {article.title}
        </Text>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.foregroundBaseFaded }}>
            {article.publishedAt.toISOString().slice(0, 10)} &middot;{' '}
            {article.author.name}
          </Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Image
            source={article.imageUrl}
            style={[
              styles.image,
              { backgroundColor: theme.backgroundBaseElevated },
            ]}
            contentFit="cover"
            priority="high"
          />
        </View>
        <RenderHTML
          source={{ html: content }}
          renderers={renderers}
          WebView={WebView}
          contentWidth={width - 17 * 2}
          tagsStyles={{
            ...tagsStyle,
            body: { ...tagsStyle.body, color: theme.foregroundBase },
          }}
          enableExperimentalMarginCollapsing
          customHTMLElementModels={customHTMLElementModels}
          renderersProps={{
            iframe: {
              scalesPageToFit: true,
            },
          }}
        />
        <View
          style={{
            marginTop: 24,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Image
              source={article.author.avatarUrl}
              contentFit="cover"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                overflow: 'hidden',
              }}
            />
            <Text style={{ color: theme.foregroundBase }}>
              {article.author.name}
            </Text>
          </View>
          {!!article.tags.length && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {article.tags.map((tag) => (
                <Text
                  key={tag.id}
                  style={{
                    paddingVertical: 6,
                    padding: 8,
                    paddingHorizontal: 12,
                    backgroundColor: theme.backgroundBaseElevated,
                    borderRadius: 12,
                    fontSize: 12,
                    color: theme.foregroundBase,
                  }}
                >
                  {tag.value}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Suspense fallback={<ActivityIndicator />}>
          <Comments articleId={id} />
        </Suspense>
      </View>
    </ScrollView>
  )
}

const renderers = {
  iframe: IframeRenderer,
} satisfies CustomTagRendererRecord

const customHTMLElementModels = {
  iframe: iframeModel,
} satisfies HTMLElementModelRecord

interface CommentsProps {
  articleId: string
}

function Comments({ articleId }: CommentsProps) {
  const theme = useTheme()

  const { data: comments } = useSuspenseQuery(
    newsArticleCommentsQuery(articleId),
  )

  return (
    <>
      <Text
        style={{
          fontWeight: '700',
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: theme.borderBase,
          color: theme.foregroundBase,
        }}
      >
        {comments.length} {comments.length === 1 ? 'kommentar' : 'kommentarer'}
      </Text>
      <View style={{ flex: 1, gap: 16, paddingBottom: 32, paddingTop: 16 }}>
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment}>
            {!!comment.replies.length && (
              <View style={{ paddingLeft: 40, paddingTop: 12, gap: 12 }}>
                {comment.replies.map((reply) => (
                  <Comment key={reply.id} comment={reply} />
                ))}
              </View>
            )}
          </Comment>
        ))}
      </View>
    </>
  )
}

interface CommentProps {
  comment: Comment
  children?: ReactNode
}

function Comment({ comment, children }: CommentProps) {
  const theme = useTheme()

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Image
          source={comment.author.avatarUrl}
          contentFit="cover"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        />

        <View style={{ gap: 6, flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text
              style={{
                fontWeight: '500',
                fontSize: 13,
                color: theme.foregroundBase,
              }}
            >
              {comment.author.name}
            </Text>
            <Text style={{ color: theme.foregroundBaseFaded, fontSize: 13 }}>
              {' '}
              &middot; <DistanceTime date={comment.createdAt} />
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: theme.backgroundBaseElevated,
              borderRadius: 12,
              borderTopLeftRadius: 2,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                lineHeight: 20,
                flex: 1,
                color: theme.foregroundBase,
              }}
            >
              {comment.comment}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <Pressable
              style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}
            >
              <SFSymbol
                name="bubble.right"
                weight="regular"
                scale="small"
                colors={[theme.foregroundBaseFaded]}
                size={13}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: theme.foregroundBaseFaded,
                }}
              >
                Svara
              </Text>
            </Pressable>
            <Pressable
              style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}
            >
              <SFSymbol
                name="hand.thumbsup"
                weight="regular"
                scale="small"
                colors={[theme.foregroundBaseFaded]}
                size={13}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: theme.foregroundBaseFaded,
                }}
              >
                Gilla{' '}
                <Text style={{ fontWeight: '400' }}>
                  ({comment.numberOfLikes})
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      {children}
    </View>
  )
}

const tagsStyle = {
  body: {
    fontSize: 17,
    lineHeight: 25,
  },
  h2: {
    marginTop: 27,
  },
  ul: {
    paddingHorizontal: 12,
    margin: 0,
  },
  ol: {},
  li: {
    marginBottom: 4,
    paddingLeft: 4,
  },
  figure: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    marginTop: 17,
    borderRadius: 12,
    overflow: 'hidden',
  },
} as const

const styles = StyleSheet.create({
  image: {
    aspectRatio: '4/3',
    borderRadius: 12,
    overflow: 'hidden',
  },
})
