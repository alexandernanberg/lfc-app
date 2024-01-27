import { Link, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Suspense, useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  PlatformColor,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ChatBubbleLeftRightIcon } from 'react-native-heroicons/outline'
import { suspend } from 'suspend-react'
import { listArticles } from '~/api'
import { useDateFormatter } from '~/lib/use-date-formatter'

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: 'Nyheter' }} />
      <SafeAreaView style={styles.container}>
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
    </>
  )
}

const ARTICLES_CHUNK = 10

function List() {
  const initialData = suspend(() => listArticles(ARTICLES_CHUNK), ['articles'])
  const [data, setData] = useState(initialData)
  const [page, setPage] = useState(0)
  const [isRefreshing, setRefreshing] = useState(false)

  const pageRef = useRef(1)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    pageRef.current = 1
    const newData = await listArticles(ARTICLES_CHUNK)
    setData(newData)
    setRefreshing(false)
  }, [])

  const onEndReched = useCallback(async () => {
    pageRef.current += 1
    const page = pageRef.current
    // API doesn't support real pagniation
    const newData = await listArticles(ARTICLES_CHUNK * page)
    setData(newData)
  }, [])

  const dateFormatter = useDateFormatter()

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <Link href={`/news/${item.id}`} asChild>
          <Pressable style={styles.card}>
            <Image
              source={{ uri: item.imageUrl, cache: 'force-cache' }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: PlatformColor('secondaryLabel'),
                  }}
                >
                  {dateFormatter.format(new Date(item.publishedAt))}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 4,
                    alignSelf: 'flex-start',
                    alignItems: 'flex-end',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 13,
                      color: PlatformColor('secondaryLabel'),
                    }}
                  >
                    {item.commentsCount}
                  </Text>
                  <ChatBubbleLeftRightIcon
                    size={15}
                    color={PlatformColor('secondaryLabel')}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Link>
      )}
      onEndReached={onEndReched}
      onEndReachedThreshold={0.5}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 17,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    gap: 12,
    borderBottomColor: PlatformColor('separator'),
    borderBottomWidth: 1,
  },
  image: {
    width: 100,
    aspectRatio: '4/3',
    borderRadius: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 0,
    flexShrink: 1,
    marginBottom: 8,
    color: PlatformColor('label'),
  },
})
