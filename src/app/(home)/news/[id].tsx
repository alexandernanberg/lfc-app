import { useSuspenseQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Suspense } from 'react'
import {
  ActivityIndicator,
  PlatformColor,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { RenderHTML } from 'react-native-render-html'
import { suspend } from 'suspend-react'
import { getArticle, getComments } from '~/api'
import { Image } from '~/components/image'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerTitle: '' }} />
      <Suspense
        fallback={
          <View style={styles.loader}>
            <ActivityIndicator />
          </View>
        }
      >
        <List />
      </Suspense>
    </SafeAreaView>
  )
}

function List() {
  const { id } = useLocalSearchParams()
  const article = suspend(() => getArticle(id as string), ['article', id])
  const { width } = useWindowDimensions()

  return (
    <ScrollView>
      <Image
        source={{ uri: article.imageUrl, cache: 'force-cache' }}
        style={[styles.image]}
        resizeMode="cover"
      />
      <View style={{ padding: 17, backgroundColor: 'white' }}>
        <Text
          style={{
            fontSize: 28,
            lineHeight: 34,
            fontWeight: '700',
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          {article.title}
        </Text>
        <RenderHTML
          source={{ html: article.content }}
          contentWidth={width}
          tagsStyles={tagsStyle}
          enableExperimentalMarginCollapsing={true}
        />
        <Suspense>
          <Comments articleId={id as string} />
        </Suspense>
      </View>
    </ScrollView>
  )
}

interface CommentProps {
  articleId: string
}

function Comments({ articleId }: CommentProps) {
  const { data: comments } = useSuspenseQuery({
    queryFn: () => getComments(articleId),
    queryKey: ['article-comments', articleId],
    refetchInterval: 60_000,
  })

  return (
    <View style={{ flex: 1, gap: 12 }}>
      {comments.map((comment) => (
        <View key={comment.id}>
          <Text style={{ fontWeight: '500' }}>{comment.author.name}</Text>
          <Text>{comment.comment}</Text>
        </View>
      ))}
    </View>
  )
}

const tagsStyle = {
  p: {
    fontSize: 17,
    lineHeight: 22,
    color: PlatformColor('label'),
  },
  ul: {
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: 12,
    margin: 0,
  },
  ol: {
    fontSize: 17,
    lineHeight: 22,
  },
  li: {
    marginBottom: 4,
    paddingLeft: 4,
  },
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    // alignItems: 'center',
    // justifyContent: 'center',
  },
  image: {
    aspectRatio: '4/3',
  },
})
