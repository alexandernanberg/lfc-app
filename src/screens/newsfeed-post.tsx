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
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import type {
  CustomTagRendererRecord,
  HTMLElementModelRecord,
  TRenderEngineConfig,
} from 'react-native-render-html'
import { defaultHTMLElementModels, RenderHTML } from 'react-native-render-html'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'
import SFSymbol from 'sweet-sfsymbols'
import type { Comment } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { InstagramEmbed } from '~/components/instagram-embed'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { TweetEmbed } from '~/components/twitter-embed'
import { postCommentsQuery, postQuery } from '~/lib/queries'
import { DistanceTime } from '~/lib/use-relative-time-formatter'
import { textStyles } from '~/theme'

type Props = StaticScreenProps<{
  id: string
}>

export function NewsfeedPostScreen({ route }: Props) {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <Content id={route.params.id} />
      </Suspense>
    </ScrollProvider>
  )
}

export function NewsfeedPostShareButton({ url }: { url?: string }) {
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
  const { data: post } = useQuery(postQuery(id))

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <NewsfeedPostShareButton url={post?.url} />,
    })
  }, [post?.url, navigation])

  if (!post) {
    return null
  }

  const content = `<p><strong>${post.excerpt}</strong></p>${post.content}`

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
          variant="headingLarge"
          style={{
            flexShrink: 1,
            marginBottom: 8,
          }}
        >
          {post.title}
        </Text>
        <View style={{ marginBottom: 24 }}>
          <Text color="baseMuted" variant="captionLarge">
            {post.publishedAt.toISOString().slice(0, 10)} &middot;{' '}
            {post.author.name}
          </Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Image
            source={post.imageUrl}
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
            body: {
              ...tagsStyle.body,
              color: theme.foregroundBase,
            },
            a: {
              color: theme.foregroundAction,
              textDecorationColor: theme.foregroundAction,
            },
            hr: {
              backgroundColor: theme.borderBase,
              height: StyleSheet.hairlineWidth,
              marginTop: 32,
              marginBottom: 32,
            },
          }}
          enableExperimentalMarginCollapsing
          enableExperimentalBRCollapsing
          customHTMLElementModels={customHTMLElementModels}
          renderersProps={{
            iframe: {
              scalesPageToFit: true,
              webViewProps: {
                style: {
                  backgroundColor: 'transparent',
                },
              },
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
              source={post.author.avatarUrl}
              contentFit="cover"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                overflow: 'hidden',
              }}
            />
            <Text variant="bodySmall">{post.author.name}</Text>
          </View>
          {!!post.tags.length && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {post.tags.map((tag) => (
                <Text
                  key={tag.id}
                  variant="captionMedium"
                  style={{
                    paddingVertical: 6,
                    padding: 8,
                    paddingHorizontal: 12,
                    backgroundColor: theme.backgroundBaseElevated,
                    borderRadius: 12,
                  }}
                >
                  {tag.value}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Separator />
        <Suspense fallback={<ActivityIndicator />}>
          <Comments postId={id} />
        </Suspense>
      </View>
    </ScrollView>
  )
}

const renderers = {
  iframe: IframeRenderer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'tweet-embed': (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const tweetId = props.tnode.attributes.id as string
    return <TweetEmbed tweetId={tweetId} />
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'instagram-embed': (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const postId = props.tnode.attributes.id as string
    return <InstagramEmbed postId={postId} />
  },
} satisfies CustomTagRendererRecord

const customHTMLElementModels = {
  iframe: iframeModel,
  'tweet-embed': defaultHTMLElementModels.div,
  'instagram-embed': defaultHTMLElementModels.div,
} satisfies HTMLElementModelRecord

interface CommentsProps {
  postId: string
}

function Comments({ postId }: CommentsProps) {
  const { data: comments } = useSuspenseQuery(postCommentsQuery(postId))

  return (
    <View
      style={{
        flex: 1,
        gap: 16,
        paddingBottom: 32,
        paddingTop: 24,
      }}
    >
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
        {comment.author.avatarUrl ? (
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
        ) : (
          <SFSymbol
            name="person.crop.circle.fill"
            size={32}
            weight="light"
            colors={[theme.foregroundBaseMuted]}
          />
        )}

        <View style={{ gap: 6, flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text variant="captionLarge" style={{ fontWeight: 500 }}>
              {comment.author.name}
            </Text>
            <Text variant="captionLarge" color="baseMuted">
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
              variant="bodySmall"
              style={{
                flex: 1,
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
                colors={[theme.foregroundBaseMuted]}
                size={13}
              />
              <Text
                variant="captionLarge"
                color="baseMuted"
                style={{
                  fontWeight: 500,
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
                colors={[theme.foregroundBaseMuted]}
                size={13}
              />
              <Text
                variant="captionLarge"
                color="baseMuted"
                style={{
                  fontWeight: 500,
                }}
              >
                Gilla{' '}
                <Text style={{ fontWeight: 400, color: undefined }}>
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
    ...textStyles.bodyMedium,
  },
  h2: {
    ...textStyles.headingSmall,
    marginTop: 27,
  },
  p: {
    ...textStyles.bodyMedium,
    marginTop: 17,
  },
  strong: {
    fontWeight: 600,
  },
  b: {
    fontWeight: 600,
  },
  ul: {
    paddingHorizontal: 12,
    marginTop: 17,
  },
  ol: {
    paddingHorizontal: 12,
    marginTop: 17,
  },
  li: {
    marginBottom: 4,
    paddingLeft: 4,
  },
  figure: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    marginBottom: 24,
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
} satisfies TRenderEngineConfig['tagsStyles']

const styles = StyleSheet.create({
  image: {
    aspectRatio: '4/3',
    borderRadius: 12,
    overflow: 'hidden',
  },
})
